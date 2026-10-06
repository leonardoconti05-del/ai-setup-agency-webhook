// lib/engine/pubblica.js
//
// Carica un Sector Pack (profilo + FAQ + valutazione offline) nel database via REST
// con la service key, senza incollare SQL. Stesse regole dello script pubblica-pack:
//  - il profilo entra in stato 'test'; se esiste già come 'production'/'approved' NON viene sovrascritto;
//  - la valutazione è quella deterministica (lib/engine/evaluate.js) e la registra;
//  - la promozione a 'production' è opzionale e il database la rifiuta se il gate non è superato.
import { validaPack, costruisciIndice } from './pack.js';
import { valutaPack } from './evaluate.js';
import { caricaDefinizionePack } from './packs/registro.js';

async function rest(ctx, path, opzioni = {}) {
  const r = await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/${path}`, { ...opzioni, headers: { ...ctx.headers, ...(opzioni.headers || {}) } });
  const testo = await r.text();
  let json = null;
  try { json = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
  if (!r.ok) throw new Error(`${opzioni.method || 'GET'} ${path.split('?')[0]}: HTTP ${r.status} ${testo.slice(0, 200)}`);
  return json;
}

export async function pubblicaPack(ctx, settore, { promuovi = false } = {}) {
  const def = await caricaDefinizionePack(settore);
  if (!def) return { ok: false, settore, errore: 'settore sconosciuto' };
  const { pack, faq, scenari, VERSIONE, CHANGELOG } = def;
  const v = validaPack(pack);
  if (!v.ok) return { ok: false, settore, errore: 'pack non valido', dettagli: v.errori };
  const ev = valutaPack({ pack, indice: costruisciIndice(pack, faq), scenari });
  const out = { ok: true, settore, version: VERSIONE, scenari: `${ev.passati}/${ev.totale}`, gate_passed: ev.gate_passed, faq: faq.length };

  const sid = encodeURIComponent(settore);
  const esistente = (await rest(ctx, `sector_profiles?settore=eq.${sid}&version=eq.${VERSIONE}&select=id,status`))?.[0];
  let id;
  if (esistente && !['draft', 'test'].includes(esistente.status)) {
    id = esistente.id;
    out.profilo = `già ${esistente.status}: non sovrascritto`;
  } else if (esistente) {
    await rest(ctx, `sector_profiles?id=eq.${esistente.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ pack, changelog: CHANGELOG || '' }) });
    id = esistente.id;
    out.profilo = 'aggiornato (test)';
  } else {
    const nuovo = await rest(ctx, 'sector_profiles', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ settore, version: VERSIONE, status: 'test', pack, changelog: CHANGELOG || '' }) });
    id = nuovo[0].id;
    out.profilo = 'creato (test)';
  }

  // FAQ e valutazione solo se il profilo non è già in uso in produzione.
  if (!esistente || ['draft', 'test'].includes(esistente.status)) {
    await rest(ctx, `sector_faq?settore=eq.${sid}&version=eq.${VERSIONE}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    await rest(ctx, 'sector_faq', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(faq.map((f) => ({ settore, version: VERSIONE, status: 'production', intent: f.intent || null, domanda_canonica: f.domanda_canonica, varianti: f.varianti || [], risposta_base: f.risposta_base, condizioni: f.condizioni || {} }))),
    });
    await rest(ctx, 'sector_eval_runs', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ profile_id: id, settore, version: VERSIONE, scenari_totali: ev.totale, scenari_passati: ev.passati, metriche: ev.metriche, gate_passed: ev.gate_passed, note: 'Valutazione offline deterministica (lib/engine/evaluate.js). Non misura la qualità del testo LLM.' }),
    });
  }

  if (promuovi) {
    if (!ev.gate_passed) return { ...out, ok: false, errore: 'gate non superato: promozione non eseguita' };
    await rest(ctx, `sector_profiles?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'production' }) });
    await rest(ctx, `sector_faq?settore=eq.${sid}&version=eq.${VERSIONE}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'production' }) });
    out.promosso = true;
  }
  return out;
}
