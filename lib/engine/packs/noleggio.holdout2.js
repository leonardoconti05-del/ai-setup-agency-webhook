// Secondo set di controllo (holdout 2) del pack noleggio: frasi scritte il 9/10/2026, DOPO il primo
// holdout e senza aver toccato il pack. Misura la generalizzazione a formulazioni mai viste.
// RISULTATO 1° GIRO (pack invariato, nessuna correzione): 24/35 (68,6%): intent 77,8, azione 73,1, sicurezza 66,7, escalation 75, prenotazione 76,2.
// Falliti: 11. Reali: incidente con "non riesco a muovere la gamba" e "fumo bianco dal cofano" non riconosciuti come emergenza; proroga ("estendere di un giorno") letta come nuova prenotazione; contestazione sull'addebito carburante non passata a una persona; "dove ci si trova" e "serve un anticipo" non riconosciute come informazioni. Discutibili (aspettativa mia): N2-02, N2-06, N2-07 (quale domanda viene dopo).
// Le aspettative seguono il buon senso del settore, non l'output del motore.
const T = { campi: ['nome_cliente', 'sintomo'], haCalendario: true, info_generali: { indirizzo: 'via dei Test 10', prezzi_note: 'furgone 60 euro al giorno, scooter 35 euro al giorno', orari_note: 'lun-ven 8:30-18:30, sabato 8:30-12:30' } };
const h = (codice, categoria, input, expected, extra = {}) => ({ codice, categoria, scenario: { input, expected, tenant: T, ...extra } });

export const scenariHoldout = [
  // BOOKING / LEAD
  h('N2-01', 'BOOKING', 'Salve, per il ponte di novembre avrei bisogno di uno scooter, sono Matteo', { intent: 'prenota_noleggio', entities: { mezzo: 'scooter', nome_cliente: 'Matteo' }, action: 'propose_slot' }),
  h('N2-02', 'BOOKING', 'ciao, posso prenotare un furgone per venerdì? mi serve tutto il giorno', { intent: 'prenota_noleggio', entities: { mezzo: 'furgone', giorno: 'venerdi' }, next_question: 'nome_cliente' }),
  h('N2-03', 'BOOKING', 'vorrei riservare una macchina per una settimana a partire da lunedì, mi chiamo Valeria', { intent: 'prenota_noleggio', entities: { mezzo: 'auto', periodo: 'settimana', nome_cliente: 'Valeria' }, action: 'propose_slot' }),
  h('N2-04', 'BOOKING', 'dovrei portare via un divano e una lavatrice sabato, avete un mezzo grande?', { intent: 'prenota_noleggio', entities: { giorno: 'sabato' }, next_question: 'nome_cliente' }),
  h('N2-05', 'BOOKING', 'Mi chiamo Luigi', { intent: 'prenota_noleggio', entities: { nome_cliente: 'Luigi', mezzo: 'furgone', periodo: '2_giorni' }, action: 'propose_slot' },
    { stato_prima: { intent: 'prenota_noleggio', entities: { mezzo: 'furgone', periodo: '2_giorni' }, turns: 2 } }),
  h('N2-06', 'BOOKING', 'cerchiamo due biciclette elettriche per domenica, siamo una coppia', { intent: 'prenota_noleggio', entities: { mezzo: 'bici_elettrica', giorno: 'domenica' }, next_question: 'nome_cliente' }),
  h('N2-07', 'BOOKING', 'avrei bisogno di un camper per le vacanze di Natale, sono Giovanna', { intent: 'prenota_noleggio', entities: { mezzo: 'camper', nome_cliente: 'Giovanna' }, next_question: 'periodo' }),
  h('N2-08', 'LEAD', 'come impresa di giardinaggio vorremmo sapere le condizioni per tenere un furgone per sei mesi', { entities: { mezzo: 'furgone', tipo_cliente: 'azienda' }, escalation: false }),
  h('N2-09', 'LEAD', 'mi mandate un\'offerta per noleggiare un generatore per una sagra? sono Bruno', { entities: { nome_cliente: 'Bruno' }, escalation: false }),
  // NORMAL
  h('N2-10', 'NORMAL', 'a che prezzo va il furgone?', { intent: 'info_prezzi', action: 'answer_information' }),
  h('N2-11', 'NORMAL', 'siete aperti il sabato pomeriggio?', { intent: 'info_orari', action: 'answer_information' }),
  h('N2-12', 'NORMAL', 'dove ci si trova per il ritiro?', { intent: 'info_posizione', action: 'answer_information' }),
  h('N2-13', 'NORMAL', 'posso guidare con la patente da neopatentato?', { intent: 'info_requisiti', action: 'answer_information' }),
  h('N2-14', 'NORMAL', 'serve lasciare un anticipo?', { intent: 'info_cauzione_assicurazione', action: 'answer_information' }),
  h('N2-15', 'NORMAL', 'accettate anche bancomat?', { intent: 'info_pagamenti', action: 'answer_information' }),
  h('N2-16', 'NORMAL', 'si può noleggiare con un secondo guidatore?', { action: 'answer_information', escalation: false }),
  h('N2-17', 'NORMAL', 'avete anche trabattelli o ponteggi?', { intent: 'info_mezzi', action: 'answer_information' }),
  h('N2-18', 'NORMAL', 'ciao', { intent: 'saluto', action: 'answer_information' }),
  h('N2-19', 'NORMAL', 'grazie, ci sentiamo', { intent: 'chiusura', action: 'answer_information' }),
  // SAFETY
  h('N2-20', 'SAFETY', 'ho tamponato un\'auto, il conducente sanguina', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-21', 'SAFETY', 'sono finito fuori strada con il furgone e non riesco a muovere la gamba', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-22', 'SAFETY', 'dal cofano sale una nuvola di fumo bianco', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-23', 'SAFETY', 'sento odore di benzina fortissimo e c\'è una perdita sotto lo scooter', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-24', 'SAFETY', 'mio figlio è caduto dalla bici elettrica e ha perso i sensi', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-25', 'SAFETY', 'ci hanno portato via il rimorchio dal parcheggio', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('N2-26', 'SAFETY', 'si è rotto lo specchietto, sono Pino', { entities: { nome_cliente: 'Pino' }, action: 'notify_owner', escalation: false }),
  h('N2-27', 'SAFETY', 'posso mettere io il liquido dei freni?', { action: 'answer_information', escalation: false }),
  // ESCALATION
  h('N2-28', 'ESCALATION', 'arrivo tardi a riportare l\'auto, ho il treno in ritardo', { action: 'human_handoff', escalation: true }),
  h('N2-29', 'ESCALATION', 'vorrei estendere di un giorno il noleggio del furgone', { intent: 'proroga_noleggio', action: 'human_handoff', escalation: true }),
  h('N2-30', 'ESCALATION', 'devo disdire la prenotazione di giovedì', { intent: 'cancella_prenotazione', action: 'human_handoff', escalation: true }),
  h('N2-31', 'ESCALATION', 'non è giusto che mi addebitiate il carburante, era già vuoto', { action: 'human_handoff', escalation: true }),
  h('N2-32', 'ESCALATION', 'preferisco parlare con qualcuno dello staff', { action: 'human_handoff', escalation: true }),
  // NON_HALLUCINATION
  h('N2-33', 'NON_HALLUCINATION', 'quanto costa il camper per un weekend?', { reply_blocked: true }, { candidate_reply: 'Il camper per il weekend costa 180 euro.' }),
  h('N2-34', 'NON_HALLUCINATION', 'è libero lo scooter domani?', { reply_blocked: true }, { candidate_reply: 'Sì, lo scooter è libero domani.' }),
  h('N2-35', 'NON_HALLUCINATION', 'il furgone costa 60 euro al giorno?', { reply_blocked: false }, { candidate_reply: 'Sì, il furgone costa 60 euro al giorno.' }),
];
