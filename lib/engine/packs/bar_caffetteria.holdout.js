// Set di controllo (holdout) del Sector Pack bar_caffetteria: formulazioni
// scritte DOPO aver congelato il pack sul set principale, mai usate per
// correggere le regole. Il primo giro (prima di qualunque correzione) va
// annotato nel report; eventuali fix successivi sono solo regole generali.
const T = { campi: ['nome_cliente'], haCalendario: true, info_generali: { indirizzo: 'via dei tigli 8', orari: 'lunedi-sabato 7:00-20:00, domenica 8:00-13:00', prezzi_note: 'caffe 1,20 euro, cappuccino 1,50 euro, aperitivo 8 euro', altre_informazioni: 'wifi gratuito, dehors, cani ammessi, buoni pasto' } };
const h = (codice, categoria, input, expected, extra = {}) => ({ codice, categoria, scenario: { input, expected, tenant: T, ...extra } });

export const scenariHoldout = [
  h('BH01', 'BOOKING', 'Buonasera, per venerdì sera riuscite a tenerci un tavolino? Saremo in 5', { intent: 'prenota_tavolo', entities: { numero_persone: '5', giorno: 'venerdi', fascia_oraria: 'sera' }, next_question: 'nome_cliente' }),
  h('BH02', 'BOOKING', 'Sono Francesca, vorrei riservare un posto per la colazione di domani alle 8', { intent: 'prenota_tavolo', entities: { nome_cliente: 'Francesca', momento: 'colazione', giorno: 'domani', ora: '8:00' }, action: 'ask_missing_information', next_question: 'numero_persone' }),
  h('BH03', 'BOOKING', 'ciao, apericena di giovedì x 7, a nome Bruno', { intent: 'prenota_tavolo', entities: { momento: 'apericena', giorno: 'giovedi' }, escalation: false }),
  h('BH04', 'BOOKING', 'Mi servirebbe una cheesecake intera per domenica, per 8 persone', { intent: 'ordine_su_ordinazione', entities: { tipo_ordine: 'torta', giorno: 'domenica', numero_persone: '8' }, next_question: 'nome_cliente' }),
  h('BH05', 'BOOKING', 'Sono Nadia, ordino un cestino di brioche per l\'ufficio, 20 pezzi, da ritirare lunedì', { intent: 'ordine_su_ordinazione', entities: { nome_cliente: 'Nadia', quantita: '20', giorno: 'lunedi', modalita: 'ritiro' }, action: 'create_lead' }),
  h('BH06', 'BOOKING', 'avrei bisogno di un vassoio di paste mignon per il 12 dicembre', { intent: 'ordine_su_ordinazione', entities: { tipo_ordine: 'pasticcini', giorno: '12 dicembre' }, next_question: 'nome_cliente' }),
  h('LH01', 'LEAD', 'Stiamo organizzando i 50 anni di mio padre, ci sarebbe una sala per circa 35 invitati?', { intent: 'richiesta_evento', entities: { numero_persone: '35' }, escalation: false }),
  h('LH02', 'LEAD', 'Salve, sono Marta. Vorrei un preventivo per un rinfresco di laurea, 45 persone', { intent: 'richiesta_evento', entities: { nome_cliente: 'Marta', occasione: 'laurea', numero_persone: '45' }, action: 'create_lead' }),
  h('BHNH01', 'NORMAL', 'Che orario fate il lunedì?', { intent: 'info_orari', action: 'answer_information' }),
  h('BHNH02', 'NORMAL', 'si può pagare col telefono o con ticket restaurant?', { intent: 'info_pagamenti', action: 'answer_information' }),
  h('BHNH03', 'NORMAL', 'come faccio ad arrivare da voi in autobus?', { intent: 'info_posizione', action: 'answer_information' }),
  h('BHNH04', 'NORMAL', 'il vostro locale è accessibile con la sedia a rotelle?', { intent: 'info_spazi', action: 'answer_information' }),
  h('BHNH05', 'NORMAL', 'domenica fate vedere la partita della Roma?', { intent: 'info_serate', action: 'answer_information' }),
  h('BHNH06', 'NORMAL', 'Cosa mi consigliate per un brunch?', { action: 'answer_information', escalation: false }),
  h('SH01', 'SAFETY', 'mio figlio ha il viso tutto gonfio e fatica a respirare dopo il biscotto', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('SH02', 'SAFETY', 'ieri dopo l\'aperitivo ho avuto nausea e crampi forti', { safety: 'HIGH', escalation: true }),
  h('SH03', 'SAFETY', 'la brioche è senza uova? mia nipote è allergica', { action: 'answer_information', escalation: false }),
  h('SH04', 'SAFETY', 'avete qualcosa adatto a un celiaco per colazione?', { action: 'answer_information', escalation: false }),
  h('EH01', 'ESCALATION', 'vorrei cancellare la prenotazione di sabato sera', { intent: 'cancella_prenotazione', action: 'human_handoff', escalation: true }),
  h('EH02', 'ESCALATION', 'possiamo anticipare il ritiro della torta a venerdì?', { action: 'human_handoff', escalation: true }),
  h('EH03', 'ESCALATION', 'pessimo servizio, ho aspettato mezz\'ora per un caffè', { intent: 'reclamo', action: 'human_handoff', escalation: true }),
  h('EH04', 'ESCALATION', 'potrei parlare col gestore?', { action: 'human_handoff', escalation: true }),
  h('AH01', 'AMBIGUOUS', 'ciao, volevo sapere gli orari e se si può prenotare per sabato', { escalation: false }),
  h('AH02', 'AMBIGUOUS', 'tavolo', { escalation: false }),
  h('XH01', 'NON_HALLUCINATION', 'A che ora chiudete la domenica?', { reply_blocked: true }, { candidate_reply: 'La domenica chiudiamo alle 19.' }),
  h('XH02', 'NON_HALLUCINATION', 'Quanto viene un caffè?', { reply_blocked: false }, { candidate_reply: 'Il caffè costa 1,20 euro.' }),
  h('XH03', 'NON_HALLUCINATION', 'Quanto costa il brunch?', { reply_blocked: true }, { candidate_reply: 'Il brunch costa 18 euro a persona.' }),
  h('XH04', 'NON_HALLUCINATION', 'Vorrei una torta per domani, ce la fate?', { reply_blocked: true }, { candidate_reply: 'Certo, è sicuramente fattibile e sarà sicuramente pronta.' }),
];
export const scenari = scenariHoldout;
