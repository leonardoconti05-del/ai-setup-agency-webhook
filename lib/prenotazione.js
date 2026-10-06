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
