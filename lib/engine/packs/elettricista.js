// lib/engine/packs/elettricista.js
//
// Sector Pack "elettricista" v1 — conoscenza di SETTORE (impresa elettrica /
// impiantista, Italia), non di una singola impresa. Prezzi, tariffe di
// uscita, orari, zone servite, servizi offerti, personale, promozioni e
// indirizzi NON stanno qui: arrivano solo dai dati del tenant.
// Settore di INTERVENTI a domicilio: guasti, sopralluoghi, preventivi,
// certificazioni. Sicurezza prima di tutto: nessuna istruzione di riparazione
// o modifica dell'impianto, nessuna diagnosi a distanza.

export const SETTORE = 'elettricista';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack elettricista — lessico di impianti/guasti, 20 intent, 10 entità, urgenza LOW-CRITICAL (fumo, scintille, scosse, acqua+corrente), sicurezza anti fai-da-te e anti-diagnosi a distanza, 21 FAQ generali di settore senza prezzi.';

// ---- Forme di urgenza, riusate sia per il lessico sia per urgency_rules ----
const CRITICI = {
  odore_bruciato: ['odore di bruciato', 'puzza di bruciato', 'sa di bruciato', 'odore di plastica bruciata', 'puzza di plastica bruciata', 'odore di cavo bruciato', 'odore di gomma bruciata', 'odore acre', 'sento bruciare'],
  fumo: ['esce fumo', 'esce del fumo', 'esce un po di fumo', 'c e fumo', 'c e del fumo', 'fa fumo', 'vedo fumo', 'vedo del fumo', 'sento fumo', 'fumo nero', 'e uscito del fumo', 'e uscito fumo', 'ha fatto fumo', 'faceva fumo', 'fumo dalla', 'fumo dal', 'fumo dai', 'fumo dall', 'fuma il', 'fuma la', 'fuma l', 'sta fumando'],
  scintille_fiamme: ['scintille', 'scintilla', 'faville', 'archi elettrici', 'fiamme', 'fiammata', 'fiammella', 'fiammelle', 'fiamma', 'a fuoco', 'prende fuoco', 'ha preso fuoco', 'sta bruciando', 'sta andando a fuoco', 'e andato a fuoco', 'in fiamme', 'principio di incendio', 'c e un incendio', 'e scoppiato un incendio', 'incendio elettrico'],
  scossa: ['ho preso la scossa', 'ho preso una scossa', 'ha preso la scossa', 'ha preso una scossa', 'preso la scossa', 'preso una scossa', 'mi ha dato la scossa', 'mi ha dato una scossa', 'da la scossa', 'da scosse', 'da una scossa', 'mi e arrivata una scossa', 'scossa elettrica', 'arriva la scossa', 'arriva una scossa', 'mi arriva la scossa', 'mi arriva una scossa', 'sento la scossa', 'sento una scossa', 'mi prende la scossa', 'prende la scossa', 'prende una scossa', 'prendo una scossa', 'ricevuto una scossa', 'ricevuto la scossa', 'scosse elettriche', 'piccole scosse', 'leggere scosse', 'scossa dalla presa', 'prendo la scossa', 'prendo scosse', 'si prende la scossa', 'folgorato', 'folgorata', 'elettrocutato', 'elettrocutata', 'sono stato fulminato', 'sono stata fulminata', 'mi ha folgorato'],
  presa_fusa: ['presa che si scioglie', 'presa si e sciolta', 'presa sciolta', 'presa fusa', 'presa che fonde', 'spina sciolta', 'spina fusa', 'spina che si scioglie', 'si e sciolta la presa', 'si e sciolto l interruttore', 'si sta sciogliendo', 'plastica sciolta', 'cavo fuso', 'cavi fusi', 'cavi bruciati', 'cavo bruciato', 'presa bruciata', 'presa annerita', 'spina bruciata', 'spina annerita', 'quadro bruciato', 'interruttore bruciato', 'si e bruciata la presa', 'si e bruciata una presa', 'si e bruciato il quadro', 'si e bruciato il cavo', 'presa carbonizzata', 'diventata nera', 'diventato nero', 'annerita', 'annerito', 'annerisce', 'puzza di plastica', 'puzza di gomma', 'odore di plastica', 'odore di gomma', 'odore di elettrico', 'puzza di elettrico', 'odore di cavo', 'puzza di cavo', 'contatore bruciato'],
  acqua_impianto: ['quadro e bagnato', 'quadro e allagato', 'il quadro elettrico e bagnato', 'si e bagnato il quadro', 'quadro si e bagnato', 'si sono bagnate le prese', 'prese si sono bagnate', 'allagata e c e ancora corrente', 'allagato e c e ancora corrente', 'allagata e c e la corrente', 'allagato e c e la corrente', 'e allagata e c e corrente', 'e allagato e c e corrente', 'acqua nel quadro', 'acqua nelle prese', 'acqua nella presa', 'acqua dentro il quadro', 'acqua che entra nel quadro', 'acqua che cola dal quadro', 'acqua che gocciola sul quadro', 'quadro elettrico bagnato', 'quadro bagnato', 'prese bagnate', 'presa bagnata', 'impianto bagnato', 'impianto allagato', 'quadro allagato', 'si e allagato il quadro', 'prese sott acqua', 'quadro sott acqua', 'infiltrazioni nel quadro', 'infiltrazione nel quadro', 'allagato e c e corrente', 'allagata e c e corrente', 'allagamento con la corrente', 'allagamento e corrente', 'acqua e corrente', 'acqua e prese', 'acqua sulle prese', 'acqua vicino al quadro', 'acqua vicino alle prese'],
  persona_male: ['non respira', 'e svenuto', 'e svenuta', 'sono svenuto', 'sono svenuta', 'privo di sensi', 'incosciente', 'ustione', 'ustionato', 'ustionata'],
};
CRITICI.acqua_impianto.push(...['acqua', 'gocciola', 'perdita', 'infiltrazioni', 'umidita'].flatMap((w) => ['sopra il', 'sopra le', 'sul', 'sulle', 'vicino al', 'vicino alle', 'dentro il', 'dentro le', 'nel', 'nelle', 'dal soffitto sopra il', 'dal soffitto sopra le', 'dal soffitto sul', 'dal soffitto sulle'].flatMap((pr) => ['quadro', 'prese', 'presa', 'centralino', 'contatore'].map((x) => `${w} ${pr} ${x}`))));
const ALTI = {
  fili_scoperti: ['fili scoperti', 'filo scoperto', 'cavi scoperti', 'cavo scoperto', 'fili a vista', 'cavi a vista', 'fili penzolanti', 'cavi penzolanti', 'penzolano', 'penzola', 'pendono dal soffitto', 'cavi che pendono', 'fili che pendono', 'pendono dei cavi', 'pendono dei fili', 'cavi pendono', 'fili pendono', 'filo penzolante', 'cavo penzolante', 'fili che penzolano', 'fili che escono dal muro', 'cavi che escono dal muro', 'cavi spelati', 'cavo spelato', 'filo spelato', 'fili spelati', 'rame a vista', 'rame scoperto', 'fili che escono', 'cavi che escono', 'cavo a terra', 'cavi a terra', 'filo a terra', 'cavo caduto', 'cavi caduti', 'cavo sotto tensione'],
  surriscaldamento: ['presa calda', 'presa che scalda', 'presa che scotta', 'presa scotta', 'prese calde', 'spina calda', 'spina che scalda', 'spina che scotta', 'cavo caldo', 'cavo che scalda', 'cavo che scotta', 'cavi caldi', 'interruttore caldo', 'interruttore che scalda', 'quadro caldo', 'quadro che scalda', 'quadro che scotta', 'salvavita caldo', 'contatore caldo', 'contatore che scalda', 'presa surriscaldata', 'surriscaldamento', 'si surriscalda', 'surriscaldato'],
  cortocircuito: ['cortocircuito', 'corto circuito', 'in corto', 'andato in corto', 'fatto corto', 'ha fatto corto', 'ho sentito un botto', 'ho sentito uno scoppio', 'un botto', 'uno scoppio', 'un boato', 'e esploso', 'e esplosa', 'ha fatto un botto'],
  dispersione_fulmine: ['sento la corrente', 'pizzica quando tocco', 'formicolio quando tocco', 'formicolio', 'e caduto un fulmine', 'colpito da un fulmine', 'colpita da un fulmine', 'ha preso un fulmine', 'fulmine'],
  emergenza_dichiarata: ['ho un emergenza', 'e un emergenza', 'emergenza elettrica', 'urgentissimo', 'urgentissima', 'e urgentissimo', 'serve subito', 'mi serve subito', 'servite subito', 'venite subito', 'venire subito', 'ossigeno', 'respiratore', 'apparecchiatura medica', 'apparecchi medicali', 'macchinario medico'],
};
const AMBIENTI = ['cucina', 'bagno', 'camera', 'camera da letto', 'cameretta', 'salotto', 'soggiorno', 'sala', 'studio', 'corridoio', 'ingresso', 'garage', 'cantina', 'balcone', 'terrazzo', 'giardino', 'taverna', 'lavanderia', 'ufficio', 'negozio', 'magazzino', 'scala', 'scale'];
const perAmbiente = (modelli) => AMBIENTI.flatMap((a) => modelli.map((m) => m.replace('{a}', a)));
const PARTI_IMPIANTO = ['presa', 'prese', 'spina', 'cavo', 'cavi', 'quadro', 'interruttore', 'salvavita', 'contatore', 'scatola di derivazione'];
const SEGNI_CALORE = ['scalda', 'si scalda', 'scotta', 'si surriscalda', 'e calda', 'e caldo', 'sono calde', 'e bollente', 'scalda troppo', 'scalda tantissimo', 'scalda molto', 'scalda parecchio'];
ALTI.surriscaldamento.push(...PARTI_IMPIANTO.flatMap((p) => SEGNI_CALORE.map((s) => `${p} ${s}`)));
const PROBLEMI_ORD = {
  salvavita_scatta: ['salvavita che scatta', 'scatta il salvavita', 'salta il salvavita', 'e saltato il salvavita', 'mi scatta il salvavita', 'mi salta il salvavita', 'il salvavita scatta', 'il salvavita salta', 'salvavita che salta', 'salvavita scatta', 'differenziale che scatta', 'scatta il differenziale', 'salta il differenziale', 'mi scatta il differenziale', 'salvavita non si riarma', 'non riesco a riarmare il salvavita', 'non riesco a riarmare', 'non riesco ad alzare il salvavita', 'salvavita non tiene', 'salvavita non si alza', 'non si alza la leva', 'scatta l interruttore', 'salta l interruttore', 'mi scatta l interruttore', 'scatta il magnetotermico', 'salta il magnetotermico', 'scatta di continuo', 'scatta in continuazione', 'il generale salta', 'salta il generale', 'scatta il generale', 'interruttore generale che salta', 'non riesco a rimettere la corrente', 'non torna la corrente', 'non si rialza', 'non si rialzano', 'non si risolleva', 'non si rimette su', 'non rimane su', 'non rimane alzato', 'non resta su', 'non si riattacca', 'non riesco a rialzare', 'non riesco a rimettere su', 'non riesco a riattivare'],
  senza_corrente: ['senza corrente', 'senza luce', 'manca la corrente', 'manca la luce', 'e saltata la corrente', 'e saltata la luce', 'e andata via la corrente', 'e andata via la luce', 'e andata la luce', 'e andata la corrente', 'non c e corrente', 'non c e luce', 'non ho corrente', 'non ho luce', 'non arriva corrente', 'blackout', 'black out', 'scatta il contatore', 'salta il contatore', 'mi scatta il contatore', 'mi salta il contatore', 'contatore che salta', 'contatore che scatta', 'il contatore salta', 'il contatore scatta', 'salta la corrente', 'mi salta la corrente', 'saltata la corrente', 'saltata la luce', 'ci e saltata la corrente', 'stacca la corrente', 'si e spento tutto', 'casa al buio', 'siamo al buio', 'e saltato tutto', 'sono senza corrente', 'siamo senza corrente', 'siamo senza luce', 'meta casa senza corrente', 'senza elettricita', 'manca l elettricita', 'non c e piu corrente', 'non c e piu luce', 'non arriva piu la corrente', 'non arriva piu corrente', 'non ho piu corrente', 'non ho piu luce'],
  presa_guasta: ['presa che non funziona', 'la presa non funziona', 'presa non funziona', 'presa rotta', 'presa non va', 'presa non da corrente', 'presa morta', 'prese che non funzionano', 'prese non funzionano', 'non funziona la presa', 'non funzionano le prese', 'presa allentata', 'presa che balla', 'spina che balla', 'presa staccata', 'una presa non va', 'le prese non vanno', 'prese senza corrente'],
  interruttore_guasto: ['interruttore rotto', 'interruttore non funziona', 'interruttore che non funziona', 'interruttore della luce non funziona', 'pulsante non funziona', 'interruttore si e rotto', 'interruttore bloccato', 'interruttore che non scatta'],
  luci_difettose: ['luce non funziona', 'luci non funzionano', 'la luce non si accende', 'non si accende la luce', 'non si accendono le luci', 'luci che sfarfallano', 'luce che sfarfalla', 'sfarfalla', 'sfarfallano', 'luci che lampeggiano', 'luce che lampeggia', 'lampeggia', 'lampeggiano', 'faretti che non si accendono', 'faretti non funzionano', 'faretti spenti', 'luci che si spengono da sole', 'luci che si spengono', 'le luci vanno e vengono'],
  scatto_con_apparecchio: ['salta quando accendo', 'scatta quando accendo', 'salta quando uso', 'scatta quando uso', 'salta appena accendo', 'scatta appena accendo', 'salta tutto quando accendo', 'salta quando attacco', 'scatta quando attacco', 'salta ogni volta che accendo', 'salta ogni volta che uso'],
};
PROBLEMI_ORD.presa_guasta.push(...perAmbiente(['prese del {a} non danno piu corrente', 'prese in {a} non danno piu corrente', 'presa del {a} non da piu corrente', 'presa in {a} non da piu corrente', 'prese del {a} non danno corrente', 'presa del {a} non da corrente']), 'non danno piu corrente', 'non da piu corrente', 'non danno corrente', 'prese non danno piu corrente', 'presa non da piu corrente', ...perAmbiente(['presa in {a} non funziona', 'presa della {a} non funziona', 'prese della {a} non funzionano', 'prese in {a} non funzionano', 'non funziona la presa in {a}', 'non funziona la presa della {a}', 'presa in {a} non va', 'presa della {a} non va', 'presa della {a} e morta']), 'una presa non funziona', 'una presa non va', 'alcune prese non funzionano', 'alcune prese non vanno', 'non funziona una presa', 'non funzionano alcune prese', 'non funzionano piu le prese');
PROBLEMI_ORD.luci_difettose.push(...perAmbiente(['luce in {a} non funziona', 'luce della {a} non funziona', 'luci della {a} non funzionano', 'luci in {a} non funzionano', 'luce della {a} non si accende', 'luci della {a} sfarfallano', 'luci della {a} lampeggiano', 'luce della {a} sfarfalla', 'non si accende la luce in {a}', 'non si accende la luce della {a}', 'non si accendono le luci della {a}']), 'una luce non funziona', 'alcune luci non funzionano', 'una lampadina che sfarfalla');
PROBLEMI_ORD.interruttore_guasto.push(...perAmbiente(['interruttore della {a} non funziona', 'interruttore in {a} non funziona']));

export const pack = {
  identity: {
    nome_ruolo: 'impresa elettrica / elettricista',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un\'impresa elettrica (elettricista / impiantista). Accogli i clienti con tono cortese, concreto e rassicurante; gestisci richieste di intervento, sopralluogo, preventivo, certificazione, informazioni e urgenze. Non sei un tecnico: non fai diagnosi del guasto a distanza, non dai istruzioni per riparare, modificare o escludere parti dell\'impianto, non stimi costi né tempi di intervento.',
  },
  mission: 'Capire se si tratta di un guasto, di un lavoro o di un\'informazione, raccogliere solo i dati necessari (problema o lavoro, nome, indirizzo dell\'intervento), organizzare sopralluogo o intervento e far arrivare subito al team le situazioni pericolose.',
  tone_default: 'professionale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, senza tecnicismi inutili.',
    'Con chi ha un guasto o un problema di sicurezza: prima una frase di vicinanza e calma, poi la domanda.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Mai istruzioni su come riparare, smontare, collegare, escludere o aggirare parti dell\'impianto (salvavita, contatore, quadro, prese, cavi).',
    'Mai diagnosi del guasto a distanza ("sarà il contatore", "è sicuramente un cortocircuito") e mai rassicurazioni sulla sicurezza ("non è pericoloso", "può aspettare").',
    'Prezzi, tariffe di uscita, orari, zone servite, tempi di arrivo e servizi offerti solo se presenti nei dati dell\'attività; altrimenti dire che si verifica con il team.',
  ],
  prohibited_claims: [
    'spiegare come riparare, sostituire, collegare, escludere o manomettere parti dell\'impianto elettrico',
    'dire cosa ha causato il guasto o che guasto è, senza sopralluogo',
    'dire che una situazione elettrica non è pericolosa o che si può aspettare',
    'dichiarare a norma o sicuro un impianto senza verifica del tecnico',
    'indicare prezzi, tariffe di uscita, sconti, orari, tempi di arrivo o zone non presenti nelle fonti',
    'garantire esiti, tempi o risultati',
  ],
  business_rules: [
    'Disdette e spostamenti di interventi già fissati vanno passati al team.',
    'Fumo, scintille, odore di bruciato, scosse, prese che si sciolgono, acqua con corrente hanno priorità assoluta sulla raccolta dati.',
    'Il sopralluogo è la base per un preventivo preciso in molti lavori; condizioni e costi sono dati dell\'attività.',
  ],

  entities: [
    { id: 'tipo_lavoro', descrizione: 'Il lavoro richiesto o il tipo di problema da risolvere.', tipo: 'enum', priorita: 10,
      valori: ['riparazione_guasto', 'impianto_nuovo', 'adeguamento_norma', 'certificazione', 'quadro_elettrico', 'salvavita', 'messa_a_terra', 'prese_interruttori', 'illuminazione', 'citofono', 'cancello_automatico', 'climatizzatore', 'boiler', 'fotovoltaico', 'wallbox', 'domotica', 'antenna_rete', 'allarme_sicurezza', 'contatore_potenza', 'verifica_impianto', 'altro'],
      domanda_varianti: ['Di che intervento o lavoro ha bisogno? Mi descriva pure il problema o cosa vuole fare.', 'Mi racconta cosa serve: un guasto da sistemare o un lavoro da fare?', 'Per quale lavoro o problema vuole il nostro intervento?'] },
    { id: 'problema', descrizione: 'Il problema o guasto descritto dal cliente (come lo descrive, senza diagnosi).', tipo: 'enum', priorita: 12,
      valori: ['senza_corrente', 'salvavita_scatta', 'presa_guasta', 'luci_difettose', 'interruttore_guasto', 'scatto_con_apparecchio', ...Object.keys(CRITICI), ...Object.keys(ALTI), 'altro'],
      domanda_varianti: ['Mi racconta che problema sta avendo?', 'Che cosa succede, esattamente?', 'Può descrivermi brevemente cosa non funziona?'] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'] },
    { id: 'indirizzo_intervento', descrizione: 'Indirizzo o zona (via e comune) dove va fatto l\'intervento.', tipo: 'string', priorita: 30,
      domanda_varianti: ['Mi dice via e comune dove serve l\'intervento?', 'In quale indirizzo dovremmo intervenire?', 'Dove si trova l\'immobile (via e comune)?'] },
    { id: 'tipo_immobile', descrizione: 'Tipo di immobile: abitazione, villa, negozio, ufficio, capannone, condominio.', tipo: 'enum', priorita: 40,
      valori: ['abitazione', 'villa', 'negozio', 'ufficio', 'capannone', 'condominio', 'altro'],
      domanda_varianti: ['Si tratta di un appartamento, una villa, un negozio o altro?'] },
    { id: 'urgenza', descrizione: 'Se la richiesta è urgente o programmabile.', tipo: 'enum', priorita: 70, valori: ['urgente', 'non_urgente'],
      domanda_varianti: ['È una cosa urgente o si può programmare?'] },
    { id: 'giorno', descrizione: 'Giorno preferito per sopralluogo o intervento.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
    { id: 'motivo_certificazione', descrizione: 'Perché serve la certificazione (vendita, affitto, lavori, allaccio...).', tipo: 'string', priorita: 80 },
  ],

  lexicon: [
    // ---- Problemi urgenti (CRITICAL / HIGH): collegati all'intent di emergenza ----
    ...Object.entries(CRITICI).map(([k, forme]) => ({ canonical: k, entity: 'problema', value: k, negabile: true, synonyms: forme, intent: 'emergenza_elettrica' })),
    ...Object.entries(ALTI).map(([k, forme]) => ({ canonical: k, entity: 'problema', value: k, negabile: true, synonyms: forme, intent: 'emergenza_elettrica' })),

    // ---- Problemi ordinari: valorizzano sia "problema" sia tipo_lavoro=riparazione_guasto ----
    ...Object.entries(PROBLEMI_ORD).flatMap(([k, forme]) => {
      const neg = k === 'salvavita_scatta';
      return [
        { canonical: k, entity: 'problema', value: k, negabile: neg, synonyms: forme, intent: 'guasto_elettrico', errors: k === 'senza_corrente' ? ['senza corente', 'sensa corrente'] : [] },
        { canonical: `${k}_lavoro`, entity: 'tipo_lavoro', value: 'riparazione_guasto', negabile: neg, synonyms: forme },
      ];
    }),

    // ---- Lavori (tipo_lavoro) ----
    { canonical: 'certificazione', entity: 'tipo_lavoro', value: 'certificazione', synonyms: ['dichiarazione di conformita', 'dichiarazione conformita', 'di co', 'certificazione', 'certificazione impianto', 'certificato impianto', 'certificato dell impianto', 'certificato per l impianto', 'certificazione dell impianto', 'certificato di conformita', 'certificare', 'certificare l impianto', 'certificazione elettrica', 'certificato elettrico', 'dichiarazione di rispondenza', 'collaudo impianto'], errors: ['certificazzione', 'dichiarazione di conformità'] },
    { canonical: 'adeguamento_norma', entity: 'tipo_lavoro', value: 'adeguamento_norma', synonyms: ['mettere a norma', 'messa a norma', 'impianto a norma', 'impianto non a norma', 'adeguamento', 'adeguare l impianto', 'adeguamento impianto', 'rimettere a norma'] },
    { canonical: 'messa_a_terra', entity: 'tipo_lavoro', value: 'messa_a_terra', synonyms: ['messa a terra', 'impianto di terra', 'dispersore', 'picchetto di terra', 'verifica di terra', 'collegamento a terra', 'la terra'] },
    { canonical: 'quadro_elettrico', entity: 'tipo_lavoro', value: 'quadro_elettrico', synonyms: ['quadro elettrico', 'quadro', 'quadretto', 'centralino', 'cassetta dei fusibili', 'scatola dei fusibili', 'fusibili', 'sostituire il quadro', 'rifare il quadro', 'nuovo quadro'], slang: ['quadretto elettrico'] },
    { canonical: 'salvavita', entity: 'tipo_lavoro', value: 'salvavita', synonyms: ['salvavita', 'differenziale', 'magnetotermico', 'interruttore differenziale', 'interruttore magnetotermico', 'salva vita'] },
    { canonical: 'illuminazione', entity: 'tipo_lavoro', value: 'illuminazione', synonyms: ['illuminazione', 'lampadina', 'lampadine', 'lampadario', 'lampadari', 'faretti', 'faretto', 'plafoniera', 'plafoniere', 'strisce led', 'striscia led', 'luci led', 'led', 'applique', 'luce esterna', 'illuminazione esterna', 'lampioni', 'punti luce', 'punto luce'] },
    { canonical: 'prese_interruttori', entity: 'tipo_lavoro', value: 'prese_interruttori', synonyms: ['presa', 'prese', 'presa elettrica', 'prese elettriche', 'interruttore', 'interruttori', 'punto presa', 'punti presa', 'placche', 'presa usb', 'prese usb', 'deviatore', 'deviatori', 'dimmer', 'pulsante'] },
    { canonical: 'citofono', entity: 'tipo_lavoro', value: 'citofono', synonyms: ['citofono', 'videocitofono', 'video citofono', 'citofoni', 'campanello', 'suoneria'] },
    { canonical: 'cancello_automatico', entity: 'tipo_lavoro', value: 'cancello_automatico', synonyms: ['cancello automatico', 'cancello elettrico', 'cancello', 'automazione cancello', 'automazione del cancello', 'motore del cancello', 'apricancello', 'telecomando del cancello', 'basculante', 'serranda', 'sbarra'] },
    { canonical: 'climatizzatore', entity: 'tipo_lavoro', value: 'climatizzatore', synonyms: ['climatizzatore', 'condizionatore', 'condizionatori', 'climatizzatori', 'aria condizionata', 'pompa di calore', 'split'], slang: ['clima'] },
    { canonical: 'boiler', entity: 'tipo_lavoro', value: 'boiler', synonyms: ['boiler', 'scaldabagno', 'scaldacqua', 'boiler elettrico', 'scaldabagno elettrico'] },
    { canonical: 'fotovoltaico', entity: 'tipo_lavoro', value: 'fotovoltaico', synonyms: ['fotovoltaico', 'pannelli solari', 'pannelli fotovoltaici', 'impianto fotovoltaico', 'impianto solare', 'batteria di accumulo', 'accumulo', 'pannelli'], slang: ['solare'] },
    { canonical: 'wallbox', entity: 'tipo_lavoro', value: 'wallbox', synonyms: ['wallbox', 'wall box', 'colonnina', 'colonnina di ricarica', 'ricarica auto elettrica', 'ricarica per auto elettrica', 'punto di ricarica', 'ricarica auto', 'auto elettrica', 'caricatore auto'] },
    { canonical: 'domotica', entity: 'tipo_lavoro', value: 'domotica', synonyms: ['domotica', 'casa intelligente', 'smart home', 'automazione domestica', 'automazioni', 'tapparelle elettriche', 'tapparelle automatiche', 'motorizzare le tapparelle', 'motorizzazione tapparelle', 'tapparelle'] },
    { canonical: 'antenna_rete', entity: 'tipo_lavoro', value: 'antenna_rete', synonyms: ['antenna', 'antenna tv', 'presa tv', 'presa antenna', 'cablaggio', 'cablaggio di rete', 'rete lan', 'presa di rete', 'presa lan', 'prese lan', 'cavo di rete', 'impianto tv', 'impianto di rete'] },
    { canonical: 'allarme_sicurezza', entity: 'tipo_lavoro', value: 'allarme_sicurezza', synonyms: ['allarme', 'antifurto', 'impianto di allarme', 'impianto antifurto', 'videosorveglianza', 'telecamere', 'sirena'] },
    { canonical: 'contatore_potenza', entity: 'tipo_lavoro', value: 'contatore_potenza', synonyms: ['spostare il contatore', 'nuovo contatore', 'allaccio', 'nuovo allaccio', 'aumento di potenza', 'aumentare la potenza', 'aumento potenza', 'potenza del contatore', 'potenza impegnata', 'allaccio contatore'] },
    { canonical: 'verifica_impianto', entity: 'tipo_lavoro', value: 'verifica_impianto', synonyms: ['verifica dell impianto', 'verifica impianto', 'controllo dell impianto', 'controllo impianto', 'controllare l impianto', 'revisione dell impianto', 'manutenzione impianto', 'check up impianto', 'controllo generale', 'far controllare l impianto', 'far vedere l impianto', 'dare un occhiata all impianto', 'verifica elettrica', 'verifica periodica', 'manutenzione'] },
    { canonical: 'impianto_nuovo', entity: 'tipo_lavoro', value: 'impianto_nuovo', synonyms: [...['rifare', 'rifacimento', 'sostituire', 'cambiare', 'fare', 'realizzare'].flatMap((v) => ['impianto', 'l impianto', 'tutto l impianto', 'l intero impianto', 'impianto elettrico', 'l impianto elettrico'].map((x) => `${v} ${x}`)), 'rifare da zero', 'rifare tutto da zero', 'impianto nuovo', 'nuovo impianto', 'nuovo impianto elettrico', 'impianto elettrico nuovo', 'rifare l impianto', 'rifacimento impianto', 'rifacimento dell impianto', 'rifare impianto', 'rifare tutto l impianto', 'rifare l impianto elettrico', 'rifacimento impianto elettrico', 'ristrutturazione', 'ristrutturare', 'ristrutturando', 'casa da ristrutturare', 'casa nuova', 'nuova casa', 'fare l impianto', 'fare impianto', 'fare l impianto elettrico', 'impianto elettrico completo', 'impianto completo', 'impianto da zero', 'cantiere', 'lavori di ristrutturazione', 'rifare la parte elettrica', 'parte elettrica', 'impianto civile', 'impianto industriale', 'nuovo ufficio', 'nuovo negozio', 'nuovo locale', 'impianto del negozio', 'impianto dell ufficio'], slang: ['impiantone'], errors: ['ristrutturzione', 'ristruturazione'] },

    // ---- Tipo di immobile ----
    { canonical: 'immobile_abitazione', entity: 'tipo_immobile', value: 'abitazione', synonyms: ['appartamento', 'bilocale', 'trilocale', 'monolocale', 'mansarda', 'attico', 'abitazione', 'casa mia', 'la mia casa', 'in casa', 'a casa', 'casa'] },
    { canonical: 'immobile_villa', entity: 'tipo_immobile', value: 'villa', synonyms: ['villa', 'villetta', 'casa indipendente', 'casolare', 'rustico', 'casa di campagna'] },
    { canonical: 'immobile_negozio', entity: 'tipo_immobile', value: 'negozio', synonyms: ['negozio', 'locale commerciale', 'attivita commerciale', 'ristorante', 'pizzeria', 'parrucchiere', 'bar', 'farmacia', 'palestra'] },
    { canonical: 'immobile_ufficio', entity: 'tipo_immobile', value: 'ufficio', synonyms: ['ufficio', 'uffici', 'studio professionale'] },
    { canonical: 'immobile_capannone', entity: 'tipo_immobile', value: 'capannone', synonyms: ['capannone', 'magazzino', 'azienda', 'fabbrica', 'stabilimento', 'officina', 'laboratorio'] },
    { canonical: 'immobile_condominio', entity: 'tipo_immobile', value: 'condominio', synonyms: ['condominio', 'scale condominiali', 'scala condominiale', 'parti comuni', 'androne', 'amministratore'] },

    // ---- Indirizzo (marcatore: il valore reale lo estrae l'analisi LLM) ----
    { canonical: 'indirizzo_indicato', entity: 'indirizzo_intervento', value: 'indicato', synonyms: ['via', 'viale', 'piazza', 'corso', 'vicolo', 'localita', 'frazione', 'abito a', 'abito in', 'abitiamo a', 'abitiamo in', 'il mio indirizzo', 'l indirizzo e', 'indirizzo e'] },

    // ---- Urgenza dichiarata ----
    { canonical: 'urgenza_alta', entity: 'urgenza', value: 'urgente', negabile: true, synonyms: ['urgente', 'urgentissimo', 'il prima possibile', 'prima possibile', 'al piu presto', 'subito', 'in giornata', 'oggi stesso', 'immediatamente'] },
    { canonical: 'urgenza_bassa', entity: 'urgenza', value: 'non_urgente', synonyms: ['non e urgente', 'non urgente', 'senza fretta', 'nessuna fretta', 'non ho fretta', 'con calma', 'con comodo', 'non c e fretta', 'nei prossimi giorni'] },

    // ---- Concetti di conversazione (collegano all'intent) ----
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto mi costa', 'quanto prendete', 'quanto chiedete', 'quanto vi fate pagare', 'quanto si paga', 'quanto spendo', 'quanto mi viene', 'tariffa', 'tariffe', 'listino', 'diritto di chiamata', 'diritto fisso', 'costo di uscita', 'costo dell uscita', 'costo uscita', 'tariffa di uscita', 'quota di uscita', 'tariffa oraria', 'costo orario', 'costo del sopralluogo', 'sopralluogo gratuito', 'sopralluogo gratis', 'preventivo gratuito', 'preventivo gratis'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario di apertura', 'orario di lavoro', 'orario di chiusura', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'a che ora aprite', 'a che ora chiudete', 'fino a che ora', 'siete operativi'], intent: 'info_orari' },
    { canonical: 'reperibilita', synonyms: ['reperibili', 'reperibilita', 'reperibile', 'h24', 'h 24', '24 ore', '24 su 24', 'ventiquattro ore', '7 su 7', 'sette su sette', 'di notte', 'notturno', 'festivi', 'giorni festivi', 'pronto intervento', 'intervento notturno', 'nel weekend', 'nel fine settimana', 'tempi di intervento', 'tempi di attesa', 'in quanto tempo'], intent: 'info_reperibilita' },
    { canonical: 'zona_servita', synonyms: ['zone servite', 'zona servita', 'zona di intervento', 'zone di intervento', 'zona di copertura', 'coprite', 'copertura', 'lavorate anche a', 'lavorate a', 'lavorate anche nella', 'lavorate anche in', 'lavorate nella provincia', 'lavorate in provincia', 'nella provincia di', 'in provincia di', 'intervenite anche nella', 'intervenite anche in', 'intervenite in', 'arrivate anche a', 'arrivate anche in', 'venite anche a', 'venite anche in', 'venite fino a', 'lavorate in zona', 'lavorate nella zona', 'intervenite a', 'intervenite anche a', 'arrivate a', 'arrivate fino a', 'fate trasferte', 'in che zone', 'in quali zone', 'in quali comuni', 'dove operate', 'dove lavorate', 'dove intervenite', 'raggio d azione', 'siete di zona', 'vi spostate'], intent: 'info_zona' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'rateizzare', 'rateizzazione', 'finanziamento', 'bancomat', 'carta di credito', 'carta', 'carte', 'contanti', 'bonifico', 'fattura', 'ricevuta', 'acconto', 'anticipo', 'saldo', 'satispay', 'paypal', 'assegno', 'detrazione', 'detrazioni', 'bonus', 'ecobonus', 'superbonus', 'sconto in fattura', 'cessione del credito', 'iva agevolata'], intent: 'info_pagamenti' },
    { canonical: 'servizi', synonyms: ['servizi', 'vi occupate', 'che lavori fate', 'quali lavori fate', 'siete abilitati', 'siete certificati', 'siete iscritti'], intent: 'info_servizi' },
    { canonical: 'garanzia', synonyms: ['garanzia', 'garanzie', 'garantite i lavori', 'assistenza dopo il lavoro', 'assistenza post vendita'], intent: 'info_servizi' },
    { canonical: 'documenti', synonyms: ['documenti', 'cosa devo preparare', 'cosa devo avere', 'foto del quadro', 'visura', 'planimetria', 'schema dell impianto', 'libretto impianto', 'cosa devo mandarvi', 'cosa devo inviare', 'posso mandarvi', 'posso inviarvi', 'vi mando una foto', 'vi mando delle foto', 'mandarvi una foto', 'mandarvi delle foto'], intent: 'info_documenti' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima', 'stima dei costi', 'stima del costo', 'stima di spesa', 'computo', 'offerta', 'quotazione', 'quanto costerebbe', 'quanto verrebbe'], intent: 'richiesta_preventivo' },
    { canonical: 'sopralluogo', synonyms: ['sopralluogo', 'sopraluogo', 'appuntamento', 'prenotare', 'prenotazione', 'fissare', 'disponibilita', 'posto libero', 'passare a vedere', 'passate a vedere', 'venire a vedere', 'venite a vedere'], intent: 'richiesta_intervento' },
    { canonical: 'domanda_tecnica', synonyms: ['come funziona', 'cos e', 'cosa e', 'cosa significa', 'che cosa significa', 'a cosa serve', 'che differenza', 'differenza tra', 'cosa vuol dire', 'cosa vuole dire', 'vuol dire', 'spiegami', 'spiegatemi', 'mi spiegate', 'mi spieghi', 'vorrei capire', 'perche scatta', 'perche salta'], intent: 'info_tecniche' },
    { canonical: 'elettricista', synonyms: ['elettricista', 'elettricisti', 'impiantista', 'tecnico', 'un tecnico', 'impresa elettrica', 'ditta', 'operaio', 'squadra'] },
  ],

  intents: [
    { id: 'emergenza_elettrica', nome: 'Emergenza elettrica', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Situazione potenzialmente pericolosa: fili scoperti, cortocircuito, parti che scaldano, scosse, fumo, scintille, acqua con corrente.',
      esempi: ['ho un emergenza elettrica', 'e un emergenza', 'serve subito un elettricista', 'ho un urgenza elettrica', 'emergenza elettrica'],
      keywords: ['emergenza', 'urgentissimo', 'urgentissima'],
      combinazioni: [
        { entity: 'problema', con: ['elettricista', 'tecnico', 'un tecnico', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'vorrei', 'volevo', 'devo', 'potete', 'potreste', 'venite', 'venire', 'passate', 'passare', 'mandate', 'mandare', 'urgente', 'subito', 'chiamare', 'chiamo'], non_con_concepts: Object.keys(PROBLEMI_ORD), score: 0.95 },
      ],
      required_entities: ['nome_cliente', 'indirizzo_intervento'], optional_entities: ['problema', 'tipo_immobile', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'guasto_elettrico', nome: 'Guasto o problema elettrico', categoria: 'SUPPORT', priorita: 15, safety_level: 'MEDIUM', campi_tenant: true,
      descrizione: 'Il cliente descrive un guasto o un problema all\'impianto (senza corrente, salvavita che scatta, presa o luce che non funziona), non necessariamente pericoloso.',
      esempi: ['mi e saltata la corrente', 'mi scatta il salvavita', 'non funziona una presa', 'sono senza luce', 'la luce non si accende', 'ho un problema all impianto elettrico', 'ho un guasto elettrico', 'si e spenta la corrente in casa', 'non riesco a riarmare il salvavita'],
      keywords: ['guasto elettrico', 'problema elettrico', 'problema all impianto'],
      combinazioni: [
        { entity: 'problema', con: ['elettricista', 'tecnico', 'un tecnico', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'vorrei', 'volevo', 'devo', 'potete', 'potreste', 'venite', 'venire', 'passate', 'passare', 'mandate', 'mandare', 'urgente', 'subito', 'chiamare', 'chiamo'], non_con_concepts: [...Object.keys(CRITICI), ...Object.keys(ALTI)], score: 0.95 },
      ],
      required_entities: ['problema', 'nome_cliente', 'indirizzo_intervento'], optional_entities: ['tipo_immobile', 'urgenza', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'propose_slot', 'notify_owner', 'create_lead'] },
    { id: 'richiesta_intervento', nome: 'Richiesta intervento o sopralluogo', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole fissare un intervento, un sopralluogo o un lavoro, o chiede disponibilità.',
      esempi: ['mi serve un elettricista', 'cerco un elettricista', 'avrei bisogno di un elettricista', 'vorrei un sopralluogo', 'vorrei fissare un sopralluogo', 'potete passare a vedere', 'potete venire a vedere', 'vorrei prenotare un intervento', 'vorrei un appuntamento', 'avete disponibilita', 'avete posto domani', 'quando potete venire', 'quando potete passare', 'vorrei fissare un intervento', 'posso prenotare', 'devo far fare un lavoro', 'mi serve un intervento'],
      keywords: ['sopralluogo', 'prenotare', 'prenotazione', 'appuntamento', 'disponibilita', 'fissare'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['vorrei', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo far', 'devo installare', 'devo montare', 'vorrei fare', 'voglio fare', 'vorrei installare', 'vorrei montare', 'vorrei sostituire', 'vorrei cambiare', 'vorrei aggiungere', 'cerco', 'volevo fare', 'dovrei fare', 'dovrei', 'vorrei rifare', 'quando potete', 'quando riuscite', 'potete venire', 'potete passare', 'devo rifare', 'devo sostituire', 'devo cambiare', 'mi occorre', 'devo spostare', 'vorrei spostare'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'certificazione', 'domanda_tecnica', 'servizi', 'documenti', 'pagamento', 'reperibilita', 'zona_servita'], score: 0.8 },
      ],
      required_entities: ['tipo_lavoro', 'nome_cliente', 'indirizzo_intervento'], optional_entities: ['tipo_immobile', 'giorno', 'fascia_oraria', 'urgenza'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_preventivo', nome: 'Richiesta preventivo', categoria: 'LEAD', priorita: 25, safety_level: 'LOW',
      descrizione: 'Il cliente chiede un preventivo o una stima per un impianto, una ristrutturazione o un lavoro.',
      esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'mi serve un preventivo', 'potete farmi un preventivo', 'preventivo per rifare l impianto', 'preventivo per una ristrutturazione', 'vorrei una stima dei costi', 'potete farmi una stima', 'quanto costerebbe rifare tutto l impianto', 'quanto verrebbe rifare l impianto', 'vorrei un preventivo per'],
      keywords: ['preventivo', 'preventivi', 'stima dei costi'],
      required_entities: ['tipo_lavoro', 'nome_cliente'], optional_entities: ['tipo_immobile', 'indirizzo_intervento', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'richiesta_certificazione', nome: 'Certificazione o dichiarazione di conformità', categoria: 'LEAD', priorita: 24, safety_level: 'LOW',
      descrizione: 'Il cliente chiede la dichiarazione di conformità, la certificazione o la messa a norma dell\'impianto.',
      esempi: ['mi serve la dichiarazione di conformita', 'vorrei la dichiarazione di conformita', 'mi serve la certificazione dell impianto', 'devo certificare l impianto', 'devo mettere a norma l impianto', 'vorrei mettere a norma l impianto', 'mi serve il certificato dell impianto', 'serve il certificato per la vendita della casa', 'serve la di co per l affitto', 'devo avere la certificazione'],
      keywords: ['dichiarazione di conformita', 'certificazione', 'certificare', 'mettere a norma', 'messa a norma'],
      required_entities: ['nome_cliente', 'indirizzo_intervento'], optional_entities: ['motivo_certificazione', 'tipo_immobile', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa un intervento, il diritto di uscita o la tariffa.',
      esempi: ['quanto costa', 'che prezzo avete', 'quanto viene', 'quanto prendete', 'mi dice il costo', 'avete un listino', 'quali sono le tariffe', 'quanto costa un intervento', 'quanto costa l uscita', 'avete un costo di uscita', 'c e un costo per il sopralluogo', 'il sopralluogo e gratuito', 'il preventivo e gratuito', 'quanto costa il sopralluogo', 'prezzi', 'costo'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'tariffe', 'listino', 'diritto di chiamata'],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede gli orari di apertura o di lavoro.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'lavorate di sabato', 'lavorate la domenica', 'siete aperti a pranzo'],
      keywords: ['orari', 'orario di apertura', 'aperti', 'chiusi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_reperibilita', nome: 'Reperibilità e pronto intervento', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se esiste un servizio di pronto intervento, reperibilità notturna/festiva o i tempi tipici di intervento.',
      esempi: ['fate pronto intervento', 'siete reperibili', 'siete reperibili di notte', 'intervenite anche la domenica', 'intervenite anche di notte', 'avete il servizio notturno', 'fate interventi urgenti', 'siete h24', 'lavorate anche nei festivi', 'in quanto tempo potete intervenire', 'in quanto tempo arrivate', 'quanto ci mettete ad arrivare', 'tempi di intervento', 'fate emergenze'],
      keywords: ['reperibili', 'reperibilita', 'pronto intervento', 'tempi di intervento', 'festivi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_zona', nome: 'Zone servite', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se l\'impresa interviene in una certa zona o comune.',
      esempi: ['in che zone intervenite', 'lavorate anche nella provincia', 'venite anche nella mia zona', 'dove operate', 'dove lavorate', 'quali zone servite', 'lavorate anche a', 'intervenite anche a', 'arrivate fino a', 'coprite la mia zona', 'fate trasferte', 'zona di intervento', 'siete di zona', 'in quali comuni lavorate'],
      keywords: ['zone servite', 'zona servita', 'coprite', 'trasferte', 'in che zone', 'in quali zone', 'dove operate', 'dove intervenite'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Informazioni servizi', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quali lavori vengono fatti o se si fa un certo lavoro.',
      esempi: ['che lavori fate', 'di cosa vi occupate', 'fate anche impianti fotovoltaici', 'fate anche wallbox', 'fate le certificazioni', 'quali servizi offrite', 'installate climatizzatori', 'montate cancelli automatici', 'avete la garanzia sui lavori', 'sapete fare la domotica', 'siete abilitati per il fotovoltaico', 'fate lavori anche per le aziende'],
      keywords: ['servizi', 'vi occupate', 'che lavori fate', 'quali lavori fate', 'garanzia', 'siete abilitati'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['fate', 'fate anche', 'installate', 'montate', 'vi occupate di', 'sapete fare', 'riuscite a fare', 'effettuate', 'eseguite', 'realizzate', 'trattate', 'vi occupate anche di'], non_con_concepts: ['preventivo', 'prezzo', 'domanda_tecnica'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Pagamenti, fattura, detrazioni', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento, rate, fattura, detrazioni e bonus.',
      esempi: ['accettate carte', 'si puo pagare a rate', 'fate rateizzazione', 'accettate il bancomat', 'fate fattura', 'si paga con la carta', 'si paga in contanti', 'fate lo sconto in fattura', 'avete il finanziamento', 'c e la detrazione fiscale', 'serve un acconto'],
      keywords: ['rate', 'rateale', 'finanziamento', 'bancomat', 'fattura', 'acconto', 'detrazione', 'detrazioni', 'bonus', 'ecobonus', 'superbonus', 'contanti', 'bonifico'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_documenti', nome: 'Cosa preparare o inviare', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Cosa serve preparare o mandare per sopralluogo, preventivo o certificazione.',
      esempi: ['cosa devo preparare', 'che documenti servono', 'cosa serve per il preventivo', 'cosa serve per il sopralluogo', 'posso mandarvi delle foto', 'vi mando una foto del quadro', 'serve la planimetria', 'servono i documenti dell impianto', 'cosa devo mandarvi'],
      keywords: ['documenti', 'planimetria', 'visura', 'libretto impianto'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_tecniche', nome: 'Domande generali sugli impianti', categoria: 'INFORMATION', priorita: 32, safety_level: 'MEDIUM',
      descrizione: 'Domande generali di conoscenza (cos\'è il salvavita, cosa significa impianto a norma): risposta solo con conoscenza di settore, mai diagnosi del caso specifico.',
      esempi: ['cos e il salvavita', 'cosa e il salvavita', 'a cosa serve il salvavita', 'come funziona il salvavita', 'perche scatta il salvavita', 'perche salta il salvavita', 'cosa significa impianto a norma', 'cos e la messa a terra', 'a cosa serve la messa a terra', 'cos e la dichiarazione di conformita', 'che differenza c e tra salvavita e magnetotermico', 'cos e un differenziale', 'cos e il magnetotermico', 'ogni quanto va controllato l impianto', 'cos e il quadro elettrico', 'cos e una wallbox', 'come funziona il fotovoltaico', 'cosa significa potenza impegnata', 'in cosa consiste il sopralluogo', 'a cosa serve il sopralluogo'],
      keywords: ['come funziona', 'cos e', 'cosa significa', 'a cosa serve', 'differenza tra', 'che differenza', 'cosa vuol dire'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['cosa vuol dire', 'cosa vuole dire', 'cosa significa', 'che cosa significa', 'cos e', 'cosa e', 'come funziona', 'come funzionano', 'a cosa serve', 'a cosa servono', 'mi spiegate', 'mi spieghi', 'spiegatemi', 'che differenza'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'sollecito_intervento', nome: 'Sollecito o stato dell\'intervento', categoria: 'SUPPORT', priorita: 18, safety_level: 'MEDIUM',
      descrizione: 'Il cliente ha già un intervento fissato e chiede quando arriva il tecnico o segnala un ritardo.',
      esempi: ['a che ora arriva il tecnico', 'quando arriva il tecnico', 'quando arrivate', 'siete in ritardo', 'il tecnico non e ancora arrivato', 'non e ancora arrivato nessuno', 'state arrivando', 'siete in arrivo', 'il tecnico e in ritardo', 'stiamo ancora aspettando', 'a che punto siete', 'il tecnico non si e visto'],
      keywords: ['in ritardo', 'ancora aspettando', 'non e ancora arrivato', 'non si e visto'],
      required_entities: [], optional_entities: ['nome_cliente'], actions: ['notify_owner'] },
    { id: 'cancella_intervento', nome: 'Disdetta intervento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole disdire un intervento o sopralluogo già fissato.',
      esempi: ['devo disdire', 'vorrei cancellare l intervento', 'non mi serve piu l intervento', 'annullare l appuntamento', 'devo annullare', 'disdire il sopralluogo', 'non serve piu che veniate', 'annullate l intervento', 'annullate pure il sopralluogo', 'annullate pure l intervento', 'annullate il sopralluogo', 'annullate la visita', 'non venite piu', 'non serve piu'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'annullate', 'disdico'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_intervento', nome: 'Spostamento intervento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole spostare un intervento o sopralluogo già fissato.',
      esempi: ['devo spostare l intervento', 'posso cambiare giorno', 'vorrei rimandare', 'posso anticipare l intervento', 'posso spostare a un altro giorno', 'devo cambiare orario', 'posticipare il sopralluogo', 'potete passare un altro giorno', 'domani non ci sono', 'possiamo fare un altro giorno', 'un altro giorno', 'un altro orario', 'in un altro orario'],
      keywords: ['un altro giorno', 'un altro orario', 'spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'spostiamo'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per un lavoro, un intervento o un trattamento ricevuto.',
      esempi: ['sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'il lavoro non e stato fatto bene', 'sono molto arrabbiato', 'ho avuto un brutto servizio', 'non sono contento del lavoro', 'dopo il vostro intervento non funziona piu', 'dopo il vostro intervento', 'il problema e tornato dopo il vostro intervento', 'sono stato trattato male', 'sono deluso dal servizio', 'il vostro tecnico ha lasciato sporco'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona.',
      esempi: ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con il titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con un tecnico', 'mi passate il titolare', 'preferisco una telefonata'],
      keywords: ['operatore'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene grazie', 'ok', 'a posto', 'ricevuto', 'ci sentiamo'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo per le persone -> escalation immediata, messaggio di sicurezza predefinito.
    critical: Object.values(CRITICI).flat(),
    // HIGH: situazione pericolosa o emergenza dichiarata -> priorità al team.
    high: Object.values(ALTI).flat(),
    // MEDIUM: guasto che merita priorità ma senza segnali di pericolo.
    medium: [...Object.values(PROBLEMI_ORD).flat(), 'urgente', 'urgenza', 'e urgente'],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare con l elettricista', 'parlare con il tecnico', 'parlare con un tecnico', 'parlare con il responsabile', 'parlare con un umano', 'parlare direttamente', 'parlare di persona', 'parlarne con una persona', 'parlarne con qualcuno', 'sentire una persona', 'sentire il tecnico', 'sentire il titolare', 'contattare il titolare', 'contattare il tecnico', 'contattare una persona', 'parlare con una persona vera',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi il titolare', 'mi passate il titolare', 'mi passi il titolare', 'mi passate il tecnico', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'mi potete chiamare', 'mi potete richiamare', 'mi puoi chiamare', 'potete chiamarmi', 'potete richiamarmi',
      'non sei una persona', 'sei un robot', 'sei un bot', 'operatore', 'persona vera', 'persona reale', 'preferisco una telefonata', 'meglio una telefonata', 'preferisco telefonare',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del team, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a chiedere istruzioni di riparazione/manomissione,
    // diagnosi a distanza o rassicurazioni sulla sicurezza.
    diagnosi_patterns: [
      // fai-da-te, manomissione, aggiramento
      'come bypasso', 'come bypassare', 'bypassare', 'bypass', 'by pass', 'come escludo il salvavita', 'come escludere il salvavita', 'come disattivo il salvavita', 'come disattivare il salvavita', 'come tolgo il salvavita', 'togliere il salvavita',
      'come evito che scatti', 'come faccio a non farlo scattare', 'come aggiro', 'aggirare', 'manomettere', 'manomissione', 'sigilli', 'piombi', 'rubare la corrente', 'allaccio abusivo', 'allacciarmi abusivamente', 'attaccare direttamente', 'collegare direttamente al contatore', 'a monte del contatore',
      'posso farlo da solo', 'posso farlo da sola', 'posso farlo da me', 'lo faccio da solo', 'lo faccio da sola', 'lo faccio io', 'fai da te', 'faidate', 'come lo ripari', 'come si ripara', 'come riparare', 'come aggiusto', 'come aggiustare', 'come sistemare', 'come sistemo', 'come posso riparare', 'posso ripararlo', 'posso riparare', 'posso aggiustarlo',
      'come cambio la presa', 'come si cambia la presa', 'come sostituisco', 'come si sostituisce', 'come si collega', 'come collego', 'come monto', 'come faccio a collegare', 'come si fa a collegare', 'tutorial', 'guida passo passo', 'istruzioni per', 'spiegami come', 'dimmi come', 'spiegatemi come',
      'cosa devo toccare', 'cosa devo staccare', 'quale filo', 'quale cavo devo', 'colore dei fili', 'colori dei fili', 'che colore ha il filo', 'filo della fase', 'quale filo e la fase', 'quale filo e il neutro',
      'posso toccare', 'e sicuro toccare', 'filo giallo e verde', 'filo giallo verde', 'cavo giallo e verde', 'al neutro', 'alla fase', 'il neutro', 'fase e neutro', 'neutro e fase', 'filo della fase', 'filo del neutro', 'cavo della fase', 'cavo del neutro', 'filo blu', 'cavo blu', 'filo marrone', 'cavo marrone', 'collegare il filo', 'collegare i fili', 'collegare il cavo', 'collegare i cavi', 'unire i fili', 'giuntare', 'invertire i fili', 'scambiare i fili', 'posso sostituire', 'posso cambiare', 'posso montare', 'posso installare', 'posso collegare', 'posso smontare', 'posso fare io', 'posso fare da solo', 'posso fare da sola', 'mi dite come si fa', 'mi dici come si fa', 'come si fa a sostituire', 'come si fa a cambiare', 'come si fa a montare', 'come si fa a installare', 'come si fa a riparare', 'posso riarmare', 'posso rialzare il salvavita', 'posso riattaccare',
      // diagnosi a distanza
      'cosa puo essere', 'che cosa puo essere', 'cosa potrebbe essere', 'che cos ho', 'che cosa ho', 'qual e il guasto', 'qual e il problema', 'cosa si e rotto', 'cosa si e guastato', 'che guasto potrebbe essere', 'secondo te', 'secondo lei', 'secondo voi', 'e colpa del', 'e colpa dell', 'dimmi cosa ho', 'dimmi almeno cosa',
      // rassicurazioni sulla sicurezza
      'e pericoloso', 'e grave', 'e normale che', 'devo preoccuparmi', 'mi devo preoccupare', 'posso stare tranquillo', 'c e pericolo', 'e rischioso', 'si puo aspettare', 'posso aspettare', 'posso continuare a usare', 'posso continuare a usarlo', 'posso usare la presa', 'posso tenere acceso', 'posso lasciare acceso', 'posso lasciarla cosi', 'posso lasciare cosi', 'e preoccupante', 'e serio', 'cosa grave', 'cosa seria',
      'cosa posso fare nel frattempo', 'cosa faccio nel frattempo', 'cosa devo fare intanto', 'cosa faccio intanto', 'nel frattempo cosa faccio', 'nel frattempo che faccio', 'cosa mi consigli di fare', 'cosa mi consiglia di fare', 'cosa mi consigliate di fare',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'stacchi i fili', 'stacca i fili', 'scolleghi il cavo', 'scollega il cavo', 'svita', 'svitare', 'sviti', 'bypassi', 'bypassare', 'escluda il salvavita', 'escludere il salvavita',
      'puo farlo da solo', 'puoi farlo da solo', 'puo ripararlo da solo', 'e semplice da fare', 'e facile da fare', 'basta sostituire', 'basta riarmare', 'basta cambiare', 'cambi la presa',
      'e sicuramente un cortocircuito', 'si tratta di un cortocircuito', 'e sicuramente il contatore', 'il problema e sicuramente', 'sara sicuramente', 'e sicuramente colpa', 'e colpa del', 'e colpa dell',
      'non e pericoloso', 'non e pericolosa', 'non e grave', 'non e nulla', 'non e niente', 'non si preoccupi', 'non si preoccupare', 'puo aspettare', 'puoi aspettare', 'nessun pericolo', 'nessun rischio', 'senza rischi', 'senza alcun rischio',
      'il suo impianto e a norma', 'il tuo impianto e a norma', 'il vostro impianto e a norma', 'impianto sicuramente a norma',
    ],
    messaggio_sicurezza: 'Per la sua sicurezza non posso dare istruzioni su come riparare, modificare o escludere parti dell\'impianto, né capire a distanza che guasto sia: serve un elettricista sul posto. Se vuole, la aiuto subito a richiedere un intervento o un sopralluogo. Se sente odore di bruciato o vede fumo o scintille, non tocchi nulla e chiami subito il 112 o il 115.',
    messaggio_emergenza: 'La situazione potrebbe essere pericolosa: non tocchi impianto, prese, cavi o apparecchi coinvolti e non cerchi di intervenire da solo. Solo se può farlo in sicurezza, senza toccare nulla di bagnato o danneggiato, tolga la corrente dall\'interruttore generale. In caso di fumo, fiamme o persone che stanno male, esca dall\'ambiente e chiami subito il 112 o il 115. Segnalo subito la sua richiesta al team come urgente.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    tipo_lavoro: ['Di che intervento o lavoro ha bisogno? Mi descriva pure il problema o cosa vuole fare.', 'Mi racconta cosa serve: un guasto da sistemare o un lavoro da fare?', 'Per quale lavoro o problema vuole il nostro intervento?'],
    problema: ['Mi racconta che problema sta avendo?', 'Che cosa succede, esattamente?', 'Può descrivermi brevemente cosa non funziona?'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    indirizzo_intervento: ['Mi dice via e comune dove serve l\'intervento?', 'In quale indirizzo dovremmo intervenire?', 'Dove si trova l\'immobile (via e comune)?'],
    tipo_immobile: ['Si tratta di un appartamento, una villa, un negozio o altro?'],
    urgenza: ['È una cosa urgente o si può programmare?'],
  },

  common_scenarios: [
    'Guasto (senza corrente, salvavita che scatta, presa o luce) con raccolta di problema, nome e indirizzo',
    'Emergenza di sicurezza (fumo, scintille, scossa, presa che si scioglie, acqua con corrente): escalation immediata',
    'Richiesta di sopralluogo o intervento programmato su un lavoro (quadro, wallbox, climatizzatore, cancello...)',
    'Preventivo per impianto nuovo o ristrutturazione; certificazione e dichiarazione di conformità',
    'Domande su prezzi, uscita, orari, zone, pagamenti: solo da dati del tenant',
    'Richieste di istruzioni fai-da-te, bypass del salvavita, diagnosi a distanza: rifiuto e proposta di intervento',
    'Disdette, spostamenti, reclami, solleciti: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque impresa. Nessun
// prezzo, orario, zona, nome o indirizzo: quelli stanno solo nei dati del tenant.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_tecniche', 'Cos\'è il salvavita?', ['cosa e il salvavita', 'che cos e il salvavita', 'a cosa serve il salvavita', 'come funziona il salvavita', 'cos e un differenziale', 'cos e l interruttore differenziale'],
    'Salvavita è il nome comune dell\'interruttore differenziale: interrompe automaticamente la corrente quando rileva una dispersione verso terra, per proteggere le persone dal rischio di scosse e l\'impianto dai danni.'),
  f('info_tecniche', 'Perché scatta il salvavita?', ['perche salta il salvavita', 'come mai scatta il salvavita', 'perche mi scatta il salvavita', 'come mai salta il salvavita', 'perche scatta il differenziale'],
    'Il salvavita scatta quando rileva una dispersione di corrente: le cause possono essere diverse, per esempio un apparecchio difettoso, umidità o un cavo danneggiato. Non si può capire a distanza: se scatta spesso o non si riarma, conviene far controllare l\'impianto da un elettricista senza forzarlo.'),
  f('info_tecniche', 'Che differenza c\'è tra salvavita e magnetotermico?', ['differenza tra salvavita e magnetotermico', 'differenza tra differenziale e magnetotermico', 'salvavita e magnetotermico sono la stessa cosa', 'magnetotermico o differenziale'],
    'Il differenziale (salvavita) protegge le persone dalle dispersioni di corrente; il magnetotermico protegge cavi e impianto da sovraccarichi e cortocircuiti. Nel quadro spesso ci sono entrambi, a volte combinati in un unico dispositivo.'),
  f('info_tecniche', 'Cos\'è il magnetotermico?', ['cosa e il magnetotermico', 'a cosa serve il magnetotermico', 'come funziona il magnetotermico', 'perche salta il magnetotermico'],
    'Il magnetotermico è l\'interruttore che interviene quando passa troppa corrente in un circuito (sovraccarico) o in caso di cortocircuito. Se interviene spesso è un segnale che l\'impianto va verificato da un professionista.'),
  f('info_tecniche', 'Cos\'è il quadro elettrico?', ['cosa e il quadro elettrico', 'a cosa serve il quadro elettrico', 'che cos e il quadro elettrico', 'cos e il centralino'],
    'Il quadro elettrico (o centralino) è il punto dell\'impianto dove sono raccolti gli interruttori di protezione che distribuiscono e proteggono la corrente nei vari circuiti della casa o dell\'attività.'),
  f('info_tecniche', 'Cosa significa impianto a norma?', ['cosa vuol dire impianto a norma', 'cos e un impianto a norma', 'quando un impianto e a norma', 'cosa significa che l impianto e a norma', 'cosa vuol dire a norma'],
    'Un impianto è a norma quando è realizzato e mantenuto secondo le norme tecniche e di legge, con componenti adeguati, protezioni (come differenziale e messa a terra) e la documentazione prevista. La verifica spetta a un tecnico abilitato.'),
  f('info_tecniche', 'Cos\'è la dichiarazione di conformità?', ['cosa e la dichiarazione di conformita', 'cos e la di co', 'a cosa serve la dichiarazione di conformita', 'cosa significa dichiarazione di conformita', 'cos e il certificato dell impianto'],
    'La dichiarazione di conformità è il documento che l\'impresa installatrice abilitata rilascia al termine dei lavori per attestare che l\'impianto è stato realizzato a regola d\'arte. Se serve nel suo caso lo valuta l\'impresa.'),
  f('info_tecniche', 'Cos\'è la messa a terra?', ['cosa e la messa a terra', 'a cosa serve la messa a terra', 'che cos e l impianto di terra', 'cosa significa messa a terra'],
    'La messa a terra è il collegamento che convoglia verso terra le correnti disperse, in modo che non passino attraverso le persone. Insieme al differenziale è una delle protezioni fondamentali dell\'impianto.'),
  f('info_tecniche', 'Serve la certificazione dell\'impianto per vendere o affittare casa?', ['serve la certificazione per vendere casa', 'serve la dichiarazione di conformita per l affitto', 'per vendere casa serve il certificato dell impianto', 'certificato impianto per la compravendita'],
    'In molti casi può essere richiesta documentazione sull\'impianto, ma dipende dalla situazione. Per il suo caso specifico conviene confrontarsi con chi segue la compravendita o l\'affitto e con l\'impresa elettrica.'),
  f('info_tecniche', 'Ogni quanto va controllato l\'impianto elettrico?', ['ogni quanto va verificato l impianto', 'ogni quanto si controlla l impianto elettrico', 'quando fare la verifica dell impianto', 'va controllato periodicamente l impianto'],
    'Non c\'è un\'unica regola valida per tutti: è buona pratica una verifica periodica, soprattutto su impianti datati e dopo modifiche o episodi anomali. L\'elettricista può indicare la cadenza più adatta.'),
  f('info_tecniche', 'Quali segnali indicano che l\'impianto va controllato?', ['quando chiamare l elettricista', 'segnali di impianto da controllare', 'come capisco se l impianto e vecchio', 'quando devo far controllare l impianto'],
    'Segnali tipici sono salvavita che scatta spesso, prese o spine che scaldano, luci che sfarfallano, impianto molto datato o privo di protezioni. In questi casi è meglio far verificare l\'impianto a un elettricista.'),
  f('info_tecniche', 'Cos\'è una wallbox?', ['cosa e una wallbox', 'a cosa serve la wallbox', 'cos e la colonnina di ricarica', 'come funziona la wallbox', 'cos e un punto di ricarica'],
    'La wallbox è un dispositivo fissato a parete per ricaricare l\'auto elettrica a casa in modo sicuro. L\'installazione richiede una verifica dell\'impianto e della potenza disponibile.'),
  f('info_tecniche', 'Come funziona un impianto fotovoltaico?', ['cos e un impianto fotovoltaico', 'come funziona il fotovoltaico', 'cosa e il fotovoltaico', 'come funzionano i pannelli fotovoltaici'],
    'L\'impianto fotovoltaico trasforma la luce del sole in elettricità: l\'energia prodotta si usa in casa e può essere accumulata in una batteria o immessa in rete. Il dimensionamento dipende da consumi e spazio disponibile, quindi serve un sopralluogo.'),
  f('info_tecniche', 'Cos\'è la potenza impegnata?', ['cosa e la potenza impegnata', 'cosa significa potenza impegnata', 'cosa vuol dire potenza del contatore', 'perche il contatore scatta con troppi apparecchi', 'cos e la potenza del contatore'],
    'La potenza impegnata è il massimo che si può usare contemporaneamente: se si supera, il contatore può interrompere la corrente. Un aumento si richiede al fornitore di energia; un elettricista può verificare l\'impianto.'),
  f('info_tecniche', 'Posso fare da solo i lavori sull\'impianto elettrico?', ['posso sostituire una presa da solo', 'si possono fare lavori elettrici da soli', 'posso fare l impianto da solo', 'lavori elettrici fai da te'],
    'I lavori sull\'impianto elettrico vanno affidati a professionisti abilitati: errori possono causare rischi per le persone e per l\'immobile, e per alcuni interventi è prevista la dichiarazione di conformità.'),
  f('info_tecniche', 'Cos\'è il sopralluogo e perché serve?', ['a cosa serve il sopralluogo', 'in cosa consiste il sopralluogo', 'cosa si fa durante il sopralluogo', 'perche serve il sopralluogo'],
    'Il sopralluogo è una visita sul posto per vedere impianto, spazi ed esigenze: in molti lavori serve per fare un preventivo preciso. Modalità e condizioni dipendono dall\'impresa.'),
  f('info_documenti', 'Cosa serve per avere un preventivo?', ['cosa devo preparare per il preventivo', 'cosa serve per un preventivo preciso', 'quali informazioni servono per il preventivo', 'cosa vi serve per fare il preventivo'],
    'Per un preventivo sono utili una descrizione dei lavori, il tipo di immobile, foto del quadro elettrico e delle zone interessate e, se disponibile, la planimetria. Per i dettagli verifichi con l\'impresa.'),
  f('info_tecniche', 'Perché le luci sfarfallano?', ['perche le luci lampeggiano', 'come mai la luce sfarfalla', 'luci che sfarfallano perche'],
    'Le luci che sfarfallano possono avere cause diverse (lampadina, alimentatore, regolatore di luce, contatti allentati): a distanza non si può stabilire. Se succede spesso o insieme ad altri segnali, conviene far controllare l\'impianto.'),
  f('info_tecniche', 'Il climatizzatore ha bisogno di una linea dedicata?', ['serve una linea dedicata per il condizionatore', 'il condizionatore ha bisogno di una linea elettrica dedicata', 'linea dedicata per il climatizzatore'],
    'Spesso è consigliata una linea dedicata e protetta per il climatizzatore, ma dipende dall\'impianto esistente: la verifica si fa in sopralluogo.'),
  f('info_tecniche', 'Ogni quanto va fatta la manutenzione del cancello automatico?', ['il cancello automatico va controllato', 'manutenzione del cancello elettrico', 'ogni quanto controllare l automazione del cancello'],
    'Per sicurezza e buon funzionamento è consigliata una manutenzione periodica dell\'automazione del cancello da parte di un tecnico; la frequenza la indica l\'installatore.'),
  f('info_tecniche', 'Cos\'è la domotica?', ['cosa e la domotica', 'cosa significa domotica', 'cos e una casa intelligente', 'che cos e la domotica'],
    'La domotica è l\'insieme di dispositivi e automazioni (luci, tapparelle, clima, allarme) controllabili in modo coordinato, anche da smartphone. Cosa è possibile dipende dall\'impianto e dalle esigenze.'),
];
