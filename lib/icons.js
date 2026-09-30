// lib/icons.js
//
// Set minimale di icone SVG inline (stile lineare, un solo tratto, nessun
// riempimento) per sostituire le emoji nell'interfaccia — usate finora come
// scorciatoia rapida ma che danno un'impressione poco professionale
// ("un gioco", come segnalato esplicitamente) a un software gestionale.
//
// Deliberatamente NON un pacchetto icone esterno (Font Awesome, Lucide via
// CDN...): niente dipendenza di rete in più da caricare ad ogni pagina,
// coerenza visiva garantita (stesso tratto, stesso spessore, stesso stile
// ovunque), e zero rischio che una CDN esterna sia irraggiungibile e rompa
// il layout. Ogni icona è un singolo <svg>, currentColor eredita il colore
// del testo circostante — nessuna gestione colore separata da fare pagina
// per pagina.

const PERCORSI = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.6 5.6 0 0 1 11 0"/><path d="M15.2 5.5a3.2 3.2 0 0 1 0 6.2"/><path d="M15 14a5.6 5.6 0 0 1 5.5 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.2l2.6 2.6L16.2 9"/>',
  alert: '<path d="M12 4 21.5 20h-19Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  folder: '<path d="M3.5 6.5a1 1 0 0 1 1-1H10l2 2.5h7.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1Z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  repeat: '<path d="M4 7.5h11.5a3.5 3.5 0 0 1 3.5 3.5v1"/><path d="M7 4.5 4 7.5l3 3"/><path d="M20 16.5H8.5A3.5 3.5 0 0 1 5 13v-1"/><path d="M17 19.5l3-3-3-3"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5Z"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  activity: '<path d="M3 12h4l2.2 6L14 6l2.2 6H21"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  building: '<rect x="4.5" y="3.5" width="11" height="17" rx="1"/><path d="M15.5 9.5H19a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H8" /><path d="M8 7.5h3M8 11h3M8 14.5h3"/>',
  wallet: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h13a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 18 19H5a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M15 12.3a1.3 1.3 0 1 0 0 .1Z"/><path d="M3.5 9.5h17"/>',
  sparkle: '<path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7 10.4 12.2 5 10.6 10.4 9Z"/>',
  phone: '<path d="M6 3.5h3.2l1.3 4.5-2.3 1.8a11.5 11.5 0 0 0 5.5 5.5l1.8-2.3 4.5 1.3V18a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4.5 5.1 1.5 1.5 0 0 1 6 3.5Z"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6.5M6.5 6.5 7.3 19a1.3 1.3 0 0 0 1.3 1.2h6.8a1.3 1.3 0 0 0 1.3-1.2l.8-12.5"/>',
  plus: '<path d="M12 4.5v15M4.5 12h15"/>',
  arrowRight: '<path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5"/>',
  list: '<path d="M8.5 6h11M8.5 12h11M8.5 18h11"/><circle cx="4.2" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="18" r="1" fill="currentColor" stroke="none"/>',
  chevronDown: '<path d="M5.5 8.5 12 15l6.5-6.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',
};

export function icon(nome, { size = 18, strokeWidth = 1.75, className = 'icona-ui' } = {}) {
  const contenuto = PERCORSI[nome];
  if (!contenuto) return '';
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenuto}</svg>`;
}
