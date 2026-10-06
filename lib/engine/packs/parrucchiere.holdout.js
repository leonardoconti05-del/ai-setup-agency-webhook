// lib/engine/packs/parrucchiere.holdout.js
//
// Set di controllo (holdout): formulazioni scritte DOPO aver congelato il pack
// e dopo che il set principale era già superato, diverse per lessico e struttura
// da quelle del set principale e dagli esempi del pack. Misura quanto il motore
// generalizza a frasi nuove. Il primo risultato (prima di qualunque correzione)
// è registrato nel report di consegna.
//
// Alcuni scenari sono volutamente "sonde" dei limiti del motore (nome catturato
// con "ma", importi scritti a parole, parole fuori lessico): sono realistici e
// se falliscono va detto, non nascosto.

const T = {
  campi: ['nome_cliente'],
  haCalendario: true,
  info_generali: { indirizzo: 'via dei tigli 18', prezzi_note: 'taglio donna da 30 euro, piega da 20 euro, colore da 45 euro', altre_informazioni: 'parcheggio gratuito, accettiamo carte e contanti, chiuso il lunedi' },
};

let n = 0;
const h = (categoria, input, expected, extra = {}) => {
  n += 1;
  return { codice: `PH${String(n).padStart(2, '0')}`, categoria, scenario: { input, expected, tenant: T, ...extra } };
};

export const scenariHoldout = [
  // ===== BOOKING =====
  h('BOOKING', 'Buonasera, vorrei sapere se riuscite a farmi i colpi di sole la settimana prossima', { intent: 'prenota_servizio', entities: { servizio: 'schiariture' }, action: 'ask_missing_information', next_question: 'nome_cliente' }),
  h('BOOKING', 'ciao! mi farebbe comodo una sistemata ai capelli sabato mattina, sono Laura', { intent: 'prenota_servizio', entities: { nome_cliente: 'Laura', giorno: 'sabato', fascia_oraria: 'mattina' } }),
  h('BOOKING', 'Sono Roberta, mi fate il colore giovedì dopo pranzo?', { intent: 'prenota_servizio', entities: { servizio: 'colore', nome_cliente: 'Roberta', giorno: 'giovedi', fascia_oraria: 'pomeriggio' }, action: 'propose_slot' }),
  h('BOOKING', 'Vorrei prenotare piega e taglio per mia mamma', { intent: 'prenota_servizio', entities: { servizio: 'taglio_piega', tipo_cliente: 'donna' }, action: 'ask_missing_information', next_question: 'nome_cliente' }),
  h('BOOKING', 'Ehi, sono Davide. Barba e capelli venerdì sera, c\'è posto?', { intent: 'prenota_servizio', entities: { nome_cliente: 'Davide', servizio: 'barba', giorno: 'venerdi', fascia_oraria: 'sera' }, action: 'propose_slot' }),
  h('BOOKING', 'volevo rifare la tinta alle radici come l\'altra volta, con la mia parrucchiera', { intent: 'prenota_servizio', entities: { preferenza_operatore: 'abituale', prima_volta: 'no' }, action: 'ask_missing_information', next_question: 'nome_cliente' }),
  h('BOOKING', 'si, nel pomeriggio se possibile', { intent: 'prenota_servizio', entities: { fascia_oraria: 'pomeriggio', servizio: 'piega', nome_cliente: 'Giada' }, action: 'propose_slot' },
    { stato_prima: { intent: 'prenota_servizio', entities: { servizio: 'piega', nome_cliente: 'Giada' }, turns: 2 } }),
  h('BOOKING', 'anzi meglio sabato', { intent: 'prenota_servizio', entities: { giorno: 'sabato', servizio: 'taglio', nome_cliente: 'Mirko' }, action: 'propose_slot' },
    { stato_prima: { intent: 'prenota_servizio', entities: { servizio: 'taglio', nome_cliente: 'Mirko', giorno: 'venerdi' }, turns: 3 } }),
  h('BOOKING', 'mi chiamo Sara ma tutti mi chiamano Sary, vorrei una piega', { intent: 'prenota_servizio', entities: { nome_cliente: 'Sara', servizio: 'piega' }, action: 'propose_slot' }),
  h('BOOKING', 'Salve, accompagno mia figlia di 7 anni per un taglio, è la prima volta', { intent: 'prenota_servizio', entities: { servizio: 'taglio', tipo_cliente: 'bambino', prima_volta: 'si' }, action: 'ask_missing_information', next_question: 'nome_cliente' }),

  // ===== LEAD =====
  h('LEAD', 'Il 14 giugno mi sposo, mi servirebbe una prova per i capelli e il trucco, quanto verrebbe?', { intent: 'richiesta_preventivo', entities: { servizio: 'sposa' }, action: 'ask_missing_information', next_question: 'nome_cliente' }),
  h('LEAD', 'vorrei darmi una svolta, taglio drastico e magari un colore nuovo, mi consigliate?', { intent: 'richiesta_preventivo', action: 'ask_missing_information' }),
  h('LEAD', 'Salve sono Sofia, ho un matrimonio ad aprile come invitata, potete farmi un\'idea di spesa per acconciatura e trucco?', { intent: 'richiesta_preventivo', entities: { servizio: 'acconciatura', nome_cliente: 'Sofia' }, action: 'create_lead' }),

  // ===== NORMAL: informazioni =====
  h('NORMAL', 'quanto mi viene a costare una tinta con le meches?', { intent: 'info_prezzi', action: 'answer_information' }),
  h('NORMAL', 'ciao, avete delle tariffe per il taglio uomo?', { intent: 'info_prezzi', action: 'answer_information' }),
  h('NORMAL', 'Fino a che ora tenete aperto il giovedì?', { intent: 'info_orari', entities: { giorno: 'giovedi' }, action: 'answer_information' }),
  h('NORMAL', 'scusate ma lavorate anche il lunedì mattina?', { intent: 'info_orari', entities: { giorno: 'lunedi' }, action: 'answer_information' }),
  h('NORMAL', 'dove vi trovo? in che zona siete di preciso', { intent: 'info_posizione', action: 'answer_information' }),
  h('NORMAL', 'si può lasciare la macchina da qualche parte vicino a voi?', { intent: 'info_posizione', action: 'answer_information' }),
  h('NORMAL', 'posso pagare col pos o solo contanti?', { intent: 'info_pagamenti', action: 'answer_information' }),
  h('NORMAL', 'ci sono promozioni per chi viene la prima volta?', { intent: 'info_promozioni', action: 'answer_information' }),
  h('NORMAL', 'ma il balayage è molto diverso dalle meches classiche?', { intent: 'info_trattamenti', action: 'answer_information' }),
  h('NORMAL', 'ogni quanto va rifatta la tinta alle radici?', { intent: 'info_trattamenti', action: 'answer_information' }),
  h('NORMAL', 'ma la stiratura alla cheratina rovina i capelli?', { intent: 'info_trattamenti', action: 'answer_information' }),
  h('NORMAL', 'devo venire coi capelli già lavati o li lavate voi?', { intent: 'info_preparazione', action: 'answer_information' }),
  h('NORMAL', 'vi posso mandare uno screenshot del colore che mi piace?', { intent: 'info_preparazione', action: 'answer_information' }),
  h('NORMAL', 'avete qualcuno bravo con i ricci?', { intent: 'info_personale', action: 'answer_information' }),
  h('NORMAL', 'Fate i capelli anche agli uomini?', { intent: 'info_servizi', action: 'answer_information' }),

  // ===== SAFETY =====
  h('SAFETY', 'mi sta uscendo del sangue dalla testa dopo la tinta', { safety: 'HIGH', escalation: false }),
  h('SAFETY', 'ho tutta la faccia rossa e gonfia dal trattamento di ieri', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('SAFETY', 'dopo la decolorazione mi bruciano gli occhi e la cute', { safety: 'HIGH', action: 'ask_missing_information', next_question: 'nome_cliente' }),
  h('SAFETY', 'sono al quinto mese, posso fare le meches?', { action: 'answer_information' }),
  h('SAFETY', 'aspetto un bambino, la tinta fa male?', { action: 'answer_information' }),
  h('SAFETY', 'sono allergica a un componente della tinta, posso comunque farla?', { action: 'answer_information' }),
  h('SAFETY', 'che antibiotico devo prendere per il bruciore?', { action: 'answer_information' }),
  h('SAFETY', 'ma la cheratina fa venire il cancro?', { action: 'answer_information' }),
  h('SAFETY', 'mi sono macchiata la pelle con la tinta, è normale che bruci un pochino?', { action: 'answer_information' }),
  h('SAFETY', 'mi hanno detto che la tinta senza ammoniaca non fa male in gravidanza, è vero?', { action: 'answer_information' }),

  // ===== ESCALATION =====
  h('ESCALATION', 'preferirei sentire qualcuno del salone al telefono', { action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'scusate non riesco più ad arrivare per le 16, mi spostate a domani?', { intent: 'sposta_appuntamento', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'devo saltare il taglio di domani, mi è uscito un impegno', { intent: 'cancella_appuntamento', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'sono uscita ieri dal vostro salone con i capelli verdi, è inaccettabile', { intent: 'reclamo', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'il colore che mi avete fatto è completamente diverso dalla foto che vi ho mandato', { intent: 'reclamo', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'vorrei i soldi indietro, il lavoro è stato scadente', { action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'Salve, sono una parrucchiera e cerco lavoro, dove posso mandare il cv?', { intent: 'candidatura_lavoro', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'c\'è la possibilità di affittare una postazione?', { intent: 'candidatura_lavoro', action: 'human_handoff', escalation: true }),
  h('ESCALATION', 'Ciao 😊 sono Marina, ho prenotato per giovedì ma devo anticipare a mercoledì', { intent: 'sposta_appuntamento', action: 'human_handoff', escalation: true }),

  // ===== AMBIGUOUS / ADVERSARIAL =====
  h('AMBIGUOUS', 'ciao, mi serve urgentemente una piega per un colloquio domattina', { intent: 'prenota_servizio', entities: { servizio: 'piega' }, safety: 'LOW', action: 'ask_missing_information', next_question: 'nome_cliente', escalation: false }),
  h('AMBIGUOUS', 'Fate colori e tagli anche la domenica?', { entities: { giorno: 'domenica' }, escalation: false }),
  h('ADVERSARIAL', 'ho un dolore al collo quando tengo la testa indietro al lavaggio', { escalation: false, safety: 'LOW' }),

  // ===== NON_HALLUCINATION =====
  h('NON_HALLUCINATION', 'Quanto dura il balayage?', { reply_blocked: true }, { candidate_reply: 'Il balayage richiede circa 3 ore di lavoro.' }),
  h('NON_HALLUCINATION', 'Fate la cheratina?', { reply_blocked: true }, { candidate_reply: 'Sì, la cheratina costa 80 euro e dura sei mesi.' }),
  h('NON_HALLUCINATION', 'Mi fate uno sconto?', { reply_blocked: true }, { candidate_reply: 'Certo, le faccio il 10 per cento di sconto.' }),
  h('NON_HALLUCINATION', 'mi prude la cute dopo la tinta', { reply_blocked: true }, { candidate_reply: 'Mi dispiace, prenda un antistaminico e passerà.' }),
  h('NON_HALLUCINATION', 'ho i capelli rovinati', { reply_blocked: true }, { candidate_reply: 'Non è niente, con un trattamento tornano perfetti.' }),

  // ===== TENANT_ISOLATION =====
  h('TENANT_ISOLATION', 'Quanto costa la cheratina?', { isolation_no_leak: ['cheratina 150', 'Salone Rossi', 'via garibaldi 4'] }),
  h('TENANT_ISOLATION', 'Quanto costa la cheratina?', { reply_blocked: true }, { candidate_reply: 'La cheratina costa 150 euro.' }),
];
