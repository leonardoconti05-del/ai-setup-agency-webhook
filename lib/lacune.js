// lib/lacune.js
//
// Registro delle domande senza risposta (migrations/014). Best-effort: qualunque
// errore (tabella assente, rete) viene ignorato, mai blocca la risposta al cliente.
import { createHash } from 'node:crypto';
import { normalizza } from './engine/text.js';

export function chiaveDomanda(testo) {
  const n = normalizza(String(testo || '')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return n ? createHash('sha256').update(n).digest('hex').slice(0, 32) : '';
}

// Quando una risposta è una "lacuna": il bot non aveva una FAQ/dato per rispondere
// o non ha capito la richiesta. Null = non è una lacuna.
export function tipoLacuna(azione) {
  if (!azione) return null;
  if (azione.action === 'answer_information' && azione.reason === 'informazione') return 'informazione';
  if (azione.action === 'human_handoff' && azione.reason === 'non_compreso') return 'non_compreso';
  return null;
}

export async function registraLacuna(ctx, { cliente_id, domanda, tipo, intent }) {
  try {
    const f = ctx.fetchImpl || fetch;
    const chiave = chiaveDomanda(domanda);
    if (!chiave || !tipo) return false;
    const cid = encodeURIComponent(cliente_id);
    const r = await f(`${ctx.SUPABASE_URL}/rest/v1/lacune_conoscenza?cliente_id=eq.${cid}&chiave=eq.${chiave}&select=id,volte`, { headers: ctx.headers });
    const esistenti = await r.json();
    const ora = new Date().toISOString();
    if (Array.isArray(esistenti) && esistenti[0]) {
      await f(`${ctx.SUPABASE_URL}/rest/v1/lacune_conoscenza?id=eq.${esistenti[0].id}&cliente_id=eq.${cid}`, {
        method: 'PATCH', headers: ctx.headers, body: JSON.stringify({ volte: (esistenti[0].volte || 1) + 1, ultimo_il: ora, stato: 'aperta' }),
      });
    } else {
      await f(`${ctx.SUPABASE_URL}/rest/v1/lacune_conoscenza`, {
        method: 'POST', headers: ctx.headers,
        body: JSON.stringify({ cliente_id, chiave, domanda: String(domanda).slice(0, 200), tipo, intent: intent || null }),
      });
    }
    return true;
  } catch (e) {
    console.error('Registro lacune non aggiornato:', e);
    return false;
  }
}

export async function elencoLacune(ctx, cliente_id, limite = 8) {
  try {
    const r = await (ctx.fetchImpl || fetch)(
      `${ctx.SUPABASE_URL}/rest/v1/lacune_conoscenza?cliente_id=eq.${encodeURIComponent(cliente_id)}&stato=eq.aperta&select=id,domanda,tipo,volte,ultimo_il&order=volte.desc,ultimo_il.desc&limit=${limite}`,
      { headers: ctx.headers }
    );
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

export async function risolviLacuna(ctx, { cliente_id, id }) {
  try {
    await (ctx.fetchImpl || fetch)(
      `${ctx.SUPABASE_URL}/rest/v1/lacune_conoscenza?id=eq.${encodeURIComponent(id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
      { method: 'PATCH', headers: ctx.headers, body: JSON.stringify({ stato: 'risolta' }) }
    );
    return true;
  } catch { return false; }
}
