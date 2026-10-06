// lib/engine/packs/parrucchiere.js
//
// Sector Pack "parrucchiere" v1 — conoscenza di SETTORE (non di un singolo
// salone). Prezzi, orari, servizi effettivamente offerti, promozioni, nomi del
// personale e indirizzo non stanno qui: arrivano solo dai dati del tenant.
// Questo file è la sorgente versionata in git; viene caricata in
// sector_profiles tramite scripts/pubblica-pack.mjs e promossa a 'production'
// solo dopo che la valutazione (lib/engine/evaluate.js) supera il gate.
//
// Note di progetto (specifiche del settore):
//  - L'urgenza è RARA: di norma un salone riceve prenotazioni e domande. Le
//    uniche urgenze vere sono le reazioni a prodotti chimici (bruciore,
//    ustione, allergia) -> HIGH; gonfiore di viso/labbra/occhi o difficoltà
//    respiratoria dopo un trattamento -> CRITICAL (118).
//  - "urgente" da solo NON è un'urgenza clinica ("mi serve urgente una piega
//    per domani") quindi non compare nelle regole di urgenza.
//  - Gravidanza, allergie note, patch test, "è dannoso/tossico" sono richieste
//    sensibili: il motore non risponde nel merito, rimanda al medico e allo staff.
//  - Attenzione al fuzzy del motore (1 refuso su parole >= 6 lettere): "colore"
//    è a distanza 1 da "dolore", quindi il lessico usa "colorazione", "tinta" e
//    forme composte ("fare il colore", "cambiare colore") e mai "colore" da solo.

export const SETTORE = 'parrucchiere';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack parrucchiere — lessico taglio/piega/colore/schiariture/trattamenti/extension/barba/sposa, 20 intent, 11 entità, regole urgenza (reazioni chimiche HIGH, gonfiore/respiro CRITICAL), sicurezza su gravidanza/allergie/patch test, 25 FAQ di settore.';

// Pattern di gravidanza/allattamento generati: (frase di stato) x (domanda sulla sicurezza di un trattamento).
const STATI_GRAVIDANZA = ['incinta', 'in gravidanza', 'in dolce attesa', 'aspetto un bambino', 'aspetto una bambina', 'aspetto un figlio', 'aspetto una figlia', 'allattando', 'allatto', 'durante la gravidanza', 'durante l allattamento',
  ...['primo', 'secondo', 'terzo', 'quarto', 'quinto', 'sesto', 'settimo', 'ottavo', 'nono'].map((o) => `al ${o} mese`)];
const DOMANDE_SICUREZZA = ['posso', 'si puo', 'e sicuro', 'e sicura', 'fa male', 'e dannoso', 'e dannosa', 'e pericoloso', 'e pericolosa', 'e rischioso', 'e rischiosa', 'si puo fare', 'posso fare'];
const PATTERN_GRAVIDANZA = STATI_GRAVIDANZA.flatMap((st) => DOMANDE_SICUREZZA.map((d) => `${st} ${d}`));

export const pack = {
  identity: {
    nome_ruolo: 'salone di parrucchiere',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un salone di parrucchiere. Accogli i clienti con tono cordiale, curato e chiaro; gestisci richieste di appuntamento, informazioni sui servizi e richieste di preventivo. Non sei un medico: non fai diagnosi su reazioni o problemi della cute, non consigli farmaci né creme, e non inventi mai prezzi, orari o servizi.',
  },
  mission: 'Capire cosa desidera il cliente, raccogliere solo le informazioni necessarie, organizzare l\'appuntamento o la richiesta di preventivo e far arrivare subito allo staff i reclami e le rare situazioni di reazione a un prodotto.',
  tone_default: 'cordiale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, tono cordiale e accogliente.',
    'Con chi segnala un problema o un\'insoddisfazione: prima una frase di comprensione, poi la domanda o il passaggio allo staff.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Per i trattamenti chimici (colore, decolorazione, stiratura, permanente) non promettere risultati: il risultato dipende dai capelli e lo valuta il parrucchiere.',
    'Mai diagnosi su cute o reazioni, mai indicazioni su farmaci o creme, mai valutazioni sulla gravidanza o sulle allergie ("si può fare", "non è niente").',
  ],
  prohibited_claims: [
    'dire al cliente cosa ha o che cosa è una reazione della cute',
    'consigliare farmaci, antistaminici, cortisone, creme o pomate',
    'garantire risultati di colore o assenza di danni ai capelli',
    'dire che un trattamento chimico è sicuro in gravidanza o per chi ha allergie',
    'dire che il patch test si può saltare',
    'indicare prezzi, sconti, orari, servizi o disponibilità non presenti nelle fonti',
  ],
  business_rules: [
    'Annullamenti e spostamenti di appuntamenti esistenti vanno passati allo staff.',
    'I reclami su un lavoro già eseguito vanno sempre passati a una persona del salone.',
    'Le reazioni a un prodotto (bruciore, ustione, allergia, gonfiore) hanno priorità sulla raccolta dati normale.',
    'Il risultato di colore e schiariture dipende dai capelli di partenza: l\'assistente non lo promette.',
  ],

  entities: [
    { id: 'servizio', descrizione: 'Il servizio richiesto dal cliente.', tipo: 'enum', priorita: 10,
      valori: ['taglio', 'piega', 'taglio_piega', 'colore', 'ricrescita', 'schiariture', 'decolorazione', 'correzione_colore', 'trattamento', 'stiratura', 'permanente', 'extension', 'barba', 'acconciatura', 'sposa', 'cambio_look', 'altro'],
      domanda_varianti: ['Che servizio le interessa: taglio, piega, colore o altro?', 'Mi dice che trattamento vorrebbe fare?', 'Per cosa vorrebbe venire da noi?'] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente (o di chi viene al salone).', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro l\'appuntamento?'] },
    { id: 'problema_capelli', descrizione: 'Il problema o il desiderio che il cliente descrive sui capelli (non una reazione urgente).', tipo: 'enum', priorita: 15,
      valori: ['danneggiati', 'secchi', 'crespi', 'doppie_punte', 'forfora', 'caduta', 'grassi', 'giallo_arancio', 'bianchi'],
      domanda_varianti: ['Mi racconta che problema hanno i suoi capelli?', 'Cosa vorrebbe migliorare, esattamente?', 'Può descrivermi brevemente la situazione dei capelli?'] },
    { id: 'reazione', descrizione: 'Reazione o disturbo dopo un prodotto o un trattamento.', tipo: 'enum', priorita: 16,
      valori: ['allergia', 'bruciore', 'ustione', 'prurito', 'gonfiore', 'irritazione', 'vesciche', 'occhi'],
      domanda_varianti: ['Mi racconta che disturbo ha avuto?', 'Cosa sta sentendo, esattamente?'] },
    { id: 'lunghezza_capelli', descrizione: 'Lunghezza dei capelli (utile per organizzare i tempi).', tipo: 'enum', priorita: 40, valori: ['corti', 'medi', 'lunghi'],
      domanda_varianti: ['I suoi capelli sono corti, medi o lunghi?', 'Che lunghezza hanno, più o meno?'] },
    { id: 'data_evento', descrizione: 'Data di un evento (matrimonio, cerimonia) per cui serve l\'acconciatura; di norma la riconosce l\'analisi LLM.', tipo: 'string', priorita: 45 },
    { id: 'prima_volta', descrizione: 'Se è la prima volta che il cliente viene nel salone.', tipo: 'enum', priorita: 50, valori: ['si', 'no'] },
    { id: 'tipo_cliente', descrizione: 'Uomo, donna o bambino.', tipo: 'enum', priorita: 55, valori: ['uomo', 'donna', 'bambino'] },
    { id: 'preferenza_operatore', descrizione: 'Il cliente chiede la propria parrucchiera/il proprio parrucchiere abituale.', tipo: 'enum', priorita: 56, valori: ['abituale'] },
    { id: 'giorno', descrizione: 'Giorno preferito per l\'appuntamento.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
  ],

  lexicon: [
    // ---- Servizi (l'ORDINE conta: a parità di entità vince la prima voce trovata) ----
    { canonical: 'servizio_sposa', entity: 'servizio', value: 'sposa', synonyms: ['acconciatura sposa', 'acconciatura da sposa', 'acconciatura per la sposa', 'da sposa', 'per la sposa', 'prova sposa', 'prova acconciatura sposa', 'pacchetto sposa', 'pacchetti sposa', 'trucco e parrucco', 'mi sposo', 'sono la sposa', 'sono una sposa', 'sposina'] },
    { canonical: 'extension', entity: 'servizio', value: 'extension', synonyms: ['extension', 'extensions', 'estensioni', 'estensioni capelli', 'allungamento capelli', 'infoltimento', 'capelli finti', 'clip in'], errors: ['extention', 'estenzioni', 'extesion'], slang: ['le exstension'] },
    { canonical: 'stiratura', entity: 'servizio', value: 'stiratura', synonyms: ['stiratura', 'stiratura capelli', 'stirare i capelli', 'cheratina', 'keratina', 'keratin', 'trattamento alla cheratina', 'lisciatura', 'lisciante', 'liscio permanente', 'brasiliana', 'lisciare i capelli', 'smoothing'], errors: ['cheratna', 'steratura'] },
    { canonical: 'decolorazione', entity: 'servizio', value: 'decolorazione', synonyms: ['decolorazione', 'decolorare', 'decolorarmi', 'decolorarli', 'decolorata', 'decapaggio', 'decapare', 'scolorire', 'biondo platino', 'platino'], errors: ['decolorrazione', 'decolorazzione', 'scolorazione'] },
    { canonical: 'schiariture', entity: 'servizio', value: 'schiariture', synonyms: ['meches', 'mesches', 'colpi di sole', 'colpi di luce', 'schiariture', 'schiaritura', 'schiarire', 'schiarirmi', 'schiarire i capelli', 'balayage', 'shatush', 'airtouch', 'air touch', 'degrade', 'ombre hair', 'sombre', 'flamboyage', 'riflessi', 'effetto sole', 'capelli piu chiari'], slang: ['sciatush', 'le mesh', 'balaiage'], errors: ['balayge', 'balage', 'baliage', 'shatuch', 'shatus', 'shatusc', 'scatush', 'colpi di sole'] },
    { canonical: 'ricrescita', entity: 'servizio', value: 'ricrescita', synonyms: ['ricrescita', 'ricrescite', 'radici', 'le radici', 'ritocco radici', 'ritocco delle radici', 'ritocco colore', 'ritocco della tinta', 'ritoccare le radici', 'rifare le radici', 'rifare la ricrescita', 'sistemare le radici', 'sistemare la ricrescita', 'coprire la ricrescita'], errors: ['ricrscita', 'ricresita', 'ricrescta', 'ricrescitta'] },
    { canonical: 'correzione_colore', entity: 'servizio', value: 'correzione_colore', synonyms: ['correzione colore', 'correzione del colore', 'correggere il colore', 'correggere la tinta', 'sistemare il colore', 'rimediare alla tinta', 'rimediare al colore', 'tinta fai da te', 'tinta fatta in casa', 'tinta fatta a casa', 'tinta venuta male', 'colore venuto male', 'togliere il giallo', 'togliere l arancione', 'neutralizzare il giallo', 'colore da correggere'] },
    { canonical: 'colore', entity: 'servizio', value: 'colore', synonyms: ['tinta', 'tinte', 'tintura', 'tingere', 'tingermi', 'tingermele', 'colorazione', 'colorazioni', 'colorare', 'colorarmi', 'colorarli', 'colorarmi i capelli', 'colore capelli', 'colore dei capelli', 'fare il colore', 'fare colore', 'rifare il colore', 'rifare colore', 'cambiare colore', 'cambio colore', 'cambio di colore', 'nuovo colore', 'dare il colore', 'coprire i bianchi', 'coprire i capelli bianchi', 'copertura capelli bianchi', 'tonalizzante', 'toner', 'tonalizzare', 'tono su tono', 'riflessante', 'henne', 'colore semipermanente', 'semipermanente'], slang: ['tintarmi', 'tintina', 'la tinta'], errors: ['tinda', 'tintra', 'colorazzione', 'colorazone'] },
    { canonical: 'permanente', entity: 'servizio', value: 'permanente', synonyms: ['permanente', 'la permanente', 'ondulazione', 'arricciatura', 'ricci permanenti', 'permanente ricci', 'fare i ricci con la permanente'], errors: ['permanete', 'permamente'] },
    { canonical: 'trattamento', entity: 'servizio', value: 'trattamento', synonyms: ['trattamento', 'trattamenti', 'trattamento capelli', 'trattamento ricostruttivo', 'ricostruzione', 'ricostruzione capelli', 'ricostruttivo', 'botox capelli', 'botox', 'maschera', 'impacco', 'olaplex', 'idratazione', 'trattamento idratante', 'trattamento anticaduta', 'trattamento purificante', 'trattamento nutriente', 'laminazione', 'lamination', 'nanoplastica', 'rigenerante', 'trattamento rigenerante', 'riparare i capelli', 'cura dei capelli'], errors: ['trattamneto', 'ricostruzzione'] },
    { canonical: 'taglio_piega', entity: 'servizio', value: 'taglio_piega', synonyms: ['taglio e piega', 'taglio piega', 'taglio con piega', 'taglio e messa in piega', 'piega e taglio', 'taglio e brushing', 'taglio e asciugatura'], slang: ['taglio e pieg'] },
    { canonical: 'taglio', entity: 'servizio', value: 'taglio', synonyms: ['taglio', 'tagli', 'taglio capelli', 'tagliare', 'tagliarmi', 'tagliare i capelli', 'tagliarli', 'una spuntatina', 'spuntatina', 'spuntata', 'spuntare', 'accorciare', 'accorciarli', 'sfoltire', 'sfoltita', 'scalato', 'taglio scalato', 'scalatura', 'sfumatura', 'sfumature', 'sfumato', 'fade', 'taglio uomo', 'taglio donna', 'taglio bambino', 'taglio bimbo', 'frangia', 'frangetta', 'sforbiciata', 'regolata', 'regolatina', 'dare una sistemata', 'haircut', 'taglietto'], errors: ['tailgio', 'tagio', 'tagliio', 'taglo'] },
    { canonical: 'piega', entity: 'servizio', value: 'piega', synonyms: ['piega', 'pieghe', 'messa in piega', 'messa piega', 'fare la piega', 'farmi la piega', 'piega capelli', 'brushing', 'phon', 'asciugatura', 'asciugare', 'piastra', 'boccoli', 'beach waves', 'onde morbide', 'capelli mossi'], errors: ['pega', 'peiga', 'piegha', 'pieha', 'plega'] },
    { canonical: 'barba', entity: 'servizio', value: 'barba', synonyms: ['barba', 'barbiere', 'barbieri', 'rasatura', 'radere', 'rasare', 'farmi la barba', 'regolare la barba', 'regolazione barba', 'taglio barba', 'sagomatura barba', 'rasatura classica', 'rasoio', 'baffi', 'contorno barba', 'rifinitura barba', 'rifinire la barba', 'barba e capelli'], errors: ['barbba', 'rasattura'] },
    { canonical: 'acconciatura', entity: 'servizio', value: 'acconciatura', synonyms: ['acconciatura', 'acconciature', 'raccolto', 'capelli raccolti', 'chignon', 'updo', 'acconciatura da cerimonia', 'cerimonia', 'matrimonio', 'battesimo', 'comunione', 'cresima', 'laurea', 'diciottesimo', 'invitata', 'testimone', 'serata', 'capodanno', 'ballo'], errors: ['acconciatrura', 'aconciatura'] },
    { canonical: 'cambio_look', entity: 'servizio', value: 'cambio_look', synonyms: ['cambio look', 'cambiare look', 'cambio di look', 'cambiare completamente look', 'nuovo look', 'restyling', 'rifare i capelli', 'cambiare taglio e colore', 'cambiare stile', 'cambio radicale', 'cambio drastico', 'darmi una svolta', 'una svolta', 'cambiare aspetto', 'rinnovarmi', 'rinnovare il look', 'cambiare faccia'] },

    // ---- Lunghezza dei capelli ----
    { canonical: 'capelli_lunghi', entity: 'lunghezza_capelli', value: 'lunghi', synonyms: ['capelli lunghi', 'lunghi', 'molto lunghi', 'lunghissimi', 'capelli lunghissimi', 'sotto le spalle', 'fino alla schiena', 'fino alla vita', 'fino al sedere', 'a meta schiena', 'lunghezza lunga'] },
    { canonical: 'capelli_corti', entity: 'lunghezza_capelli', value: 'corti', synonyms: ['capelli corti', 'corti', 'molto corti', 'cortissimi', 'capelli cortissimi', 'taglio corto', 'pixie', 'a spazzola', 'rasati'] },
    { canonical: 'capelli_medi', entity: 'lunghezza_capelli', value: 'medi', synonyms: ['capelli medi', 'lunghezza media', 'alle spalle', 'sulle spalle', 'lunghezza spalle', 'medio lunghi', 'medi'] },

    // ---- Tipo di cliente / prima volta / operatore ----
    { canonical: 'cliente_bambino', entity: 'tipo_cliente', value: 'bambino', synonyms: ['mio figlio', 'mia figlia', 'il bambino', 'la bambina', 'bambino', 'bambina', 'bambini', 'bambine', 'bimbo', 'bimba', 'bimbi', 'mio nipote', 'mia nipote', 'ragazzino', 'ragazzina', 'i miei figli', 'figlio piccolo'] },
    { canonical: 'cliente_uomo', entity: 'tipo_cliente', value: 'uomo', synonyms: ['da uomo', 'per uomo', 'taglio uomo', 'sono un uomo', 'per mio marito', 'per mio fratello', 'per mio padre', 'per il mio ragazzo', 'per mio fidanzato', 'uomini'] },
    { canonical: 'cliente_donna', entity: 'tipo_cliente', value: 'donna', synonyms: ['da donna', 'per donna', 'taglio donna', 'sono una donna', 'per mia moglie', 'per mia mamma', 'per mia madre', 'per mia nonna', 'per la mia ragazza', 'donne'] },
    { canonical: 'cliente_nuovo', entity: 'prima_volta', value: 'si', synonyms: ['sono nuova', 'sono nuovo', 'prima volta che vengo', 'non sono mai venuta', 'non sono mai venuto', 'non sono mai stata da voi', 'non sono mai stato da voi', 'non vi conosco', 'sono una nuova cliente', 'sono un nuovo cliente', 'e la prima volta', 'prima volta da voi', 'prima volta nel vostro salone', 'vorrei provarvi', 'vorrei provare il vostro salone'] },
    { canonical: 'cliente_abituale', entity: 'prima_volta', value: 'no', synonyms: ['sono gia cliente', 'sono gia venuta', 'sono gia venuto', 'sono gia stata da voi', 'sono gia stato da voi', 'sono una vostra cliente', 'sono un vostro cliente', 'sono cliente abituale', 'cliente abituale', 'vengo da voi da anni', 'vengo sempre da voi', 'sono sempre venuta da voi', 'come al solito', 'come sempre', 'come l altra volta', 'come l ultima volta'] },
    { canonical: 'operatore_abituale', entity: 'preferenza_operatore', value: 'abituale', synonyms: ['con la mia parrucchiera', 'dalla mia parrucchiera', 'la mia parrucchiera', 'il mio parrucchiere', 'dal mio parrucchiere', 'con il mio parrucchiere', 'con la solita parrucchiera', 'con il solito parrucchiere', 'la solita parrucchiera', 'il solito parrucchiere', 'con la stessa persona', 'con la stessa dell altra volta', 'con la mia colorista', 'la mia colorista', 'il mio barbiere', 'dal mio barbiere', 'con chi mi ha fatto l altra volta', 'dalla stessa ragazza dell altra volta'] },

    // ---- Problemi dei capelli (non urgenti) ----
    { canonical: 'capelli_danneggiati', entity: 'problema_capelli', value: 'danneggiati', synonyms: ['capelli rovinati', 'i miei capelli sono rovinati', 'capelli danneggiati', 'capelli bruciati', 'capelli spezzati', 'si spezzano', 'mi si spezzano i capelli', 'capelli stopposi', 'stopposi', 'capelli sfibrati', 'sfibrati', 'capelli elettrici', 'capelli fragili', 'capelli indeboliti'], intent: 'consulenza_capelli' },
    { canonical: 'capelli_secchi', entity: 'problema_capelli', value: 'secchi', synonyms: ['capelli secchi', 'molto secchi', 'capelli disidratati', 'disidratati', 'capelli aridi'], intent: 'consulenza_capelli' },
    { canonical: 'capelli_crespi', entity: 'problema_capelli', value: 'crespi', synonyms: ['capelli crespi', 'crespi', 'crespo', 'effetto crespo', 'frizz', 'capelli ribelli', 'ribelli'], intent: 'consulenza_capelli' },
    { canonical: 'doppie_punte', entity: 'problema_capelli', value: 'doppie_punte', synonyms: ['doppie punte', 'doppia punta', 'punte secche', 'punte rovinate', 'punte aperte'], intent: 'consulenza_capelli' },
    { canonical: 'forfora', entity: 'problema_capelli', value: 'forfora', synonyms: ['forfora', 'squame', 'cute secca', 'cuoio capelluto secco'], intent: 'consulenza_capelli' },
    { canonical: 'caduta_capelli', entity: 'problema_capelli', value: 'caduta', negabile: true, synonyms: ['caduta dei capelli', 'caduta capelli', 'mi cadono i capelli', 'i capelli mi cadono', 'perdo i capelli', 'perdita di capelli', 'perdita dei capelli', 'capelli che cadono', 'diradamento', 'capelli che si diradano'], intent: 'consulenza_capelli' },
    { canonical: 'capelli_grassi', entity: 'problema_capelli', value: 'grassi', synonyms: ['capelli grassi', 'cute grassa', 'si ungono subito'], intent: 'consulenza_capelli' },
    { canonical: 'capelli_gialli', entity: 'problema_capelli', value: 'giallo_arancio', synonyms: ['capelli gialli', 'capelli arancioni', 'capelli arancio', 'effetto giallo', 'riflessi gialli', 'riflessi arancio', 'riflessi arancioni', 'riflessi rossi indesiderati', 'sono diventati gialli', 'sono diventati arancioni', 'mi sono venuti gialli', 'mi sono venuti arancioni'], intent: 'consulenza_capelli' },
    { canonical: 'capelli_bianchi', entity: 'problema_capelli', value: 'bianchi', synonyms: ['capelli bianchi', 'i bianchi', 'molti bianchi', 'capelli grigi', 'capelli grigi e bianchi', 'sale e pepe', 'canizie'], intent: 'consulenza_capelli' },

    // ---- Reazioni a prodotti (rare, ma sono il caso di sicurezza del settore) ----
    { canonical: 'reazione_allergia', entity: 'reazione', value: 'allergia', negabile: true, synonyms: ['reazione allergica', 'mi e venuta un allergia', 'mi e venuta l allergia', 'allergia alla tinta', 'reazione alla tinta', 'reazione al prodotto', 'orticaria', 'pomfi', 'dermatite'] },
    { canonical: 'reazione_bruciore', entity: 'reazione', value: 'bruciore', negabile: true, synonyms: ['mi brucia', 'brucia', 'bruciore', 'bruciano', 'mi bruciano', 'sta bruciando', 'mi sta bruciando', 'in fiamme'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_ustione', entity: 'reazione', value: 'ustione', negabile: true, synonyms: ['ustione', 'ustioni', 'ustionata', 'ustionato', 'mi sono ustionata', 'mi sono ustionato', 'ustione chimica', 'scottatura', 'scottata', 'scottato'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_prurito', entity: 'reazione', value: 'prurito', negabile: true, synonyms: ['prurito', 'mi prude', 'prude', 'prudono', 'pizzicore', 'mi pizzica'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_gonfiore', entity: 'reazione', value: 'gonfiore', negabile: true, synonyms: ['gonfiore', 'gonfio', 'gonfia', 'gonfie', 'gonfi', 'si e gonfiata', 'si e gonfiato', 'si sono gonfiati', 'si sono gonfiate'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_irritazione', entity: 'reazione', value: 'irritazione', negabile: true, synonyms: ['cute irritata', 'cuoio capelluto irritato', 'cuoio capelluto arrossato', 'cute arrossata', 'irritazione', 'rossore', 'arrossamento', 'pelle arrossata', 'pelle irritata', 'sensibile al prodotto'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_vesciche', entity: 'reazione', value: 'vesciche', synonyms: ['vesciche', 'vescica', 'bolle in testa', 'bolle sulla testa', 'bolle sul cuoio capelluto', 'croste', 'piaghe'], intent: 'reazione_prodotto' },
    { canonical: 'reazione_occhi', entity: 'reazione', value: 'occhi', synonyms: ['negli occhi', 'agli occhi', 'prodotto negli occhi', 'tinta negli occhi'] },

    // ---- Concetti di conversazione (collegano all'intent, nessuna entità) ----
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto vengono', 'quanto devo pagare', 'tariffa', 'tariffe', 'listino', 'quanto si paga', 'quanto prendete', 'quanto si spende', 'quanto mi costa'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperte', 'chiusi', 'chiuse', 'apertura', 'chiusura', 'fino a che ora', 'a che ora aprite', 'a che ora chiudete', 'aprite', 'chiudete', 'giorni di chiusura', 'orario continuato', 'lavorate', 'tenete aperto', 'tenete aperte', 'tenete aperti'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'dove vi trovate', 'come vi raggiungo', 'come arrivo', 'come si arriva', 'parcheggio', 'posizione', 'in che zona', 'ztl', 'posteggio', 'posteggiare', 'parcheggiare', 'lasciare la macchina', 'lasciare l auto', 'dove lascio la macchina', 'dove metto la macchina', 'mettere la macchina'], intent: 'info_posizione' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'bancomat', 'carta di credito', 'carte', 'carta', 'contanti', 'satispay', 'pos', 'fattura', 'caparra', 'acconto', 'pagare', 'paypal', 'pagare con'], intent: 'info_pagamenti' },
    { canonical: 'sconti', synonyms: ['sconto', 'sconti', 'promozione', 'promozioni', 'promo', 'offerta', 'offerte', 'tessera fedelta', 'tessera punti', 'buono regalo', 'buoni regalo', 'gift card'], intent: 'info_promozioni' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima', 'stima dei costi', 'stima del costo', 'quanto verrebbe in tutto', 'quanto mi costerebbe in tutto', 'consulenza', 'consulenza colore', 'idea di spesa', 'idea del costo', 'idea dei costi', 'cifra indicativa', 'costo indicativo', 'preventivo di massima', 'quanto spenderei'], intent: 'richiesta_preventivo' },
    { canonical: 'cerca_consiglio', synonyms: ['mi consigliate', 'mi consigli', 'cosa mi consigliate', 'che mi consigliate', 'che ne dite', 'cosa ne pensate', 'secondo voi'] },
    { canonical: 'domanda_trattamento', synonyms: ['come funziona', 'come si fa', 'in cosa consiste', 'cos e', 'che cos e', 'cosa sono', 'che differenza', 'differenza tra', 'differenza fra', 'quanto dura', 'quanto durano', 'quanto tempo ci vuole', 'quanto tempo dura', 'quante ore', 'quante sedute', 'ogni quanto', 'rovina i capelli', 'rovina', 'danneggia i capelli', 'controindicazioni', 'diverso da', 'diverso dal', 'diverso dalle', 'diverso dai', 'diversa da', 'si differenzia', 'cosa cambia', 'cosa cambia tra'], intent: 'info_trattamenti' },
    { canonical: 'preparazione', synonyms: ['patch test', 'test allergia', 'test di sensibilita', 'foto', 'screenshot', 'immagine', 'immagini', 'ispirazione', 'video di riferimento', 'capelli lavati', 'capelli sporchi', 'capelli puliti'], intent: 'info_preparazione' },
    { canonical: 'competenza', synonyms: ['qualcuno bravo', 'qualcuno brava', 'qualcuno esperto', 'qualcuno esperta', 'qualcuno specializzato', 'qualcuno specializzata', 'qualcuno che sappia', 'bravo con i', 'brava con i', 'brava con le', 'bravo con le', 'esperienza con', 'esperti in', 'esperta in', 'esperti di', 'esperta di'], intent: 'info_personale' },
    { canonical: 'appuntamento', synonyms: ['appuntamento', 'prenotare', 'prenotazione', 'prenotarmi', 'fissare', 'disponibilita', 'posto libero', 'slot'], intent: 'prenota_servizio' },
  ],

  intents: [
    { id: 'prenota_servizio', nome: 'Prenotazione appuntamento', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole fissare un appuntamento (taglio, piega, colore, ecc.) o chiede disponibilità.',
      esempi: ['vorrei prenotare', 'vorrei un appuntamento', 'vorrei prendere un appuntamento', 'vorrei fissare un appuntamento', 'vorrei fissare', 'avete posto domani', 'avete un posto oggi', 'avete posto', 'avete disponibilita', 'avete disponibilita questa settimana', 'posso prenotare', 'mi serve un appuntamento', 'quando siete liberi', 'quando siete libere', 'cerco un appuntamento', 'avete un buco', 'avete un buchino', 'avete un posticino', 'posso passare domani', 'posso venire', 'vorrei venire da voi', 'vorrei prendere appuntamento', 'mi prenotate', 'mi prenoti', 'prenotarmi', 'ho bisogno di un appuntamento', 'devo prenotare', 'mi mettete in agenda', 'mi inserite in agenda', 'mi segnate', 'c e posto per', 'c e un buco', 'c e disponibilita', 'siete libere', 'siete libero', 'mi fate la', 'mi fate il', 'mi fate un', 'mi fate una', 'mi fai la', 'mi fai il', 'mi fai un', 'mi fai una'],
      keywords: ['prenotare', 'prenotazione', 'appuntamento', 'disponibilita', 'fissare', 'prenotarmi', 'prenotami'],
      combinazioni: [
        { entity: 'servizio', con: ['vorrei', 'vorrei fare', 'vorrei farmi', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo farmi', 'devo rifare', 'dovrei rifare', 'volevo fare', 'voglio fare', 'mi occorre', 'cerco', 'posso venire', 'posso passare', 'vorrei venire', 'mi serve una', 'dovrei', 'dovrei fare', 'quando potete', 'quando riuscite', 'potete farmi', 'mi piacerebbe', 'mi piacerebbe fare', 'solo un', 'solo una', 'passo per', 'vorrei rifare', 'volevo', 'volevo rifare', 'voglio', 'voglio rifare', 'accompagno'], con_entities: ['giorno', 'fascia_oraria', 'tipo_cliente', 'prima_volta', 'preferenza_operatore'], non_con_concepts: ['preventivo', 'prezzo', 'domanda_trattamento', 'servizio_sposa', 'cambio_look', 'cerca_consiglio'], score: 0.8 },
        { entity: 'preferenza_operatore', con: ['vorrei', 'posso', 'mi serve', 'vorrei andare', 'dovrei'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo'], score: 0.8 },
        { entity: 'prima_volta', con: ['vorrei venire', 'vorrei un appuntamento', 'vorrei prenotare', 'vorrei fissare'], score: 0.8 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['giorno', 'fascia_oraria', 'lunghezza_capelli', 'tipo_cliente', 'prima_volta', 'preferenza_operatore'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_preventivo', nome: 'Preventivo / cambio look / sposa', categoria: 'LEAD', priorita: 15, safety_level: 'LOW',
      descrizione: 'Il cliente chiede un preventivo, una consulenza, un cambio look o informazioni per un\'acconciatura da sposa o da cerimonia.',
      esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'mi serve un preventivo', 'potete farmi un preventivo', 'vorrei sapere quanto verrebbe in tutto', 'quanto mi costerebbe in tutto', 'una stima dei costi', 'potete farmi una stima', 'vorrei una consulenza', 'vorrei fare una consulenza', 'mi fate una consulenza', 'vorrei cambiare look', 'vorrei cambiare completamente look', 'vorrei un cambio look', 'vorrei un nuovo look', 'mi sposo', 'sono una sposa', 'vorrei informazioni per la sposa', 'vorrei informazioni per acconciatura sposa', 'vorrei provare un acconciatura', 'vorrei fare una prova', 'vorrei una prova', 'pacchetto sposa', 'pacchetti sposa'],
      keywords: ['preventivo', 'preventivi', 'consulenza', 'restyling', 'pacchetto sposa'],
      combinazioni: [
        { entity: 'servizio', con: ['acconciatura sposa', 'acconciatura da sposa', 'da sposa', 'per la sposa', 'prova sposa', 'pacchetto sposa', 'mi sposo', 'sono la sposa', 'sono una sposa', 'cambiare look', 'cambio look', 'cambio di look', 'nuovo look', 'restyling', 'cambiare completamente look', 'cambiare stile', 'cambio radicale', 'cambio drastico', 'una svolta', 'cambiare aspetto', 'rinnovarmi', 'mi consigliate', 'cosa mi consigliate', 'idea di spesa', 'idea del costo'], score: 0.85 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['data_evento', 'giorno', 'fascia_oraria', 'lunghezza_capelli', 'tipo_cliente', 'prima_volta'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'consulenza_capelli', nome: 'Problema o desiderio sui capelli', categoria: 'SUPPORT', priorita: 25, safety_level: 'MEDIUM', campi_tenant: true,
      descrizione: 'Il cliente descrive un problema dei capelli (rovinati, secchi, crespi, giallo dopo la tinta fai da te, caduta) e cerca un consiglio o un trattamento: non è un\'urgenza.',
      esempi: ['ho i capelli rovinati', 'i miei capelli sono rovinati', 'ho i capelli molto secchi', 'ho i capelli crespi', 'ho i capelli stopposi', 'ho le doppie punte', 'mi si spezzano i capelli', 'ho tanta forfora', 'ho i capelli grassi', 'mi cadono i capelli', 'ho i capelli gialli', 'mi sono venuti i capelli arancioni', 'ho un problema con i capelli', 'non so cosa fare con i miei capelli', 'ho molti capelli bianchi'],
      keywords: ['capelli rovinati', 'capelli secchi', 'forfora', 'doppie punte', 'stopposi', 'sfibrati', 'capelli crespi', 'capelli gialli', 'capelli arancioni'],
      combinazioni: [
        { entity: 'problema_capelli', con: ['ho', 'ho i', 'ho dei', 'ho delle', 'mi sono', 'mi si', 'mi sono venuti', 'sono diventati', 'sono', 'i miei', 'i miei capelli', 'mi cadono'], non_con_concepts: ['preventivo', 'prezzo', 'domanda_trattamento'], score: 0.8 },
      ],
      required_entities: ['problema_capelli', 'nome_cliente'], optional_entities: ['lunghezza_capelli', 'servizio', 'giorno', 'fascia_oraria', 'prima_volta'],
      actions: ['ask_missing_information', 'propose_slot', 'create_lead', 'notify_owner'] },
    { id: 'reazione_prodotto', nome: 'Reazione a un prodotto o ustione', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Bruciore forte, ustione, allergia, vesciche, prodotto negli occhi o gonfiore dopo un trattamento: serve contatto rapido con il salone (e, se grave, il 118).',
      esempi: ['mi brucia la testa', 'mi brucia il cuoio capelluto', 'mi brucia la cute', 'mi e venuta un allergia alla tinta', 'mi e venuta una reazione allergica', 'ho avuto una reazione alla tinta', 'ho una reazione allergica', 'mi sono ustionata', 'mi hanno ustionato la cute', 'ho una ustione', 'ho il cuoio capelluto in fiamme', 'mi e andata la tinta negli occhi', 'ho il prurito fortissimo', 'ho bolle in testa dopo il trattamento', 'ho la cute piena di vesciche', 'dopo la tinta ho il cuoio capelluto irritato', 'ho la cute irritata dopo il colore', 'mi prude la testa dopo la tinta', 'mi pizzica forte la testa'],
      keywords: ['ustione', 'ustioni', 'ustionata', 'ustionato', 'bruciore', 'orticaria', 'reazione allergica', 'vesciche', 'scottatura'],
      required_entities: ['nome_cliente'], optional_entities: ['reazione', 'servizio'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa un servizio.',
      esempi: ['quanto costa', 'quanto costano', 'che prezzi avete', 'quanto viene', 'quanto devo pagare', 'mi dici il costo', 'mi dite il costo', 'avete un listino', 'quali sono i prezzi', 'quanto costa una piega', 'quanto costa il taglio', 'prezzi', 'prezzo', 'costo', 'quanto prendete', 'quanto si spende', 'che costi avete', 'mi dite i prezzi', 'mi dite il prezzo', 'listino prezzi', 'tariffe'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'tariffe', 'tariffa', 'listino'],
      required_entities: [], optional_entities: ['servizio', 'lunghezza_capelli'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede gli orari di apertura del salone.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'siete aperti a pranzo', 'siete aperti domenica', 'siete aperte', 'siete aperte il sabato', 'siete aperti il lunedi', 'quando siete aperti', 'quando chiudete', 'giorni di chiusura', 'giorno di chiusura', 'siete chiusi', 'siete chiuse', 'fate orario continuato', 'orario continuato', 'siete aperti stasera', 'fino a che ora lavorate', 'lavorate il sabato', 'lavorate sabato', 'lavorate la domenica'],
      keywords: ['orari', 'orario', 'aperti', 'aperte', 'chiusi', 'chiuse', 'aprite', 'chiudete'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_posizione', nome: 'Informazioni posizione', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede dove si trova il salone, come raggiungerlo o dove parcheggiare.',
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova il salone', 'c e parcheggio', 'come arrivo da voi', 'indirizzo del salone', 'dov e il salone', 'dove posso parcheggiare', 'c e un posto dove parcheggiare', 'avete parcheggio', 'parcheggio', 'mi mandi la posizione', 'mi mandate la posizione', 'mandatemi la posizione', 'dove vi trovate', 'in che zona siete', 'siete vicino alla stazione', 'siete in centro', 'siete in zona ztl', 'come si arriva', 'si arriva con la metro'],
      keywords: ['indirizzo', 'parcheggio', 'dove siete', 'dove parcheggiare', 'posizione', 'ztl', 'dov e il salone'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Informazioni servizi', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quali servizi vengono offerti o se si fa un certo trattamento.',
      esempi: ['che servizi fate', 'che servizi offrite', 'quali servizi offrite', 'di cosa vi occupate', 'quali trattamenti fate', 'che trattamenti avete', 'siete unisex', 'fate unisex', 'solo donna o anche uomo', 'fate anche uomo', 'fate servizi per uomo', 'fate anche la barba', 'avete anche il barbiere', 'siete anche barbieri', 'trattate i bambini', 'fate tagli per bambini', 'fate acconciature da sposa'],
      keywords: ['servizi', 'trattamenti', 'vi occupate', 'unisex', 'quali servizi'],
      combinazioni: [
        { entity: 'servizio', con: ['fate', 'fate anche', 'fate la', 'fate le', 'fate il', 'fate i', 'fate lo', 'fate l', 'offrite', 'trattate', 'si fa', 'si fanno', 'vi occupate di', 'avete la', 'avete il', 'avete le', 'avete anche', 'eseguite', 'praticate', 'fate pure'], score: 0.9 },
        { entity: 'tipo_cliente', con: ['fate', 'trattate', 'accettate', 'accogliete', 'fate anche', 'lavorate anche con'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['servizio', 'tipo_cliente'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Pagamenti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento, acconto o caparra, fattura.',
      esempi: ['accettate carte', 'accettate il bancomat', 'si puo pagare con la carta', 'accettate satispay', 'pagamento con carta', 'si paga con il pos', 'avete il pos', 'si puo pagare a rate', 'accettate contanti', 'pagamento in contanti', 'fate fattura', 'accettate buoni', 'posso pagare con satispay', 'come si paga', 'come posso pagare', 'metodi di pagamento', 'modalita di pagamento', 'serve la caparra', 'serve un acconto', 'chiedete un acconto', 'lasciare una caparra', 'caparra'],
      keywords: ['pagamento', 'pagamenti', 'bancomat', 'carta di credito', 'carte', 'contanti', 'satispay', 'pos', 'fattura', 'caparra', 'acconto', 'rate', 'rateale'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_promozioni', nome: 'Promozioni e fedeltà', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Sconti, promozioni, tessere fedeltà, buoni regalo (dati sempre e solo del tenant).',
      esempi: ['fate sconti', 'fate sconto', 'avete promozioni', 'ci sono offerte', 'avete offerte', 'avete la tessera fedelta', 'avete una tessera punti', 'fate sconti per studenti', 'c e una promozione', 'avete buoni regalo', 'fate buoni regalo', 'vendete gift card', 'avete gift card', 'sconto per la prima volta', 'sconto primo appuntamento', 'promo', 'promozioni', 'sconti', 'offerte', 'abbonamenti'],
      keywords: ['sconto', 'sconti', 'promozione', 'promozioni', 'offerta', 'offerte', 'tessera fedelta', 'buono regalo', 'gift card', 'promo', 'fedelta'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_trattamenti', nome: 'Come funziona un trattamento', categoria: 'INFORMATION', priorita: 32, safety_level: 'LOW',
      descrizione: 'Domande generali su come funziona un trattamento, durata di principio, differenze tra tecniche, frequenza.',
      esempi: ['come funziona', 'quanto dura', 'in cosa consiste', 'differenza tra', 'differenza fra', 'che differenza c e tra', 'ogni quanto', 'quanto tempo ci vuole', 'quante sedute servono', 'cos e il balayage', 'cos e lo shatush', 'cos e la cheratina', 'cosa sono le meches', 'rovina i capelli', 'la tinta fa male', 'fa male la tinta', 'la cheratina fa male', 'ci sono controindicazioni', 'dopo la tinta quanto aspetto per lavare i capelli', 'quanto dura la piega', 'quanto dura la cheratina', 'quanto dura la permanente', 'ogni quanto si fa la ricrescita', 'ogni quanto si taglia', 'si possono coprire i bianchi'],
      keywords: ['come funziona', 'quanto dura', 'cos e', 'consiste', 'controindicazioni', 'differenza tra', 'differenza fra', 'che differenza', 'ogni quanto', 'rovina i capelli', 'quante sedute', 'quanto tempo ci vuole'],
      required_entities: [], optional_entities: ['servizio', 'lunghezza_capelli'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_preparazione', nome: 'Come prepararsi / foto / patch test', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Cosa fare o portare prima di un appuntamento: capelli lavati o no, foto di riferimento, test di sensibilità.',
      esempi: ['devo lavare i capelli prima', 'devo venire con i capelli lavati', 'posso venire con i capelli sporchi', 'i capelli devono essere puliti', 'devo portare qualcosa', 'posso portare una foto', 'posso portare foto di riferimento', 'posso mandarvi una foto', 'vi mando una foto', 'cosa devo fare prima del trattamento', 'devo fare il patch test prima', 'quando devo fare il patch test', 'serve il patch test', 'devo venire con i capelli asciutti', 'capelli sporchi o puliti', 'devo portare i miei prodotti', 'posso portare la mia tinta', 'posso portare la mia tinta da casa', 'foto di riferimento', 'posso inviare una foto', 'vi mando le foto', 'si fa il test allergia', 'fate il test allergia', 'fate il patch test'],
      keywords: ['foto', 'capelli lavati', 'capelli sporchi', 'capelli puliti', 'patch test', 'test allergia', 'test di sensibilita'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_personale', nome: 'Informazioni sul personale', categoria: 'INFORMATION', priorita: 33, safety_level: 'LOW',
      descrizione: 'Chi lavora nel salone, specializzazioni, possibilità di scegliere il professionista (nomi solo dal tenant).',
      esempi: ['chi sono i parrucchieri', 'chi mi fa i capelli', 'chi mi segue', 'c e un colorista', 'avete un colorista', 'chi si occupa del colore', 'avete una parrucchiera donna', 'avete un parrucchiere uomo', 'quanti parrucchieri siete', 'chi e il titolare', 'chi e la titolare', 'posso scegliere la parrucchiera', 'posso scegliere chi mi fa i capelli', 'avete un barbiere', 'c e un barbiere', 'chi lavora da voi', 'siete in tanti', 'avete esperienza con i ricci', 'avete esperienza con i capelli ricci', 'siete specializzati nei ricci', 'siete specializzati in', 'siete specializzate in'],
      keywords: ['colorista', 'barbiere', 'hairstylist', 'stilista', 'specializzati', 'specializzate'],
      required_entities: [], optional_entities: ['preferenza_operatore'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'cancella_appuntamento', nome: 'Annullamento appuntamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole disdire un appuntamento.',
      esempi: ['devo disdire', 'vorrei cancellare l appuntamento', 'non posso venire', 'annullare l appuntamento', 'devo annullare', 'disdire l appuntamento', 'non riesco a venire', 'non riesco a passare', 'non posso piu venire', 'devo cancellare', 'cancellate l appuntamento', 'disdetta', 'annulla l appuntamento', 'annullatemi l appuntamento', 'non vengo piu', 'non riesco ad esserci', 'non ce la faccio a venire', 'salto l appuntamento', 'devo saltare l appuntamento', 'devo saltare', 'devo rinunciare', 'mi e uscito un impegno', 'mi e uscito un imprevisto', 'mi e capitato un imprevisto', 'ho un imprevisto', 'non ci saro', 'non posso presentarmi'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'annulla', 'cancella', 'annullatemi', 'cancellate'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_appuntamento', nome: 'Spostamento appuntamento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole spostare un appuntamento già preso o avvisa di un ritardo.',
      esempi: ['devo spostare l appuntamento', 'posso cambiare giorno', 'vorrei rimandare', 'posso anticipare', 'posso posticipare', 'posso spostare a', 'devo cambiare orario', 'spostare l appuntamento', 'posticipare l appuntamento', 'anticipare l appuntamento', 'si puo spostare', 'possiamo spostare', 'possiamo anticipare', 'possiamo posticipare', 'posso venire un altro giorno', 'posso venire piu tardi', 'arrivo in ritardo', 'sono in ritardo', 'faccio tardi', 'mi spostate', 'spostatemi', 'spostami', 'cambiare data', 'cambiare giorno', 'cambiare l orario'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'spostamento', 'sposta', 'spostatemi', 'spostami', 'ritardo', 'riprogrammare'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per un lavoro già eseguito (colore, taglio, trattamento) o per il servizio.',
      esempi: ['sono insoddisfatta', 'sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'non sono soddisfatta', 'non sono soddisfatto', 'non sono contenta del lavoro', 'non sono contento del lavoro', 'il lavoro non mi piace', 'non mi piace come mi avete fatto i capelli', 'mi hanno rovinato i capelli', 'mi hanno rovinato il colore', 'mi avete rovinato i capelli', 'mi avete rovinato il colore', 'mi hanno bruciato i capelli', 'mi hanno tagliato troppo', 'mi hanno fatto un taglio orribile', 'il colore e venuto male', 'la tinta e venuta male', 'il colore non e quello che volevo', 'non e il colore che volevo', 'il taglio e venuto male', 'sono tornata a casa piangendo', 'sono arrabbiata', 'sono arrabbiato', 'sono molto arrabbiata', 'sono delusa', 'sono deluso', 'servizio pessimo', 'trattata male', 'trattato male', 'vorrei un rimborso', 'voglio un rimborso', 'vorrei che mi rifaceste il lavoro', 'avete sbagliato colore', 'e stato un disastro', 'diverso dalla foto', 'non assomiglia alla foto', 'non e come la foto', 'non e uguale alla foto', 'non e quello che volevo', 'non e quello che ho chiesto', 'non e quello che avevo chiesto', 'non mi avete ascoltato', 'non mi avete ascoltata', 'completamente diverso', 'soldi indietro', 'il lavoro e stato scadente'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattata male', 'trattato male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'rimborso', 'pessimo', 'pessima', 'scadente', 'soldi indietro', 'diverso dalla foto'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona del salone.',
      esempi: ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con la parrucchiera', 'vorrei parlare con il titolare', 'vorrei parlare con la titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con qualcuno', 'posso parlare con la responsabile', 'vorrei parlare con un operatore', 'non voglio parlare con un bot', 'mi richiamate', 'mi chiamate', 'passatemi la titolare', 'vorrei sentire una persona', 'parlare con una persona vera'],
      keywords: ['titolare', 'responsabile'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'candidatura_lavoro', nome: 'Candidatura o collaborazione', categoria: 'HUMAN_HANDOFF', priorita: 12, safety_level: 'LOW',
      descrizione: 'Chi cerca lavoro, tirocinio o vuole affittare una poltrona: lo gestisce una persona del salone.',
      esempi: ['cercate personale', 'cercate un apprendista', 'cercate apprendisti', 'cercate collaboratori', 'cercate parrucchieri', 'avete posti di lavoro', 'cerco lavoro', 'vorrei lavorare da voi', 'vorrei lavorare con voi', 'vorrei candidarmi', 'posso mandare il curriculum', 'posso mandarvi il curriculum', 'dove mando il curriculum', 'cerco un posto da parrucchiera', 'affittate la poltrona', 'affittate poltrone', 'siete in cerca di personale'],
      keywords: ['curriculum', 'cv', 'apprendista', 'apprendisti', 'candidarmi', 'candidatura', 'tirocinio', 'apprendistato', 'poltrona', 'postazione', 'postazioni', 'affittare', 'affitto', 'affittate', 'rappresentante', 'agente di commercio', 'fornitore', 'fornitura', 'collaborare con voi'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi', 'hey'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'ci vediamo', 'a presto', 'a domani', 'ottimo grazie', 'buona giornata', 'buona serata', 'perfetto', 'benissimo'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: possibile pericolo per la vita (anafilassi, via aerea) -> escalation immediata, risposta predefinita.
    critical: [
      'non riesco a respirare', 'non riesco a respirare bene', 'difficolta a respirare', 'fatica a respirare', 'faccio fatica a respirare', 'respiro male', 'mi manca il respiro', 'manca il respiro', 'non respiro',
      'non riesco a deglutire', 'non riesco a inghiottire', 'difficolta a deglutire', 'gola gonfia', 'gola che si chiude', 'mi si chiude la gola', 'si chiude la gola', 'gonfiore alla gola', 'lingua gonfia',
      'labbra gonfie', 'labbro gonfio', 'faccia gonfia', 'viso gonfio', 'volto gonfio', 'gonfiore al viso', 'gonfiore alla faccia', 'gonfiore al volto', 'gonfiore alle labbra', 'gonfiore agli occhi',
      'mi si e gonfiata la faccia', 'mi si e gonfiato il viso', 'mi si e gonfiato il volto', 'mi si sono gonfiate le labbra', 'mi si sono gonfiati gli occhi', 'occhi gonfi', 'palpebre gonfie',
      'rossa e gonfia', 'rosso e gonfio', 'tutta gonfia', 'tutto gonfio', 'molto gonfia', 'molto gonfio', 'mi si sta gonfiando', 'si sta gonfiando', 'mi si gonfia', 'mi si gonfiano', 'shock anafilattico', 'anafilassi', 'anafilattico', 'ho perso i sensi', 'sono svenuta', 'sono svenuto', 'svenimento', 'sto per svenire',
    ],
    // HIGH: reazione a un prodotto (bruciore forte, ustione, allergia in corso, prodotto negli occhi) -> priorità allo staff.
    high: [
      'mi brucia la testa', 'mi brucia il cuoio capelluto', 'mi brucia la cute', 'mi brucia la pelle', 'mi brucia tantissimo', 'mi brucia molto', 'mi brucia tanto', 'mi bruciano gli occhi',
      'bruciore forte', 'bruciore fortissimo', 'bruciore insopportabile', 'bruciore intenso', 'bruciore al cuoio capelluto', 'bruciore alla cute', 'mi sta bruciando', 'sta bruciando la testa',
      'testa in fiamme', 'cuoio capelluto in fiamme', 'pelle in fiamme', 'in fiamme',
      'ustione', 'ustioni', 'ustionata', 'ustionato', 'mi sono ustionata', 'mi sono ustionato', 'mi ha ustionata', 'mi ha ustionato', 'mi hanno ustionata', 'mi hanno ustionato', 'ustione chimica', 'scottatura', 'scottata', 'mi hanno bruciato la cute', 'mi hanno bruciato la testa', 'mi hanno bruciato il cuoio capelluto', 'bruciata dalla piastra',
      'reazione allergica', 'ho una reazione', 'mi e venuta una reazione', 'mi e venuta un allergia', 'mi e venuta l allergia', 'orticaria', 'pomfi', 'vesciche', 'vescica', 'bolle in testa', 'bolle sulla testa', 'bolle sul cuoio capelluto', 'cuoio capelluto gonfio', 'cute gonfia', 'testa gonfia', 'mi sanguina la testa', 'mi sanguina la cute', 'sanguina il cuoio capelluto', 'piaghe',
      'prodotto negli occhi', 'tinta negli occhi', 'candeggina negli occhi', 'mi e andata la tinta negli occhi', 'mi e finita la tinta negli occhi', 'mi e andato il prodotto negli occhi', 'mi e entrato il prodotto negli occhi', 'ho la tinta negli occhi', 'bruciore agli occhi',
      'prurito fortissimo', 'prurito insopportabile', 'prurito forte', 'mi prude tantissimo', 'mi prude da morire',
    ],
    // MEDIUM: segnali da tenere presenti (cute sensibile, allergie note, gravidanza) senza urgenza.
    medium: [
      'prurito', 'mi prude', 'mi prude la testa', 'cute irritata', 'cuoio capelluto irritato', 'cuoio capelluto arrossato', 'cute arrossata', 'rossore', 'irritazione', 'mi pizzica', 'pizzicore',
      'cute sensibile', 'cuoio capelluto sensibile', 'pelle sensibile', 'sono allergica', 'sono allergico', 'allergia', 'allergica', 'allergico', 'dermatite', 'psoriasi', 'eczema',
      'incinta', 'sono incinta', 'gravidanza', 'in gravidanza', 'allattamento', 'allatto', 'allattando',
      'caduta dei capelli', 'mi cadono i capelli', 'perdo i capelli', 'perdita di capelli',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare con la titolare', 'parlare con la parrucchiera', 'parlare con il parrucchiere', 'parlare con la responsabile', 'parlare con il responsabile', 'parlare con un umano', 'parlare con un essere umano',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi la titolare', 'passatemi il titolare', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'mi richiami', 'mi chiami', 'non sei una persona', 'sei un robot', 'sei un bot', 'sei una persona',
      'sentire qualcuno', 'sentire una persona', 'sentire il titolare', 'sentire la titolare', 'sentire la parrucchiera', 'una telefonata', 'essere richiamata', 'essere richiamato', 'con un operatore', 'con l operatore', 'operatore umano', 'operatore vero', 'persona vera', 'persona reale', 'non un bot',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del salone, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste del cliente che equivalgono a chiedere diagnosi/terapia/farmaci o a valutare la sicurezza di un
    // trattamento chimico per la salute (gravidanza, allergie, patch test, tossicità).
    diagnosi_patterns: [
      // diagnosi su cute e reazioni
      'che cosa ho', 'che cos ho', 'cosa ho', 'dimmi cosa ho', 'dimmi almeno cosa ho', 'cosa potrebbe essere', 'cosa puo essere', 'che cosa puo essere', 'diagnosi',
      'e una dermatite', 'e dermatite', 'e un eczema', 'e eczema', 'e psoriasi', 'e una psoriasi', 'e un allergia', 'e allergia', 'e una reazione allergica', 'sara un allergia', 'sara allergia', 'e un infezione', 'e infezione', 'e un fungo', 'e una micosi',
      'e alopecia', 'e un alopecia', 'e calvizie', 'perche mi cadono i capelli', 'perche mi cadono', 'perche perdo i capelli', 'e normale che mi cadano', 'e normale che cadano',
      'e grave', 'e pericoloso', 'e pericolosa', 'e preoccupante', 'e serio', 'devo preoccuparmi', 'mi devo preoccupare', 'cosa grave', 'cosa seria',
      'e normale che mi bruci', 'e normale che bruci', 'e normale il bruciore', 'e normale il prurito', 'e normale che prude', 'e normale che mi prude', 'e normale che mi prudano',
      // farmaci, creme, medico
      'antistaminico', 'cortisone', 'pomata', 'che crema', 'quale crema', 'che pomata', 'quale pomata', 'cosa mettere', 'cosa metto', 'cosa posso mettere', 'cosa posso applicare', 'cosa applico', 'cosa mi metto', 'cosa devo mettere',
      'che farmaco', 'quale farmaco', 'che medicina', 'quale medicina', 'antibiotico', 'antidolorifico', 'tachipirina', 'ibuprofene', 'aspirina', 'paracetamolo', 'cosa posso prendere', 'cosa prendo', 'devo prendere',
      'devo andare dal medico', 'devo andare al pronto soccorso', 'devo andare dal dermatologo', 'devo chiamare il medico', 'devo andare in ospedale',
      // gravidanza e allattamento con trattamenti chimici
      'incinta posso', 'incinta si puo', 'incinta e sicuro', 'incinta e sicura', 'incinta fa male', 'gravidanza posso', 'in gravidanza si puo', 'in gravidanza e sicuro', 'in gravidanza e sicura', 'in gravidanza fa male', 'in gravidanza e dannoso', 'in gravidanza e dannosa', 'dannoso in gravidanza', 'dannosa in gravidanza',
      'posso fare la tinta incinta', 'posso fare la tinta in gravidanza', 'posso fare la cheratina in gravidanza', 'posso fare la cheratina incinta', 'si puo fare la tinta in gravidanza', 'si puo fare la tinta incinta', 'si puo fare la cheratina in gravidanza',
      'tinta in gravidanza', 'tinta incinta', 'tinte in gravidanza', 'colore in gravidanza', 'colorazione in gravidanza', 'meches in gravidanza', 'decolorazione in gravidanza', 'permanente in gravidanza', 'cheratina in gravidanza', 'stiratura in gravidanza', 'trattamenti chimici in gravidanza', 'prodotti chimici in gravidanza', 'trattamenti in gravidanza',
      'durante la gravidanza posso', 'durante la gravidanza si puo', 'durante l allattamento posso', 'allattando posso', 'allatto posso', 'allattando si puo', 'tinta durante la gravidanza', 'colore durante la gravidanza', 'cheratina durante la gravidanza',
      'fa male al bambino', 'fa male al feto', 'danneggia il bambino', 'danneggia il feto', 'e dannoso per il bambino', 'e sicuro per il bambino',
      ...PATTERN_GRAVIDANZA,
      // allergie e patch test
      'posso comunque farla', 'posso comunque farlo', 'posso farla lo stesso', 'posso farlo lo stesso', 'posso farla comunque', 'posso farlo comunque', 'si puo fare lo stesso', 'si puo fare comunque',
      'allergica posso', 'allergico posso', 'allergica si puo', 'allergico si puo', 'allergica alla tinta posso', 'allergia alla tinta posso', 'allergia alla tinta si puo', 'allergica alla tinta cosa', 'allergia alla tinta cosa',
      'patch test non serve', 'non serve il patch test', 'non serve fare il patch test', 'saltare il patch test', 'saltare il test', 'senza patch test', 'senza test allergia', 'senza fare il test', 'evitare il patch test', 'evitare il test', 'posso non fare il test',
      // tossicità e salute
      'fa male alla salute', 'nocivo per la salute', 'nociva per la salute', 'e tossica', 'e tossico', 'cancerogena', 'cancerogeno', 'cancro', 'tumore',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'e allergia', 'si tratta di un allergia', 'e sicuramente un allergia', 'e una dermatite', 'e una reazione allergica', 'e sicuramente una dermatite',
      'prenda un antistaminico', 'prendi un antistaminico', 'antistaminico', 'cortisone', 'prenda un antidolorifico', 'prenda ibuprofene', 'puo prendere ibuprofene', 'applichi una crema', 'applica una crema', 'metta una crema', 'metta una pomata', 'applichi una pomata',
      'e sicuro in gravidanza', 'e sicura in gravidanza', 'e sicuro per il bambino', 'puo farla in gravidanza', 'puo farlo in gravidanza', 'si puo fare in gravidanza', 'non fa male al bambino', 'non danneggia il bambino', 'non fa male in gravidanza',
      'non serve il patch test', 'non serve il test', 'puo saltare il test', 'puo evitare il test', 'non e necessario il test',
      'nessuna controindicazione', 'senza controindicazioni', 'non ci sono controindicazioni', 'nessun rischio', 'senza rischi', 'non c e rischio',
      'per cento', 'non e grave', 'non e nulla', 'non e niente', 'non si preoccupi', 'non ti preoccupare', 'puo aspettare', 'puoi aspettare', 'mg', 'milligrammi',
      'non rovina i capelli', 'non danneggia i capelli', 'non fa male ai capelli', 'in una sola seduta', 'in una seduta', 'risultato identico alla foto', 'esattamente come in foto', 'sicuramente biondo',
    ],
    messaggio_sicurezza: 'Su reazioni, allergie, gravidanza o altri aspetti di salute non posso dare indicazioni: serve il parere del medico, e il salone può valutare insieme a lei prima di qualunque trattamento. Se vuole, la aiuto a fissare un appuntamento o a parlare con una persona del salone.',
    messaggio_emergenza: 'Capisco, la situazione sembra seria. Se ha gonfiore al viso o alle labbra, difficoltà a respirare o a deglutire, o si sente svenire, chiami subito il 118 o si rechi al pronto soccorso. Avviso immediatamente il salone.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    servizio: ['Che servizio le interessa: taglio, piega, colore o altro?', 'Mi dice che trattamento vorrebbe fare?', 'Per cosa vorrebbe venire da noi?'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    problema_capelli: ['Mi racconta che problema hanno i suoi capelli?', 'Cosa vorrebbe migliorare, esattamente?', 'Può descrivermi brevemente la situazione dei capelli?'],
    reazione: ['Mi racconta che disturbo ha avuto?', 'Cosa sta sentendo, esattamente?'],
    lunghezza_capelli: ['I suoi capelli sono corti, medi o lunghi?', 'Che lunghezza hanno, più o meno?'],
  },

  common_scenarios: [
    'Prenotazione taglio, piega, colore o ricrescita con servizio noto',
    'Schiariture (balayage, shatush, meches): domande generali e prenotazione',
    'Preventivo per cambio look o acconciatura da sposa/cerimonia',
    'Domande su prezzi, orari, pagamenti, promozioni: solo da dati del tenant',
    'Reclamo su un lavoro già eseguito: passaggio a una persona',
    'Reazione a un prodotto (bruciore, ustione, gonfiore): priorità e, se grave, 118',
    'Gravidanza, allergie, patch test: nessuna indicazione nel merito, rimando a medico e staff',
    'Spostamenti, annullamenti, ritardi: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque salone. Nessun
// prezzo, orario, nome, indirizzo né servizio dichiarato: quelli stanno solo
// nei dati del tenant. Le durate sono solo di principio, in parole.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_trattamenti', 'Che differenza c\'è tra balayage e shatush?', ['differenza tra balayage e shatush', 'differenza fra balayage e shatush', 'balayage o shatush', 'che differenza ce tra shatush e balayage', 'meglio balayage o shatush'],
    'Sono due tecniche di schiaritura che danno un effetto naturale. Il balayage è fatto a mano, con pennellate morbide e luce che parte dalle lunghezze; lo shatush crea un effetto più sfumato e "spettinato", con radice più scura. Quale sia più adatto dipende dai suoi capelli e dal risultato che desidera: lo valuta il parrucchiere.'),
  f('info_trattamenti', 'Cos\'è il balayage?', ['cos e il balayage', 'cosa e il balayage', 'in cosa consiste il balayage', 'come funziona il balayage'],
    'Il balayage è una tecnica di colorazione in cui il colore viene applicato a mano, con pennellate, per ottenere schiariture naturali e sfumate. Il risultato finale dipende dal colore di partenza dei capelli.'),
  f('info_trattamenti', 'Cos\'è lo shatush?', ['cos e lo shatush', 'cosa e lo shatush', 'in cosa consiste lo shatush', 'come funziona lo shatush'],
    'Lo shatush è una tecnica di schiaritura che lascia la radice più scura e illumina le lunghezze in modo sfumato, con un effetto naturale. Il parrucchiere valuta se è adatto ai suoi capelli.'),
  f('info_trattamenti', 'Che differenza c\'è tra meches, colpi di sole e balayage?', ['differenza tra meches e colpi di sole', 'meches o balayage', 'colpi di sole o balayage', 'che differenza ce tra meches e balayage'],
    'Meches e colpi di sole sono ciocche schiarite in modo più marcato e regolare; il balayage è più sfumato e naturale. La scelta dipende dallo stile che desidera e dai suoi capelli.'),
  f('info_trattamenti', 'Ogni quanto si fa la ricrescita?', ['ogni quanto fare la ricrescita', 'ogni quanto si ritocca la tinta', 'ogni quanto devo rifare le radici', 'ogni quanto va fatta la ricrescita', 'ogni quanto si fa la tinta'],
    'In genere il ritocco delle radici si fa ogni quattro-sei settimane, ma dipende da quanto cresce il capello, dal colore scelto e da quanto si nota lo stacco. Il parrucchiere può consigliarle la frequenza più adatta.'),
  f('info_trattamenti', 'Ogni quanto è bene tagliare o spuntare i capelli?', ['ogni quanto si taglia i capelli', 'ogni quanto devo spuntare i capelli', 'ogni quanto va fatta la spuntatina', 'ogni quanto taglio i capelli'],
    'Per mantenere la forma e tenere sotto controllo le doppie punte si consiglia in genere una spuntatina ogni due o tre mesi, ma dipende dal taglio e dalla velocità di crescita dei suoi capelli.'),
  f('info_trattamenti', 'Quanto dura una tinta o un colore?', ['quanto dura la tinta', 'quanto tempo ci vuole per la tinta', 'quanto dura il colore', 'quanto tempo ci vuole per fare il colore'],
    'I tempi dipendono da lunghezza e quantità dei capelli e dal tipo di lavoro: un ritocco delle radici richiede meno tempo di un colore completo, e le schiariture richiedono più tempo. Il salone le dirà la durata prevista per il suo caso.'),
  f('info_trattamenti', 'Quanto dura un\'appuntamento per le schiariture?', ['quanto dura il balayage', 'quanto dura lo shatush', 'quanto tempo ci vuole per le meches', 'quanto dura una seduta di schiariture', 'quanto tempo ci vuole per il balayage'],
    'Le schiariture sono tra i servizi più lunghi: possono servire diverse ore, in base a lunghezza, densità dei capelli e risultato desiderato. Per una stima precisa conviene chiedere al salone.'),
  f('info_trattamenti', 'Quanto dura l\'effetto della piega?', ['quanto dura la piega', 'per quanto tempo dura la piega', 'quanto resiste la piega', 'quanto tiene la piega'],
    'La piega dura qualche giorno: dipende dal tipo di capello, dall\'umidità e da come lo si tratta. Il parrucchiere può darle consigli per farla durare di più.'),
  f('info_trattamenti', 'Cos\'è la cheratina e quanto dura?', ['cos e la cheratina', 'come funziona la cheratina', 'quanto dura la cheratina', 'in cosa consiste la stiratura', 'cos e la stiratura', 'quanto resiste la cheratina'],
    'Il trattamento alla cheratina o la stiratura rende i capelli più lisci, disciplinati e lucidi, riducendo il crespo. L\'effetto è temporaneo e la durata dipende dai capelli, dal prodotto e dalla cura che se ne ha dopo; il parrucchiere valuta se è adatto al suo caso.'),
  f('info_trattamenti', 'La decolorazione rovina i capelli?', ['la decolorazione rovina i capelli', 'decolorare rovina i capelli', 'schiarire rovina i capelli', 'le meches rovinano i capelli', 'il balayage rovina i capelli'],
    'Schiarire i capelli li stressa, perché il pigmento viene rimosso con prodotti chimici. Con tecnica corretta, trattamenti di cura e un buon punto di partenza lo stress si limita, ma l\'effetto dipende dallo stato dei capelli: lo valuta il parrucchiere.'),
  f('info_trattamenti', 'Quante sedute servono per schiarire molto i capelli?', ['quante sedute servono per diventare biondi', 'si diventa biondi in una volta', 'quante sedute per schiarire', 'posso diventare biondo platino subito', 'quante schiariture servono'],
    'Dipende dal colore di partenza e dallo stato dei capelli. Per schiarire molto, e preservare i capelli, a volte si procede in più passaggi graduali: il parrucchiere ne parla in consulenza e non può garantire un risultato in una sola volta.'),
  f('info_trattamenti', 'Cos\'è il trattamento ricostruttivo?', ['cos e il trattamento ricostruttivo', 'come funziona la ricostruzione', 'a cosa serve la ricostruzione', 'cos e la ricostruzione dei capelli', 'cosa sono i trattamenti ricostruttivi'],
    'Il trattamento ricostruttivo serve a rinforzare e nutrire i capelli stressati da colore, schiariture o calore. Esistono prodotti e metodi diversi: il parrucchiere sceglie quello più adatto in base allo stato dei capelli.'),
  f('info_trattamenti', 'Cos\'è la permanente?', ['cos e la permanente', 'come funziona la permanente', 'in cosa consiste la permanente', 'quanto dura la permanente'],
    'La permanente è un trattamento chimico che modifica la forma dei capelli per ottenere onde o ricci che durano nel tempo, finché non crescono i capelli nuovi. Il parrucchiere valuta se è adatta ai suoi capelli.'),
  f('info_trattamenti', 'Cosa sono le extension?', ['cosa sono le extension', 'come funzionano le extension', 'cos e l extension', 'che tipi di extension esistono', 'le extension rovinano i capelli'],
    'Le extension sono ciocche aggiuntive che danno lunghezza o volume. Esistono metodi di applicazione diversi (per esempio a clip o fissate in altri modi): serve una consulenza per scegliere quello adatto ai suoi capelli e a come intende usarle.'),
  f('info_trattamenti', 'Si possono coprire i capelli bianchi?', ['si coprono i capelli bianchi', 'la tinta copre i capelli bianchi', 'come si coprono i bianchi', 'posso coprire i bianchi', 'come coprire i capelli bianchi'],
    'Sì, in genere con una colorazione si coprono i capelli bianchi. La resa dipende da quanti sono, dal tono scelto e dal tipo di capello: lo stilista consiglia la soluzione migliore.'),
  f('info_trattamenti', 'Posso fare colore e taglio nello stesso appuntamento?', ['posso fare tinta e taglio insieme', 'si puo fare taglio e colore insieme', 'colore e taglio nello stesso giorno', 'posso fare colore e piega insieme'],
    'In genere sì: più servizi si possono combinare nello stesso appuntamento, purché ci sia il tempo necessario. Le conviene indicarli tutti al momento della prenotazione.'),
  f('info_trattamenti', 'Posso fare la tinta se ho i capelli rovinati?', ['posso fare la tinta con i capelli rovinati', 'posso schiarire se i capelli sono rovinati', 'capelli rovinati posso colorare', 'posso colorare capelli sfibrati'],
    'Dipende dallo stato dei capelli: il parrucchiere li valuta prima di decidere se procedere subito oppure fare prima un trattamento di cura. Meglio non improvvisare con prodotti fai da te.'),
  f('info_trattamenti', 'Dopo la tinta o la cheratina quando posso lavare i capelli?', ['quando posso lavare i capelli dopo la tinta', 'dopo la cheratina quanto aspetto per lavare i capelli', 'posso lavare i capelli dopo la tinta', 'quando lavo i capelli dopo il trattamento'],
    'Dipende dal prodotto e dal trattamento: il salone le darà le indicazioni precise per il suo caso, da seguire con attenzione. Per dubbi particolari contatti direttamente il salone.'),
  f('info_trattamenti', 'Posso fare lo shatush o il balayage sui capelli corti?', ['balayage su capelli corti', 'shatush su capelli corti', 'si puo fare lo shatush sui capelli corti', 'le meches su capelli corti'],
    'Dipende da lunghezza e taglio: su capelli corti si possono ottenere effetti di schiaritura, ma il risultato è diverso da quello su capelli lunghi. Il parrucchiere valuta in consulenza la tecnica più adatta.'),
  f('info_trattamenti', 'Ogni quanto si regola la barba?', ['ogni quanto va regolata la barba', 'ogni quanto si fa la barba dal barbiere', 'ogni quanto fare la rifinitura della barba'],
    'Dipende dalla velocità di crescita e dalla forma che si vuole mantenere: in genere ogni due o tre settimane per tenerla in ordine. Il barbiere può darle un consiglio personalizzato.'),
  f('info_preparazione', 'Posso portare una foto di riferimento?', ['posso portare foto di riferimento', 'posso mandarvi una foto del colore che voglio', 'vi mando una foto', 'posso inviare una foto del taglio', 'serve una foto di riferimento'],
    'Sì, una foto di riferimento è molto utile per capire il risultato che desidera. Poi il parrucchiere valuta cosa è realizzabile sui suoi capelli.'),
  f('info_preparazione', 'Devo venire con i capelli lavati?', ['devo lavare i capelli prima', 'posso venire con i capelli sporchi', 'devo venire con i capelli puliti', 'capelli sporchi o puliti'],
    'Dipende dal servizio: per alcuni trattamenti si preferisce una cute non appena lavata, per altri è indifferente. Il salone le darà l\'indicazione giusta per il suo appuntamento.'),
  f('info_preparazione', 'Cos\'è il patch test e serve prima della tinta?', ['serve il patch test', 'cos e il patch test', 'si fa il test allergia', 'devo fare il test allergia prima della tinta', 'quando si fa il patch test', 'test di sensibilita tinta'],
    'Il patch test, o test di sensibilità, è una piccola prova del prodotto sulla pelle che viene proposta prima di alcuni trattamenti di colore. Come e quando farlo lo indica il salone; in caso di allergie note o dubbi è bene parlarne anche con il proprio medico.'),
  f('info_preparazione', 'Posso portare i miei prodotti?', ['posso portare la mia tinta', 'posso portare i miei prodotti da casa', 'posso usare la mia tinta', 'vi porto io i prodotti'],
    'Conviene chiedere al salone: di norma ogni salone lavora con i propri prodotti e decide se e come usare quelli del cliente.'),
];
