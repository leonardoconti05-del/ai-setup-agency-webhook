// lib/settori.js
//
// Mappa puramente di presentazione (nessuna tabella nuova): per ogni
// "settore" già presente in configurazioni_cliente.settore, definisce
// il nome ufficiale da mostrare e le etichette usate nella dashboard
// cliente, così il gestionale parla il linguaggio giusto per ogni tipo
// di attività (un dentista ha "pazienti" e "visite", un elettricista ha
// "clienti" e "interventi").
//
// Coerenza: i valori di "settore" qui mappati sono quelli realmente in uso
// su configurazioni_cliente al 30/9/2026 (verificato via query diretta).
// Un settore non presente in questa mappa usa DEFAULT — non deve mai
// rompere la dashboard, solo mostrare etichette generiche.
//
// "nome" è scritto a mano (non derivato dalla chiave tecnica tipo
// "agenzia_web_grafica" -> "Agenzia Web Grafica") perché quel tipo di
// derivazione automatica produce etichette goffe — qui ogni settore ha
// un nome che userebbe davvero un'attività italiana di quel tipo.

const DEFAULT = { nome: 'Altra attività', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' };

export const SETTORI = {
  dentista: { nome: 'Studio Dentistico', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Visita', eventoPlurale: 'Visite' },
  medico: { nome: 'Studio Medico', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Visita', eventoPlurale: 'Visite' },
  veterinario: { nome: 'Clinica Veterinaria', cliente: 'Paziente', clientiPlurale: 'Pazienti (animali)', evento: 'Visita', eventoPlurale: 'Visite' },
  fisioterapista: { nome: 'Studio di Fisioterapia', cliente: 'Paziente', clientiPlurale: 'Pazienti', evento: 'Seduta', eventoPlurale: 'Sedute' },
  estetista: { nome: 'Centro Estetico', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Trattamento', eventoPlurale: 'Trattamenti' },
  parrucchiere: { nome: 'Salone di Acconciature', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' },
  palestra_personal_trainer: { nome: 'Palestra & Personal Training', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Sessione', eventoPlurale: 'Sessioni' },
  elettricista: { nome: 'Impresa Elettrica', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  fabbro: { nome: 'Fabbro', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  imbianchino: { nome: 'Imbiancatura & Decorazione', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Lavoro', eventoPlurale: 'Lavori' },
  giardiniere: { nome: 'Giardinaggio & Manutenzione Verde', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  autofficina: { nome: 'Autofficina', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  carrozzeria: { nome: 'Carrozzeria', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  gommista: { nome: 'Gommista', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  traslochi: { nome: 'Traslochi', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Trasloco', eventoPlurale: 'Traslochi' },
  pulizie: { nome: 'Servizi di Pulizia', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Intervento', eventoPlurale: 'Interventi' },
  avvocato: { nome: 'Studio Legale', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  commercialista: { nome: 'Studio Commercialista', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  consulente: { nome: 'Consulenza Professionale', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Consulenza', eventoPlurale: 'Consulenze' },
  amministratore_condominio: { nome: 'Amministrazione Condominiale', cliente: 'Condominio', clientiPlurale: 'Condomini', evento: 'Richiesta', eventoPlurale: 'Richieste' },
  immobiliare: { nome: 'Agenzia Immobiliare', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Appuntamento', eventoPlurale: 'Appuntamenti' },
  agenzia_web_grafica: { nome: 'Agenzia Web & Grafica', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Progetto', eventoPlurale: 'Progetti' },
  fotografo_videomaker: { nome: 'Fotografia & Videomaking', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Servizio', eventoPlurale: 'Servizi fotografici' },
  organizzazione_eventi: { nome: 'Organizzazione Eventi', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Evento', eventoPlurale: 'Eventi' },
  bar_caffetteria: { nome: 'Bar & Caffetteria', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Prenotazione', eventoPlurale: 'Prenotazioni' },
  ristorante: { nome: 'Ristorante', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Prenotazione', eventoPlurale: 'Prenotazioni' },
  noleggio: { nome: 'Noleggio', cliente: 'Cliente', clientiPlurale: 'Clienti', evento: 'Noleggio', eventoPlurale: 'Noleggi' },
  scuola_guida: { nome: 'Scuola Guida', cliente: 'Allievo', clientiPlurale: 'Allievi', evento: 'Lezione', eventoPlurale: 'Lezioni' },
  centro_corsi: { nome: 'Centro Corsi & Formazione', cliente: 'Iscritto', clientiPlurale: 'Iscritti', evento: 'Lezione', eventoPlurale: 'Lezioni' },
};

const CHIAVI_SETTORI = Object.keys(SETTORI);

export function etichetteSettore(settore) {
  return SETTORI[settore] || DEFAULT;
}

// Nome leggibile del settore. Usa il nome scritto a mano se il settore è
// mappato; altrimenti deriva un'etichetta leggibile dalla chiave grezza,
// così un valore imprevisto non rompe mai la pagina.
export function nomeSettore(settore) {
  if (!settore) return 'Altro';
  const mappato = SETTORI[settore];
  if (mappato) return mappato.nome;
  return String(settore)
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// Iniziali per il badge del settore (es. "Studio Dentistico" -> "SD").
export function inizialiSettore(settore) {
  const nome = nomeSettore(settore);
  const parole = nome.split(/[\s&]+/).filter(Boolean);
  if (parole.length === 0) return '?';
  if (parole.length === 1) return parole[0].slice(0, 2).toUpperCase();
  return (parole[0][0] + parole[1][0]).toUpperCase();
}

// Colore del badge: calcolato deterministicamente (stesso settore -> stesso
// colore sempre), non scelto a mano uno per uno — con 29 settori sarebbe
// facile finire con colori ripetuti o stonati. La tonalità (hue) è
// distribuita in modo uniforme sulla ruota cromatica in base alla
// posizione del settore nell'elenco; saturazione e luminosità sono fisse,
// scelte per restare leggibili con testo bianco sopra.
// Famiglia ristretta di colori attorno al teal di marca (#0E6E62, ~172°),
// non un arcobaleno a tutto spettro: i badge devono sembrare parte dello
// stesso sistema visivo, non 29 colori a caso. La variazione (tonalità +
// luminosità) basta a distinguere le voci in un elenco; le iniziali nel
// badge restano il vero elemento identificativo.
export function coloreSettore(settore) {
  const indice = settore && CHIAVI_SETTORI.includes(settore) ? CHIAVI_SETTORI.indexOf(settore) : CHIAVI_SETTORI.length;
  const totale = CHIAVI_SETTORI.length + 1; // +1 per lo slot "non impostato/sconosciuto"
  const hue = 150 + Math.round((indice * 42) / totale); // banda stretta 150°-192°
  const light = 30 + (indice % 4) * 6; // 30/36/42/48%, per variare senza uscire dalla famiglia
  return `hsl(${hue}, 38%, ${light}%)`;
}
