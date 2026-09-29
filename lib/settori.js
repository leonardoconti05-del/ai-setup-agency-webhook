// lib/settori.js
//
// Mappa puramente di presentazione (nessuna tabella nuova): per ogni
// "settore" già presente in configurazioni_cliente.settore, definisce
// icona ed etichette usate nella dashboard cliente, così il gestionale
// parla il linguaggio giusto per ogni tipo di attività (un dentista ha
// "pazienti" e "visite", un elettricista ha "clienti" e "interventi").
//
// Coerenza: i valori di "settore" qui mappati sono quelli realmente in uso
// su configurazioni_cliente al 30/9/2026 (verificato via query diretta).
// Un settore non presente in questa mappa usa DEFAULT — non deve mai
// rompere la dashboard, solo mostrare etichette generiche.

const DEFAULT = { icona: '🏢', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' };

export const SETTORI = {
  dentista: { icona: '🦷', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Visita', eventoPlurale: 'Visite' },
  medico: { icona: '🩺', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Visita', eventoPlurale: 'Visite' },
  veterinario: { icona: '🐾', cliente: 'Paziente', clientiPlurale: 'Pazienti (animali)', evento: 'Visita', eventoPlurale: 'Visite' },
  fisioterapista: { icona: '🏃', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Seduta', eventoPlurale: 'Sedute' },
  estetista: { icona: '💆', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Trattamento', eventoPlurale: 'Trattamenti' },
  parrucchiere: { icona: '💇', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' },
  palestra_personal_trainer: { icona: '🏋️', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Sessione', eventoPlurale: 'Sessioni' },
  elettricista: { icona: '⚡', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  fabbro: { icona: '🔧', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  imbianchino: { icona: '🎨', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Lavoro', eventoPlurale: 'Lavori' },
  giardiniere: { icona: '🌳', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  autofficina: { icona: '🔩', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  carrozzeria: { icona: '🚗', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  gommista: { icona: '🛞', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  traslochi: { icona: '📦', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Trasloco', eventoPlurale: 'Traslochi' },
  pulizie: { icona: '🧹', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  avvocato: { icona: '⚖️', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  commercialista: { icona: '📊', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  consulente: { icona: '💼', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  amministratore_condominio: { icona: '🏘️', cliente: 'Condominio', clientiPlurale: 'Condomini', evento: 'Richiesta', eventoPlurale: 'Richieste' },
  immobiliare: { icona: '🏠', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' },
  agenzia_web_grafica: { icona: '💻', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Progetto', eventoPlurale: 'Progetti' },
  fotografo_videomaker: { icona: '📷', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Servizio', eventoPlurale: 'Servizi fotografici' },
  organizzazione_eventi: { icona: '🎉', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Evento', eventoPlurale: 'Eventi' },
  bar_caffetteria: { icona: '☕', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Prenotazione', eventoPlurale: 'Prenotazioni' },
  ristorante: { icona: '🍽️', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Prenotazione', eventoPlurale: 'Prenotazioni' },
  noleggio: { icona: '🚙', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Noleggio', eventoPlurale: 'Noleggi' },
  scuola_guida: { icona: '🚦', cliente: 'Allievo', clientiPlurale: 'Allievi', evento: 'Lezione', eventoPlurale: 'Lezioni' },
  centro_corsi: { icona: '📚', cliente: 'Iscritto', clientiPlurale: 'Iscritti', evento: 'Lezione', eventoPlurale: 'Lezioni' },
};

export function etichetteSettore(settore) {
  return SETTORI[settore] || DEFAULT;
}

// Etichetta leggibile del settore stesso (es. "agenzia_web_grafica" -> "Agenzia Web & Grafica").
export function nomeSettore(settore) {
  if (!settore) return 'Altro';
  return String(settore)
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
