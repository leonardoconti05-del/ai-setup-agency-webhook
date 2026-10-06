// lib/retention.js
//
// Politica di conservazione dei dati. Principi:
//  - dati TECNICI (log, richieste di approvazione già decise, domande risolte): scadenza di default;
//  - dati dei CLIENTI FINALI (richieste_clienti: nome, conversazione): NESSUNA cancellazione
//    finché il titolare dell'agenzia non sceglie un periodo (variabile RETENTION_RICHIESTE_GIORNI,
//    minimo 30): è una scelta legale/commerciale, non tecnica;
//  - il registro azioni AI (ai_action_ledger) è append-only e non scade mai: non contiene testi dei clienti.
// Le date sono sempre calcolate dal server: nessun valore arriva dal client.

const GIORNO = 24 * 3600 * 1000;

function giorni(valore, predefinito, minimo) {
  if (valore === undefined || valore === null || String(valore).trim() === '') return predefinito;
  const n = Number(valore);
  if (!Number.isFinite(n) || n < minimo) return predefinito;
  return Math.floor(n);
}

export function pianoConservazione(env = process.env, adesso = Date.now()) {
  const taglio = (g) => new Date(adesso - g * GIORNO).toISOString();
  const gLog = giorni(env.RETENTION_LOG_GIORNI, 90, 7);
  const gApprov = giorni(env.RETENTION_APPROVAZIONI_GIORNI, 180, 30);
  const gLacune = giorni(env.RETENTION_LACUNE_GIORNI, 90, 7);
  const gRichieste = giorni(env.RETENTION_RICHIESTE_GIORNI, null, 30);
  const piano = [
    { nome: 'event_log', giorni: gLog, path: `event_log?created_at=lt.${taglio(gLog)}` },
    { nome: 'approval_requests', giorni: gApprov, path: `approval_requests?stato=neq.pending&created_at=lt.${taglio(gApprov)}` },
    { nome: 'lacune_conoscenza', giorni: gLacune, path: `lacune_conoscenza?stato=eq.risolta&ultimo_il=lt.${taglio(gLacune)}` },
  ];
  if (gRichieste) {
    piano.push({ nome: 'richieste_clienti', giorni: gRichieste, path: `richieste_clienti?updated_at=lt.${taglio(gRichieste)}` });
  }
  return piano;
}

export async function eseguiConservazione(ctx, env = process.env, adesso = Date.now()) {
  const f = ctx.fetchImpl || fetch;
  const esito = [];
  for (const p of pianoConservazione(env, adesso)) {
    try {
      const r = await f(`${ctx.SUPABASE_URL}/rest/v1/${p.path}`, { method: 'DELETE', headers: { ...ctx.headers, Prefer: 'return=representation' } });
      if (!r.ok) { esito.push({ tabella: p.nome, giorni: p.giorni, errore: `HTTP ${r.status}` }); continue; }
      const righe = await r.json();
      esito.push({ tabella: p.nome, giorni: p.giorni, eliminate: Array.isArray(righe) ? righe.length : 0 });
    } catch (e) {
      esito.push({ tabella: p.nome, giorni: p.giorni, errore: String(e.message || e) });
    }
  }
  return esito;
}
