// Set di controllo (holdout): formulazioni scritte DOPO aver tarato le regole
// sul set principale, mai usate per correggere il pack. Misura quanto il
// motore generalizza a frasi nuove. Il primo risultato registrato in
// docs/SECTOR_ENGINE.md è quello ottenuto prima di qualunque correzione.
const T = { campi: ['nome_paziente', 'sintomo', 'urgenza'], haCalendario: true, info_generali: { indirizzo: 'via fano 3', prezzi_note: 'pacchetto base 100euro' } };
const h = (codice, categoria, input, expected, extra = {}) => ({ codice, categoria, scenario: { input, expected, tenant: T, ...extra } });

export const scenari = [
  h('HO01', 'BOOKING', 'Buonasera, avrei necessità di fissare una seduta di igiene per la prossima settimana', { intent: 'prenota_visita', entities: { servizio: 'igiene_dentale' }, action: 'ask_missing_information', next_question: 'nome_paziente' }),
  h('HO02', 'BOOKING', 'ciao! mi piacerebbe prendere un appuntamento x una visita di controllo', { intent: 'prenota_visita', entities: { servizio: 'controllo' }, next_question: 'nome_paziente' }),
  h('HO03', 'BOOKING', 'Sono Federica Russo, volevo sapere se c\'è posto per un controllo giovedì', { intent: 'prenota_visita', entities: { nome_paziente: 'Federica Russo', servizio: 'controllo', giorno: 'giovedi' }, action: 'propose_slot' }),
  h('HO04', 'BOOKING', 'dovrei fare lo sbiancamento prima del matrimonio di mia sorella, quando potete?', { intent: 'prenota_visita', entities: { servizio: 'sbiancamento' } }),
  h('HO05', 'BOOKING', 'salve mio figlio deve fare una visita, ha 6 anni', { entities: { tipo_paziente: 'bambino' }, action: 'ask_missing_information' }),
  h('HO06', 'BOOKING', 'vorrei prenotare pls', { intent: 'prenota_visita', next_question: 'servizio' }),
  h('HO07', 'BOOKING', 'Mi serve la pulizia dei denti, preferibilmente di sera', { intent: 'prenota_visita', entities: { servizio: 'igiene_dentale', fascia_oraria: 'sera' } }),
  h('HO08', 'BOOKING', 'Sono Tommaso. Posso venire lunedì mattina per togliere il dente del giudizio?', { intent: 'prenota_visita', entities: { nome_paziente: 'Tommaso', servizio: 'estrazione', giorno: 'lunedi', fascia_oraria: 'mattina' } }),
  h('HO09', 'LEAD', 'Salve, vorrei sapere quanto verrebbe un preventivo per impianti dentali', { intent: 'richiesta_preventivo', entities: { servizio: 'impianto' } }),
  h('HO10', 'LEAD', 'potete farmi una stima dei costi per l\'apparecchio ai denti?', { intent: 'richiesta_preventivo', entities: { servizio: 'ortodonzia' } }),
  h('HO11', 'NORMAL', 'Qual è il prezzo di una seduta di igiene?', { intent: 'info_prezzi', action: 'answer_information' }),
  h('HO12', 'NORMAL', 'avete tariffe agevolate per gli studenti?', { action: 'answer_information' }),
  h('HO13', 'NORMAL', 'fino a che ora siete aperti il venerdì?', { intent: 'info_orari', action: 'answer_information' }),
  h('HO14', 'NORMAL', 'dov\'è lo studio? c\'è un posto dove parcheggiare', { intent: 'info_posizione', action: 'answer_information' }),
  h('HO15', 'NORMAL', 'si può pagare con il bancomat o solo contanti?', { intent: 'info_pagamenti', action: 'answer_information' }),
  h('HO16', 'NORMAL', 'Che documenti devo portare per la visita?', { intent: 'info_documenti', action: 'answer_information' }),
  h('HO17', 'NORMAL', 'lo sbiancamento rovina lo smalto?', { action: 'answer_information', escalation: false }),
  h('HO18', 'NORMAL', 'in cosa consiste una cura canalare', { intent: 'info_trattamenti', action: 'answer_information' }),
  h('HO19', 'NORMAL', 'Buongiorno', { intent: 'saluto', action: 'answer_information' }),
  h('HO20', 'NORMAL', 'perfetto, grazie mille!', { intent: 'chiusura', action: 'answer_information' }),
  h('HO21', 'NORMAL', 'mi sanguinano le gengive quando mi lavo i denti da qualche giorno', { intent: 'problema_sintomo', entities: { sintomo: 'sanguinamento' }, action: 'ask_missing_information' }),
  h('HO22', 'NORMAL', 'ho un molare che mi da fastidio quando mastico', { intent: 'problema_sintomo', action: 'ask_missing_information' }),
  h('HO23', 'NORMAL', 'mi è caduta una capsula', { action: 'ask_missing_information', escalation: false }),
  h('HO24', 'SAFETY', 'ho un dolore che non riesco a sopportare, sono disperato', { intent: 'urgenza_dentale', safety: 'HIGH' }),
  h('HO25', 'SAFETY', 'mi si è gonfiata tantissimo la guancia e ho la febbre', { safety: 'HIGH', escalation: false }),
  h('HO26', 'SAFETY', 'ho caduto la bici e mi si è rotto un dente davanti, sanguina', { safety: 'HIGH' }),
  h('HO27', 'SAFETY', 'ho una gola gonfia e faccio fatica a respirare dopo la visita', { safety: 'CRITICAL', action: 'emergency_escalation', escalation: true }),
  h('HO28', 'SAFETY', 'il sangue non si ferma da due ore dopo che mi hanno tolto il dente', { escalation: false }),
  h('HO29', 'SAFETY', 'posso prendere la tachipirina visto il mal di denti?', { action: 'answer_information' }),
  h('HO30', 'SAFETY', 'secondo lei è una cosa grave?', { action: 'answer_information' }),
  h('HO31', 'SAFETY', 'ho una carie? che cosa mi consiglia di fare', { action: 'answer_information' }),
  h('HO32', 'ESCALATION', 'preferirei parlare con un operatore', { action: 'human_handoff', escalation: true }),
  h('HO33', 'ESCALATION', 'scusate devo annullare la visita di mercoledì', { intent: 'cancella_appuntamento', action: 'human_handoff', escalation: true }),
  h('HO34', 'ESCALATION', 'posso anticipare la visita a martedì?', { intent: 'sposta_appuntamento', action: 'human_handoff', escalation: true }),
  h('HO35', 'ESCALATION', 'sono veramente arrabbiato per come sono stato trattato', { action: 'human_handoff', escalation: true }),
  h('HO36', 'AMBIGUOUS', 'ciao, quanto costa una pulizia e quando avete posto?', { entities: { servizio: 'igiene_dentale' }, escalation: false }),
  h('HO37', 'AMBIGUOUS', 'vorrei info', { escalation: false }),
  h('HO38', 'AMBIGUOUS', 'mi manda il mio dentista di prima, devo continuare le cure', { escalation: false }),
  h('HO39', 'NORMAL', 'non ho nessun dolore, voglio solo fare la pulizia', { entities: { servizio: 'igiene_dentale' }, safety: 'LOW' }),
  h('HO40', 'NORMAL', 'Non riesco a venire domani, posso spostare?', { action: 'human_handoff', escalation: true }),
];
