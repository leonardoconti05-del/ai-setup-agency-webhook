// lib/prenotazione.js
//
// Quando proporre gli slot a un cliente che ha già un appuntamento confermato.
// Regola prudente: un secondo appuntamento si propone solo se il precedente è
// GIÀ PASSATO e il messaggio di questo turno chiede davvero una prenotazione
// (non un "grazie"). Se il precedente è ancora futuro, o non ha una data
// salvata (conferme anteriori al fix), resta il comportamento storico: nessun
// nuovo slot automatico, decide una persona.

export function puoProporreSlot({ fase, appuntamentoInizio, nuovaPrenotazione, adesso = Date.now() }) {
  if (fase !== 'confermato') return true;
  if (!nuovaPrenotazione || !appuntamentoInizio) return false;
  const t = Date.parse(appuntamentoInizio);
  return Number.isFinite(t) && t < adesso;
}

// Cliente con un appuntamento confermato ancora futuro: invece di una frase
// generica (o di una risposta libera del modello) gli ricordiamo l'appuntamento
// che risulta, scritto da noi con i dati salvati. Null = non si applica.
export function rispostaAppuntamentoEsistente({ fase, appuntamentoInizio, nome, adesso = Date.now() }) {
  if (fase !== 'confermato' || !appuntamentoInizio) return null;
  const t = Date.parse(appuntamentoInizio);
  if (!Number.isFinite(t) || t <= adesso) return null;
  const quando = new Date(t).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const saluto = nome ? `Ciao ${nome}, r` : 'R';
  return `${saluto}isulta già un suo appuntamento per ${quando}. Se desidera spostarlo o prenotarne un altro, lo comunico allo studio che la ricontatterà.`;
}
