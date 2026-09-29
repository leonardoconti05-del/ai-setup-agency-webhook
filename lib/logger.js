// lib/logger.js
//
// Log di osservabilità per il webhook WhatsApp (api/whatsapp.js). Ogni
// richiesta in ingresso riceve un request_id univoco tramite creaRequestId();
// logEvento() scrive una riga in event_log (migrations/004_observability.sql)
// per ogni fase significativa dell'elaborazione, con lo stesso request_id —
// così un singolo messaggio è ricostruibile dall'inizio alla fine.
//
// Scrittura SEMPRE "best-effort": un errore nel logging non deve mai far
// fallire l'elaborazione del messaggio reale (stesso principio già usato
// per notificaStaff in api/whatsapp.js — il log è un side-effect, non un
// requisito per rispondere al cliente).

import crypto from 'crypto';

export function creaRequestId() {
  return crypto.randomUUID();
}

// { SUPABASE_URL, headers } sono gli stessi già usati per le altre chiamate
// Supabase nel file chiamante — nessuna nuova configurazione richiesta.
export async function logEvento({ SUPABASE_URL, headers, requestId, clienteId, telefono, fase, stato = 'ok', dettaglio }) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/event_log`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        request_id: requestId,
        cliente_id: clienteId || null,
        telefono: telefono || null,
        fase,
        stato,
        dettaglio: dettaglio ?? null,
      }),
    });
  } catch (e) {
    // Non rilanciare mai: il logging non deve mai interrompere il flusso
    // principale di risposta al cliente su WhatsApp.
    console.error(`Errore scrittura event_log (fase=${fase}):`, e);
  }
}
