// lib/engine/packs/avvocato.js
//
// Sector Pack "avvocato" v1 — conoscenza di SETTORE (studio legale, Italia),
// non di un singolo studio. Parcelle, preventivi, orari, nomi degli avvocati,
// aree effettivamente trattate, indirizzi e modalità di consulenza (online,
// telefonica) NON stanno qui: arrivano solo dai dati del tenant.
//
// Settore REGOLAMENTATO e coperto da segreto professionale. Il bot è solo
// l'accoglienza dello studio: raccoglie il MINIMO per fissare un appuntamento
// o far richiamare dall'avvocato (area di diritto, presenza di scadenze o
// udienze imminenti, nome) e non chiede mai i dettagli della vicenda per
// WhatsApp. NON dà pareri legali, NON valuta le probabilità di vincere una
// causa, NON interpreta contratti o atti, NON promette esiti né tempi, NON
// indica scadenze o termini legali come certezze. Le urgenze reali (udienza,
// notifica, termine in scadenza, arresto/fermo, violenza o minacce, sfratto
// esecutivo imminente) vanno subito all'avvocato; se c'è pericolo per
// l'incolumità il messaggio rimanda al 112.
//
// Le liste di frasi di urgenza sono in parte generate da combinazioni
// (prodotto) per coprire le varianti di costruzione italiane ("ho l'udienza
// domani", "domani ho udienza", "udienza fissata per domani") senza che il
// motore abbia prossimità tra parole: vedi docs/SECTOR_ENGINE.md (limiti).
// ATTENZIONE: il pack è scritto da AI e va rivisto da un avvocato prima di
// un uso reale (vedi docs/SECTOR_ENGINE.md).

export const SETTORE = 'avvocato';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack avvocato (studio legale) — lessico per 15 aree di diritto, 22 intent (prima consulenza/appuntamento, nuovo cliente, preventivo, parcelle, aree, documenti e invio documenti, riservatezza, gratuito patrocinio, conoscenza generale, stato pratica, disdetta/spostamento, reclamo, emergenza), 8 entità, urgenze reali (udienza/notifica/termine, arresto/fermo, violenza/minacce, sfratto esecutivo) con passaggio immediato e rimando al 112, sicurezza anti-parere/anti-pronostico/anti-interpretazione di atti e anti-raccolta di dettagli sensibili, 25 FAQ di settore solo conoscenza generale.';

// Prodotto cartesiano di liste di parole: genera le varianti di una frase.
const prodotto = (...liste) => liste.reduce((acc, l) => acc.flatMap((a) => l.map((b) => `${a} ${b}`.trim())), ['']);
const unici = (arr) => [...new Set(arr)];

// ---- Frasi di urgenza reale (CRITICAL): generate + elenco esplicito ----
const ART = ['', 'un', 'una', 'il', 'la', 'l'];
const URG_UDIENZA = unici([
  // "ho (l')udienza", "c'è un'udienza", "mi hanno fissato l'udienza"
  ...prodotto(['ho', 'abbiamo', 'c e', 'e stata fissata', 'e fissata', 'e stato fissato', 'm hanno fissato', 'mi hanno fissato', 'mi hanno convocato per'], ART, ['udienza', 'interrogatorio', 'prima udienza']),
  // "udienza domani", "l'udienza è tra due giorni"
  ...prodotto(['udienza', 'interrogatorio', 'notifica', 'convalida', 'prima udienza'], ['oggi', 'domani', 'dopodomani', 'stasera', 'stamattina', 'e oggi', 'e domani', 'e dopodomani', 'per oggi', 'per domani', 'per dopodomani', 'e fissata per domani', 'e fissata per oggi', 'tra pochi giorni', 'tra due giorni', 'tra tre giorni', 'tra un paio di giorni', 'fra pochi giorni', 'fra due giorni', 'fra tre giorni', 'e tra pochi giorni', 'e tra due giorni', 'e tra tre giorni', 'questa settimana', 'e questa settimana']),
  // "domani ho l'udienza"
  ...prodotto(['oggi', 'domani', 'dopodomani', 'stasera', 'stamattina'], ['ho', 'abbiamo', 'c e'], ART, ['udienza', 'interrogatorio']),
  'domani devo andare in tribunale', 'domani devo presentarmi in tribunale', 'devo presentarmi in tribunale', 'devo andare in tribunale domani', 'devo andare dal giudice', 'devo presentarmi davanti al giudice', 'devo comparire davanti al giudice', 'mi hanno convocato in tribunale', 'mi hanno convocato dal giudice', 'mi hanno convocato in procura', 'mi hanno convocato in questura', 'mi hanno convocato dai carabinieri', 'devo andare in procura', 'devo presentarmi in procura', 'devo presentarmi in questura', 'devo presentarmi dai carabinieri',
]);
const URG_NOTIFICA = unici([
  ...prodotto(['ho ricevuto', 'ho appena ricevuto', 'mi e arrivato', 'mi e arrivata', 'mi e appena arrivato', 'mi e appena arrivata', 'mi hanno consegnato', 'mi hanno dato', 'mi hanno recapitato'], ['', 'un', 'una', 'il', 'la'], ['decreto ingiuntivo', 'atto di citazione', 'citazione', 'atto giudiziario', 'atto del tribunale', 'atto dal tribunale', 'notifica', 'notifica dal tribunale', 'notifica del tribunale', 'atto di precetto', 'precetto', 'pignoramento', 'atto di pignoramento', 'avviso di garanzia', 'informazione di garanzia', 'avviso di conclusione delle indagini', 'decreto penale', 'decreto penale di condanna', 'convocazione dal tribunale', 'convocazione in tribunale', 'convocazione in procura', 'convocazione dalla procura', 'ricorso', 'lettera dal tribunale', 'raccomandata dal tribunale', 'intimazione di sfratto', 'atto di sfratto', 'sfratto', 'sentenza', 'ordinanza', 'provvedimento del giudice', 'decreto del giudice']),
  'mi hanno notificato', 'mi e stato notificato', 'mi e stata notificata', 'mi hanno pignorato', 'conto pignorato', 'stipendio pignorato', 'casa pignorata', 'auto pignorata', 'mi hanno pignorato il conto', 'mi hanno pignorato lo stipendio',
]);
const URG_TERMINI = [
  'scade domani', 'scade oggi', 'scade dopodomani', 'scade a breve', 'scade questa settimana', 'scade tra pochi giorni', 'scade fra pochi giorni',
  'scadenza domani', 'scadenza oggi', 'scadenza dopodomani', 'scadenza tra pochi giorni', 'scadenza imminente', 'scadenza ravvicinata', 'scadenza vicina', 'scadenza a breve',
  'termine scade', 'il termine scade', 'i termini scadono', 'scadono i termini', 'scade il termine', 'termine in scadenza', 'termini in scadenza', 'sta per scadere il termine', 'stanno per scadere i termini', 'termini stanno scadendo', 'scadenza dei termini',
  'ultimo giorno per fare ricorso', 'ultimo giorno per l opposizione', 'ultimo giorno per opporsi', 'ultimo giorno utile', 'ultimi giorni per fare ricorso', 'ultimi giorni utili', 'e l ultimo giorno',
  'ho una scadenza', 'c e una scadenza', 'ho delle scadenze', 'ci sono delle scadenze', 'ci sono scadenze', 'ho un termine', 'ho dei termini', 'ho una data limite',
  'rischio di perdere i termini', 'rischio di perdere il termine', 'sto per perdere i termini', 'sto perdendo i termini', 'ricorso entro domani', 'opposizione entro domani', 'opposizione entro pochi giorni', 'ricorso entro pochi giorni',
];
const URG_ARRESTO = [
  'e stato arrestato', 'e stata arrestata', 'sono stato arrestato', 'sono stata arrestata', 'hanno arrestato', 'mi hanno arrestato', 'lo hanno arrestato', 'l hanno arrestato', 'la hanno arrestata', 'l hanno arrestata', 'stanno arrestando', 'arrestato ieri', 'arrestato stanotte', 'arrestato stamattina', 'arrestata ieri', 'arrestata stanotte',
  'in stato di fermo', 'in stato di arresto', 'fermo di polizia giudiziaria', 'e stato fermato dalla polizia', 'e stato fermato dai carabinieri', 'mi hanno fermato i carabinieri', 'mi ha fermato la polizia', 'convalida del fermo', 'convalida dell arresto', 'udienza di convalida', 'interrogatorio di garanzia',
  'portato in questura', 'portato in caserma', 'portato in commissariato', 'e in questura', 'sono in questura', 'e in caserma', 'sono in caserma', 'e in commissariato', 'sono in commissariato', 'trattenuto in questura', 'trattenuto in caserma', 'trattenuta in questura',
  'e in carcere', 'e finito in carcere', 'e stato portato in carcere', 'sono in carcere', 'agli arresti domiciliari', 'e agli arresti',
  'perquisizione in corso', 'stanno perquisendo', 'mi stanno perquisendo', 'sono arrivati i carabinieri', 'sono arrivati i poliziotti', 'e arrivata la polizia', 'sono arrivati i finanzieri', 'ci sono i carabinieri a casa', 'c e la polizia a casa', 'la polizia e a casa', 'i carabinieri sono a casa', 'la guardia di finanza e in azienda', 'sequestro in corso', 'stanno sequestrando',
];
const URG_SFRATTO = [
  'sfratto esecutivo', 'sfratto imminente', 'ufficiale giudiziario', 'ufficiali giudiziari', 'esecuzione dello sfratto', 'esecuzione dell sfratto', 'accesso dell ufficiale giudiziario', 'viene l ufficiale giudiziario', 'mi sfrattano domani', 'mi sfrattano oggi', 'sfratto domani', 'sfratto tra pochi giorni', 'mi buttano fuori di casa', 'mi mettono in strada', 'mi cacciano di casa domani', 'cambio serratura', 'hanno cambiato la serratura',
];
const URG_VIOLENZA = [
  'mi sta picchiando', 'mi sta minacciando', 'mi sta aggredendo', 'ci sta picchiando', 'ci sta minacciando', 'mi stanno picchiando', 'mi stanno minacciando', 'mi stanno aggredendo',
  'mi picchia', 'mi ha picchiato', 'mi ha picchiata', 'mi ha aggredito', 'mi ha aggredita', 'ci picchia', 'picchia i bambini', 'picchia mio figlio', 'picchia i miei figli',
  'mi hanno minacciato', 'mi hanno minacciata', 'ci hanno minacciato', 'mi hanno picchiato', 'mi hanno picchiata', 'ci hanno picchiato', 'mi hanno aggredito', 'mi hanno aggredita', 'minacciato di morte', 'minacciata di morte', 'minacciati di morte', 'sono stato minacciato', 'sono stata minacciata', 'e stato minacciato', 'e stata minacciata', 'sono stato picchiato', 'sono stata picchiata', 'e stato picchiato', 'e stata picchiata', 'sono stato aggredito', 'sono stata aggredita', 'e stato aggredito', 'e stata aggredita',
  'mi minaccia', 'mi ha minacciato', 'mi ha minacciata', 'ci minaccia', 'mi minacciano', 'minacce di morte', 'minaccia di morte', 'mi minaccia di morte', 'mi ha minacciato di morte', 'mi vuole uccidere', 'mi vuole ammazzare', 'vuole uccidermi', 'vuole ammazzarmi', 'mi ucciderebbe', 'dice che mi ammazza', 'dice che mi uccide', 'dice che ci ammazza',
  'ha una pistola', 'ha un coltello', 'e armato', 'e armata', 'ha un arma', 'ha delle armi',
  'ho paura per la mia vita', 'ho paura per la vita', 'ho paura per i miei figli', 'ho paura che mi faccia del male', 'ho paura che mi uccida', 'temo per la mia incolumita', 'temo per la mia vita', 'temo per i miei figli',
  'sono in pericolo', 'siamo in pericolo', 'sono in pericolo di vita', 'non sono al sicuro', 'non siamo al sicuro', 'non e al sicuro', 'sto scappando di casa', 'sono scappata di casa', 'sono scappato di casa', 'sta sfondando la porta', 'sta cercando di entrare', 'sta forzando la porta',
  'mi sta seguendo', 'mi sta pedinando', 'mi perseguita', 'mi pedina', 'sono perseguitata', 'sono perseguitato', 'stalking', 'sono vittima di stalking',
  'violenza domestica', 'violenza in famiglia', 'maltrattamenti in famiglia', 'maltrattamenti', 'mi maltratta', 'mi maltrattano', 'violenza sessuale', 'sono stata violentata', 'sono stato violentato', 'abusi sessuali', 'abuso sessuale', 'revenge porn', 'mi ricatta con le foto', 'mi ricatta',
];

// Frasi a cui l'avvocato deve arrivare subito: tutte CRITICAL (template, zero LLM).
const CRITICAL = unici([...URG_UDIENZA, ...URG_NOTIFICA, ...URG_TERMINI, ...URG_ARRESTO, ...URG_SFRATTO, ...URG_VIOLENZA]);

export const pack = {
  identity: {
    nome_ruolo: 'studio legale',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di accoglienza di uno studio legale. Accogli chi cerca un avvocato o chiede informazioni sullo studio con tono cortese, sobrio e rassicurante, e raccogli il MINIMO necessario per fissare un appuntamento o far richiamare l\'avvocato: area di diritto, presenza di scadenze o udienze imminenti, nome. Non sei un avvocato: non dai pareri legali, non valuti le probabilità di vincere una causa, non interpreti contratti o atti, non prometti esiti né tempi, non indichi scadenze o termini di legge. Per riservatezza e segreto professionale non chiedi né ascolti i dettagli della vicenda su WhatsApp: quelli si trattano direttamente con l\'avvocato.',
  },
  mission: 'Capire se la persona cerca una consulenza, un nuovo incarico, un preventivo o un\'informazione sullo studio; raccogliere solo il minimo (area di diritto, scadenze o udienze imminenti, nome); organizzare la prima consulenza; passare subito all\'avvocato le urgenze reali e tutto ciò che richiede una persona.',
  tone_default: 'professionale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, tono sobrio, rispettoso e senza giri di parole: chi scrive a uno studio legale è spesso in difficoltà.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Riservatezza: non chiedere i dettagli della vicenda, i nomi delle controparti o altri dati sensibili. Se la persona inizia a raccontare il caso, ringrazia e spiega che i dettagli li tratterà direttamente con l\'avvocato; il minimo che serve è l\'area di diritto, se ci sono scadenze o udienze imminenti e il nome.',
    'Mai pareri legali, mai valutazioni sulle probabilità di successo, mai interpretazione di contratti o atti, mai previsioni su esiti o tempi: spiega con garbo che solo l\'avvocato può farlo e proponi un appuntamento.',
    'Mai indicare scadenze, termini o prescrizioni come certezze: se la persona ha un termine, un\'udienza o una notifica vicina, avvisa subito l\'avvocato.',
    'Parcelle, preventivi, orari, aree trattate, avvocati dello studio e modalità di consulenza (presenza, online, telefono) si dicono solo se compaiono nei dati dello studio; altrimenti dì che verifichi con lo studio.',
    'Se c\'è un pericolo per l\'incolumità (violenza, minacce in corso) indica di chiamare subito il 112 e avvisa lo studio.',
    'Non confermare né smentire se una persona è cliente dello studio o se lo studio assiste una controparte: sono informazioni coperte da riservatezza.',
    'Non invitare a inviare per WhatsApp documenti, atti o foto riservate: indica di concordare con lo studio il canale da usare.',
  ],
  prohibited_claims: [
    'dare pareri o consigli legali, anche in forma di "secondo me" o "in genere"',
    'dire se la persona ha ragione o torto, o valutare le possibilità di vincere o perdere una causa',
    'interpretare contratti, clausole, atti, sentenze, lettere o provvedimenti',
    'promettere o prevedere esiti (vittoria, assoluzione, risarcimento, assegno) o tempi di una causa',
    'indicare scadenze, termini di ricorso, prescrizioni o decadenze come certezze',
    'indicare parcelle, preventivi, sconti, importi o orari non presenti nelle fonti',
    'garantire un risultato o dire che un caso è "facile" o "già vinto"',
    'dire se una persona ha diritto al gratuito patrocinio, a un assegno, a un risarcimento o a un\'eredità',
    'confermare o smentire che una persona o una controparte sia cliente dello studio',
    'chiedere o accettare dettagli riservati della vicenda, documenti sensibili o dati bancari via chat',
  ],
  business_rules: [
    'Annullamenti e spostamenti di appuntamenti già fissati vanno passati a una persona dello studio.',
    'Lo stato di una pratica o di una causa in corso lo comunica solo lo studio: passa a una persona.',
    'Parcelle, preventivi, modalità di pagamento, orari, aree trattate e disponibilità sono dati dello studio: mai inventarli.',
    'Le urgenze reali (udienza, notifica, termine in scadenza, arresto o fermo, violenza o minacce, sfratto esecutivo) si segnalano subito all\'avvocato.',
    'I pagamenti e i dati bancari non si gestiscono in chat.',
  ],

  entities: [
    { id: 'area_diritto', descrizione: 'Area del diritto di cui la persona ha bisogno (è l\'unico dato di merito che serve per fissare la consulenza; non i dettagli del caso).', tipo: 'enum', priorita: 5,
      valori: ['penale', 'famiglia', 'lavoro', 'immobiliare', 'condominio', 'successioni', 'recupero_crediti', 'risarcimento_danni', 'responsabilita_sanitaria', 'amministrativo', 'tributario', 'societario', 'bancario', 'immigrazione', 'civile'],
      domanda_varianti: ['Di che area si tratta, per esempio famiglia, lavoro, penale o civile? Mi basta una parola: i dettagli li vedrà direttamente l\'avvocato.', 'In quale ambito le serve assistenza? Non servono dettagli, solo l\'area.'] },
    { id: 'scadenza_imminente', descrizione: 'Se ci sono scadenze, termini o udienze imminenti di cui l\'avvocato deve essere informato (sì/no, senza dettagli).', tipo: 'enum', priorita: 8, valori: ['si', 'no'],
      domanda_varianti: ['Ci sono scadenze o udienze vicine di cui l\'avvocato deve essere informato subito?', 'Ha una scadenza o un\'udienza imminente? Mi basta un sì o un no.'] },
    { id: 'modalita', descrizione: 'Modalità di consulenza preferita: in studio, online o telefonica.', tipo: 'enum', priorita: 30, valori: ['presenza', 'online', 'telefono'] },
    { id: 'tipo_cliente', descrizione: 'Se la richiesta è di un privato o di un\'impresa.', tipo: 'enum', priorita: 35, valori: ['privato', 'impresa'] },
    { id: 'nome_cliente', descrizione: 'Nome della persona (o di chi richiede la consulenza).', tipo: 'string', priorita: 50,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta per l\'avvocato?', 'A che nome registro la richiesta?'] },
    { id: 'giorno', descrizione: 'Giorno preferito per la consulenza o per il contatto.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'telefono', descrizione: 'Numero di telefono se la persona lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Area di diritto (l'ordine conta: la prima voce trovata vince per l'entità) ----
    { canonical: 'area_penale', entity: 'area_diritto', value: 'penale', synonyms: ['penale', 'diritto penale', 'penalista', 'querela', 'querelare', 'querelato', 'querelata', 'sporgere querela', 'sporgere denuncia', 'fare denuncia', 'denuncia', 'denunciare', 'denunciato', 'denunciata', 'reato', 'reati', 'imputato', 'imputata', 'indagato', 'indagata', 'sotto processo', 'processo penale', 'avviso di garanzia', 'truffa', 'truffato', 'truffata', 'furto', 'rapina', 'diffamazione', 'diffamato', 'diffamata', 'lesioni', 'stalking', 'maltrattamenti', 'violenza domestica', 'violenza sessuale', 'minacce', 'estorsione', 'calunnia', 'legittima difesa', 'guida in stato di ebbrezza', 'guida in stato di ebrezza', 'spaccio', 'patteggiamento', 'decreto penale', 'arrestato', 'arrestata', 'arresto', 'carcere', 'fermo di polizia', 'avvocato d ufficio', 'difensore d ufficio'], errors: ['penalle', 'denuncai', 'quereela'] },
    { canonical: 'area_famiglia', entity: 'area_diritto', value: 'famiglia', synonyms: ['famiglia', 'diritto di famiglia', 'separazione', 'separarmi', 'separarci', 'separarsi', 'separato', 'separata', 'divorzio', 'divorziare', 'divorziato', 'divorziata', 'divorzio breve', 'affidamento', 'affidamento dei figli', 'affido', 'mantenimento', 'assegno di mantenimento', 'assegno divorzile', 'assegno di divorzio', 'assegno per i figli', 'alimenti', 'figli contesi', 'casa coniugale', 'matrimonio', 'coniuge', 'ex marito', 'ex moglie', 'unione civile', 'convivenza', 'convivente', 'adozione', 'riconoscimento di paternita', 'disconoscimento', 'amministratore di sostegno', 'interdizione'], errors: ['divorzzio', 'divorzo', 'separazzione', 'sepazione', 'seperazione', 'seperarmi', 'mantenimeto'] },
    { canonical: 'area_lavoro', entity: 'area_diritto', value: 'lavoro', synonyms: ['licenziamento', 'licenziato', 'licenziata', 'licenziare', 'licenziarmi', 'mi hanno licenziato', 'diritto del lavoro', 'giuslavorista', 'datore di lavoro', 'causa di lavoro', 'mobbing', 'demansionamento', 'straining', 'contratto di lavoro', 'stipendio non pagato', 'stipendi non pagati', 'non mi pagano lo stipendio', 'non mi pagano gli stipendi', 'tfr', 'trattamento di fine rapporto', 'dimissioni', 'dimissioni per giusta causa', 'lavoro in nero', 'infortunio sul lavoro', 'incidente sul lavoro', 'malattia professionale', 'contratto a termine', 'cassa integrazione', 'ferie non godute', 'straordinari non pagati', 'sul posto di lavoro', 'il mio datore', 'il mio capo mi', 'azienda mi ha'], errors: ['licenziamneto', 'licenziamnto', 'licenzziato', 'licenziamentto'] },
    { canonical: 'area_immobiliare', entity: 'area_diritto', value: 'immobiliare', synonyms: ['sfratto', 'sfratti', 'sfrattato', 'sfrattata', 'sfrattare', 'sfrattarlo', 'inquilino', 'inquilini', 'affittuario', 'locatore', 'conduttore', 'contratto di locazione', 'contratto di affitto', 'contratto d affitto', 'canone di locazione', 'morosita', 'moroso', 'non paga l affitto', 'affitto non pagato', 'padrone di casa', 'proprietario di casa', 'deposito cauzionale', 'diritto immobiliare', 'compravendita', 'compromesso', 'rogito', 'vizi della casa', 'caparra', 'immobile', 'immobili'], errors: ['sfrato', 'sfrattto', 'inquilno'] },
    { canonical: 'area_condominio', entity: 'area_diritto', value: 'condominio', synonyms: ['condominio', 'condomini', 'condomino', 'amministratore di condominio', 'assemblea condominiale', 'spese condominiali', 'delibera condominiale', 'millesimi', 'parti comuni', 'diritto condominiale'], errors: ['condomonio', 'condiminio'] },
    { canonical: 'area_successioni', entity: 'area_diritto', value: 'successioni', synonyms: ['successione', 'successioni', 'eredita', 'ereditato', 'ereditare', 'erede', 'eredi', 'testamento', 'testamentario', 'diritto successorio', 'divisione ereditaria', 'quota di legittima', 'lesione di legittima', 'legittimari', 'lascito', 'donazione', 'donazioni', 'rinuncia all eredita', 'accettazione dell eredita', 'beneficio d inventario', 'defunto', 'deceduto', 'decesso'], errors: ['ereditta', 'testamneto', 'sucessione'] },
    { canonical: 'area_recupero_crediti', entity: 'area_diritto', value: 'recupero_crediti', synonyms: ['recupero crediti', 'recuperare un credito', 'recuperare i miei soldi', 'recuperare dei soldi', 'recuperare il credito', 'credito da recuperare', 'crediti', 'fattura non pagata', 'fatture non pagate', 'fatture insolute', 'insoluto', 'insoluti', 'cliente moroso', 'cliente che non paga', 'debitore', 'debitori', 'non mi paga', 'non mi pagano', 'mi deve dei soldi', 'mi deve ancora dei soldi', 'decreto ingiuntivo', 'ingiunzione di pagamento', 'diffida di pagamento', 'prestito non restituito', 'soldi prestati', 'assegno scoperto', 'assegno protestato', 'cambiale'], errors: ['recuper crediti', 'recupero credtti'] },
    { canonical: 'area_responsabilita_sanitaria', entity: 'area_diritto', value: 'responsabilita_sanitaria', synonyms: ['malasanita', 'errore medico', 'errori medici', 'responsabilita medica', 'responsabilita sanitaria', 'colpa medica', 'negligenza medica', 'intervento sbagliato', 'errore in ospedale', 'errore chirurgico', 'diagnosi sbagliata', 'infezione in ospedale', 'danni da intervento'], errors: ['malasanità', 'mala sanita'] },
    { canonical: 'area_risarcimento_danni', entity: 'area_diritto', value: 'risarcimento_danni', synonyms: ['risarcimento', 'risarcimento danni', 'risarcire', 'incidente stradale', 'incidente', 'sinistro', 'tamponamento', 'investito', 'investita', 'danno biologico', 'danni', 'danno', 'liquidazione del danno', 'compagnia assicurativa', 'assicurazione non paga', 'assicurazione'], errors: ['risarcimeto', 'incidnte', 'incidnete', 'risarcimneto'] },
    { canonical: 'area_tributario', entity: 'area_diritto', value: 'tributario', synonyms: ['tributario', 'diritto tributario', 'cartella esattoriale', 'cartelle esattoriali', 'cartella di pagamento', 'cartelle di pagamento', 'accertamento fiscale', 'avviso di accertamento', 'agenzia delle entrate', 'agenzia entrate', 'agenzia della riscossione', 'riscossione', 'equitalia', 'tasse', 'imposte', 'tributi', 'imu', 'tari', 'contenzioso tributario', 'commissione tributaria', 'fisco', 'rottamazione'], errors: ['tributaro', 'cartela esattoriale'] },
    { canonical: 'area_amministrativo', entity: 'area_diritto', value: 'amministrativo', synonyms: ['amministrativo', 'diritto amministrativo', 'multa', 'multe', 'contravvenzione', 'ricorso al prefetto', 'ricorso al giudice di pace', 'giudice di pace', 'ricorso al tar', 'tar', 'pubblica amministrazione', 'concorso pubblico', 'appalto pubblico', 'appalti pubblici', 'ritiro della patente', 'sospensione della patente', 'patente', 'decurtazione punti', 'punti della patente', 'ztl', 'autovelox', 'fermo amministrativo', 'permesso edilizio', 'abuso edilizio', 'condono'], errors: ['amministrtivo', 'contravenzione'] },
    { canonical: 'area_societario', entity: 'area_diritto', value: 'societario', synonyms: ['societa', 'srl', 'spa', 'snc', 'sas', 'socio', 'soci', 'socio di maggioranza', 'socio di minoranza', 'diritto societario', 'diritto commerciale', 'contratto commerciale', 'contratti commerciali', 'statuto', 'cessione di quote', 'cessione quote', 'cessione di azienda', 'fallimento', 'crisi d impresa', 'concordato preventivo', 'procedura concorsuale', 'liquidazione giudiziale', 'recesso del socio', 'start up', 'startup'], errors: ['socetà', 'societa srl'] },
    { canonical: 'area_bancario', entity: 'area_diritto', value: 'bancario', synonyms: ['banca', 'banche', 'conto corrente', 'anatocismo', 'usura', 'usura bancaria', 'mutuo', 'mutuo usurario', 'finanziaria', 'segnalazione in crif', 'crif', 'centrale rischi', 'protestato', 'protesto', 'bancario', 'diritto bancario', 'carta di credito'], errors: ['anatocimso'] },
    { canonical: 'area_immigrazione', entity: 'area_diritto', value: 'immigrazione', synonyms: ['permesso di soggiorno', 'cittadinanza', 'cittadinanza italiana', 'ricongiungimento familiare', 'immigrazione', 'diritto dell immigrazione', 'visto d ingresso', 'richiesta di visto', 'espulsione', 'decreto di espulsione', 'asilo politico', 'richiesta di asilo', 'protezione internazionale', 'rinnovo del permesso', 'stranieri'], errors: ['immigrazone', 'cittadinaza'] },
    { canonical: 'area_civile', entity: 'area_diritto', value: 'civile', synonyms: ['diritto civile', 'civilista', 'causa civile', 'contratto', 'contratti', 'inadempimento', 'inadempiente', 'clausola', 'clausole', 'vizi', 'vicino di casa', 'vicini di casa', 'il mio vicino', 'i miei vicini', 'confini', 'confine', 'servitu', 'usucapione', 'diritti reali', 'responsabilita civile', 'contenzioso', 'controversia', 'consumatore', 'diritti del consumatore', 'garanzia legale', 'acquisto online'], errors: ['inadempimneto', 'contrato'] },

    // ---- Modalità di consulenza (dichiarata dal cliente) ----
    { canonical: 'modalita_online', entity: 'modalita', value: 'online', synonyms: ['online', 'on line', 'da remoto', 'videochiamata', 'video chiamata', 'videoconsulto', 'a distanza', 'via zoom', 'su zoom', 'google meet', 'skype', 'teams'], errors: ['onlin', 'videochiamta'] },
    { canonical: 'modalita_telefono', entity: 'modalita', value: 'telefono', synonyms: ['consulenza telefonica', 'per telefono', 'al telefono', 'telefonata', 'telefonicamente', 'consulto telefonico'], errors: ['telefonca'] },
    { canonical: 'modalita_presenza', entity: 'modalita', value: 'presenza', synonyms: ['in presenza', 'di persona', 'in studio', 'venire in studio', 'passare in studio', 'passare dallo studio', 'venire da voi'] },

    // ---- Tipo di cliente ----
    { canonical: 'cliente_impresa', entity: 'tipo_cliente', value: 'impresa', synonyms: ['la mia azienda', 'la mia societa', 'la mia ditta', 'la mia impresa', 'per la mia azienda', 'per la mia societa', 'per un azienda', 'per un impresa', 'sono un imprenditore', 'sono un imprenditrice', 'sono un artigiano', 'ho una srl', 'ho una ditta', 'ho una societa', 'ho un azienda', 'ho un impresa', 'ho una partita iva', 'libero professionista'] },
    { canonical: 'cliente_privato', entity: 'tipo_cliente', value: 'privato', synonyms: ['sono un privato', 'sono una privata', 'a titolo personale', 'come privato', 'come privata', 'per uso personale', 'faccio da privato'] },

    // ---- Scadenze o udienze imminenti (sì/no, senza dettagli) ----
    { canonical: 'scadenza_no', entity: 'scadenza_imminente', value: 'no', synonyms: ['nessuna scadenza', 'nessuna scadenza imminente', 'non ho scadenze', 'non ho scadenza', 'non ho scadenze imminenti', 'non ci sono scadenze', 'non ci sono scadenze imminenti', 'senza scadenze', 'nessuna udienza', 'non ho udienze', 'non ho udienza', 'nessun termine', 'nessun termine in scadenza', 'nessuna data limite', 'nessuna urgenza', 'non c e urgenza', 'non c e fretta', 'non e urgente', 'non ho fretta', 'niente di urgente', 'nessuna fretta', 'non ci sono udienze'] },
    { canonical: 'scadenza_si', entity: 'scadenza_imminente', value: 'si', negabile: true, synonyms: ['ho una scadenza', 'ho una scadenza vicina', 'ho una scadenza a breve', 'c e una scadenza', 'c e una scadenza vicina', 'scadenza vicina', 'scadenza a breve', 'ho un termine', 'ho dei termini', 'ho una data limite', 'ho delle scadenze', 'ci sono delle scadenze', 'ci sono scadenze'] },

    // ---- Concetti di conversazione (collegano all'intent, nessuna entità) ----
    { canonical: 'concetto_appuntamento', synonyms: ['appuntamento', 'appuntamenti', 'prenotare', 'fissare', 'incontro con l avvocato', 'incontrare l avvocato', 'passare in studio', 'venire in studio'], intent: 'prenota_consulenza' },
    { canonical: 'concetto_consulenza', synonyms: ['consulenza', 'consulenze', 'consulto'], intent: 'prenota_consulenza' },
    { canonical: 'concetto_preventivo', synonyms: ['preventivo', 'preventivi', 'stima dei costi'], intent: 'richiedi_preventivo' },
    { canonical: 'concetto_parcelle', synonyms: ['parcella', 'parcelle', 'compenso', 'compensi', 'quanto costa', 'quanto costano', 'quanto prende', 'quanto prendete', 'quanto chiede', 'quanto chiedete', 'tariffe', 'tariffa', 'tariffario', 'costi', 'quanto viene', 'quanto mi costa', 'a rate', 'rateale', 'rateali', 'rateizzare', 'anticipo', 'acconto'], intent: 'info_parcelle' },
    { canonical: 'concetto_orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'a che ora aprite', 'a che ora chiudete'], intent: 'info_orari' },
    { canonical: 'concetto_indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova lo studio', 'come vi raggiungo', 'come arrivo', 'sede', 'parcheggio', 'dove e lo studio'], intent: 'info_posizione' },
    { canonical: 'concetto_documenti', synonyms: ['documenti', 'documentazione', 'cosa devo portare', 'cosa portare', 'che carte servono'], intent: 'info_documenti' },
    { canonical: 'concetto_invio', synonyms: ['mandare i documenti', 'inviare i documenti', 'mandarvi i documenti', 'inviarvi i documenti', 'vi mando i documenti', 'vi invio i documenti', 'allegati', 'allegare', 'mandarvi un pdf', 'inviarvi un pdf'], intent: 'info_invio_documenti' },
    { canonical: 'concetto_riservatezza', synonyms: ['segreto professionale', 'riservatezza', 'riservato', 'riservata', 'riservate', 'confidenziale', 'confidenziali', 'privacy'], intent: 'info_riservatezza' },
    { canonical: 'concetto_gratuito_patrocinio', synonyms: ['gratuito patrocinio', 'patrocinio a spese dello stato', 'patrocinio gratuito'], intent: 'info_gratuito_patrocinio' },
    { canonical: 'concetto_mediazione', synonyms: ['mediazione', 'mediazione civile', 'negoziazione assistita', 'conciliazione'], intent: 'info_processo' },
    { canonical: 'concetto_atti', synonyms: ['atto di citazione', 'decreto ingiuntivo', 'querela', 'procura alle liti', 'prescrizione', 'udienza', 'sentenza', 'appello', 'cassazione', 'testamento olografo', 'conflitto di interessi'], intent: 'info_processo' },
    { canonical: 'concetto_pratica', synonyms: ['la mia pratica', 'il mio fascicolo', 'aggiornamenti', 'novita sulla', 'a che punto'], intent: 'stato_pratica' },
  ],

  intents: [
    { id: 'prenota_consulenza', nome: 'Prenotazione di una consulenza / appuntamento', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'La persona vuole fissare una (prima) consulenza o un appuntamento con l\'avvocato. Si raccoglie solo area di diritto, presenza di scadenze imminenti e nome: mai i dettagli della vicenda.',
      esempi: ['vorrei un appuntamento', 'vorrei prendere un appuntamento', 'vorrei fissare un appuntamento', 'vorrei prenotare un appuntamento', 'vorrei prenotare una consulenza', 'vorrei fissare una consulenza', 'vorrei una consulenza', 'mi serve una consulenza', 'avrei bisogno di una consulenza', 'vorrei una prima consulenza', 'vorrei fissare la prima consulenza', 'vorrei prenotare la prima consulenza', 'vorrei una consulenza legale', 'consulenza legale', 'posso avere un appuntamento', 'posso prendere un appuntamento', 'posso fissare un appuntamento', 'avete disponibilita', 'avete posto', 'quando posso venire', 'quando posso passare', 'quando potrei venire in studio', 'vorrei venire in studio', 'vorrei passare in studio', 'vorrei un appuntamento con l avvocato', 'vorrei incontrare l avvocato', 'vorrei incontrare un avvocato', 'appuntamento con l avvocato', 'appuntamento con un avvocato', 'vorrei un incontro con l avvocato', 'vorrei fissare un incontro', 'prenotare una consulenza', 'fissare una consulenza', 'prendere appuntamento', 'vorrei prendere appuntamento', 'vorrei un consulto', 'sono disponibile per una consulenza'],
      keywords: ['appuntamento', 'prenotare una consulenza', 'fissare una consulenza', 'prendere appuntamento', 'fissare un incontro', 'consulenza', 'consulto'],
      combinazioni: [
        { entity: 'area_diritto', con: ['appuntamento', 'consulenza', 'consulto', 'incontro', 'fissare', 'prenotare', 'prendere appuntamento'], non_con_concepts: ['concetto_parcelle', 'concetto_preventivo', 'concetto_documenti', 'concetto_invio', 'concetto_orari', 'concetto_indirizzo'], score: 0.85 },
        { entity: 'modalita', con: ['appuntamento', 'consulenza', 'consulto', 'incontro', 'prenotare', 'fissare'], non_con_concepts: ['concetto_parcelle', 'concetto_preventivo', 'concetto_documenti'], score: 0.85 },
      ],
      required_entities: ['area_diritto', 'scadenza_imminente', 'nome_cliente'],
      optional_entities: ['modalita', 'tipo_cliente', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },

    { id: 'richiedi_preventivo', nome: 'Richiesta di preventivo', categoria: 'LEAD', priorita: 21, safety_level: 'LOW',
      descrizione: 'La persona chiede un preventivo per un\'attività legale: si raccoglie area di diritto e nome, e l\'avvocato risponde con il preventivo. Nessuna cifra in chat.',
      esempi: ['vorrei un preventivo', 'vorrei un preventivo per', 'mi fate un preventivo', 'mi fate un preventivo per', 'potete farmi un preventivo', 'preventivo gratuito', 'mi serve un preventivo', 'avrei bisogno di un preventivo', 'richiedere un preventivo', 'chiedere un preventivo', 'vorrei richiedere un preventivo', 'vorrei sapere il preventivo', 'preventivo per una causa', 'potete mandarmi un preventivo', 'mi fate un preventivo scritto', 'preventivo scritto'],
      keywords: ['preventivo', 'preventivi'],
      combinazioni: [
        { entity: 'area_diritto', con: ['preventivo', 'preventivi'], score: 0.88 },
      ],
      required_entities: ['area_diritto', 'nome_cliente'],
      optional_entities: ['tipo_cliente', 'scadenza_imminente', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },

    { id: 'cerca_avvocato', nome: 'Cerca un avvocato / nuovo incarico', categoria: 'LEAD', priorita: 22, safety_level: 'LOW',
      descrizione: 'La persona cerca un avvocato o vuole affidare un incarico (separazione, licenziamento, recupero crediti, denuncia...). Lead da qualificare con il minimo: area di diritto, scadenze imminenti, nome. Nessun dettaglio della vicenda.',
      esempi: ['mi serve un avvocato', 'cerco un avvocato', 'ho bisogno di un avvocato', 'avrei bisogno di un avvocato', 'vorrei un avvocato', 'cerco un legale', 'mi serve un legale', 'ho bisogno di un legale', 'avrei bisogno di un legale', 'mi serve un penalista', 'cerco un penalista', 'mi serve un civilista', 'cerco un civilista', 'vorrei affidarvi', 'vorrei affidarvi una causa', 'vorrei affidarvi il mio caso', 'vorrei farmi assistere', 'vorrei essere assistito', 'vorrei essere assistita', 'mi potete assistere', 'potete assistermi', 'cerco assistenza legale', 'ho bisogno di assistenza legale', 'mi serve assistenza legale', 'vorrei assistenza legale', 'ho un problema legale', 'ho una questione legale', 'ho una causa', 'devo fare causa', 'voglio fare causa', 'vorrei fare causa', 'vorrei intentare una causa', 'vorrei fare ricorso', 'devo fare ricorso', 'devo denunciare', 'vorrei sporgere denuncia', 'vorrei sporgere querela', 'devo separarmi', 'voglio separarmi', 'vorrei separarmi', 'voglio divorziare', 'vorrei divorziare', 'mi hanno licenziato', 'sono stato licenziato', 'sono stata licenziata', 'mi hanno denunciato', 'sono stato denunciato', 'sono stata denunciata', 'sono stato querelato', 'ho avuto un incidente', 'devo recuperare dei soldi', 'vorrei recuperare un credito', 'ho un contenzioso', 'mi serve un avvocato esperto', 'cerco un avvocato esperto'],
      keywords: ['cerco un avvocato', 'mi serve un avvocato', 'avvocato per', 'legale per', 'fare causa', 'assistenza legale', 'penalista', 'civilista'],
      combinazioni: [
        { entity: 'area_diritto', con_entities: ['area_diritto'], non_con_concepts: ['concetto_parcelle', 'concetto_preventivo', 'concetto_documenti', 'concetto_invio', 'concetto_orari', 'concetto_indirizzo', 'concetto_appuntamento', 'concetto_consulenza', 'concetto_riservatezza', 'concetto_gratuito_patrocinio', 'concetto_mediazione', 'concetto_atti', 'concetto_pratica'], score: 0.75 },
      ],
      required_entities: ['area_diritto', 'scadenza_imminente', 'nome_cliente'],
      optional_entities: ['modalita', 'tipo_cliente', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },

    { id: 'info_parcelle', nome: 'Parcelle, costi e pagamenti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede quanto costa una consulenza, una causa o un avvocato, o come si paga (a rate, anticipo): si risponde solo con i dati dello studio, mai con importi inventati o "medi".',
      esempi: ['quanto costa', 'quanto costa una consulenza', 'quanto costa la consulenza', 'quanto costa un avvocato', 'quanto costa una causa', 'quanto costa una causa di', 'quanto costa un divorzio', 'quanto costa una separazione', 'quanto prende un avvocato', 'quanto prendete', 'quanto chiedete', 'quanto chiede l avvocato', 'quali sono le tariffe', 'quali sono i costi', 'qual e la parcella', 'quanto e la parcella', 'come funzionano le parcelle', 'avete tariffe', 'avete un tariffario', 'quanto mi costa', 'quanto verrebbe', 'quanto viene', 'si puo pagare a rate', 'posso pagare a rate', 'pagamento a rate', 'e possibile pagare a rate', 'accettate pagamenti rateali', 'come si paga', 'come si pagano', 'chiedete un anticipo', 'serve un anticipo', 'quanto devo pagare', 'la consulenza costa', 'la prima consulenza costa', 'la prima consulenza e gratuita', 'prima consulenza gratuita', 'la consulenza e gratuita', 'consulenza gratuita'],
      keywords: ['parcella', 'compenso', 'tariffe', 'quanto costa', 'quanto prendete', 'a rate', 'pagamento rateale', 'anticipo'],
      required_entities: [], optional_entities: ['area_diritto'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_aree', nome: 'Aree di diritto e servizi dello studio', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede di cosa si occupa lo studio, in quali aree di diritto lavora o se tratta una certa materia: si risponde solo con i dati dello studio.',
      esempi: ['di cosa vi occupate', 'di che cosa vi occupate', 'quali aree trattate', 'quali materie trattate', 'in quali aree lavorate', 'quali sono le vostre aree', 'vi occupate di', 'vi occupate anche di', 'trattate', 'trattate anche', 'seguite anche', 'fate anche', 'assistete anche', 'siete specializzati in', 'siete esperti di', 'avete un esperto di', 'avete un avvocato esperto di', 'avete un penalista', 'avete un civilista', 'avete un giuslavorista', 'siete penalisti', 'in cosa siete specializzati', 'c e un avvocato che si occupa di', 'chi si occupa di', 'assistete anche le aziende', 'assistete anche le imprese', 'seguite anche cause di', 'fate cause di', 'quali servizi offrite', 'che servizi offrite', 'che servizi fate'],
      keywords: ['vi occupate', 'trattate', 'siete specializzati', 'quali aree', 'quali materie', 'assistete'],
      required_entities: [], optional_entities: ['area_diritto', 'tipo_cliente'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_prima_consulenza', nome: 'Come funziona la prima consulenza', categoria: 'INFORMATION', priorita: 29, safety_level: 'LOW',
      descrizione: 'La persona chiede come si svolge la prima consulenza, quanto dura, cosa aspettarsi. Si risponde con la conoscenza generale e con i dati dello studio.',
      esempi: ['come funziona la prima consulenza', 'come funziona la consulenza', 'come funziona il primo incontro', 'come funziona un primo incontro', 'quanto dura la consulenza', 'quanto dura la prima consulenza', 'cosa succede alla prima consulenza', 'cosa si fa alla prima consulenza', 'come si svolge la consulenza', 'come si svolge la prima consulenza', 'cosa devo aspettarmi', 'cosa succede al primo incontro', 'come si svolge il primo incontro', 'com e fatta la consulenza', 'in cosa consiste la consulenza'],
      keywords: ['primo incontro', 'prima consulenza', 'dura la consulenza', 'come funziona la consulenza'],
      required_entities: [], optional_entities: ['modalita'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_modalita', nome: 'Consulenza online, telefonica o in studio', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede se la consulenza si può fare online, per telefono o di persona: solo dati dello studio.',
      esempi: ['fate consulenze online', 'fate consulenze telefoniche', 'si puo fare online', 'si puo fare la consulenza online', 'si puo fare la consulenza per telefono', 'si puo fare in videochiamata', 'fate videochiamate', 'e possibile una consulenza online', 'e possibile una videochiamata', 'consulenza da remoto', 'posso fare la consulenza da casa', 'devo venire per forza in studio', 'devo venire di persona', 'si puo fare a distanza', 'fate consulenze a distanza', 'siete disponibili anche online', 'riuscite a fare una videochiamata'],
      keywords: ['online', 'da remoto', 'videochiamata', 'a distanza', 'consulenza telefonica', 'per forza in studio'],
      required_entities: [], optional_entities: ['modalita'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_documenti', nome: 'Documenti da portare', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Cosa portare alla consulenza: si risponde con la conoscenza generale; l\'elenco preciso lo indica lo studio.',
      esempi: ['che documenti servono', 'quali documenti servono', 'cosa devo portare', 'cosa devo portare alla consulenza', 'cosa devo portare all appuntamento', 'cosa serve portare', 'che documenti devo portare', 'quali documenti devo portare', 'che documenti porto', 'cosa porto', 'documenti da portare', 'documenti necessari', 'che carte servono', 'quali carte devo portare', 'cosa mi serve per la consulenza', 'cosa serve per la consulenza', 'cosa serve per l appuntamento'],
      keywords: ['documenti', 'documentazione', 'che carte'],
      required_entities: [], optional_entities: ['area_diritto'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_invio_documenti', nome: 'Invio di documenti o foto', categoria: 'INFORMATION', priorita: 28, safety_level: 'MEDIUM',
      descrizione: 'La persona vuole inviare documenti, atti o foto (per WhatsApp o email): per riservatezza si indica di concordare il canale con lo studio, senza raccogliere materiale sensibile in chat e senza leggerlo o commentarlo.',
      esempi: ['posso mandare i documenti', 'posso inviare i documenti', 'posso mandarvi i documenti', 'posso inviarvi i documenti', 'vi mando i documenti', 'vi invio i documenti', 'posso mandare il contratto', 'posso mandarvi il contratto', 'posso mandarvi le foto', 'posso inviarvi una foto', 'posso mandare una foto', 'posso mandare un file', 'posso mandare un pdf', 'posso inviarvi un pdf', 'posso mandare tutto qui', 'vi mando tutto qui', 'vi mando tutto su whatsapp', 'posso mandare i documenti su whatsapp', 'posso mandare i documenti qui', 'dove posso mandare i documenti', 'dove invio i documenti', 'a chi mando i documenti', 'a che indirizzo email posso inviare', 'indirizzo email per i documenti', 'posso mandare via email', 'posso mandare la sentenza', 'posso inviare la sentenza', 'posso inviare la citazione', 'posso mandare l atto', 'posso mandare la lettera', 'posso allegare', 'vi allego i documenti', 'vi mando una foto del contratto'],
      keywords: ['mandare i documenti', 'inviare i documenti', 'mandarvi i documenti', 'inviarvi i documenti', 'allegare', 'allegati', 'mandarvi una foto', 'inviarvi un pdf'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_riservatezza', nome: 'Riservatezza e segreto professionale', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede se quanto dirà è riservato, cos\'è il segreto professionale, come vengono trattati i suoi dati.',
      esempi: ['e tutto riservato', 'e riservato', 'quello che dico e riservato', 'quello che vi dico e riservato', 'rimane riservato', 'sono riservate le informazioni', 'cos e il segreto professionale', 'cosa e il segreto professionale', 'esiste il segreto professionale', 'siete tenuti al segreto', 'nessuno sapra niente', 'nessuno lo viene a sapere', 'i miei dati sono al sicuro', 'come trattate i miei dati', 'che fine fanno i miei dati', 'e confidenziale', 'e una conversazione riservata'],
      keywords: ['riservato', 'riservatezza', 'segreto professionale', 'confidenziale', 'i miei dati'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_orari', nome: 'Orari dello studio', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede gli orari di apertura dello studio.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'siete aperti a pranzo', 'siete aperti', 'orari dello studio', 'orario di apertura', 'che orari fate', 'quando siete aperti'],
      keywords: ['orari', 'orario', 'aperti', 'chiusi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_posizione', nome: 'Posizione dello studio', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La persona chiede dove si trova lo studio o come raggiungerlo.',
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova lo studio', 'c e parcheggio', 'come arrivo da voi', 'indirizzo dello studio', 'dov e lo studio', 'dove posso parcheggiare', 'dove e lo studio', 'dov e lo studio legale', 'dove si trova lo studio legale', 'dove e la vostra sede'],
      keywords: ['indirizzo', 'parcheggio', 'dove siete', 'dov e lo studio', 'la vostra sede'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_gratuito_patrocinio', nome: 'Gratuito patrocinio (informazioni generali)', categoria: 'INFORMATION', priorita: 31, safety_level: 'MEDIUM',
      descrizione: 'La persona chiede cos\'è il gratuito patrocinio o se lo studio lo segue. Solo informazione generale e dati dello studio: se la persona vi ha diritto lo valuta solo l\'avvocato.',
      esempi: ['cos e il gratuito patrocinio', 'cosa e il gratuito patrocinio', 'come funziona il gratuito patrocinio', 'cosa significa gratuito patrocinio', 'fate il gratuito patrocinio', 'seguite il gratuito patrocinio', 'accettate il gratuito patrocinio', 'si puo avere un avvocato gratis', 'si puo avere un avvocato gratuito', 'cos e il patrocinio a spese dello stato', 'come funziona il patrocinio a spese dello stato', 'avvocato gratis'],
      keywords: ['gratuito patrocinio', 'patrocinio a spese dello stato', 'patrocinio gratuito', 'avvocato gratis'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_processo', nome: 'Come funziona (conoscenza giuridica generale)', categoria: 'INFORMATION', priorita: 33, safety_level: 'MEDIUM',
      descrizione: 'Domande generali di settore (mediazione, negoziazione assistita, citazione, decreto ingiuntivo, querela, prescrizione, udienza, appello, successione...): solo conoscenza generale e non riferita al caso della persona.',
      esempi: ['cos e la mediazione', 'cosa e la mediazione', 'cosa significa mediazione', 'cos e la negoziazione assistita', 'cosa e la negoziazione assistita', 'cos e un atto di citazione', 'cosa e un atto di citazione', 'cos e una citazione', 'cos e un decreto ingiuntivo', 'cosa e un decreto ingiuntivo', 'cosa significa decreto ingiuntivo', 'cos e la querela', 'cosa e la querela', 'differenza tra denuncia e querela', 'che differenza c e tra denuncia e querela', 'cos e la prescrizione', 'cosa significa prescrizione', 'cos e un udienza', 'cosa e un udienza', 'come funziona un udienza', 'cos e la procura alle liti', 'cos e una procura', 'differenza tra separazione e divorzio', 'che differenza c e tra separazione e divorzio', 'cos e l affidamento condiviso', 'cos e l assegno di mantenimento', 'cos e la successione', 'cos e un testamento', 'cos e un testamento olografo', 'cos e l appello', 'cos e il ricorso in appello', 'cos e la cassazione', 'cos e il conflitto di interessi', 'differenza tra avvocato e notaio', 'che differenza c e tra avvocato e notaio', 'come funziona una causa', 'come funziona il processo civile', 'come funziona un processo penale', 'quanto dura una causa in generale', 'cos e una diffida', 'cos e una lettera di diffida', 'cos e un precetto', 'cos e un pignoramento'],
      keywords: ['mediazione', 'negoziazione assistita', 'atto di citazione', 'decreto ingiuntivo', 'querela', 'prescrizione', 'procura alle liti', 'cassazione', 'conflitto di interessi', 'testamento olografo', 'affidamento condiviso'],
      required_entities: [], optional_entities: ['area_diritto'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'stato_pratica', nome: 'Stato di una pratica o di una causa in corso', categoria: 'HUMAN_HANDOFF', priorita: 12, safety_level: 'LOW',
      descrizione: 'Un cliente dello studio chiede aggiornamenti su una pratica o una causa in corso: il bot non ha accesso al fascicolo, passa a una persona.',
      esempi: ['a che punto e la mia pratica', 'a che punto e la causa', 'a che punto siamo', 'a che punto e il mio caso', 'novita sulla mia pratica', 'novita sulla causa', 'ci sono novita', 'aggiornamenti sulla mia pratica', 'aggiornamenti sulla causa', 'come procede la mia pratica', 'come procede la causa', 'che fine ha fatto la mia pratica', 'esito dell udienza', 'com e andata l udienza', 'e uscita la sentenza', 'e arrivata la sentenza', 'avete notizie', 'avete novita', 'notizie sulla mia causa', 'volevo sapere a che punto siamo', 'ho una pratica aperta con voi', 'avete depositato il ricorso', 'avete depositato l atto', 'l avvocato ha depositato', 'a che punto e il mio fascicolo', 'sono un vostro cliente volevo aggiornamenti'],
      keywords: ['a che punto siamo', 'a che punto e', 'novita sulla', 'aggiornamenti sulla', 'la mia pratica', 'il mio fascicolo', 'esito dell udienza'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'emergenza_legale', nome: 'Urgenza legale', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Richiesta esplicitamente urgente, senza gli elementi di un\'urgenza reale già riconosciuta (udienza, notifica, termine, arresto, violenza): si raccoglie il nome e si avvisa subito l\'avvocato.',
      esempi: ['ho un urgenza legale', 'ho bisogno urgente di un avvocato', 'mi serve subito un avvocato', 'mi serve un avvocato subito', 'avvocato urgente', 'serve un avvocato urgente', 'ho urgenza di parlare con un avvocato', 'ho bisogno subito di un avvocato', 'ho bisogno di un avvocato subito'],
      keywords: [],
      required_entities: ['nome_cliente'], optional_entities: ['area_diritto'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },

    { id: 'cancella_appuntamento', nome: 'Disdetta di un appuntamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'La persona vuole annullare una consulenza o un appuntamento già fissato.',
      esempi: ['devo disdire l appuntamento', 'devo annullare l appuntamento', 'devo disdire la consulenza', 'devo annullare la consulenza', 'devo disdire', 'devo annullare', 'non posso venire all appuntamento', 'non riesco a venire all appuntamento', 'vorrei cancellare l appuntamento', 'annullare l appuntamento', 'disdire l appuntamento', 'non posso piu venire', 'non riesco a venire', 'annullate l appuntamento', 'cancellate l appuntamento', 'annullate la consulenza', 'cancellate la consulenza', 'non vengo piu'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'annullate', 'cancellate'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'sposta_appuntamento', nome: 'Spostamento di un appuntamento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'La persona vuole spostare una consulenza o un appuntamento già preso.',
      esempi: ['devo spostare l appuntamento', 'posso spostare l appuntamento', 'devo spostare la consulenza', 'posso spostare la consulenza', 'posso cambiare giorno', 'vorrei rimandare l appuntamento', 'possiamo spostare l appuntamento', 'posso anticipare l appuntamento', 'devo cambiare orario', 'posticipare l appuntamento', 'possiamo vederci un altro giorno', 'possiamo cambiare orario', 'vorrei cambiare l appuntamento', 'posso rimandare la consulenza'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'riprogrammare'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per il servizio, una mancata risposta o una parcella contestata.',
      esempi: ['sono insoddisfatto', 'sono insoddisfatta', 'vorrei fare un reclamo', 'voglio lamentarmi', 'sono molto arrabbiato', 'sono molto arrabbiata', 'non sono contento del servizio', 'sono stato trattato male', 'sono stata trattata male', 'nessuno mi ha richiamato', 'nessuno mi risponde', 'non mi avete mai richiamato', 'vi ho scritto e nessuno risponde', 'l avvocato non risponde', 'l avvocato non mi risponde', 'l avvocato non mi richiama', 'e una vergogna', 'voglio contestare la parcella', 'vorrei contestare la parcella', 'contestare la parcella', 'contesto la parcella', 'la parcella e sbagliata', 'la parcella e troppo alta', 'non sono d accordo con la parcella', 'non mi seguite', 'non mi sento seguito', 'non mi sento seguita'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'scortese', 'maleducato', 'contestare la parcella'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'La persona chiede di parlare con una persona, con l\'avvocato o con la segreteria.',
      esempi: ['voglio parlare con una persona', 'vorrei parlare con l avvocato', 'vorrei parlare con un avvocato', 'passatemi l avvocato', 'posso parlare con la segreteria', 'chiamatemi', 'richiamatemi', 'posso parlare con qualcuno', 'vorrei parlare con il titolare', 'potete richiamarmi', 'mi richiamate', 'posso parlare con la segretaria', 'vorrei sentire l avvocato', 'vorrei parlare direttamente con l avvocato'],
      keywords: ['operatore', 'segretaria', 'segreteria'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi', 'buongiorno avvocato', 'salve avvocato'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },

    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'La persona ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'grazie a presto', 'ottimo grazie', 'arrivederci', 'buona giornata', 'grazie dell aiuto'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: urgenza reale che richiede l'avvocato subito (udienza, notifica,
    // termine in scadenza, arresto/fermo, violenza o minacce, sfratto esecutivo)
    // -> escalation immediata con risposta predefinita (zero LLM) e rimando al 112.
    critical: CRITICAL,
    // HIGH: richiesta esplicitamente urgente ma senza gli elementi di un'urgenza reale.
    high: [
      'urgente', 'urgentissimo', 'e urgentissimo', 'urgentemente', 'con urgenza', 'ho urgenza', 'ho molta fretta', 'caso urgente', 'avvocato urgente', 'situazione urgente',
      'mi serve subito un avvocato', 'mi serve un avvocato subito', 'ho bisogno subito di un avvocato', 'ho bisogno di un avvocato subito', 'ho bisogno urgente', 'urgenza legale',
      'e un emergenza', 'emergenza', 'ho un emergenza', 'e una situazione grave', 'situazione grave',
    ],
    // MEDIUM: situazione delicata ma non urgente.
    medium: [
      'sfratto', 'sfrattato', 'sfrattata', 'diffida', 'lettera di diffida', 'lettera dell avvocato', 'lettera di un avvocato', 'controparte', 'minacciato di denuncia', 'mi minacciano di denunciarmi', 'mi hanno denunciato', 'sono stato denunciato', 'sono stata denunciata', 'sono stato querelato', 'sono indagato', 'sono indagata', 'sono imputato', 'sono imputata',
      'cartella esattoriale', 'fermo amministrativo', 'tribunale', 'giudice', 'sequestro', 'pignoramento',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con l avvocato', 'parlare con un avvocato', 'parlare con l avvocata', 'parlare con il legale', 'parlare con un legale', 'parlare con la segretaria', 'parlare con la segreteria', 'parlare con il titolare', 'parlare con un umano', 'parlare con un responsabile', 'parlare con il responsabile', 'parlare direttamente con l avvocato',
      'sentire l avvocato', 'sentire un avvocato', 'sentire una persona', 'sentire qualcuno', 'in carne e ossa', 'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi l avvocato', 'mi passate l avvocato', 'passami l avvocato',
      'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'potete richiamarmi', 'potete chiamarmi',
      'non sei una persona', 'sei un robot', 'sei un bot', 'sei umano', 'operatore', 'persona vera', 'persona reale',
      // pagamenti: mai in chat
      'mandami i soldi', 'mandatemi i soldi', 'mandami un bonifico', 'iban', 'bonifico', 'postepay', 'western union', 'dati bancari', 'numero della carta', 'numero di carta',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta all\'avvocato, che la ricontatterà il prima possibile. Se in questo momento c\'è un pericolo per lei o per altri, chiami subito il 112. Per pagamenti e dati bancari si procede solo con lo studio.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a chiedere un parere legale, una previsione
    // sull'esito o sui tempi, l'interpretazione di un atto o di un contratto,
    // l'indicazione di un termine di legge, oppure che spingono a raccontare i
    // dettagli riservati della vicenda o a rivelare chi è cliente dello studio.
    diagnosi_patterns: [
      // parere e consiglio legale
      'un parere', 'parere legale', 'dammi un parere', 'mi dai un parere', 'mi dia un parere', 'vorrei un parere', 'consiglio legale', 'un consiglio legale', 'mi consiglia', 'mi consigli', 'cosa mi consiglia', 'cosa mi consigli', 'che mi consiglia', 'che mi consigli', 'cosa devo fare adesso', 'cosa devo fare ora', 'cosa devo fare in questo caso', 'cosa devo fare nel mio caso', 'cosa dovrei fare nel mio caso', 'come mi devo comportare', 'come mi comporto', 'come devo comportarmi', 'secondo lei', 'secondo voi', 'secondo te', 'a suo parere', 'a tuo parere',
      'rispondi come un avvocato', 'rispondimi come un avvocato', 'fai finta di essere un avvocato', 'fingi di essere un avvocato', 'come se fossi un avvocato', 'come se fossi l avvocato', 'dammi una consulenza qui', 'consulenza in chat', 'consulenza gratis qui', 'consulenza qui su whatsapp',
      // probabilità di successo ed esito
      'posso vincere', 'possiamo vincere', 'vincere la causa', 'vincere questa causa', 'vinco la causa', 'vinceremo', 'vincero', 'si vince', 'si puo vincere', 'una causa vinta', 'causa vinta', 'ho possibilita', 'quante possibilita', 'che possibilita', 'che possibilita ho', 'che probabilita', 'quante probabilita', 'probabilita di vincere', 'probabilita di successo', 'ho speranze', 'ho qualche speranza', 'ho buone possibilita', 'chance di vincere', 'chances', 'ho ragione', 'ho torto', 'ho ragione io', 'sono dalla parte della ragione', 'e colpa mia', 'sono colpevole', 'ho delle colpe', 'che rischio', 'cosa rischio', 'quanto rischio', 'rischio il carcere', 'rischio la galera', 'finisco in carcere', 'andro in carcere', 'andro in galera', 'mi condannano', 'mi condanneranno', 'mi assolveranno', 'saro condannato', 'saro condannata', 'sara assolto', 'sara condannato', 'cosa mi succede', 'cosa mi succedera', 'come andra a finire', 'come finira', 'andra a finire bene',
      'quanto prendo', 'quanto mi spetta', 'quanto mi spettera', 'quanto mi spetterebbe', 'a quanto ammonta', 'a quanto ammonterebbe', 'quanto posso ottenere', 'quanto posso ricevere', 'quanto mi daranno', 'quanto mi danno', 'quanto potrei ottenere', 'quanto potrei ricevere', 'quanto mi pagheranno', 'quanto dovro pagare di assegno', 'quanto dovro dare', 'che assegno mi spetta', 'che risarcimento mi spetta', 'quanto vale la causa', 'quanto vale il risarcimento',
      // tempi dell'esito
      'quanto durera', 'quanto durera la causa', 'quanto durera la mia causa', 'quanto dura la mia causa', 'quanto tempo ci vorra', 'in quanto tempo si risolve', 'in quanto tempo finisce', 'in quanto tempo ottengo', 'in quanto tempo ottenere', 'quando sara finita', 'quando finira la causa', 'quando avro i soldi', 'quando mi pagano', 'entro quando finisce',
      // diritto, liceità, validità, obblighi
      'ho diritto', 'abbiamo diritto', 'ho il diritto', 'mi spetta', 'mi spettano', 'e legale', 'e lecito', 'e illegale', 'e illecito', 'e legittimo', 'e illegittimo', 'e regolare', 'e in regola', 'e a norma di legge', 'e consentito', 'e permesso dalla legge', 'si puo fare per legge', 'posso farlo per legge', 'e reato', 'e un reato', 'costituisce reato', 'rischio una denuncia', 'posso essere denunciato', 'posso essere denunciata', 'posso denunciare', 'posso denunciarlo', 'posso denunciarla', 'posso querelare', 'posso fare causa', 'posso fargli causa', 'posso fargli causa', 'posso citarlo', 'posso licenziarlo', 'posso licenziare', 'posso sfrattarlo', 'posso sfrattare', 'posso recedere', 'posso rescindere', 'posso disdire il contratto', 'posso non pagare', 'devo pagare le tasse', 'devo pagare questa multa', 'devo pagare il debito', 'devo pagare l assegno', 'devo pagare il risarcimento', 'devo pagare la sanzione', 'devo pagare la cartella', 'sono obbligato', 'sono obbligata', 'sono tenuto', 'sono tenuta', 'devo restituire', 'devo risarcire', 'mi conviene', 'ti conviene', 'le conviene', 'conviene fare causa', 'conviene fare', 'conviene denunciare', 'conviene separarsi', 'conviene accettare', 'conviene firmare', 'devo firmare', 'posso firmare', 'devo accettare', 'posso rifiutare', 'devo rispondere', 'posso non rispondere',
      // interpretazione di contratti e atti
      'il contratto e valido', 'e valido il contratto', 'e valido', 'e nullo', 'e nulla', 'il contratto e nullo', 'e vessatoria', 'e vincolante', 'sono vincolato', 'sono vincolata', 'mi vincola', 'cosa significa questa clausola', 'cosa dice la clausola', 'cosa significa la clausola', 'che significa questa clausola', 'cosa vuol dire questa clausola', 'cosa dice il contratto', 'cosa dice questo contratto', 'cosa significa questo articolo', 'cosa significa questa sentenza', 'cosa dice la sentenza', 'cosa dice questa sentenza', 'cosa significa questo atto', 'cosa dice questo atto', 'cosa dice la lettera', 'cosa significa questa lettera', 'cosa dice questa lettera', 'cosa significa questo decreto', 'cosa significa questo verbale',
      'leggere il contratto', 'guardare il contratto', 'controllare il contratto', 'dare un occhiata al contratto', 'dare un occhiata a questo contratto', 'dare un occhiata a questo atto', 'dare un occhiata a questa lettera', 'guardare questa lettera', 'guardare questo atto', 'leggere questa lettera', 'leggere questo atto', 'controllare questa lettera', 'controllare questo atto', 'controllare questi documenti', 'controllare se e in regola', 'guardare la sentenza', 'leggere la sentenza', 'rivedere il contratto', 'rivedere questo contratto', 'verificare il contratto', 'verificare se il contratto', 'ti mando il contratto', 'vi mando il contratto cosi', 'vi mando la sentenza cosi', 'ti mando la lettera', 'vi mando la lettera cosi',
      // termini e scadenze di legge
      'entro quando devo', 'entro quanto devo', 'entro quanto tempo devo', 'quanti giorni ho', 'quanti giorni ho per', 'quanti giorni ho di tempo', 'quanto tempo ho', 'quanto tempo ho per', 'quanto tempo ho per fare ricorso', 'termine per fare ricorso', 'termine per il ricorso', 'termini per il ricorso', 'termine per l opposizione', 'termini di scadenza', 'qual e il termine', 'qual e la scadenza', 'qual e il termine di legge', 'sono ancora in tempo', 'siamo ancora in tempo', 'e ancora in tempo', 'e scaduto il termine', 'e scaduto il tempo', 'e scaduto', 'e prescritto', 'si e prescritto', 'e andato in prescrizione', 'e decaduto', 'sono decaduto', 'sono decaduta', 'quando si prescrive', 'quando scade il termine', 'in quanti giorni si prescrive', 'quando va in prescrizione', 'ho ancora tempo per', 'in quanti giorni devo',
      // raccontare i dettagli del caso (riservatezza: non per WhatsApp)
      'vi racconto', 'le racconto', 'ti racconto', 'vi spiego il mio caso', 'le spiego il mio caso', 'ti spiego il mio caso', 'vi spiego la situazione', 'le spiego la situazione', 'ti spiego la situazione', 'vi spiego cosa e successo', 'le spiego cosa e successo', 'ti spiego cosa e successo', 'vi racconto cosa e successo', 'le racconto cosa e successo', 'ti racconto cosa e successo', 'posso raccontarvi', 'posso raccontarle', 'posso spiegarvi', 'posso spiegarle', 'posso raccontare tutto', 'posso spiegare tutto', 'vi scrivo la mia storia', 'ecco la situazione', 'ecco cosa e successo', 'vi dico cosa e successo', 'vi dico tutto', 'vi spiego tutto', 'le spiego tutto', 'vi racconto tutto', 'le racconto tutto', 'ascoltate la mia storia', 'mi ascoltate', 'mi ascolti', 'vi faccio un riassunto', 'vi faccio un riassunto del caso', 'vi riassumo il caso', 'vi riassumo la situazione', 'ho tutto scritto qui', 'ecco i fatti', 'i fatti sono questi', 'questi sono i fatti',
      // richieste di aiuto a eludere la legge o a manipolare prove
      'far sparire', 'cancellare le prove', 'distruggere le prove', 'nascondere le prove', 'nascondere i beni', 'intestare i beni', 'falsificare', 'documento falso', 'firma falsa', 'testimone falso', 'evadere le tasse', 'evitare di pagare', 'come non pagare', 'come fregare', 'come farla franca', 'farla franca',
      // clienti e controparti dello studio (riservatezza)
      'e vostro cliente', 'e una vostra cliente', 'e un vostro cliente', 'sono vostri clienti', 'e vostra cliente', 'siete gli avvocati di', 'siete l avvocato di', 'assistete anche la controparte', 'assistete la controparte', 'assistete anche lui', 'assistete anche lei', 'assistete anche mio marito', 'assistete anche mia moglie', 'assistete il mio ex', 'assistete la mia ex', 'avete gia un incarico con', 'avete un incarico con', 'e gia seguito da voi', 'chi sono i vostri clienti', 'chi segue il vostro studio', 'chi avete come clienti', 'dimmi se e vostro cliente', 'dimmi chi sono i vostri clienti', 'elenco dei vostri clienti', 'lista dei vostri clienti', 'quali clienti avete', 'dati degli altri clienti', 'dati dei clienti', 'pratiche degli altri clienti', 'fascicoli degli altri clienti', 'fascicolo di un altro cliente',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    // Frasi AFFERMATIVE specifiche: una risposta che dica "non posso dirle se ha
    // ragione" o "non posso prevedere i tempi" non deve essere bloccata.
    vietato: [
      // esito e probabilità di successo
      'vincera la causa', 'vincera sicuramente', 'vincerete la causa', 'vincera di sicuro', 'vincerà', 'vincerete', 'vincerà sicuramente', 'la causa e vinta', 'e una causa vinta', 'e una causa facile', 'e un caso facile', 'e un caso semplice', 'e una causa semplice', 'e un caso vinto', 'e un caso sicuro', 'ha buone possibilita', 'ha ottime possibilita', 'ha molte possibilita', 'ha poche possibilita', 'le possibilita sono alte', 'le possibilita sono buone', 'le possibilita sono basse', 'ha ottime probabilita', 'le probabilita sono alte', 'ha sicuramente ragione', 'ha di sicuro ragione', 'ha ragione lei', 'ha torto', 'ha sicuramente torto', 'le do ragione', 'ha tutte le ragioni', 'ha ragione e', 'non rischia nulla', 'non rischia niente', 'non rischia il carcere', 'non finira in carcere', 'finira in carcere', 'rischia il carcere', 'sara condannato', 'sara condannata', 'sara assolto', 'sara assolta', 'sicuramente assolto', 'sicuramente condannato', 'andra tutto bene', 'andra sicuramente bene', 'si risolvera senza problemi', 'esito garantito', 'esito positivo garantito', 'esito sicuro', 'risultato garantito', 'risultato assicurato', 'otterra sicuramente', 'otterra un risarcimento', 'otterra il risarcimento', 'otterra l assegno', 'le spettera un assegno', 'le spetta un risarcimento', 'le spetta un assegno', 'le spettano', 'le spetta sicuramente', 'ottiene sicuramente', 'ha diritto a',
      // tempi
      'la causa durera', 'durera circa', 'durera poco', 'durera pochi mesi', 'si concludera in pochi mesi', 'si concludera entro', 'finira in pochi mesi', 'in pochi mesi', 'in poche settimane', 'tempi brevi garantiti', 'tempi certi', 'entro pochi mesi', 'entro poche settimane', 'avra i soldi entro',
      // scadenze e termini come certezze
      'ha tempo fino al', 'ha ancora tempo', 'e ancora in tempo', 'e scaduto il termine', 'il termine scade il', 'il termine e di', 'il termine e scaduto', 'il termine per il ricorso e', 'e prescritto', 'non e prescritto', 'non e ancora prescritto', 'si e prescritto', 'e decaduto', 'non e decaduto', 'la scadenza e il', 'il termine scadra',
      // liceità, validità, interpretazione, consigli
      'e perfettamente legale', 'e legale', 'e illegale', 'e legittimo', 'e illegittimo', 'e lecito', 'e illecito', 'e un reato', 'non e reato', 'non costituisce reato', 'il contratto e valido', 'il contratto e nullo', 'il contratto non e valido', 'la clausola e nulla', 'la clausola e valida', 'la clausola e vessatoria', 'significa che deve', 'significa che non deve', 'in base al contratto lei', 'secondo il contratto lei', 'secondo la legge lei', 'per la legge lei', 'puo licenziarlo', 'puo sfrattarlo', 'puo denunciarlo', 'puo fargli causa', 'puo fare causa', 'puo rifiutarsi', 'non deve pagare', 'deve pagare', 'non e tenuto a pagare', 'e tenuto a pagare', 'le conviene', 'ti conviene', 'conviene sicuramente', 'le consiglio di', 'ti consiglio di', 'il mio consiglio e', 'le consiglio di fare causa', 'le consiglio di firmare', 'le consiglio di non firmare', 'faccia causa', 'non firmi', 'firmi pure',
      // gratuito patrocinio e diritti
      'ha diritto al gratuito patrocinio', 'non ha diritto al gratuito patrocinio', 'rientra nel gratuito patrocinio', 'ha diritto all assegno', 'ha diritto al risarcimento', 'ha diritto all eredita', 'ha diritto a una quota', 'e erede',
      // importi scritti a parole (la verifica numerica non li vede)
      'mila euro', 'milioni di euro', 'k euro', 'cento euro', 'duecento euro', 'trecento euro', 'cinquecento euro', 'mille euro',
      // clienti e riservatezza
      'e nostro cliente', 'e una nostra cliente', 'e un nostro cliente', 'non e nostro cliente', 'non e un nostro cliente', 'e cliente dello studio', 'assistiamo anche la controparte', 'non assistiamo la controparte', 'abbiamo un incarico con', 'non abbiamo un incarico con',
      // impegni a leggere atti o a dare pareri via chat, richieste di materiale riservato
      'lo leggo e le dico', 'le dico se e valido', 'le dico se ha ragione', 'le faccio un parere', 'le do un parere', 'le do un consiglio', 'le dico io cosa fare', 'mi mandi il contratto', 'mi mandi pure il contratto', 'mi mandi pure i documenti', 'mi invii i documenti', 'mi mandi i documenti qui', 'mi mandi la sentenza', 'mi mandi pure la foto', 'mi mandi pure la sentenza',
      // pagamenti
      'ecco l iban', 'mi mandi i dati della carta', 'faccia un bonifico', 'mi invii il bonifico',
    ],
    messaggio_sicurezza: 'Non posso dare pareri legali, valutare le possibilità di un caso né indicare esiti, tempi o scadenze: solo l\'avvocato può farlo dopo aver esaminato la situazione. Per riservatezza non serve raccontarmi i dettagli qui in chat: li tratterà direttamente con lui. Se vuole, fisso una consulenza o faccio richiamare dallo studio; e se c\'è una scadenza o un\'udienza vicina me lo dica subito, così avviso l\'avvocato.',
    messaggio_emergenza: 'Capisco, è una situazione urgente: la segnalo subito all\'avvocato, che la contatterà con priorità. Se invece in questo momento c\'è un pericolo per lei o per altri, chiami subito il 112 (per violenza e stalking è attivo anche il 1522).',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    area_diritto: ['Di che area si tratta, per esempio famiglia, lavoro, penale o civile? Mi basta una parola: i dettagli li vedrà direttamente l\'avvocato.', 'In quale ambito le serve assistenza? Non servono dettagli, solo l\'area.', 'Mi dice l\'area di diritto (per esempio famiglia, lavoro, penale, civile)?'],
    scadenza_imminente: ['Ci sono scadenze o udienze vicine di cui l\'avvocato deve essere informato subito?', 'Ha una scadenza o un\'udienza imminente? Mi basta un sì o un no.', 'C\'è qualche termine o udienza in arrivo a breve?'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta per l\'avvocato?', 'A che nome registro la richiesta?'],
  },

  common_scenarios: [
    'Prima consulenza: area di diritto, scadenze imminenti, nome, preferenza di giorno',
    'Nuovo cliente che cerca un avvocato (famiglia, lavoro, penale, civile, recupero crediti...): lead con il solo minimo',
    'Richiesta di preventivo: area e nome, risposta dell\'avvocato',
    'Domande su parcelle, pagamenti, aree trattate, orari, consulenza online: solo da dati dello studio',
    'Documenti da portare e invio di documenti: indicazioni generali, canale riservato concordato con lo studio',
    'Richieste di parere, di pronostico, di interpretazione di atti o di scadenze: risposta di sicurezza e proposta di appuntamento',
    'Persona che inizia a raccontare il caso: invito a non fornire dettagli in chat',
    'Urgenze reali (udienza, notifica, termine, arresto, violenza, sfratto esecutivo): segnalazione immediata all\'avvocato, 112 se c\'è pericolo',
    'Stato di una pratica, spostamenti, annullamenti, reclami: passaggio a una persona dello studio',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque studio legale.
// Nessuna parcella, importo, orario, termine numerico, nome o indirizzo: quelli
// stanno solo nei dati del tenant (o li indica l'avvocato). Nessun parere sul
// caso specifico.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_prima_consulenza', 'Come funziona la prima consulenza?', ['come funziona la prima consulenza', 'come funziona la consulenza', 'cosa succede alla prima consulenza', 'cosa si fa alla prima consulenza', 'come si svolge la prima consulenza', 'come funziona il primo incontro', 'cosa devo aspettarmi dalla consulenza'],
    'La prima consulenza è un colloquio con l\'avvocato in cui si espone la situazione e si capisce quali strade ci sono, cosa serve e come si può procedere. Solo in quella sede l\'avvocato può valutare il caso: durata, modalità e condizioni le comunica lo studio.'),
  f('info_documenti', 'Cosa devo portare alla consulenza?', ['cosa devo portare alla consulenza', 'che documenti servono per la consulenza', 'cosa devo portare all appuntamento', 'quali documenti devo portare', 'cosa porto alla prima consulenza', 'cosa serve per la consulenza'],
    'In genere conviene portare un documento di identità, il codice fiscale e tutti i documenti che riguardano la vicenda (per esempio contratti, lettere, atti ricevuti, comunicazioni) in ordine cronologico. Se non è sicuro di cosa serva, può portare tutto: l\'avvocato selezionerà ciò che è utile. Per l\'elenco preciso faccia riferimento allo studio.'),
  f('info_invio_documenti', 'Posso inviare i documenti su WhatsApp?', ['posso inviare i documenti su whatsapp', 'posso mandare i documenti su whatsapp', 'posso mandare i documenti qui', 'posso mandarvi i documenti qui', 'posso inviare documenti per whatsapp', 'posso mandare una foto del contratto', 'dove posso mandare i documenti'],
    'Per tutelare la riservatezza è meglio non inviare documenti, atti o foto riservate per WhatsApp prima di aver concordato con lo studio il canale da usare. Lo studio le indicherà come e dove consegnarli in modo sicuro, di solito dopo il primo contatto con l\'avvocato.'),
  f('info_riservatezza', 'Quello che dico all\'avvocato è riservato?', ['e tutto riservato', 'quello che dico e riservato', 'e riservato quello che dico', 'i miei dati sono riservati', 'rimane riservato', 'e confidenziale', 'quello che vi dico rimane riservato'],
    'Sì: l\'avvocato è tenuto al segreto professionale su quanto apprende dal cliente e dal caso, e ai dati personali si applicano le norme sulla protezione dei dati. Per questo i dettagli della vicenda è meglio raccontarli direttamente all\'avvocato e non in chat.'),
  f('info_riservatezza', 'Cos\'è il segreto professionale?', ['cos e il segreto professionale', 'cosa e il segreto professionale', 'cosa significa segreto professionale', 'cosa vuol dire segreto professionale', 'esiste il segreto professionale'],
    'Il segreto professionale è il dovere dell\'avvocato di mantenere riservato tutto ciò che apprende nello svolgimento dell\'incarico: le informazioni del cliente non possono essere rivelate a terzi se non nei limiti previsti dalla legge.'),
  f('info_processo', 'Che differenza c\'è tra avvocato e notaio?', ['differenza tra avvocato e notaio', 'che differenza c e tra avvocato e notaio', 'avvocato o notaio', 'cosa fa un notaio e cosa fa un avvocato', 'serve un avvocato o un notaio'],
    'L\'avvocato assiste e rappresenta le persone nelle controversie e fornisce consulenza legale; il notaio è un pubblico ufficiale che redige e autentica determinati atti (per esempio compravendite di immobili, testamenti pubblici, atti societari). Quale figura serva nel suo caso lo indica l\'avvocato dello studio.'),
  f('info_processo', 'Cos\'è la mediazione civile?', ['cos e la mediazione', 'cosa e la mediazione', 'cos e la mediazione civile', 'cosa significa mediazione', 'come funziona la mediazione', 'cosa vuol dire mediazione'],
    'La mediazione è un procedimento in cui un mediatore neutrale aiuta le parti a cercare un accordo, senza che sia un giudice a decidere. Per alcune materie è un passaggio previsto prima di poter andare in causa. Se sia necessaria nel suo caso e come affrontarla lo valuta l\'avvocato.'),
  f('info_processo', 'Cos\'è la negoziazione assistita?', ['cos e la negoziazione assistita', 'cosa e la negoziazione assistita', 'cosa significa negoziazione assistita', 'come funziona la negoziazione assistita'],
    'La negoziazione assistita è una procedura in cui le parti, assistite dai rispettivi avvocati, cercano di raggiungere un accordo prima di rivolgersi al giudice. In alcuni casi è un passaggio obbligatorio, in altri facoltativo: la valutazione spetta all\'avvocato.'),
  f('info_gratuito_patrocinio', 'Cos\'è il gratuito patrocinio?', ['cos e il gratuito patrocinio', 'cosa e il gratuito patrocinio', 'come funziona il gratuito patrocinio', 'cosa significa gratuito patrocinio', 'cos e il patrocinio a spese dello stato', 'come funziona il patrocinio a spese dello stato'],
    'Il gratuito patrocinio (patrocinio a spese dello Stato) è uno strumento che permette a chi si trova in determinate condizioni economiche, stabilite dalla legge, di essere assistito da un avvocato con spese a carico dello Stato. Requisiti e modalità vanno verificati caso per caso: io non posso dire se una persona vi rientri, e se lo studio lo segue lo comunica lo studio.'),
  f('info_processo', 'Cos\'è un atto di citazione?', ['cos e un atto di citazione', 'cosa e un atto di citazione', 'cos e una citazione', 'cosa significa atto di citazione', 'cosa vuol dire citazione in giudizio'],
    'L\'atto di citazione è l\'atto con cui si avvia una causa civile davanti al giudice, chiamando in giudizio la controparte. Chi lo riceve ha dei termini da rispettare: è importante rivolgersi subito a un avvocato e non lasciare passare tempo.'),
  f('info_processo', 'Cos\'è un decreto ingiuntivo?', ['cos e un decreto ingiuntivo', 'cosa e un decreto ingiuntivo', 'cosa significa decreto ingiuntivo', 'cosa vuol dire decreto ingiuntivo', 'come funziona il decreto ingiuntivo'],
    'Il decreto ingiuntivo è un provvedimento con cui il giudice, su richiesta di chi vanta un credito, ordina al debitore di pagare. Chi lo riceve ha termini ristretti per reagire e le conseguenze dipendono da cosa si fa: per questo è importante far vedere l\'atto all\'avvocato il prima possibile, senza attendere.'),
  f('info_processo', 'Che differenza c\'è tra denuncia e querela?', ['differenza tra denuncia e querela', 'che differenza c e tra denuncia e querela', 'cos e la querela', 'cosa e la querela', 'cosa significa querela', 'denuncia o querela'],
    'La denuncia è la comunicazione all\'autorità di un fatto che costituisce reato; la querela è la dichiarazione con cui la persona offesa chiede che si proceda contro l\'autore di certi reati, e per questi è un passaggio necessario. Quale strada sia adatta e con quali termini lo valuta l\'avvocato.'),
  f('info_processo', 'Cos\'è la prescrizione?', ['cos e la prescrizione', 'cosa e la prescrizione', 'cosa significa prescrizione', 'cosa vuol dire prescrizione', 'come funziona la prescrizione'],
    'La prescrizione è l\'estinzione di un diritto o di un reato per il trascorrere del tempo previsto dalla legge. I termini cambiano molto a seconda della materia e del caso, quindi non posso indicarne nessuno: se pensa che un termine stia per scadere lo dica subito, così avviso l\'avvocato.'),
  f('info_processo', 'Cos\'è un\'udienza?', ['cos e un udienza', 'cosa e un udienza', 'cosa significa udienza', 'come funziona un udienza', 'cosa succede in udienza', 'cosa vuol dire udienza'],
    'L\'udienza è l\'incontro davanti al giudice in cui le parti, tramite i loro avvocati, presentano le proprie posizioni; nel corso di un procedimento ce ne possono essere più d\'una. Se ha un\'udienza vicina me lo dica subito, così avviso l\'avvocato.'),
  f('info_processo', 'Cos\'è la procura alle liti?', ['cos e la procura alle liti', 'cosa e la procura alle liti', 'cosa significa procura alle liti', 'cos e una procura per l avvocato', 'cosa devo firmare per dare l incarico'],
    'La procura alle liti è il documento con cui il cliente conferisce all\'avvocato il potere di rappresentarlo in giudizio. Prima di firmare qualunque documento l\'avvocato dello studio le spiegherà di cosa si tratta.'),
  f('info_processo', 'Che differenza c\'è tra separazione e divorzio?', ['differenza tra separazione e divorzio', 'che differenza c e tra separazione e divorzio', 'separazione o divorzio', 'cos e la separazione', 'cos e il divorzio', 'cosa significa separazione', 'cosa significa divorzio'],
    'La separazione attenua gli effetti del matrimonio ma non lo scioglie; il divorzio pone fine al matrimonio. Presupposti, passaggi e conseguenze (figli, casa, mantenimento) dipendono dalla situazione: è l\'avvocato a spiegarli dopo aver esaminato il caso.'),
  f('info_processo', 'Cos\'è l\'affidamento condiviso?', ['cos e l affidamento condiviso', 'cosa e l affidamento condiviso', 'cosa significa affidamento condiviso', 'cosa vuol dire affidamento condiviso', 'come funziona l affidamento dei figli'],
    'L\'affidamento condiviso è la regola generale per i figli di genitori separati: entrambi i genitori mantengono la responsabilità e le decisioni importanti vengono prese insieme, mentre collocamento e modalità di frequentazione sono definiti caso per caso. Per la sua situazione serve l\'avvocato.'),
  f('info_processo', 'Come funziona una causa civile?', ['come funziona una causa', 'come funziona una causa civile', 'come funziona il processo civile', 'come si svolge una causa', 'come si svolge un processo civile', 'come funziona un processo'],
    'In estrema sintesi: l\'avvocato prepara e deposita l\'atto introduttivo, la controparte può difendersi, il giudice fissa le udienze, raccoglie le prove e alla fine decide con una sentenza, che in certi casi si può impugnare. Le fasi e il percorso concreto dipendono dal caso e li spiega l\'avvocato.'),
  f('info_processo', 'Quanto dura una causa?', ['quanto dura una causa', 'quanto dura una causa in generale', 'quanto durano le cause', 'quanto tempo ci vuole per una causa', 'i tempi di una causa', 'quanto dura un processo'],
    'I tempi di una causa variano moltissimo in base alla materia, al tribunale e alla complessità, e non sono prevedibili con certezza: per questo nessuno può promettere una durata. L\'avvocato potrà darle un\'idea dei passaggi, senza impegni sui tempi.'),
  f('info_processo', 'Cos\'è una diffida?', ['cos e una diffida', 'cosa e una diffida', 'cos e una lettera di diffida', 'cosa significa diffida', 'cosa significa lettera di diffida'],
    'La diffida è una comunicazione scritta con cui si invita qualcuno a fare o a smettere di fare qualcosa entro un certo termine, preannunciando di solito iniziative ulteriori. Se ne ha ricevuta una conviene farla vedere subito a un avvocato; io non posso interpretarne il contenuto.'),
  f('info_processo', 'Cos\'è il conflitto di interessi?', ['cos e il conflitto di interessi', 'cosa e il conflitto di interessi', 'cosa significa conflitto di interessi', 'un avvocato puo assistere entrambe le parti', 'l avvocato puo assistere tutti e due'],
    'C\'è conflitto di interessi quando un avvocato non potrebbe assistere una persona senza danneggiare un\'altra che già assiste o che ha assistito. In generale un avvocato non assiste parti con interessi contrapposti nella stessa vicenda. Per ragioni di riservatezza lo studio non può dire chi sono i propri clienti.'),
  f('info_processo', 'Cos\'è un testamento?', ['cos e un testamento', 'cosa e un testamento', 'cos e un testamento olografo', 'cosa significa testamento olografo', 'cosa significa testamento'],
    'Il testamento è l\'atto con cui una persona dispone di ciò che lascerà dopo la morte. Può avere forme diverse (per esempio scritto interamente a mano, o ricevuto da un notaio) e la legge tutela comunque certe quote a favore di alcuni familiari. Per il suo caso serve la valutazione di un professionista.'),
  f('info_modalita', 'Si può fare la consulenza online o per telefono?', ['si puo fare la consulenza online', 'si puo fare la consulenza per telefono', 'fate consulenze online', 'fate consulenze telefoniche', 'si puo fare in videochiamata', 'consulenza a distanza'],
    'Molti studi offrono anche consulenze in videochiamata o al telefono oltre a quelle in studio, ma dipende dall\'organizzazione di ciascuno: la disponibilità e le modalità le conferma lo studio.'),
  f('info_parcelle', 'Come si stabilisce il compenso dell\'avvocato?', ['come si stabilisce il compenso', 'come funziona la parcella', 'come si paga un avvocato', 'come si calcola la parcella', 'come funzionano i compensi dell avvocato', 'si puo avere un preventivo scritto'],
    'Il compenso dell\'avvocato si concorda con il cliente, di norma prima di iniziare, e il cliente può chiedere di avere per iscritto una previsione dei costi dell\'attività. Importi, modalità di pagamento e rateizzazione dipendono dallo studio e dal tipo di incarico: li comunica lo studio.'),
  f('info_processo', 'Cos\'è il ricorso in appello?', ['cos e l appello', 'cosa e l appello', 'cos e il ricorso in appello', 'cosa significa appello', 'come funziona l appello'],
    'L\'appello è l\'impugnazione con cui si chiede a un giudice di grado superiore di riesaminare una sentenza. Ci sono termini precisi e condizioni da rispettare, che variano da caso a caso: se ha ricevuto una sentenza, la mostri subito all\'avvocato.'),
];
