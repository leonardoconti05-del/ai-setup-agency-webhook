// api/cron/follow-up.js
//
// Follow-up automatici per lead non convertiti (migrations/006_follow_up.sql).
// Chiamato una volta al giorno da Vercel Cron (vedi vercel.json — limite del
// piano Vercel Hobby: cron job più frequenti di 1/giorno falliscono il
// deploy). Non è un problema funzionale: la logica sotto controlla comunque
// ore trascorse e fascia oraria consentita ad ogni esecuzione, quindi un
// solo passaggio al giorno (fissato dentro l'orario 09:00-19:00) basta a
// individuare e inviare tutti i follow-up dovuti. Per ogni cliente con
// follow_up_attivo = true, cerca le richieste
// ferme allo stato "in_corso" da abbastanza tempo e invia un messaggio
// WhatsApp proattivo (non una risposta a un messaggio in arrivo: qui
// chiamiamo direttamente l'API REST di Twilio per l'invio).
//
// Sicurezza per design, non solo per accessorietà:
// - Protetto da CRON_SECRET (stesso pattern raccomandato da Vercel per i
//   cron job: senza il secret configurato, l'endpoint rifiuta tutto).
// - Opt-in esplicito per cliente (follow_up_attivo, default false).
// - Limite massimo di messaggi per conversazione (follow_up_max_messaggi).
// - Fascia oraria consentita (follow_up_orario_da/a).
// - STOP automatico: se il cliente risponde nel frattempo, api/whatsapp.js
//   azzera il contatore (_follow_up_count) e questo cron non lo considera
//   più "in attesa di follow-up" per il ciclo attuale, dato che la
//   condizione ottimistica su updated_at fallisce se la riga è cambiata
//   dopo la lettura.
//
// IMPORTANTE — finestra delle 24 ore di WhatsApp:
// WhatsApp/Meta permette a un'azienda di scrivere per prima a un cliente con
// testo libero SOLO entro 24 ore dall'ultimo messaggio ricevuto da quel
// cliente. Il follow-up per definizione scatta dopo un periodo di silenzio
// (default 24 ore), quindi nella maggior parte dei casi finisce FUORI da
// quella finestra: un invio con "Body" libero verrebbe rifiutato da Twilio
// (errore 63016). Per questo, se è configurato TWILIO_CONTENT_SID_FOLLOWUP
// (il Content SID di un template WhatsApp pre-approvato da Meta, con una
// sola variabile {{1}} = nome attività), il messaggio viene inviato tramite
// quel template invece che come testo libero — funziona anche fuori dalla
// finestra. Senza questa variabile configurata, il cron usa comunque il
// testo libero come fallback (utile solo per test entro le 24 ore) e logga
// chiaramente l'errore 63016 quando Twilio lo rifiuta, invece di fallire in
// modo silenzioso. Istruzioni per creare il template: docs/DECISIONS.md.

import { creaRequestId, logEvento } from '../../lib/logger.js';
import { caricaPolicy, valutaAzione, POLICY_VERSION } from '../../lib/governance/policy.js';
import { registra as registraLedger, riferimentoSoggetto } from '../../lib/governance/ledger.js';

const MESSAGGIO_DEFAULT = (nomeAttivita) =>
  `Ciao! Siamo ancora a disposizione per la sua richiesta a ${nomeAttivita}. Se ha bisogno di altro tempo o ha domande, scriva pure qui.`;

// nomeAttivita è sempre passato: serve sia per il testo libero di fallback
// sia come variabile {{1}} del template approvato, quando configurato.
async function inviaMessaggioWhatsApp(numeroDa, numeroA, testo, nomeAttivita) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN mancanti: impossibile inviare messaggi proattivi.');
  }
  const contentSid = process.env.TWILIO_CONTENT_SID_FOLLOWUP;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const parametri = { From: `whatsapp:${numeroDa}`, To: `whatsapp:${numeroA}` };
  if (contentSid) {
    // Template WhatsApp pre-approvato: valido anche fuori dalla finestra
    // delle 24 ore. Il testo effettivo lo decide il template approvato da
    // Meta, non il campo "testo" qui passato — per questo un eventuale
    // messaggio personalizzato per cliente (follow_up_messaggio) non viene
    // usato in questa modalità (vedi nota in docs/DECISIONS.md).
    parametri.ContentSid = contentSid;
    parametri.ContentVariables = JSON.stringify({ '1': nomeAttivita });
  } else {
    // Fallback: testo libero, valido solo entro 24 ore dall'ultimo
    // messaggio del cliente. Fuori da quella finestra Twilio risponde con
    // l'errore 63016, gestito esplicitamente dal chiamante.
    parametri.Body = testo;
  }
  const body = new URLSearchParams(parametri);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    if (data && Number(data.code) === 63016) {
      throw new Error(
        'Twilio ha rifiutato il messaggio (errore 63016): fuori dalla finestra delle 24 ore e nessun template ' +
        'approvato configurato. Imposta TWILIO_CONTENT_SID_FOLLOWUP con il Content SID di un template WhatsApp ' +
        'approvato da Meta — vedi docs/DECISIONS.md.'
      );
    }
    throw new Error(`Errore invio Twilio (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// Confronta l'ora attuale (fuso Europe/Rome) con la fascia consentita.
// oraDa/oraA arrivano da Postgres come stringhe "HH:MM:SS".
function dentroOrarioConsentito(oraDa, oraA) {
  const adesso = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false });
  const da = String(oraDa || '09:00').slice(0, 5);
  const a = String(oraA || '19:00').slice(0, 5);
  return adesso >= da && adesso <= a;
}

export default async function handler(req, res) {
  // ===== Protezione: solo Vercel Cron (o chi conosce CRON_SECRET) =====
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    console.error('CRON_SECRET non configurato: endpoint rifiutato per sicurezza (fail-closed, stesso principio già usato per TWILIO_AUTH_TOKEN in api/whatsapp.js).');
    return res.status(500).json({ error: 'Server misconfigured: CRON_SECRET missing' });
  }
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  const riepilogo = { clientiEsaminati: 0, richiesteEsaminate: 0, inviati: 0, saltati: 0, saltatiPolicy: 0, errori: 0 };

  try {
    // 1. Clienti con follow-up attivo (opt-in esplicito)
    const clientiRes = await fetch(
      `${SUPABASE_URL}/rest/v1/configurazioni_cliente?follow_up_attivo=eq.true&select=cliente_id,numero_whatsapp,nome_attivita,follow_up_dopo_ore,follow_up_max_messaggi,follow_up_orario_da,follow_up_orario_a,follow_up_messaggio`,
      { headers }
    );
    const clienti = await clientiRes.json();
    if (!Array.isArray(clienti)) {
      console.error('Errore lettura configurazioni_cliente per follow-up:', JSON.stringify(clienti));
      return res.status(500).json({ error: 'Errore lettura configurazione clienti' });
    }
    riepilogo.clientiEsaminati = clienti.length;

    for (const config of clienti) {
      if (!dentroOrarioConsentito(config.follow_up_orario_da, config.follow_up_orario_a)) {
        continue; // fuori fascia oraria per questo cliente: riprovare al prossimo ciclo
      }

      // Autonomia decisa dal titolare: se non ha dato il livello per i follow-up
      // automatici (livello < 3, oppure 4 = solo con approvazione) non si invia nulla.
      // Senza righe in tenant_action_policy vale il default storico (invia).
      const ctxGov = { SUPABASE_URL, headers };
      const policyRows = await caricaPolicy(ctxGov, config.cliente_id);
      const policyFollowUp = policyRows.find((r) => r.agent_id === 'followup' && r.action === 'send_followup');
      // Explicit tenant policy is mandatory for autonomous follow-up.
      // Only autonomy 3 or 5 may execute without approval; 0-2 are proposal-only
      // and 4 requires approval, which this cron cannot satisfy.
      const autonomiaFollowUp = policyFollowUp ? Number(policyFollowUp.autonomy_level) : null;
      if (!policyFollowUp || !Number.isInteger(autonomiaFollowUp) || ![3, 5].includes(autonomiaFollowUp)) {
        riepilogo.saltatiPolicy++;
        continue;
      }
      const polFollowUp = {
        livello: autonomiaFollowUp,
        esegue: true,
        motivo: 'policy_tenant',
        policy_version: POLICY_VERSION,
      };

      // 2. Richieste "in_corso" (lead non convertito) di questo cliente
      const richiesteRes = await fetch(
        `${SUPABASE_URL}/rest/v1/richieste_clienti?cliente_id=eq.${encodeURIComponent(config.cliente_id)}&stato=eq.in_corso&select=id,numero_utente,dati_raccolti,updated_at`,
        { headers }
      );
      const richieste = await richiesteRes.json();
      if (!Array.isArray(richieste)) continue;
      riepilogo.richiesteEsaminate += richieste.length;

      for (const richiesta of richieste) {
        const dati = richiesta.dati_raccolti || {};
        const conteggioAttuale = Number(dati._follow_up_count) || 0;

        if (conteggioAttuale >= config.follow_up_max_messaggi) {
          riepilogo.saltati++;
          continue; // già inviati tutti i follow-up consentiti per questa richiesta
        }

        // Riferimento temporale: l'ultimo follow-up se già inviato, altrimenti
        // l'ultimo aggiornamento reale della conversazione (ultima attività
        // del cliente). Così ogni follow-up rispetta lo stesso intervallo
        // dal precedente, non solo dal primo silenzio.
        const riferimento = dati._ultimo_follow_up_il || richiesta.updated_at;
        const oreTrascorse = (Date.now() - new Date(riferimento).getTime()) / (1000 * 60 * 60);
        if (oreTrascorse < config.follow_up_dopo_ore) {
          riepilogo.saltati++;
          continue; // non ancora il momento
        }

        const requestId = creaRequestId();
        try {
          const testo = (config.follow_up_messaggio && config.follow_up_messaggio.trim())
            || MESSAGGIO_DEFAULT(config.nome_attivita || 'la nostra attività');

          await inviaMessaggioWhatsApp(
            config.numero_whatsapp,
            richiesta.numero_utente,
            testo,
            config.nome_attivita || 'la nostra attività'
          );

          // Scrittura condizionata: se la richiesta è stata modificata dopo
          // la lettura (es. il cliente ha appena risposto), questa PATCH non
          // trova righe da aggiornare e falliamo silenziosamente qui sotto
          // invece di sovrascrivere una conversazione già ripresa — stesso
          // principio del lock ottimistico già usato in api/whatsapp.js.
          const nuoviDati = {
            ...dati,
            _follow_up_count: conteggioAttuale + 1,
            _ultimo_follow_up_il: new Date().toISOString(),
          };
          const patchRes = await fetch(
            `${SUPABASE_URL}/rest/v1/richieste_clienti?id=eq.${encodeURIComponent(richiesta.id)}&stato=eq.in_corso&updated_at=eq.${encodeURIComponent(richiesta.updated_at)}`,
            {
              method: 'PATCH',
              headers: { ...headers, Prefer: 'return=representation' },
              body: JSON.stringify({ dati_raccolti: nuoviDati }),
            }
          );
          const patched = await patchRes.json().catch(() => []);
          const scritturaRiuscita = Array.isArray(patched) && patched.length > 0;

          await logEvento({
            SUPABASE_URL, headers, requestId,
            clienteId: config.cliente_id, telefono: richiesta.numero_utente,
            fase: 'follow_up_inviato',
            stato: scritturaRiuscita ? 'ok' : 'errore',
            dettaglio: { numeroFollowUp: conteggioAttuale + 1, conflittoConcorrenza: !scritturaRiuscita },
          });

          if (scritturaRiuscita) {
            await registraLedger(ctxGov, {
              cliente_id: config.cliente_id, request_id: requestId, actor: 'agent:followup', action: 'followup_sent',
              autonomy_level: polFollowUp.livello, approval: 'not_required', reason: `follow_up_${conteggioAttuale + 1}`,
              subject_ref: riferimentoSoggetto(config.cliente_id, richiesta.numero_utente), policy_version: POLICY_VERSION,
            });
          }
          if (scritturaRiuscita) riepilogo.inviati++;
          else riepilogo.saltati++;
        } catch (e) {
          console.error(`Errore invio follow-up per richiesta ${richiesta.id}:`, e);
          await logEvento({
            SUPABASE_URL, headers, requestId,
            clienteId: config.cliente_id, telefono: richiesta.numero_utente,
            fase: 'follow_up_inviato', stato: 'errore', dettaglio: { errore: String(e.message || e) },
          });
          riepilogo.errori++;
        }
      }
    }

    return res.status(200).json(riepilogo);
  } catch (err) {
    console.error('Errore generale nel cron follow-up:', err);
    return res.status(500).json({ error: 'Errore interno', dettaglio: String(err.message || err) });
  }
}
