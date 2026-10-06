// lib/governance/esegui-approvata.js
//
// Decisione del titolare su una richiesta di approvazione + esecuzione
// dell'azione approvata. Garanzie:
//  - la richiesta si decide UNA sola volta (risolviApprovazione filtra stato=pending),
//    quindi un doppio click non esegue due volte;
//  - tutto filtrato per cliente_id preso dalla sessione, mai dal client;
//  - un'azione sconosciuta viene approvata ma NON eseguita (deny-by-default);
//  - ogni decisione ed esecuzione finisce nel ledger (senza testo del cliente);
//  - se l'esecuzione fallisce l'esito lo dice: il titolare non vede un falso "fatto".

import { risolviApprovazione } from './approvazioni.js';
import { registra, riferimentoSoggetto, hashTesto } from './ledger.js';
import { creaEvento as creaEventoGoogle } from '../google-calendar.js';

const pulisciNumero = (n) => String(n || '').replace('whatsapp:', '');

async function inviaWhatsApp({ fetchImpl = fetch, env = process.env }, { da, a, testo }) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Credenziali Twilio mancanti');
  const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: `whatsapp:${pulisciNumero(da)}`, To: `whatsapp:${pulisciNumero(a)}`, Body: testo }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}`);
}

async function get(ctx, path) {
  const r = await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/${path}`, { headers: ctx.headers });
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

const quando = (iso) => new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

export async function eseguiAzioneApprovata(ctx, richiesta, deps = {}) {
  const { cliente_id } = richiesta;
  const payload = richiesta.payload || {};
  const cid = encodeURIComponent(cliente_id);
  const invia = deps.inviaWhatsApp || ((p) => inviaWhatsApp(ctx, p));
  const creaEvento = deps.creaEvento || creaEventoGoogle;

  const [config] = await get(ctx, `configurazioni_cliente?cliente_id=eq.${cid}&select=numero_whatsapp,google_calendar_id,clienti(nome_attivita)`);
  if (!config) return { ok: false, esito: 'configurazione tenant non trovata' };
  const numero = payload.numero_utente;
  if (!numero) return { ok: false, esito: 'richiesta priva del numero del cliente' };

  if (richiesta.action === 'reply') {
    if (!payload.bozza) return { ok: false, esito: 'bozza mancante' };
    await invia({ da: config.numero_whatsapp, a: numero, testo: payload.bozza });
    return { ok: true, esito: 'risposta inviata al cliente' };
  }

  if (richiesta.action === 'create_calendar_event') {
    if (!config.google_calendar_id) return { ok: false, esito: 'calendario non collegato' };
    const [rc] = await get(ctx, `richieste_clienti?cliente_id=eq.${cid}&numero_utente=eq.${encodeURIComponent(numero)}&select=dati_raccolti`);
    const dati = rc?.dati_raccolti || {};
    const slot = { inizio: new Date(payload.inizio), fine: new Date(payload.fine) };
    if (Number.isNaN(slot.inizio.getTime())) return { ok: false, esito: 'orario non valido' };
    const evento = await creaEvento(config.google_calendar_id, slot, dati, config.clienti?.nome_attivita || 'Attività');
    if (evento?.error) return { ok: false, esito: 'Google Calendar ha rifiutato l\'evento' };
    await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/richieste_clienti?cliente_id=eq.${cid}&numero_utente=eq.${encodeURIComponent(numero)}`, {
      method: 'PATCH', headers: ctx.headers,
      body: JSON.stringify({ dati_raccolti: { ...dati, _fase: 'confermato', _appuntamento_inizio: slot.inizio.toISOString() }, updated_at: new Date().toISOString() }),
    });
    let avviso = 'evento creato';
    try {
      await invia({ da: config.numero_whatsapp, a: numero, testo: `Appuntamento confermato per ${quando(slot.inizio)}. A presto!` });
      avviso += ' e cliente avvisato';
    } catch (e) {
      avviso += ' (cliente NON avvisato: ' + String(e.message || e) + ')';
    }
    return { ok: true, esito: avviso };
  }

  return { ok: false, esito: `azione "${richiesta.action}" approvata ma non eseguibile automaticamente` };
}

async function riapri(ctx, richiesta, errore) {
  try {
    await (ctx.fetchImpl || fetch)(
      `${ctx.SUPABASE_URL}/rest/v1/approval_requests?id=eq.${encodeURIComponent(richiesta.id)}&cliente_id=eq.${encodeURIComponent(richiesta.cliente_id)}&stato=eq.approved`,
      { method: 'PATCH', headers: ctx.headers, body: JSON.stringify({ stato: 'pending', decided_at: null, decided_by: null, payload: { ...(richiesta.payload || {}), ultimo_errore: String(errore).slice(0, 200) } }) }
    );
  } catch (e) {
    console.error('Errore riapertura richiesta di approvazione:', e);
  }
}

export async function decidiApprovazione(ctx, { cliente_id, id, decisione, decided_by = 'titolare' }, deps = {}) {
  const r = await risolviApprovazione(ctx, { cliente_id, id, decisione, decided_by });
  if (!r.ok) return r;
  const richiesta = r.richiesta;
  const base = {
    cliente_id, actor: `human:${decided_by}`, autonomy_level: 4,
    subject_ref: richiesta.payload?.numero_utente ? riferimentoSoggetto(cliente_id, richiesta.payload.numero_utente) : null,
  };
  const regLedger = (e) => (deps.registra || registra)(ctx, { ...base, ...e });
  if (decisione === 'rejected') {
    await regLedger({ action: `${richiesta.action}_rejected`, approval: 'rejected', reason: 'rifiutata dal titolare' });
    return { ok: true, richiesta, esito: 'rifiutata, nessuna azione eseguita' };
  }
  let esito;
  try {
    esito = await eseguiAzioneApprovata(ctx, richiesta, deps);
  } catch (e) {
    esito = { ok: false, esito: String(e.message || e) };
  }
  await regLedger({
    action: `${richiesta.action}_${esito.ok ? 'executed' : 'failed'}`, approval: 'approved',
    reason: esito.esito, input_hash: hashTesto(JSON.stringify(richiesta.payload || {})),
  });
  if (!esito.ok) {
    // Nulla è stato eseguito (i fallimenti avvengono prima di ogni effetto): la richiesta
    // torna in attesa con l'errore, così il titolare può riprovare o rifiutare.
    await riapri(ctx, richiesta, esito.esito);
  }
  return { ok: true, richiesta, eseguita: esito.ok, esito: esito.esito };
}

export async function elencoApprovazioniPending(ctx, cliente_id) {
  try {
    const r = await (ctx.fetchImpl || fetch)(
      `${ctx.SUPABASE_URL}/rest/v1/approval_requests?cliente_id=eq.${encodeURIComponent(cliente_id)}&stato=eq.pending&select=id,action,payload,created_at&order=created_at.asc&limit=50`,
      { headers: ctx.headers }
    );
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}
