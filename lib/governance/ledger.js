// lib/governance/ledger.js
//
// Registro delle azioni dell'AI: append-only con hash a catena PER TENANT.
// row_hash = sha256(prev_hash + contenuto canonico). Se qualcuno modifica una
// riga dopo il fatto, verificaCatena() lo rileva. NON è immutabilità
// crittografica assoluta (chi ha la service role può comunque inserire righe o
// cancellare il tenant): è append-only + verificabile.
//
// Best-effort: un errore qui non deve mai impedire di rispondere al cliente.
// Il testo del cliente non viene salvato: solo hash, e un estratto della risposta.

import crypto from 'crypto';

export const GENESIS = 'GENESIS';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function stringifyStabile(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stringifyStabile).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stringifyStabile(v[k])}`).join(',')}}`;
}

export const CAMPI_HASH = ['cliente_id', 'request_id', 'actor', 'action', 'autonomy_level', 'approval', 'reason', 'subject_ref', 'sources', 'model', 'prompt_version', 'policy_version', 'pack_version', 'input_hash', 'output_excerpt', 'result'];

export function calcolaHash(prevHash, riga) {
  const contenuto = {};
  for (const k of CAMPI_HASH) contenuto[k] = riga[k] ?? null;
  return sha256(`${prevHash}|${stringifyStabile(contenuto)}`);
}

// Riferimento al cliente finale: hash salato per tenant (non reversibile e non
// collegabile tra tenant diversi). Il numero di telefono non entra nel ledger.
export function riferimentoSoggetto(clienteId, telefono) {
  return sha256(`${process.env.LEDGER_SALT || ''}|${clienteId}|${telefono || ''}`).slice(0, 24);
}
export const hashTesto = (t) => sha256(String(t ?? ''));

export function costruisciRiga(e) {
  return {
    cliente_id: e.cliente_id,
    request_id: e.request_id || null,
    actor: e.actor,
    action: e.action,
    autonomy_level: e.autonomy_level ?? 5,
    approval: e.approval || 'not_required',
    reason: e.reason || null,
    subject_ref: e.subject_ref || null,
    sources: e.sources || [],
    model: e.model || null,
    prompt_version: e.prompt_version || null,
    policy_version: e.policy_version || null,
    pack_version: e.pack_version ?? null,
    input_hash: e.input_hash || null,
    output_excerpt: e.output_excerpt ? String(e.output_excerpt).slice(0, 300) : null,
    result: e.result || 'ok',
  };
}

async function ultimoHash(SUPABASE_URL, headers, clienteId, fetchImpl) {
  const r = await fetchImpl(`${SUPABASE_URL}/rest/v1/ai_action_ledger?cliente_id=eq.${encodeURIComponent(clienteId)}&select=row_hash&order=id.desc&limit=1`, { headers });
  const righe = await r.json();
  if (!Array.isArray(righe)) throw new Error('ledger non disponibile');
  return righe[0]?.row_hash || GENESIS;
}

// Ritorna { ok, motivo? }. Non lancia mai.
export async function registra({ SUPABASE_URL, headers, fetchImpl = fetch }, entry) {
  try {
    if (!entry?.cliente_id) return { ok: false, motivo: 'cliente_id mancante' };
    const riga = costruisciRiga(entry);
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      const prev = await ultimoHash(SUPABASE_URL, headers, entry.cliente_id, fetchImpl);
      const body = { ...riga, prev_hash: prev, row_hash: calcolaHash(prev, riga) };
      const res = await fetchImpl(`${SUPABASE_URL}/rest/v1/ai_action_ledger`, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
      if (res.ok) return { ok: true };
      if (res.status !== 409) return { ok: false, motivo: `status ${res.status}` };
      // 409: un'altra scrittura ha preso lo stesso prev_hash; si rilegge e si riprova una volta.
    }
    return { ok: false, motivo: 'conflitto catena' };
  } catch (e) {
    console.error('Errore scrittura ledger (best-effort):', e);
    return { ok: false, motivo: String(e.message || e) };
  }
}

// Verifica una catena già ordinata per id crescente. Pura, usabile da script.
export function verificaCatena(righe) {
  let prev = GENESIS;
  for (let i = 0; i < righe.length; i++) {
    const r = righe[i];
    if (r.prev_hash !== prev) return { ok: false, indice: i, motivo: 'prev_hash non coincide' };
    if (calcolaHash(prev, r) !== r.row_hash) return { ok: false, indice: i, motivo: 'contenuto modificato' };
    prev = r.row_hash;
  }
  return { ok: true, righe: righe.length };
}
