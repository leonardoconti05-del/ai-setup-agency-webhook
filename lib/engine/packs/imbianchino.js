// lib/engine/packs/imbianchino.js
//
// Sector Pack "imbianchino" v1 — conoscenza di SETTORE (imbiancatura,
// tinteggiatura e decorazione; lavori a domicilio in Italia), non di una
// singola impresa. Prezzi, tariffe, sconti, orari, tempi di inizio o durata dei
// lavori, zone servite, servizi offerti, marche di prodotto, personale,
// promozioni, garanzie e indirizzi NON stanno qui: arrivano solo dai dati del
// tenant.
// Settore di LAVORI a domicilio che nascono da un SOPRALLUOGO. Regole di
// dominio:
//  - il bot NON stima mai superfici, quantità di prodotto, costi o tempi: il
//    preventivo si fa dopo il sopralluogo;
//  - muffa, umidità, infiltrazioni, crepe: nessuna diagnosi né rimedio, solo
//    rimando al sopralluogo (e a un professionista per i problemi strutturali);
//  - lavori in altezza (ponteggi, trabattelli, facciate): nessun giudizio sulla
//    sicurezza, nessuna istruzione per salire/montare, valutazione al
//    sopralluogo;
//  - colori e materiali: il risultato finale non si promette (luce, supporto,
//    lotti di tinta, numero di mani);
//  - urgenze rare (infiltrazione attiva, rischio di caduta o di crollo,
//    caduta di intonaco/calcinacci): priorità al team; pericolo per le
//    persone (ferite, vapori, fumo/incendio, crolli, acqua con corrente):
//    escalation immediata e invito al 112 (115 per i vigili del fuoco).

export const SETTORE = 'imbianchino';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack imbianchino — lessico di imbiancatura/decorazione/muffa/umidità/lavori in quota, 21 intent, 12 entità, urgenza LOW-CRITICAL (persone ferite, vapori, fuoco, crolli, acqua con corrente; HIGH per infiltrazioni attive e rischio di caduta), sicurezza anti-stima e anti-diagnosi, 28 FAQ generali di settore senza prezzi.';

const uniq = (a) => [...new Set(a)];
const prod = (A, B) => A.flatMap((a) => B.map((b) => `${a} ${b}`));

// ---- Forme di urgenza, riusate sia per il lessico sia per urgency_rules ----
const CRITICI = {
  persona_ferita: [
    'si e fatto male', 'si e fatta male', 'si e fatto molto male', 'si e fatta molto male', 'mi sono fatto male', 'mi sono fatta male', 'e ferito', 'e ferita', 'sono ferito', 'sono ferita', 'e rimasto ferito', 'e rimasta ferita',
    'infortunio', 'infortunato', 'infortunata', 'incidente sul lavoro', 'sanguina', 'sta sanguinando', 'perde sangue', 'ambulanza', 'chiamare il 118', 'chiamare l ambulanza', 'chiamo il 118',
    ...prod(['si e rotto', 'si e rotta', 'si e fratturato', 'si e fratturata'], ['una gamba', 'un braccio', 'la gamba', 'il braccio', 'la schiena', 'una caviglia', 'la caviglia', 'un polso', 'il polso', 'il collo', 'una costola', 'il femore', 'la testa']),
  ],
  caduta_persona: [
    ...prod(['e caduto', 'e caduta', 'sono caduto', 'sono caduta', 'e scivolato', 'e scivolata', 'caduto', 'caduta'], ['dal ponteggio', 'dalla scala', 'dall alto', 'dal tetto', 'dal balcone', 'dal trabattello', 'dalla piattaforma', 'dall impalcatura', 'dal cestello', 'dal soppalco']),
    'e precipitato', 'e precipitata', 'l operaio e caduto', 'un operaio e caduto', 'l imbianchino e caduto', 'il pittore e caduto', 'ho preso una brutta caduta',
  ],
  malessere: [
    'non respira', 'e svenuto', 'e svenuta', 'sono svenuto', 'sono svenuta', 'privo di sensi', 'incosciente', 'ha perso i sensi', 'ha perso conoscenza', 'convulsioni', 'mi sento male', 'si sente male', 'non riesco a respirare',
    'difficolta a respirare', 'mi manca il respiro', 'mi gira la testa', 'ho la nausea', 'forte nausea',
  ],
  intossicazione: [
    'intossicato', 'intossicata', 'intossicazione', 'vapori mi hanno fatto stare male', 'vapori mi hanno fatto male', 'ho respirato vapori', 'ho respirato i vapori', 'ho respirato solvente', 'ho respirato il solvente', 'ho inalato solvente', 'ho inalato i vapori',
    'ho inalato vernice', 'ho respirato la vernice', 'fumi tossici', 'mi bruciano gli occhi', 'mi brucia la gola', 'vernice negli occhi', 'solvente negli occhi', 'pittura negli occhi', 'schizzo negli occhi', 'schizzata negli occhi',
    'ha bevuto la vernice', 'ha bevuto il solvente', 'ha bevuto il diluente', 'ha mangiato la vernice', 'ha mangiato la pittura', 'ha ingerito vernice', 'ha ingerito solvente', 'ha ingoiato la vernice', 'ho ingoiato la pittura', 'ho ingoiato il solvente', 'ho bevuto il solvente', 'ho bevuto il diluente', 'ho ingerito solvente', 'ho ingerito la pittura',
  ],
  fuoco_gas: [
    'e a fuoco', 'ha preso fuoco', 'prende fuoco', 'sta prendendo fuoco', 'e andato a fuoco', 'e andata a fuoco', 'in fiamme', 'fiamme', 'fiammata', 'fiammelle', 'c e un incendio', 'e scoppiato un incendio', 'principio di incendio', 'sta andando a fuoco', 'sta bruciando',
    'stracci a fuoco', 'stracci hanno preso fuoco', 'hanno preso fuoco', 'hanno preso fiamma', 'ha preso fiamma', 'prendono fuoco', 'stanno bruciando', 'stanno prendendo fuoco', 'solvente ha preso fuoco', 'vernice ha preso fuoco', 'solvente a fuoco', 'e esploso', 'e esplosa', 'esplosione', 'scoppio',
    'odore di gas', 'puzza di gas', 'sento gas', 'sento odore di gas', 'fuga di gas', 'perdita di gas', 'c e gas', 'c e fumo', 'c e del fumo', 'esce fumo', 'esce del fumo', 'vedo fumo', 'sento fumo', 'fumo nero', 'sta fumando',
    'odore di bruciato', 'puzza di bruciato', 'sa di bruciato',
  ],
  ponteggio_crollo: [
    'ponteggio e crollato', 'e crollato il ponteggio', 'ponteggio crollato', 'il ponteggio sta crollando', 'ponteggio sta cadendo', 'e caduto il ponteggio', 'ponteggio caduto', 'e crollata l impalcatura', 'impalcatura crollata', 'e crollato il trabattello',
    'trabattello caduto', 'trabattello si e ribaltato', 'scala si e ribaltata', 'si e ribaltato il ponteggio', 'si e ribaltata la scala',
  ],
  crollo: [
    'e crollato il soffitto', 'soffitto crollato', 'e crollato il controsoffitto', 'controsoffitto crollato', 'e caduto il controsoffitto', 'e caduto il soffitto', 'e caduto un pezzo di soffitto', 'pezzo di soffitto caduto', 'e crollato il balcone', 'balcone crollato',
    'e venuto giu il soffitto', 'e venuto giu un pezzo di soffitto', 'e venuto giu il controsoffitto', 'e venuto giu il muro', 'e venuta giu la parete', 'e venuto giu un pezzo di muro', 'e venuto giu un pezzo', 'e venuta giu una parte del soffitto', 'e venuto giu il cornicione', 'e crollato il cornicione', 'cornicione crollato', 'e crollato il muro', 'muro crollato', 'e crollata la parete', 'parete crollata', 'e crollato un pezzo', 'crollo del soffitto', 'crollo del controsoffitto', 'crollo del balcone', 'crollo del muro', 'crollo della parete', 'crollo del cornicione', 'crollo del tetto',
  ],
  acqua_elettricita: [
    'quadro e bagnato', 'il quadro elettrico e bagnato', 'si e bagnato il quadro', 'si sono bagnate le prese', 'quadro bagnato', 'prese bagnate', 'presa bagnata', 'quadro elettrico bagnato', 'quadro allagato', 'prese sott acqua',
    'gocciola dal lampadario', 'cola acqua dal lampadario', 'acqua dal lampadario', 'acqua dai faretti', 'acqua dalle luci', 'acqua dalla plafoniera', 'acqua dalla presa', 'acqua dalle prese',
    'scintille', 'scintilla', 'ho preso la scossa', 'ho preso una scossa', 'ha preso la scossa', 'ha preso una scossa', 'mi ha dato la scossa', 'scossa elettrica', 'folgorato', 'folgorata', 'elettrocutato', 'elettrocutata',
    ...['acqua', 'gocciola', 'cola', 'perdita', 'infiltrazione', 'infiltrazioni', 'umidita', 'piove'].flatMap((w) => ['sopra il', 'sopra le', 'sul', 'sulle', 'vicino al', 'vicino alle', 'dentro il', 'dentro le', 'nel', 'nelle', 'nei', 'sopra al'].flatMap((pr) => ['quadro', 'quadro elettrico', 'prese', 'presa', 'centralino', 'contatore', 'lampadario', 'faretti'].map((x) => `${w} ${pr} ${x}`))),
  ],
};

const ALTI = {
  infiltrazione_attiva: [
    'infiltrazione in corso', 'infiltrazioni in corso', 'infiltrazione attiva', 'infiltrazioni attive', 'perdita in corso', 'perdita d acqua in corso',
    'acqua che cola dal soffitto', 'acqua che cola dalla parete', 'acqua che cola dal muro', 'acqua che scende dal soffitto', 'acqua che scende dalla parete', 'acqua dal soffitto', 'acqua dal tetto', 'acqua dalle pareti', 'acqua dal muro', 'acqua dalla parete',
    'gocciola dal soffitto', 'gocciola dalla parete', 'gocciola il soffitto', 'gocciolano dal soffitto', 'soffitto che gocciola', 'soffitto gocciola', 'soffitto che perde', 'il soffitto perde acqua', 'perde acqua il soffitto', 'perde dal soffitto',
    'piove in casa', 'piove dentro', 'piove dal soffitto', 'entra acqua', 'entra acqua dal tetto', 'entra acqua dal balcone', 'entra acqua dal muro', 'soffitto allagato',
    'la macchia si sta allargando', 'macchia che si allarga', 'macchia che si ingrandisce', 'macchia sempre piu grande', 'l acqua continua a scendere', 'continua a gocciolare', 'continua a colare', 'sta colando acqua', 'cola acqua', 'colano acqua',
    'bolla d acqua sul soffitto', 'soffitto gonfio d acqua', 'soffitto pieno d acqua', 'soffitto che si gonfia', 'il soffitto si gonfia', 'il soffitto si e gonfiato', 'soffitto rigonfio', 'soffitto che cede', 'soffitto cede', 'soffitto sta cedendo', 'il soffitto sta per cedere',
  ],
  caduta_intonaco: [
    'si staccano pezzi', 'si staccano pezzi di intonaco', 'si stacca un pezzo di cornicione', 'si stacca un pezzo di intonaco', 'staccano pezzi di intonaco', 'cadono dal cornicione', 'cade dal cornicione', 'e venuto giu l intonaco', 'cade l intonaco', 'cade intonaco', 'cadono pezzi di intonaco', 'pezzi di intonaco che cadono', 'pezzi di intonaco caduti', 'e caduto un pezzo di intonaco', 'e caduto dell intonaco', 'caduti pezzi di intonaco', 'intonaco che cade', 'calcinacci', 'cadono calcinacci', 'calcinaccio',
    'pezzi che cadono dal soffitto', 'pezzi che cadono dal balcone', 'pezzi che cadono dalla facciata', 'cadono pezzi dalla facciata', 'cadono pezzi dal soffitto', 'cadono pezzi dal cornicione', 'cadono pezzi di muro', 'pezzi di muro che cadono',
    'si sta staccando il soffitto', 'il soffitto si sta sfaldando', 'soffitto che si sfalda', 'si sfalda il soffitto', 'pezzi di cornicione', 'cornicione che cade', 'cornicione che si stacca', 'distacco di intonaco dalla facciata', 'intonaco pericolante', 'frontalini che cadono', 'frontalino che cade', 'ferri scoperti', 'ferri arrugginiti che escono',
  ],
  rischio_caduta: [
    'ponteggio instabile', 'ponteggio che traballa', 'ponteggio traballante', 'ponteggio traballa', 'ponteggio che balla', 'ponteggio pericolante', 'ponteggio non sicuro', 'ponteggio storto', 'ponteggio senza parapetti', 'ponteggio senza protezioni', 'ponteggio non a norma', 'ponteggio sembra instabile',
    'impalcatura instabile', 'impalcatura traballante', 'impalcatura che traballa', 'trabattello instabile', 'trabattello traballa', 'scala traballante', 'scala instabile', 'scala che traballa',
    'rischio di caduta', 'rischio caduta', 'rischio di cadere', 'rischio di cadute', 'pericolo di caduta', 'pericolo caduta', 'pericolo di cadere', 'rischia di cadere', 'rischiano di cadere', 'rischio che cada', 'rischio che cadano', 'rischia di crollare', 'rischio di crollo', 'rischio crollo', 'pericolo di crollo',
    'sta per cadere', 'sta per crollare', 'sta per cedere', 'rischio cedimento', 'parapetto mancante', 'manca il parapetto', 'senza parapetto', 'ringhiera che cede', 'ringhiera pericolante', 'ringhiera instabile', 'ringhiera rotta', 'balcone che cede', 'balcone instabile', 'balcone pericolante', 'balcone che trema', 'cornicione pericolante', 'cornicione che pende',
    'lavori in quota pericolosi', 'lavorare in quota senza protezioni', 'senza imbracatura', 'senza linea vita', 'pericolo per i passanti', 'pericolo per i bambini', 'pericolo per le persone', 'pericolo per chi passa', 'pericolo per l incolumita',
  ],
  cedimento_strutturale: [
    'crepa che si allarga', 'crepa si allarga', 'la crepa si allarga', 'si allarga la crepa', 'le crepe si allargano', 'crepe si allargano', 'crepa peggiora', 'la crepa peggiora', 'crepa che peggiora', 'crepe che peggiorano', 'si sta aprendo la crepa', 'crepa che si apre', 'crepe che si allargano', 'crepa che si allunga', 'crepe che si allungano', 'crepa che si ingrandisce', 'crepe che si ingrandiscono', 'crepa sempre piu grande', 'crepe sempre piu grandi', 'crepa passante', 'crepe passanti', 'lesione passante', 'lesioni passanti',
    'crepa strutturale', 'crepe strutturali', 'lesione strutturale', 'lesioni strutturali', 'muro che si sposta', 'muro che si e spostato', 'muro che si inclina', 'muro pendente', 'parete che si muove', 'soffitto che scricchiola', 'si sente scricchiolare il soffitto',
  ],
  emergenza_dichiarata: [
    'ho un emergenza', 'e un emergenza', 'e una emergenza', 'emergenza in corso', 'si tratta di un emergenza', 'urgenza grave', 'emergenza grave', 'emergenza vera',
  ],
};

// Problemi ordinari (MEDIUM): non pericolosi di per sé. Valorizzano "problema" e portano all'intent problema_pareti.
const PROBLEMI_ORD = {
  muffa: [
    'muffa', 'muffe', 'macchie di muffa', 'macchia di muffa', 'ammuffito', 'ammuffita', 'ammuffiti', 'ammuffite', 'ammuffisce', 'ammuffiscono', 'muffa nera', 'puntini neri', 'puntini neri sul muro', 'macchie nere sul muro', 'macchie nere sul soffitto', 'macchie nere agli angoli', 'macchie nere in bagno', 'macchie scure agli angoli',
    'si e formata la muffa', 'si forma la muffa', 'si sono formate le muffe', 'mi viene la muffa', 'mi e venuta la muffa', 'ci e venuta la muffa',
  ],
  umidita: [
    'umidita', 'umido', 'umida', 'umidi', 'umide', 'muri umidi', 'pareti umide', 'parete umida', 'muro umido', 'muro bagnato', 'pareti bagnate', 'muro che suda', 'pareti che sudano', 'parete che suda', 'muro che trasuda', 'umidita di risalita', 'umidita da risalita', 'risalita capillare', 'risalita di umidita',
    'umidita in casa', 'casa umida', 'cantina umida', 'bagno umido',
  ],
  condensa: ['condensa', 'condensa sulle pareti', 'condensa sui muri', 'pareti che fanno condensa', 'fa condensa', 'fanno condensa'],
  salnitro: ['salnitro', 'efflorescenze', 'efflorescenza', 'muro che sbriciola', 'sale sul muro', 'muro con il sale', 'patina bianca sul muro', 'polvere bianca sul muro', 'polverina bianca'],
  macchie: [
    'macchia sul soffitto', 'macchie sul soffitto', 'macchia gialla sul soffitto', 'macchie gialle sul soffitto', 'aloni sul soffitto', 'alone sul soffitto', 'macchia scura sul soffitto', 'macchie scure sul soffitto', 'macchia di umidita', 'macchie di umidita', 'alone di umidita', 'aloni di umidita',
    'macchia marrone', 'macchie marroni', 'macchie gialle', 'macchia gialla', 'aloni gialli', 'alone giallo', 'aloni', 'alone', 'macchie sul muro', 'macchia sul muro', 'macchie sulla parete', 'macchie sulle pareti', 'macchia sulla parete', 'macchie scure', 'macchia scura',
  ],
  infiltrazione_pregressa: [
    'infiltrazione', 'infiltrazioni', 'infiltrazione d acqua', 'infiltrazioni d acqua', 'segno di infiltrazione', 'segni di infiltrazione', 'macchia da infiltrazione', 'macchie da infiltrazione', 'alone da infiltrazione', 'danno da infiltrazione', 'danni da infiltrazione', 'danni da acqua', 'danno da acqua',
    'dopo la perdita', 'dopo l infiltrazione', 'dopo un infiltrazione', 'dopo il danno d acqua', 'dopo un allagamento', 'dopo l allagamento', 'dopo il tubo rotto', 'perdita dal piano di sopra', 'perdita dall appartamento di sopra',
  ],
  crepe: [
    'crepa', 'crepe', 'crepatura', 'crepature', 'cavillature', 'cavillatura', 'fessura', 'fessure', 'lesione', 'lesioni', 'crepe nel muro', 'crepe nel soffitto', 'crepe sul muro', 'crepe sul soffitto', 'crepe sulla facciata', 'crepe in facciata', 'crepa nella parete', 'muro crepato', 'parete crepata', 'soffitto crepato', 'si e crepato', 'si sono create delle crepe',
    'segni di assestamento', 'assestamento',
  ],
  scrostamento: [
    'scrostato', 'scrostata', 'scrostati', 'scrostate', 'si scrosta', 'si sta scrostando', 'scrostamento', 'vernice che si stacca', 'pittura che si stacca', 'pittura si stacca', 'la pittura si stacca', 'vernice si stacca', 'pittura si sfoglia', 'pittura si scrosta', 'pittura si gonfia', 'pittura fa le bolle', 'fa le bolle', 'fanno le bolle', 'pittura che si sfoglia', 'vernice che si sfoglia', 'pittura che si gonfia', 'vernice che si gonfia', 'pittura che fa le bolle', 'bolle sulla parete', 'bolle nella pittura', 'bolle sul muro',
    'intonaco che si stacca', 'intonaco che si sfalda', 'intonaco si sfalda', 'intonaco si stacca', 'intonaco che si sbriciola', 'intonaco ammalorato', 'intonaco rovinato', 'pittura rovinata', 'pareti rovinate', 'pareti scrostate', 'muri scrostati', 'muro scrostato', 'si sfoglia', 'sfogliata', 'si sta sfogliando',
  ],
  annerimento: [
    'pareti ingiallite', 'pareti annerite', 'muri anneriti', 'muro annerito', 'parete annerita', 'soffitto annerito', 'soffitto ingiallito', 'ingiallite dal fumo', 'annerite dal fumo', 'annerito dal fumo', 'pareti sporche', 'muri sporchi', 'segni di fumo', 'fuliggine', 'dopo l incendio', 'dopo un incendio', 'danni da incendio', 'danno da incendio', 'danni da fumo', 'nicotina', 'macchie di nicotina', 'ingiallimento', 'annerimento',
  ],
};

const AMBIENTI_TERMINI = {
  soggiorno: ['soggiorno', 'salotto', 'sala', 'living', 'zona giorno', 'sala da pranzo', 'tinello'],
  cucina: ['cucina', 'cucinino', 'angolo cottura'],
  camere: ['camera', 'camere', 'camera da letto', 'camere da letto', 'cameretta', 'camerette', 'stanza da letto', 'stanza dei bambini', 'zona notte', 'matrimoniale'],
  bagno: ['bagno', 'bagni', 'doccia', 'servizi igienici'],
  ingresso_corridoio: ['ingresso', 'corridoio', 'disimpegno', 'atrio', 'entrata', 'andito'],
  scale: ['scale', 'vano scale', 'scala condominiale', 'scale condominiali', 'tromba delle scale', 'pianerottolo', 'pianerottoli'],
  tutta_la_casa: ['tutta la casa', 'tutto l appartamento', 'tutta casa', 'tutte le stanze', 'tutti gli ambienti', 'tutti i locali', 'l intero appartamento', 'l intera casa', 'tutto il piano', 'tutta la villa', 'casa intera', 'appartamento intero', 'tutto l alloggio'],
  piu_ambienti: ['due stanze', 'tre stanze', 'quattro stanze', 'piu stanze', 'alcune stanze', 'un paio di stanze', 'due camere', 'tre camere', 'due ambienti', 'tre ambienti', 'piu ambienti', 'alcuni ambienti', 'un paio di ambienti', 'bilocale', 'trilocale', 'quadrilocale'],
  balcone_terrazzo: ['balcone', 'balconi', 'terrazzo', 'terrazza', 'veranda', 'loggia', 'portico', 'tettoia'],
  cantina_garage: ['cantina', 'garage', 'box', 'box auto', 'taverna', 'mansarda', 'soffitta', 'lavanderia', 'ripostiglio', 'sgabuzzino'],
  ufficio_negozio: ['ufficio', 'uffici', 'negozio', 'locale commerciale', 'studio', 'sala d attesa', 'ambulatorio', 'reception', 'locali del negozio'],
  facciata_esterni: ['facciata', 'facciate', 'esterno', 'esterni', 'muri esterni', 'pareti esterne', 'prospetto', 'prospetti', 'recinzione', 'muro di cinta', 'muretto', 'muri di recinzione', 'sottogronda', 'cornicione'],
  soffitti: ['soffitto', 'soffitti', 'plafone', 'solaio'],
};

export const pack = {
  identity: {
    nome_ruolo: 'imbianchino / impresa di imbiancatura e decorazione',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un\'impresa di imbiancatura e decorazione (imbianchino, pittore edile, decoratore) che lavora a domicilio. Accogli i clienti con tono cortese, concreto e rassicurante; gestisci richieste di sopralluogo, preventivo, informazioni e segnalazioni di muffa, umidità o urgenze. Non sei un tecnico: non fai diagnosi di muffa, umidità, infiltrazioni o crepe, non consigli prodotti o lavorazioni, non stimi mai superfici, quantità di prodotto, costi o tempi (il preventivo si fa dopo il sopralluogo), non giudichi la sicurezza di ponteggi o lavori in quota e non prometti colori, resa o durata del risultato.',
  },
  mission: 'Capire che lavoro serve (imbiancatura, tinteggiatura, decorazione, ripristino, facciate...), raccogliere solo i dati necessari (tipo di lavoro, ambienti, nome, indirizzo o zona, disponibilità per il sopralluogo), organizzare il sopralluogo da cui nasce il preventivo e far arrivare subito al team le situazioni urgenti o pericolose.',
  tone_default: 'professionale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, senza tecnicismi inutili.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Mai stimare metri quadri, quantità di pittura, numero di mani, giorni di lavoro, costi o tempi: dire con gentilezza che servono il sopralluogo e il preventivo dell\'impresa.',
    'Muffa, umidità, macchie, infiltrazioni, crepe: nessuna diagnosi della causa, nessun rimedio o prodotto consigliato; si valuta in sopralluogo. Per dubbi sulla salute ci si rivolge a un medico; per crepe o cedimenti a un tecnico abilitato.',
    'Lavori in altezza (ponteggi, trabattelli, scale, facciate): nessun giudizio sulla sicurezza e nessuna istruzione per salire, montare o lavorare in quota; ne parla il team al sopralluogo.',
    'Colori e materiali: si può parlare di campioni e scelta in generale, ma mai promettere che il colore sul muro sarà identico al campione, che non si vedranno i ritocchi o che il risultato durerà un certo tempo.',
    'Prezzi, tariffe, sconti, orari, tempi di inizio, zone servite, servizi, marche di prodotto e garanzie solo se presenti nei dati dell\'attività; altrimenti dire che si verifica con il team.',
  ],
  prohibited_claims: [
    'stimare superfici, quantità di prodotto, numero di mani, durata dei lavori o costi senza sopralluogo e preventivo',
    'dire quale sia la causa di muffa, umidità, macchie, infiltrazioni o crepe, o che un problema è di un certo tipo, senza sopralluogo',
    'consigliare rimedi, prodotti o lavorazioni per risolvere muffa, umidità o altri problemi del supporto',
    'dire che una situazione di pericolo (crepe, crolli, ponteggi, balconi, soffitti) non è grave o che si può aspettare',
    'giudicare sicuro o a norma un ponteggio, una scala, un balcone o un lavoro in quota',
    'dare indicazioni mediche sugli effetti di muffa, vapori o prodotti',
    'promettere che il colore sarà identico al campione o al catalogo, che i ritocchi non si vedranno, che la muffa non tornerà o che il risultato durerà nel tempo',
    'indicare prezzi, tariffe, sconti, orari, tempi di inizio, zone o garanzie non presenti nelle fonti',
  ],
  business_rules: [
    'Il preventivo si basa su un sopralluogo: il bot non anticipa cifre, superfici, quantità o tempi.',
    'Disdette e spostamenti di sopralluoghi o lavori già fissati vanno passati al team.',
    'Infiltrazioni in corso, caduta di intonaco o calcinacci, rischio di caduta o crollo, ponteggi instabili hanno priorità sulla raccolta dati e vanno segnalati subito al team.',
    'Ferite, malori, intossicazione da vapori o prodotti, fumo o incendio, crolli, acqua vicino a impianto elettrico: invito immediato a mettersi in sicurezza e chiamare il 112 (115 vigili del fuoco).',
    'Condizioni di garanzia, assistenza dopo i lavori, ritocchi e prodotti utilizzati sono dati dell\'attività.',
  ],

  entities: [
    { id: 'tipo_lavoro', descrizione: 'Il lavoro richiesto.', tipo: 'enum', priorita: 10,
      valori: ['imbiancatura_interni', 'tinteggiatura_facciata', 'verniciatura_infissi', 'decorativo', 'carta_da_parati', 'cartongesso', 'rasatura_stuccatura', 'trattamento_muffa_umidita', 'impermeabilizzazione_cappotto', 'soffitti', 'scale_condominiali', 'ristrutturazione', 'ritocchi', 'altro'],
      domanda_varianti: ['Di che lavoro ha bisogno? Per esempio imbiancare, rifare una facciata, una decorazione...', 'Mi racconta cosa vorrebbe fare: che tipo di lavoro le serve?', 'Per quale lavoro vuole il nostro sopralluogo?'] },
    { id: 'problema', descrizione: 'Il problema segnalato dal cliente (come lo descrive, senza diagnosi).', tipo: 'enum', priorita: 12,
      valori: [...Object.keys(PROBLEMI_ORD), ...Object.keys(ALTI), ...Object.keys(CRITICI), 'altro'],
      domanda_varianti: ['Mi racconta che problema vede? (per esempio macchie, muffa, umidità, crepe...)', 'Che cosa nota esattamente sul muro o sul soffitto?', 'Può descrivermi brevemente cosa succede?'] },
    { id: 'ambienti', descrizione: 'Gli ambienti o le parti da lavorare (stanze, facciata, scale...).', tipo: 'enum', priorita: 15,
      valori: [...Object.keys(AMBIENTI_TERMINI), 'altro'],
      domanda_varianti: ['Quali ambienti o parti vanno fatti? Per esempio soggiorno, camere, bagno, tutta la casa, la facciata...', 'Mi dice quali stanze o zone riguarda il lavoro?', 'Che ambienti vorrebbe sistemare?'] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'] },
    { id: 'indirizzo_lavoro', descrizione: 'Indirizzo o zona (via e comune) dove si trova l\'immobile da lavorare.', tipo: 'string', priorita: 30,
      domanda_varianti: ['Mi dice via e comune dove si trova l\'immobile?', 'In quale indirizzo o zona dovrebbe venire l\'imbianchino?', 'Dove si trova la casa o il locale (via e comune)?'] },
    { id: 'tipo_immobile', descrizione: 'Tipo di immobile: abitazione, villa, negozio, ufficio, capannone, condominio, struttura ricettiva.', tipo: 'enum', priorita: 40,
      valori: ['abitazione', 'villa', 'negozio', 'ufficio', 'capannone', 'condominio', 'struttura_ricettiva', 'altro'],
      domanda_varianti: ['Si tratta di un appartamento, una villa, un negozio, un condominio o altro?'] },
    { id: 'altezza_lavoro', descrizione: 'Se il lavoro è in quota (ponteggio, trabattello, piani alti, soffitti molto alti).', tipo: 'enum', priorita: 45,
      valori: ['ponteggio', 'piano_alto', 'soffitti_alti', 'non_in_quota'],
      domanda_varianti: ['Il lavoro è in altezza, per esempio piani alti, soffitti molto alti o facciata con ponteggio?'] },
    { id: 'urgenza', descrizione: 'Se la richiesta è urgente o programmabile.', tipo: 'enum', priorita: 70, valori: ['urgente', 'non_urgente'],
      domanda_varianti: ['È una cosa urgente o si può programmare?'] },
    { id: 'giorno', descrizione: 'Giorno preferito per il sopralluogo.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera per il sopralluogo.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'motivo_lavoro', descrizione: 'Perché serve il lavoro (vendita, affitto, ristrutturazione, riconsegna, nuova apertura...).', tipo: 'string', priorita: 80 },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Problemi urgenti (CRITICAL / HIGH): collegati all'intent di emergenza ----
    ...Object.entries(CRITICI).map(([k, forme]) => ({ canonical: k, entity: 'problema', value: k, negabile: true, synonyms: uniq(forme), intent: 'emergenza_pericolo' })),
    ...Object.entries(ALTI).map(([k, forme]) => ({ canonical: k, entity: 'problema', value: k, negabile: true, synonyms: uniq(forme), intent: 'emergenza_pericolo' })),

    // ---- Problemi ordinari (muffa, umidità, macchie, crepe...) ----
    ...Object.entries(PROBLEMI_ORD).map(([k, forme]) => ({ canonical: k, entity: 'problema', value: k, negabile: true, synonyms: uniq(forme), intent: 'problema_pareti', errors: k === 'muffa' ? ['mufa', 'muffe nere', 'mufffa'] : k === 'umidita' ? ['umidità', 'umiditá'] : k === 'infiltrazione_pregressa' ? ['infiltrazzione', 'infiltrazzioni'] : [] })),

    // ---- Lavori (tipo_lavoro): dal più specifico al più generico (il primo che compare vince) ----
    { canonical: 'carta_da_parati', entity: 'tipo_lavoro', value: 'carta_da_parati', synonyms: ['carta da parati', 'carte da parati', 'tappezzeria', 'tappezzare', 'rivestimento murale', 'rivestimenti murali', 'wallpaper', 'carta parati', 'cartapesta murale', 'fotomurale', 'fotomurali', 'rimuovere la carta da parati', 'togliere la carta da parati'] },
    { canonical: 'decorativo', entity: 'tipo_lavoro', value: 'decorativo', synonyms: ['stucco veneziano', 'stucchi veneziani', 'stucco decorativo', 'stucchi decorativi', 'decorazione', 'decorazioni', 'decorare', 'decorativo', 'decorativa', 'pittura decorativa', 'pitture decorative', 'effetto marmorino', 'marmorino', 'calce decorativa', 'tadelakt', 'effetto cemento', 'resina decorativa', 'spatolato', 'effetto spatolato', 'velature', 'velatura', 'effetto velluto', 'effetto sabbiato', 'sabbiato', 'effetto pietra', 'finto marmo', 'trompe l oeil', 'murales', 'murale', 'greca', 'bordura decorativa', 'boiserie', 'effetto seta', 'effetto metallizzato', 'pittura metallizzata', 'stencil', 'parete di accento', 'parete a effetto'] },
    { canonical: 'cartongesso', entity: 'tipo_lavoro', value: 'cartongesso', synonyms: ['cartongesso', 'carton gesso', 'controsoffitto', 'controsoffitti', 'contro soffitto', 'parete in cartongesso', 'pareti in cartongesso', 'velette', 'veletta', 'nicchia in cartongesso', 'lastre di cartongesso', 'rasatura del cartongesso', 'stuccatura del cartongesso'] },
    { canonical: 'rasatura_stuccatura', entity: 'tipo_lavoro', value: 'rasatura_stuccatura', synonyms: ['rasatura', 'rasare', 'rasate', 'rasare le pareti', 'stuccatura', 'stuccare', 'stuccatura delle pareti', 'stuccatura dei buchi', 'stuccare i buchi', 'stuccare le crepe', 'riparare le crepe', 'riparazione crepe', 'sistemare le crepe', 'rattoppare', 'rattoppo', 'reintonacare', 'reintonacatura', 'rifare l intonaco', 'rifacimento intonaco', 'intonacare', 'intonacatura', 'livellare le pareti', 'livellare il muro', 'rifinitura', 'carteggiare', 'carteggiatura', 'levigare le pareti', 'levigatura'] },
    { canonical: 'trattamento_muffa_umidita', entity: 'tipo_lavoro', value: 'trattamento_muffa_umidita', synonyms: ['trattamento antimuffa', 'trattamento anti muffa', 'trattamento contro la muffa', 'pittura antimuffa', 'pittura anti muffa', 'vernice antimuffa', 'antimuffa', 'anti muffa', 'togliere la muffa', 'togliere muffa', 'eliminare la muffa', 'eliminare muffa', 'rimuovere la muffa', 'rimuovere muffa', 'trattare la muffa', 'sistemare la muffa', 'risanamento', 'risanare', 'risanamento muri', 'risanamento delle pareti', 'bonifica della muffa', 'bonificare la muffa', 'sanificare le pareti', 'sistemare l umidita', 'risolvere l umidita', 'trattamento umidita', 'trattamento dell umidita', 'ripristino dopo la muffa', 'ripristino dopo infiltrazione', 'ripristino dopo l infiltrazione', 'ripristino dopo il danno d acqua', 'ripristino dopo un infiltrazione', 'ripristinare dopo l infiltrazione'] },
    { canonical: 'impermeabilizzazione_cappotto', entity: 'tipo_lavoro', value: 'impermeabilizzazione_cappotto', synonyms: ['impermeabilizzazione', 'impermeabilizzare', 'guaina', 'guaine', 'cappotto', 'cappotto termico', 'isolamento a cappotto', 'isolamento termico', 'isolare la facciata', 'intonaco termico', 'intonaco isolante', 'sigillatura', 'sigillare', 'sigillare i balconi', 'balconi da impermeabilizzare', 'pittura impermeabilizzante', 'impermeabilizzante', 'resina per terrazzo', 'rivestimento del terrazzo'] },
    { canonical: 'tinteggiatura_facciata', entity: 'tipo_lavoro', value: 'tinteggiatura_facciata', synonyms: ['tinteggiare la facciata', 'tinteggiatura facciata', 'tinteggiatura della facciata', 'tinteggiatura esterna', 'tinteggiatura esterni', 'tinteggiare esterni', 'tinteggiare l esterno', 'imbiancare la facciata', 'imbiancare l esterno', 'imbiancare gli esterni', 'imbiancatura esterna', 'pitturare la facciata', 'pitturare l esterno', 'dipingere la facciata', 'dipingere l esterno', 'ridipingere la facciata', 'rifare la facciata', 'rifacimento facciata', 'rifacimento della facciata', 'ritinteggiare la facciata', 'ritinteggiare l esterno', 'rinnovare la facciata', 'facciata', 'facciate', 'prospetto', 'prospetti', 'muri esterni', 'pareti esterne', 'muro di cinta', 'recinzione', 'sottogronda', 'cornicione', 'frontalini', 'rivestimento esterno', 'intonaco esterno', 'tinteggio esterni', 'esterni'] },
    { canonical: 'verniciatura_infissi', entity: 'tipo_lavoro', value: 'verniciatura_infissi', synonyms: ['verniciare', 'verniciatura', 'verniciare le porte', 'verniciatura porte', 'verniciare le finestre', 'verniciatura finestre', 'verniciatura infissi', 'verniciare gli infissi', 'infissi', 'persiane', 'persiana', 'scuri', 'serramenti', 'smalto', 'smaltare', 'smaltatura', 'laccare', 'laccatura', 'laccato', 'ringhiera', 'ringhiere', 'cancello in ferro', 'cancelli in ferro', 'inferriate', 'inferriata', 'ferro battuto', 'recinzione in ferro', 'radiatori', 'termosifoni', 'termosifone', 'radiatore', 'zoccolini', 'battiscopa', 'cornici', 'porte interne', 'porta di casa', 'porta d ingresso', 'portone', 'portoncino', 'mobili da verniciare', 'verniciare i mobili', 'cucina da verniciare', 'ante della cucina', 'trattamento del legno', 'impregnante', 'impregnare', 'cera', 'travi in legno', 'travi a vista', 'parquet da verniciare', 'verniciare il parquet', 'lucidare', 'ripassare le persiane', 'vernice per ferro', 'antiruggine', 'ruggine', 'cancello', 'gazebo', 'pergola', 'staccionata', 'steccato', 'pergolato'] },
    { canonical: 'scale_condominiali', entity: 'tipo_lavoro', value: 'scale_condominiali', synonyms: ['scale condominiali', 'scala condominiale', 'vano scala', 'vano scale', 'tromba delle scale', 'tromba delle scale condominiali', 'tinteggiare le scale', 'imbiancare le scale', 'imbiancare il vano scala', 'imbiancare il vano scale', 'tinteggiare il vano scale', 'tinteggiare il vano scala', 'parti comuni', 'androne', 'atrio condominiale', 'pianerottoli', 'ritinteggiare le scale', 'ritinteggiare il vano scale', 'pittura delle scale', 'pittura del vano scale'] },
    { canonical: 'ristrutturazione', entity: 'tipo_lavoro', value: 'ristrutturazione', synonyms: ['ristrutturazione', 'ristrutturare', 'ristrutturando', 'ristrutturato', 'casa da ristrutturare', 'rimettere a nuovo', 'rimettere a nuovo casa', 'rinnovare casa', 'rinnovare l appartamento', 'ristrutturare casa', 'lavori di ristrutturazione', 'rifacimento completo', 'ripristino completo', 'finiture', 'finitura', 'ultimo giro di lavori', 'dopo la ristrutturazione', 'fine lavori', 'dopo i lavori edili', 'cantiere', 'pittura a fine lavori', 'pittura dopo muratori', 'dopo i muratori', 'dopo il muratore', 'dopo l elettricista', 'dopo l idraulico', 'dopo la posa'] },
    { canonical: 'soffitti', entity: 'tipo_lavoro', value: 'soffitti', synonyms: ['imbiancare il soffitto', 'imbiancare i soffitti', 'imbiancare soffitto', 'tinteggiare il soffitto', 'tinteggiare i soffitti', 'dipingere il soffitto', 'pitturare il soffitto', 'ripassare il soffitto', 'soffitto da rifare', 'soffitti da rifare', 'rifare i soffitti', 'rifare il soffitto', 'soffitto da imbiancare', 'soffitti da imbiancare', 'soffitti alti da imbiancare', 'soffitto a cassettoni', 'soffitti a cassettoni', 'soffitto a volta', 'soffitti a volta', 'travi del soffitto', 'solai a vista'] },
    { canonical: 'ritocchi', entity: 'tipo_lavoro', value: 'ritocchi', synonyms: ['ritocco', 'ritocchi', 'ritoccare', 'ritoccatina', 'una ripassata', 'ripassata', 'ripassare', 'ripassare le pareti', 'piccoli ritocchi', 'piccolo ritocco', 'ritocchino', 'ritocchini', 'solo una parete', 'una sola parete', 'una parete sola', 'una parete', 'una stanza sola', 'solo una stanza', 'solo una camera', 'solo un po', 'parte della parete', 'un pezzo di parete', 'rifare una macchia', 'coprire una macchia', 'coprire un buco', 'sistemare un angolo', 'ripristino pittura', 'ripristinare la pittura', 'piccoli lavori', 'piccolo lavoretto', 'lavoretto', 'lavoretti', 'una mano di pittura', 'una mano di bianco', 'una mano di colore'] },
    { canonical: 'imbiancatura_interni', entity: 'tipo_lavoro', value: 'imbiancatura_interni', synonyms: ['imbiancare', 'imbiancatura', 'imbianchiamo', 'imbiancarmi', 'imbiancarci', 'far imbiancare', 'tinteggiare', 'tinteggiatura', 'tinteggiatura interna', 'tinteggiatura interni', 'tinteggiare gli interni', 'tinteggiare casa', 'tinteggiare le pareti', 'tinteggio', 'ritinteggiare', 'ritinteggiatura', 'pitturare', 'pitturazione', 'pittura', 'dipingere', 'dipingere casa', 'dipingere le pareti', 'ridipingere', 'ridipingere casa', 'ridipingere le pareti', 'dare il bianco', 'dare una mano di bianco', 'dare una mano di pittura', 'dare una rinfrescata', 'rinfrescare le pareti', 'rinfrescare casa', 'rinfrescata', 'rinfrescare', 'rifare le pareti', 'rifare i muri', 'pareti da rifare', 'pareti da imbiancare', 'muri da imbiancare', 'cambiare colore', 'cambiare il colore', 'cambiare colore alle pareti', 'cambiare colore ai muri', 'cambio colore', 'cambio di colore', 'colorare le pareti', 'colorare i muri', 'dare colore', 'pareti colorate', 'idropittura', 'lavabile', 'pittura lavabile', 'pittura traspirante', 'pittura ai silicati', 'tinta', 'tinte', 'bianco', 'rifare il colore', 'rifare colore', 'rifare la tinta', 'dare un nuovo colore', 'ridare colore', 'rifare le camere', 'rifare la camera', 'rifare le stanze', 'rifare la stanza', 'rifare il soggiorno', 'rifare la cucina', 'rifare il bagno', 'rifare il salotto', 'rifare il corridoio', 'rifare l ingresso'] },
    { canonical: 'lavoro_altro', entity: 'tipo_lavoro', value: 'altro', synonyms: ['un lavoro', 'dei lavori', 'lavori in casa', 'lavori di casa', 'un lavoretto'] },

    // ---- Ambienti ----
    ...Object.entries(AMBIENTI_TERMINI).map(([k, forme]) => ({ canonical: `amb_${k}`, entity: 'ambienti', value: k, synonyms: forme })),

    // ---- Lavori in quota (altezza_lavoro) ----
    { canonical: 'ponteggio', entity: 'altezza_lavoro', value: 'ponteggio', synonyms: ['ponteggio', 'ponteggi', 'impalcatura', 'impalcature', 'trabattello', 'trabattelli', 'piattaforma aerea', 'piattaforma elevabile', 'cestello', 'autoscala', 'gru', 'scala lunga', 'palazzina', 'edificio alto', 'dall esterno in alto'] },
    { canonical: 'piano_alto', entity: 'altezza_lavoro', value: 'piano_alto', synonyms: ['ultimo piano', 'terzo piano', 'quarto piano', 'quinto piano', 'sesto piano', 'settimo piano', 'piano alto', 'piani alti', 'al terzo piano', 'al quarto piano', 'al quinto piano', 'attico', 'ultimo piano di un palazzo'] },
    { canonical: 'soffitti_alti', entity: 'altezza_lavoro', value: 'soffitti_alti', synonyms: ['soffitti alti', 'soffitto alto', 'soffitti molto alti', 'soffitto molto alto', 'soffitto altissimo', 'soffitti altissimi', 'doppia altezza', 'altezza elevata', 'soffitti a cassettoni', 'soffitti a volta', 'soffitto a volta', 'volte', 'volta', 'loft', 'altezza di 4 metri', 'altezza di 5 metri', 'vano scale alto', 'tre metri e mezzo', 'quattro metri di altezza', 'cinque metri di altezza'] },

    // ---- Tipo di immobile ----
    { canonical: 'immobile_struttura', entity: 'tipo_immobile', value: 'struttura_ricettiva', synonyms: ['b&b', 'b b', 'bed and breakfast', 'bed breakfast', 'casa vacanze', 'casa vacanza', 'airbnb', 'affittacamere', 'agriturismo', 'hotel', 'albergo', 'pensione', 'residence', 'struttura ricettiva', 'locanda', 'appartamenti per turisti', 'appartamento per turisti', 'case vacanze'] },
    { canonical: 'immobile_condominio', entity: 'tipo_immobile', value: 'condominio', synonyms: ['condominio', 'condomini', 'palazzo', 'amministratore di condominio', 'amministratore', 'assemblea condominiale', 'parti comuni', 'stabile'] },
    { canonical: 'immobile_capannone', entity: 'tipo_immobile', value: 'capannone', synonyms: ['capannone', 'capannoni', 'magazzino', 'azienda', 'fabbrica', 'stabilimento', 'officina', 'laboratorio', 'capannone industriale'] },
    { canonical: 'immobile_ufficio', entity: 'tipo_immobile', value: 'ufficio', synonyms: ['ufficio', 'uffici', 'studio professionale', 'studio medico', 'studio dentistico', 'sede aziendale', 'coworking'] },
    { canonical: 'immobile_negozio', entity: 'tipo_immobile', value: 'negozio', synonyms: ['negozio', 'negozi', 'locale commerciale', 'attivita commerciale', 'ristorante', 'pizzeria', 'parrucchiere', 'bar', 'farmacia', 'palestra', 'boutique', 'locale', 'pub', 'trattoria', 'centro estetico'] },
    { canonical: 'immobile_villa', entity: 'tipo_immobile', value: 'villa', synonyms: ['villa', 'villetta', 'villette', 'casa indipendente', 'casolare', 'rustico', 'casa di campagna', 'bifamiliare', 'villino', 'casa a schiera', 'casa singola'] },
    { canonical: 'immobile_abitazione', entity: 'tipo_immobile', value: 'abitazione', synonyms: ['appartamento', 'bilocale', 'trilocale', 'monolocale', 'quadrilocale', 'mansarda', 'abitazione', 'casa mia', 'la mia casa', 'in casa', 'a casa', 'casa', 'alloggio', 'appartamentino', 'seconda casa', 'casa al mare', 'casa in montagna', 'prima casa'] },

    // ---- Indirizzo / zona (marcatore: il valore reale lo estrae l'analisi LLM) ----
    { canonical: 'indirizzo_indicato', entity: 'indirizzo_lavoro', value: 'indicato', synonyms: ['via', 'viale', 'piazza', 'corso', 'vicolo', 'largo', 'localita', 'frazione', 'abito a', 'abito in', 'abitiamo a', 'abitiamo in', 'vivo a', 'vivo in', 'viviamo a', 'viviamo in', 'il mio indirizzo', 'l indirizzo e', 'indirizzo e', 'si trova a', 'si trova in', 'si trova al', 'il locale e a', 'la casa e a', 'la casa e in', 'l appartamento e a', 'l appartamento e in', 'siamo di', 'comune di', 'nel comune di'] },

    // ---- Urgenza dichiarata ----
    { canonical: 'urgenza_alta', entity: 'urgenza', value: 'urgente', negabile: true, synonyms: ['urgente', 'urgentissimo', 'urgentissima', 'il prima possibile', 'prima possibile', 'al piu presto', 'subito', 'in giornata', 'immediatamente', 'di fretta', 'ho fretta', 'abbiamo fretta', 'molta fretta', 'entro pochi giorni'] },
    { canonical: 'urgenza_bassa', entity: 'urgenza', value: 'non_urgente', synonyms: ['non e urgente', 'non urgente', 'senza fretta', 'nessuna fretta', 'non ho fretta', 'con calma', 'con comodo', 'non c e fretta', 'nei prossimi mesi', 'prossimo mese', 'in primavera', 'in autunno', 'in estate', 'dopo l estate', 'a settembre'] },

    // ---- Motivo del lavoro ----
    { canonical: 'motivo_vendita', entity: 'motivo_lavoro', value: 'vendita', synonyms: ['per vendere casa', 'per vendere', 'devo vendere', 'prima di vendere', 'in vendita', 'metto in vendita', 'per la vendita'] },
    { canonical: 'motivo_affitto', entity: 'motivo_lavoro', value: 'affitto', synonyms: ['per affittare', 'per l affitto', 'prima di affittare', 'riconsegna', 'restituire l appartamento', 'restituire la casa', 'fine contratto', 'fine affitto', 'inquilino', 'inquilini', 'nuovi inquilini', 'ospiti', 'prima dei prossimi ospiti', 'tra un ospite e l altro'] },
    { canonical: 'motivo_trasloco', entity: 'motivo_lavoro', value: 'trasloco', synonyms: ['prima del trasloco', 'dopo il trasloco', 'trasloco', 'mi trasferisco', 'ci trasferiamo', 'casa nuova', 'nuova casa', 'ho appena comprato casa', 'ho comprato casa', 'abbiamo comprato casa', 'appena comprato'] },

    // ---- Concetti di conversazione (collegano all'intent) ----
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto mi costa', 'quanto prendete', 'quanto chiedete', 'quanto vi fate pagare', 'quanto si paga', 'quanto spendo', 'quanto mi viene', 'tariffa', 'tariffe', 'listino', 'costo orario', 'tariffa oraria', 'costo a metro quadro', 'prezzo a metro quadro', 'prezzo al metro quadro', 'costo al metro quadro', 'costo al mq', 'prezzo al mq', 'a quanto viene', 'costo del sopralluogo', 'sopralluogo gratuito', 'sopralluogo gratis', 'sopralluogo a pagamento', 'preventivo gratuito', 'preventivo gratis', 'preventivo a pagamento'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario di apertura', 'orario di lavoro', 'orario di chiusura', 'orari di lavoro', 'orari dei lavori', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'a che ora aprite', 'a che ora chiudete', 'fino a che ora', 'siete operativi', 'a che ora iniziate', 'a che ora cominciate', 'a che ora venite', 'in che orari lavorate', 'in quali orari', 'quando lavorate', 'giorni di lavoro', 'lavorate di sabato', 'lavorate il sabato', 'lavorate la domenica', 'lavorate nel weekend', 'lavorate nel fine settimana', 'lavorate anche il sabato', 'lavorate anche la domenica', 'lavorate di sera', 'lavorate nei festivi', 'lavorate i festivi', 'lavorate anche nei festivi'], intent: 'info_orari' },
    { canonical: 'zona_servita', synonyms: ['zone servite', 'zona servita', 'zona di intervento', 'zone di intervento', 'zona di copertura', 'coprite', 'copertura', 'lavorate anche a', 'lavorate a', 'lavorate anche nella', 'lavorate anche in', 'lavorate nella provincia', 'lavorate in provincia', 'nella provincia di', 'in provincia di', 'intervenite anche nella', 'intervenite anche in', 'intervenite in', 'intervenite a', 'intervenite anche a', 'arrivate anche a', 'arrivate anche in', 'arrivate a', 'arrivate fino a', 'venite anche a', 'venite anche in', 'venite fino a', 'lavorate in zona', 'lavorate nella zona', 'fate trasferte', 'in che zone', 'in quali zone', 'in quali comuni', 'dove operate', 'dove lavorate', 'dove intervenite', 'raggio di azione', 'fino a dove arrivate', 'siete di zona', 'vi spostate', 'lavorate fuori', 'lavorate anche fuori', 'quali zone', 'che zone'], intent: 'info_zona' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'rateizzare', 'rateizzazione', 'finanziamento', 'bancomat', 'carta di credito', 'carta', 'carte', 'contanti', 'bonifico', 'fattura', 'ricevuta', 'acconto', 'anticipo', 'saldo', 'satispay', 'paypal', 'assegno', 'detrazione', 'detrazioni', 'bonus', 'bonus facciate', 'bonus ristrutturazione', 'ecobonus', 'superbonus', 'sconto in fattura', 'cessione del credito', 'iva agevolata', 'iva al 10', 'iva ridotta', 'detraibile', 'detraibili', 'agevolazioni', 'agevolazione fiscale', 'agevolazioni fiscali'], intent: 'info_pagamenti' },
    { canonical: 'servizi', synonyms: ['servizi', 'vi occupate', 'che lavori fate', 'quali lavori fate', 'siete abilitati', 'siete iscritti', 'siete assicurati', 'assicurazione', 'durc', 'siete in regola', 'avete la partita iva', 'siete una impresa', 'siete un impresa', 'impresa edile', 'lavorate con le aziende', 'lavorate per i condomini', 'lavorate per le aziende', 'lavorate con i privati', 'fate anche', 'vi occupate anche', 'trattate anche', 'eseguite anche', 'sapete fare', 'riuscite a fare'], intent: 'info_servizi' },
    { canonical: 'garanzia', synonyms: ['garanzia', 'garanzie', 'garantite i lavori', 'assistenza dopo il lavoro', 'assistenza dopo i lavori', 'assistenza post vendita', 'se dopo ci sono problemi', 'se dopo i lavori ci sono problemi', 'ritocchi gratuiti', 'ritocchi gratis', 'ritocchi inclusi'], intent: 'info_servizi' },
    { canonical: 'documenti', synonyms: ['documenti', 'cosa devo preparare', 'cosa devo avere', 'foto dei muri', 'foto delle pareti', 'foto della stanza', 'foto delle stanze', 'foto del soffitto', 'planimetria', 'le misure', 'misure delle stanze', 'cosa devo mandarvi', 'cosa devo inviare', 'posso mandarvi', 'posso inviarvi', 'vi mando una foto', 'vi mando delle foto', 'mandarvi una foto', 'mandarvi delle foto', 'mandarvi un video', 'vi mando un video', 'foto', 'fotografie'], intent: 'info_documenti' },
    { canonical: 'preparazione', synonyms: ['spostare i mobili', 'spostate i mobili', 'spostate voi i mobili', 'sposto i mobili', 'devo spostare i mobili', 'svuotare la stanza', 'svuotare le stanze', 'devo svuotare', 'proteggete i pavimenti', 'proteggete i mobili', 'coprite i mobili', 'coprite i pavimenti', 'copritura', 'teli di protezione', 'teli', 'nylon', 'nastro di carta', 'pulizia finale', 'pulite dopo', 'fate pulizia', 'smaltite', 'smaltimento', 'odore di vernice', 'puzza di vernice', 'odore della pittura', 'odore di pittura', 'puzza di pittura', 'posso stare in casa', 'posso restare in casa', 'posso dormire in casa', 'stare in casa durante i lavori', 'restare in casa durante i lavori', 'durante i lavori', 'devo uscire', 'devo lasciare casa', 'devo essere presente', 'devo essere in casa', 'serve che io sia presente', 'serve che sia presente', 'con un neonato', 'con i bambini', 'con gli animali', 'con il cane', 'con il gatto', 'polvere', 'imbrattare', 'sporcate', 'sporcare i pavimenti', 'sporco'], intent: 'info_preparazione' },
    { canonical: 'domanda_quota', synonyms: ['serve il ponteggio', 'serve un ponteggio', 'serve l impalcatura', 'servono i ponteggi', 'ci vuole il ponteggio', 'ci vuole un ponteggio', 'fate lavori in quota', 'fate lavori in altezza', 'lavori in quota', 'lavori in altezza', 'lavorate in quota', 'lavorate in altezza', 'autorizzazione per il ponteggio', 'autorizzazione ponteggio', 'permesso per il ponteggio', 'permesso ponteggio', 'permessi per il ponteggio', 'suolo pubblico', 'occupazione di suolo pubblico', 'occupazione suolo pubblico', 'chi monta il ponteggio', 'montate voi il ponteggio', 'montate il ponteggio', 'ponteggio incluso', 'ponteggio compreso', 'il ponteggio lo montate voi', 'il ponteggio lo fornite', 'fornite il ponteggio', 'noleggio ponteggio', 'noleggiate il ponteggio', 'usate il trabattello', 'usate il ponteggio', 'usate piattaforme', 'come lavorate in quota', 'come lavorate in altezza', 'ho bisogno del ponteggio'], intent: 'info_lavori_quota' },
    { canonical: 'colori', synonyms: ['colore', 'colori', 'tinta', 'tinte', 'tonalita', 'campione', 'campioni', 'campioncino', 'campioncini', 'nuance', 'codice colore', 'tintometro', 'ral', 'pantone', 'sfumatura', 'sfumature', 'pastello', 'tinte pastello', 'colore chiaro', 'colore scuro', 'colori scuri', 'colori chiari', 'colore forte', 'abbinare i colori', 'scegliere il colore', 'tinta unita', 'bianco caldo', 'bianco puro', 'marca di pittura', 'marche di pittura', 'che pittura usate', 'che marca', 'prodotti ecologici', 'pitture ecologiche', 'pittura ecologica', 'pittura lavabile', 'pittura traspirante', 'pittura ai silicati', 'pittura a calce', 'tempera', 'pittura a tempera', 'smalto all acqua', 'pittura all acqua', 'pitture all acqua', 'a base d acqua', 'prodotti non tossici', 'pitture non tossiche', 'pittura non tossica', 'vernici non tossiche', 'prodotti naturali', 'prodotti senza odore', 'pittura senza odore', 'prodotti sicuri per i bambini', 'prodotti atossici', 'pittura atossica', 'pitture atossiche', 'senza solventi', 'pittura senza solventi', 'pittura per cucina', 'pittura per bagno', 'finitura opaca', 'finitura lucida', 'finitura satinata', 'opaco', 'lucido', 'satinato'], intent: 'info_colori_materiali' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima', 'stima dei costi', 'stima del costo', 'stima di spesa', 'computo', 'offerta', 'quotazione', 'quanto costerebbe', 'quanto verrebbe', 'quanto mi costerebbe', 'quanto mi verrebbe'], intent: 'richiesta_preventivo' },
    { canonical: 'sopralluogo', synonyms: ['sopralluogo', 'sopraluogo', 'sopralluoghi', 'appuntamento', 'prenotare', 'prenotazione', 'fissare', 'disponibilita', 'passare a vedere', 'passate a vedere', 'venire a vedere', 'venite a vedere', 'vedere i locali', 'vedere le stanze', 'dare un occhiata', 'dare un occhiata ai muri', 'venire a dare un occhiata', 'passare a dare un occhiata', 'potete passare', 'potete venire', 'venite a casa'], intent: 'richiesta_sopralluogo' },
    { canonical: 'domanda_tecnica', synonyms: ['come funziona', 'cos e', 'cosa e', 'cosa significa', 'che cosa significa', 'a cosa serve', 'che differenza', 'differenza tra', 'cosa vuol dire', 'cosa vuole dire', 'vuol dire', 'spiegami', 'spiegatemi', 'mi spiegate', 'mi spieghi', 'vorrei capire', 'in cosa consiste', 'che cos e', 'cosa sono'], intent: 'info_tecniche' },
    { canonical: 'figura_imbianchino', synonyms: ['imbianchino', 'imbianchini', 'pittore', 'pittori', 'pittore edile', 'decoratore', 'decoratori', 'tinteggiatore', 'tinteggiatori', 'verniciatore'], intent: 'richiesta_sopralluogo' },
    { canonical: 'imbianchino', synonyms: ['ditta', 'impresa', 'impresa di pittura', 'impresa di imbiancatura', 'operaio', 'operai', 'squadra', 'artigiano', 'artigiani', 'pittura edile'] },
  ],

  intents: [
    { id: 'emergenza_pericolo', nome: 'Emergenza o pericolo', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Situazione urgente o pericolosa: infiltrazione in corso, caduta di intonaco o calcinacci, rischio di caduta o crollo, ponteggio instabile, persone ferite, vapori, fumo, acqua con corrente.',
      esempi: ['ho un emergenza', 'e un emergenza', 'ho un urgenza grave', 'c e acqua che cola dal soffitto', 'il soffitto gocciola', 'cadono pezzi di intonaco', 'il ponteggio traballa', 'c e rischio di caduta', 'il balcone e pericolante', 'sta per cadere un pezzo di cornicione', 'e un emergenza serve un pittore'],
      keywords: ['emergenza', 'calcinacci'],
      combinazioni: [
        { entity: 'problema', con: ['imbianchino', 'pittore', 'ditta', 'impresa', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'vorrei', 'volevo', 'devo', 'potete', 'potreste', 'venite', 'venire', 'passate', 'passare', 'mandate', 'mandare', 'urgente', 'subito', 'chiamare', 'chiamo', 'ho', 'abbiamo', 'c e', 'ci sono'], non_con_concepts: Object.keys(PROBLEMI_ORD), score: 0.95 },
      ],
      required_entities: ['nome_cliente', 'indirizzo_lavoro'], optional_entities: ['problema', 'ambienti', 'tipo_immobile', 'altezza_lavoro', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'problema_pareti', nome: 'Muffa, umidità, macchie o crepe', categoria: 'SUPPORT', priorita: 15, safety_level: 'MEDIUM', campi_tenant: true,
      descrizione: 'Il cliente segnala muffa, umidità, macchie, vecchie infiltrazioni, crepe o scrostamenti: nessuna diagnosi, si rimanda al sopralluogo.',
      esempi: ['ho la muffa in casa', 'ho muffa in camera', 'ci sono macchie di umidita sul soffitto', 'ho umidita sulle pareti', 'la parete e umida', 'ho delle macchie di muffa in bagno', 'le pareti hanno la muffa', 'ho un problema di umidita', 'ho un problema di muffa', 'si e formata la muffa', 'muffa agli angoli', 'macchie scure agli angoli', 'ho macchie sul soffitto', 'la pittura si stacca', 'ho delle crepe sul muro', 'il muro e scrostato', 'ho una macchia di infiltrazione', 'ho condensa sulle pareti', 'ho del salnitro sul muro', 'la pittura fa le bolle', 'pareti ingiallite dal fumo', 'ho muffa sul soffitto del bagno'],
      keywords: ['muffa', 'umidita', 'condensa', 'salnitro', 'infiltrazione', 'infiltrazioni', 'crepe', 'scrostato', 'scrostamento'],
      combinazioni: [
        { entity: 'problema', con: ['ho', 'abbiamo', 'c e', 'ci sono', 'ho notato', 'notiamo', 'vedo', 'ho visto', 'mi sono accorto', 'mi sono accorta', 'sono comparse', 'e comparsa', 'sono apparse', 'e apparsa', 'compaiono', 'appaiono', 'mi ritrovo', 'ho trovato', 'si e formata', 'si sono formate', 'viene fuori', 'sta uscendo'], non_con_concepts: [...Object.keys(CRITICI), ...Object.keys(ALTI)], score: 0.85 },
      ],
      required_entities: ['problema', 'nome_cliente', 'indirizzo_lavoro'], optional_entities: ['ambienti', 'tipo_immobile', 'urgenza', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'notify_owner', 'propose_slot', 'create_lead'] },
    { id: 'richiesta_sopralluogo', nome: 'Richiesta sopralluogo', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole fissare un sopralluogo per un lavoro (da cui nasce il preventivo) o chiede disponibilità.',
      esempi: ['mi serve un imbianchino', 'cerco un imbianchino', 'avrei bisogno di un imbianchino', 'mi serve un pittore', 'cerco un pittore edile', 'vorrei un sopralluogo', 'vorrei fissare un sopralluogo', 'potete passare a vedere', 'potete venire a vedere', 'vorrei prenotare un sopralluogo', 'vorrei un appuntamento', 'avete disponibilita', 'avete posto domani', 'quando potete passare', 'quando potete venire', 'posso prenotare un sopralluogo', 'devo far imbiancare casa', 'quando potete iniziare', 'quando potete cominciare', 'vorrei che veniste a vedere'],
      keywords: ['sopralluogo', 'sopraluogo', 'prenotare', 'prenotazione', 'appuntamento', 'disponibilita', 'fissare'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['vorrei', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo far', 'devo dare', 'devo rifare', 'devo imbiancare', 'devo tinteggiare', 'devo pitturare', 'devo verniciare', 'devo sistemare', 'vorrei fare', 'voglio fare', 'vorrei rifare', 'vorrei cambiare', 'vorrei dare', 'cerco', 'volevo fare', 'volevo imbiancare', 'dovrei fare', 'dovrei', 'quando potete', 'quando riuscite', 'potete venire', 'potete passare', 'mi occorre', 'devo', 'voglio', 'vorrei far', 'volevamo', 'vorremmo', 'dovremmo', 'dobbiamo', 'abbiamo bisogno', 'ci serve', 'ci servirebbe'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'domanda_tecnica', 'servizi', 'documenti', 'pagamento', 'orari', 'zona_servita', 'garanzia', 'preparazione', 'domanda_quota', ...Object.keys(PROBLEMI_ORD)], score: 0.8 },
      ],
      required_entities: ['tipo_lavoro', 'nome_cliente', 'indirizzo_lavoro'], optional_entities: ['ambienti', 'tipo_immobile', 'altezza_lavoro', 'giorno', 'fascia_oraria', 'urgenza', 'motivo_lavoro'],
      actions: ['ask_missing_information', 'notify_owner', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_preventivo', nome: 'Richiesta preventivo', categoria: 'LEAD', priorita: 25, safety_level: 'LOW',
      descrizione: 'Il cliente chiede un preventivo o una stima per un lavoro: si raccolgono i dati e si propone il sopralluogo, senza mai anticipare cifre.',
      esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'mi serve un preventivo', 'potete farmi un preventivo', 'preventivo per imbiancare casa', 'preventivo per tinteggiare la facciata', 'vorrei una stima dei costi', 'potete farmi una stima', 'quanto costerebbe imbiancare casa', 'quanto verrebbe imbiancare un appartamento', 'vorrei un preventivo per', 'avrei bisogno di un preventivo', 'mi serve una quotazione', 'mi fate un offerta', 'preventivo per', 'una quotazione per', 'mi mandate un preventivo', 'mi mandi un preventivo', 'mandatemi un preventivo', 'inviatemi un preventivo', 'mi fate avere un preventivo', 'vorrei ricevere un preventivo', 'mi inviate un preventivo'],
      keywords: ['preventivo', 'preventivi', 'stima dei costi', 'quotazione'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['quanto costerebbe', 'quanto verrebbe', 'quanto mi costerebbe', 'quanto mi verrebbe', 'quanto costa imbiancare', 'quanto costa tinteggiare', 'quanto costa rifare', 'quanto costa dipingere', 'quanto costa pitturare', 'quanto costa verniciare', 'quanto viene imbiancare', 'quanto viene tinteggiare', 'quanto viene rifare', 'quanto viene dipingere', 'quanto prendete per imbiancare', 'quanto prendete per tinteggiare', 'a quanto viene imbiancare', 'a quanto viene tinteggiare', 'quanto costa far imbiancare', 'quanto costa far tinteggiare', 'quanto costa rinfrescare', 'quanto mi costa imbiancare', 'quanto mi costa tinteggiare', 'quanto spenderei per', 'quanto costerebbe far'], score: 0.95 },
      ],
      required_entities: ['tipo_lavoro', 'ambienti', 'nome_cliente'], optional_entities: ['tipo_immobile', 'indirizzo_lavoro', 'altezza_lavoro', 'giorno', 'fascia_oraria', 'motivo_lavoro'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa un lavoro, il sopralluogo o la tariffa: la risposta viene solo dai dati dell\'impresa; nessuna stima del bot.',
      esempi: ['quanto costa', 'che prezzo avete', 'quanto viene', 'quanto prendete', 'mi dice il costo', 'avete un listino', 'quali sono le tariffe', 'quanto costa il sopralluogo', 'il sopralluogo e gratuito', 'il preventivo e gratuito', 'il preventivo costa qualcosa', 'prezzi', 'costo', 'costo al metro quadro', 'quanto costa al metro quadro', 'quanto costa un imbianchino', 'quanto vi fate pagare'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'tariffe', 'listino'],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede gli orari di apertura o di lavoro.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'lavorate di sabato', 'lavorate la domenica', 'a che ora iniziate a lavorare', 'in che orari lavorate'],
      keywords: ['orari', 'orario di apertura', 'aperti', 'chiusi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_zona', nome: 'Zone servite', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se l\'impresa lavora in una certa zona o comune.',
      esempi: ['in che zone lavorate', 'lavorate anche nella provincia', 'venite anche nella mia zona', 'dove operate', 'dove lavorate', 'quali zone servite', 'lavorate anche a', 'arrivate fino a', 'coprite la mia zona', 'fate trasferte', 'zona di intervento', 'siete di zona', 'in quali comuni lavorate'],
      keywords: ['zone servite', 'zona servita', 'coprite', 'trasferte', 'in che zone', 'in quali zone', 'dove operate', 'dove lavorate'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Informazioni servizi e garanzia', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quali lavori vengono fatti, se si fa un certo lavoro, se l\'impresa è assicurata o se c\'è garanzia/assistenza sui lavori.',
      esempi: ['che lavori fate', 'di cosa vi occupate', 'fate anche stucco veneziano', 'fate anche cartongesso', 'fate anche le facciate', 'quali servizi offrite', 'verniciate anche le persiane', 'montate la carta da parati', 'avete la garanzia sui lavori', 'siete assicurati', 'lavorate anche per i condomini', 'fate lavori anche per le aziende', 'fate anche ritocchi dopo i lavori', 'se dopo ci sono problemi intervenite'],
      keywords: ['servizi', 'vi occupate', 'che lavori fate', 'quali lavori fate', 'garanzia', 'siete assicurati'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['fate', 'fate anche', 'montate', 'applicate', 'vi occupate di', 'sapete fare', 'riuscite a fare', 'effettuate', 'eseguite', 'realizzate', 'trattate', 'vi occupate anche di', 'lavorate anche', 'fate pure', 'eseguite anche'], non_con_concepts: ['preventivo', 'prezzo', 'domanda_tecnica', 'domanda_quota', 'colori', 'preparazione'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Pagamenti, fattura, detrazioni', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento, rate, fattura, acconto, detrazioni e bonus (nessuna consulenza fiscale).',
      esempi: ['accettate carte', 'si puo pagare a rate', 'fate rateizzazione', 'accettate il bancomat', 'fate fattura', 'si paga con la carta', 'si paga in contanti', 'fate lo sconto in fattura', 'avete il finanziamento', 'c e la detrazione fiscale', 'serve un acconto', 'ci sono bonus per la facciata', 'si puo detrarre'],
      keywords: ['rate', 'rateale', 'finanziamento', 'bancomat', 'fattura', 'acconto', 'detrazione', 'detrazioni', 'bonus', 'ecobonus', 'superbonus', 'contanti', 'bonifico', 'agevolazioni'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_documenti', nome: 'Cosa preparare o inviare', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Cosa serve preparare o mandare (foto, misure) per sopralluogo e preventivo.',
      esempi: ['cosa devo preparare', 'cosa serve per il preventivo', 'cosa serve per il sopralluogo', 'posso mandarvi delle foto', 'vi mando delle foto delle pareti', 'servono le misure', 'devo mandarvi le misure delle stanze', 'posso mandarvi un video', 'cosa devo mandarvi', 'vi mando una foto della stanza', 'serve la planimetria'],
      keywords: ['documenti', 'planimetria', 'le misure'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_preparazione', nome: 'Come si svolgono i lavori', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Mobili, protezione di pavimenti e arredi, pulizia, polvere, odore, permanenza in casa durante i lavori.',
      esempi: ['devo spostare i mobili', 'i mobili li spostate voi', 'proteggete i pavimenti', 'coprite i mobili', 'fate pulizia dopo i lavori', 'si sente odore di vernice', 'posso stare in casa durante i lavori', 'devo uscire di casa', 'devo essere presente', 'con i bambini in casa si puo', 'con il cane in casa si puo fare', 'sporcate molto', 'fate polvere', 'smaltite voi i rifiuti', 'dove metto i mobili'],
      keywords: ['spostare i mobili', 'durante i lavori', 'pulizia finale', 'smaltimento', 'polvere'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_colori_materiali', nome: 'Colori e materiali', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Scelta del colore, campioni, tipi di pittura e finiture (lavabile, traspirante, opaca): conoscenza generale, nessuna promessa sul risultato finale.',
      esempi: ['posso scegliere il colore', 'mi aiutate a scegliere il colore', 'avete i campioni di colore', 'posso vedere i campioni', 'il colore sara uguale al campione', 'che pittura usate', 'che marca di pittura usate', 'usate pitture lavabili', 'usate prodotti ecologici', 'avete pitture traspiranti', 'che pittura va bene per la cucina', 'posso portare io il colore', 'mi consigliate un colore', 'che differenza c e tra opaco e satinato', 'avete pitture atossiche', 'si puo avere lo stesso colore di prima'],
      keywords: ['colore', 'colori', 'campioni', 'tonalita', 'tintometro', 'codice colore', 'pitture lavabili', 'traspirante'],
      required_entities: [], optional_entities: ['tipo_lavoro', 'ambienti'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_lavori_quota', nome: 'Ponteggi e lavori in altezza', categoria: 'INFORMATION', priorita: 30, safety_level: 'MEDIUM',
      descrizione: 'Domande generali su ponteggi, trabattelli, lavori in quota e permessi: solo conoscenza generale, nessun giudizio di sicurezza sul caso specifico.',
      esempi: ['serve il ponteggio', 'serve un ponteggio per la facciata', 'fate lavori in quota', 'fate lavori in altezza', 'montate voi il ponteggio', 'il ponteggio e compreso', 'serve l autorizzazione per il ponteggio', 'serve il permesso per il suolo pubblico', 'chi monta il ponteggio', 'usate il trabattello', 'come lavorate in altezza', 'ho bisogno del ponteggio'],
      keywords: ['lavori in quota', 'lavori in altezza', 'suolo pubblico'],
      required_entities: [], optional_entities: ['altezza_lavoro', 'tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_tecniche', nome: 'Domande generali sui lavori', categoria: 'INFORMATION', priorita: 32, safety_level: 'MEDIUM',
      descrizione: 'Domande generali di conoscenza (differenza tra idropittura e smalto, cos\'è la rasatura, cos\'è lo stucco veneziano): solo conoscenza di settore, mai diagnosi del caso specifico né stime.',
      esempi: ['cos e la rasatura', 'cosa significa tinteggiare', 'che differenza c e tra idropittura e smalto', 'che differenza c e tra imbiancare e tinteggiare', 'cos e lo stucco veneziano', 'come funziona il cartongesso', 'a cosa serve il fissativo', 'cos e il cappotto', 'cos e un antimuffa', 'in cosa consiste il sopralluogo', 'a cosa serve il sopralluogo', 'cos e la pittura traspirante', 'cosa significa pittura lavabile', 'che cos e il marmorino'],
      keywords: ['come funziona', 'cos e', 'cosa significa', 'a cosa serve', 'differenza tra', 'che differenza', 'cosa vuol dire', 'in cosa consiste'],
      combinazioni: [
        { entity: 'tipo_lavoro', con: ['cosa vuol dire', 'cosa vuole dire', 'cosa significa', 'che cosa significa', 'cos e', 'cosa e', 'come funziona', 'come funzionano', 'a cosa serve', 'a cosa servono', 'mi spiegate', 'mi spieghi', 'spiegatemi', 'che differenza', 'in cosa consiste'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['tipo_lavoro'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'sollecito_appuntamento', nome: 'Sollecito o stato dell\'appuntamento', categoria: 'SUPPORT', priorita: 18, safety_level: 'MEDIUM',
      descrizione: 'Il cliente ha già un sopralluogo o un lavoro fissato e chiede quando arriva l\'imbianchino o segnala un ritardo.',
      esempi: ['a che ora arrivate', 'quando arriva il pittore', 'quando arrivate', 'siete in ritardo', 'l imbianchino non e ancora arrivato', 'non e ancora arrivato nessuno', 'state arrivando', 'siete in arrivo', 'il pittore e in ritardo', 'stiamo ancora aspettando', 'a che punto siete', 'non si e visto nessuno', 'dove siete', 'dovevate venire oggi'],
      keywords: ['in ritardo', 'ancora aspettando', 'non e ancora arrivato', 'non si e visto', 'dovevate venire'],
      required_entities: [], optional_entities: ['nome_cliente'], actions: ['notify_owner'] },
    { id: 'cancella_appuntamento', nome: 'Disdetta sopralluogo o lavoro', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole disdire un sopralluogo o un lavoro già fissato.',
      esempi: ['devo disdire', 'vorrei cancellare il sopralluogo', 'non mi serve piu il sopralluogo', 'annullare l appuntamento', 'devo annullare', 'disdire il sopralluogo', 'non serve piu che veniate', 'annullate il lavoro', 'annullate pure il sopralluogo', 'annullate la visita', 'non venite piu', 'non serve piu', 'ho cambiato idea non voglio piu fare i lavori', 'ho trovato un altro imbianchino'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'annullate', 'disdico'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_appuntamento', nome: 'Spostamento sopralluogo o lavoro', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole spostare un sopralluogo o l\'inizio dei lavori già fissati.',
      esempi: ['devo spostare il sopralluogo', 'posso cambiare giorno', 'vorrei rimandare i lavori', 'posso anticipare il sopralluogo', 'posso spostare a un altro giorno', 'devo cambiare orario', 'posticipare il sopralluogo', 'potete passare un altro giorno', 'domani non ci sono', 'possiamo fare un altro giorno', 'posso spostare il sopralluogo', 'posso rimandare il sopralluogo', 'possiamo spostare il sopralluogo', 'possiamo spostare l appuntamento', 'rimandare l inizio dei lavori', 'dobbiamo rimandare i lavori', 'spostare l inizio dei lavori', 'un altro giorno', 'un altro orario', 'in un altro orario', 'dobbiamo spostare l inizio dei lavori'],
      keywords: ['un altro giorno', 'un altro orario', 'spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'spostiamo', 'spostare il sopralluogo', 'spostare l appuntamento', 'spostare i lavori', 'rimandare i lavori', 'rimandare l inizio', 'rimandare il sopralluogo', 'rimandare l appuntamento'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo o problema dopo i lavori', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per un lavoro già eseguito: colore diverso, aloni, pennellate, sporco, danni, muffa tornata, pittura che si stacca dopo il lavoro.',
      esempi: ['sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'il lavoro non e stato fatto bene', 'sono molto arrabbiato', 'ho avuto un brutto servizio', 'non sono contento del lavoro', 'dopo il vostro lavoro la pittura si stacca', 'dopo il vostro lavoro', 'dopo il vostro intervento', 'il colore e diverso da quello scelto', 'ci sono gli aloni dopo la pittura', 'si vedono le pennellate', 'si vedono le riprese', 'la muffa e tornata dopo il vostro lavoro', 'la muffa e tornata', 'avete sporcato il pavimento', 'avete rovinato il parquet', 'avete macchiato i mobili', 'il vostro pittore ha lasciato sporco', 'sono deluso dal lavoro', 'e ricomparsa la muffa dopo i lavori'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'che avete dipinto', 'che avete imbiancato', 'che avete tinteggiato', 'che avete verniciato', 'avete dipinto male', 'avete imbiancato male', 'vergogna', 'pessimo lavoro', 'lavoro fatto male', 'avete rovinato', 'avete sporcato', 'avete macchiato', 'pennellate', 'le riprese'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona.',
      esempi: ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con il titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con il pittore', 'mi passate il titolare', 'preferisco una telefonata'],
      keywords: ['operatore'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene grazie', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'ok grazie a posto cosi', 'a posto cosi', 'va bene cosi grazie', 'tutto chiaro grazie', 'ho capito grazie', 'ok ho capito'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo per le persone -> escalation immediata, messaggio di sicurezza predefinito.
    critical: uniq(Object.values(CRITICI).flat()),
    // HIGH: situazione urgente o pericolosa -> priorità al team.
    high: uniq(Object.values(ALTI).flat()),
    // MEDIUM: problema che merita attenzione ma senza segnali di pericolo.
    medium: uniq([...Object.values(PROBLEMI_ORD).flat(), 'urgente', 'urgenza', 'e urgente', 'urgentissimo', 'urgentissima']),
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare con il pittore', 'parlare con l imbianchino', 'parlare con il responsabile', 'parlare con un umano', 'parlare direttamente', 'parlare di persona', 'parlarne con una persona', 'parlarne con qualcuno', 'sentire una persona', 'sentire il titolare', 'sentire l imbianchino', 'contattare il titolare', 'contattare una persona', 'parlare con una persona vera', 'parlare con chi fa i preventivi',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi il titolare', 'mi passate il titolare', 'mi passi il titolare', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'mi potete chiamare', 'mi potete richiamare', 'mi puoi chiamare', 'potete chiamarmi', 'potete richiamarmi',
      'non sei una persona', 'sei un robot', 'sei un bot', 'operatore', 'persona vera', 'persona reale', 'preferisco una telefonata', 'meglio una telefonata', 'preferisco telefonare',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del team, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a: consiglio tecnico o fai-da-te, diagnosi di muffa/umidità/crepe,
    // domande di salute, rassicurazioni su sicurezza in quota, stime a distanza (superfici, quantità,
    // costi, tempi) o promesse sul risultato.
    diagnosi_patterns: [
      // fai-da-te, metodo, prodotti
      'posso farlo da solo', 'posso farlo da sola', 'posso farlo io', 'lo faccio da solo', 'lo faccio da sola', 'lo faccio io', 'fai da te', 'faidate', 'tutorial', 'guida passo passo', 'istruzioni per', 'spiegami come', 'dimmi come', 'spiegatemi come',
      'come si fa a imbiancare', 'come imbianco', 'un numero a caso', 'numero a caso', 'una cifra a caso', 'dimmi un numero', 'dammi un numero', 'un numero qualsiasi', 'non importa se e giusto', 'sparami una cifra', 'sparami un numero', 'come si imbianca', 'come si tinteggia', 'come tinteggio', 'come si stucca', 'come stucco', 'come si applica', 'come applico', 'come si da la pittura', 'come si dipinge', 'come dipingo',
      'come tolgo la muffa', 'come elimino la muffa', 'come si toglie la muffa', 'come si elimina la muffa', 'come faccio a togliere la muffa', 'come eliminare la muffa', 'come togliere la muffa', 'come rimuovo la muffa', 'come si rimuove la muffa', 'come tolgo la carta da parati', 'come si toglie la carta da parati',
      'rimedi per la muffa', 'rimedio per la muffa', 'rimedi casalinghi', 'rimedio casalingo', 'rimedi fai da te', 'che prodotto devo usare', 'quale prodotto devo usare', 'quale pittura devo usare', 'che pittura devo usare', 'quale pittura uso', 'che pittura uso', 'che prodotto passo', 'quale prodotto passo', 'cosa passo', 'cosa posso usare sulla muffa', 'prodotto per la muffa', 'prodotto contro la muffa', 'farla sparire', 'far sparire la muffa', 'che prodotto uso', 'quale prodotto uso', 'che prodotto compro', 'quale prodotto compro', 'cosa metto sulla muffa', 'cosa passo sulla muffa', 'cosa posso passare', 'candeggina', 'varechina', 'aceto', 'bicarbonato',
      'posso dipingere sopra', 'posso verniciare sopra', 'posso pitturare sopra', 'posso imbiancare sopra', 'posso passare la pittura sopra', 'posso ridipingere sopra', 'posso coprire la muffa', 'posso coprire la macchia', 'coprire la macchia con', 'coprire la muffa', 'basta ridipingere', 'basta ridare una mano', 'basta una mano di bianco', 'basta una mano',
      'posso stuccare io', 'posso stuccare da solo', 'posso chiudere la crepa', 'posso riparare la crepa', 'posso tappare',
      // diagnosi a distanza
      'cosa puo essere', 'che cosa puo essere', 'cosa potrebbe essere', 'che cos e questa', 'che macchia e', 'che muffa e', 'e muffa nera', 'e muffa o', 'un problema di condensa o', 'condensa o di umidita', 'condensa o umidita', 'muffa o condensa', 'umidita o condensa', 'muffa o umidita', 'e umidita o', 'e umidita di risalita', 'umidita di risalita o condensa', 'e condensa o', 'e salnitro',
      'da cosa dipende', 'da cosa e causata', 'da cosa e causato', 'da cosa derivano', 'che causa ha', 'qual e la causa', 'qual e il problema', 'perche viene la muffa', 'perche mi viene la muffa', 'perche si forma la muffa', 'perche compare la muffa', 'perche si formano le macchie', 'perche ho la muffa', 'perche ho l umidita', 'perche si gonfia', 'perche si stacca', 'perche si scrosta',
      'da dove arriva l umidita', 'da dove viene l umidita', 'da dove viene l acqua', 'da dove arriva l acqua', 'e colpa del tetto', 'e colpa del vicino', 'e colpa dell idraulico', 'e colpa del', 'e colpa dell', 'secondo te', 'secondo lei', 'secondo voi', 'dimmi cosa ho', 'dimmi almeno cosa',
      'e una crepa strutturale', 'crepa strutturale o', 'e strutturale', 'e grave la crepa', 'la crepa e grave', 'e normale che', 'e normale',
      // salute
      'la muffa e tossica', 'la muffa fa male', 'muffa fa male', 'muffa e pericolosa', 'muffa e dannosa', 'muffa nociva', 'muffa tossica', 'e pericolosa la muffa', 'fa male la muffa', 'respirare la muffa', 'muffa e allergie', 'muffa e asma', 'e pericoloso per la salute', 'e pericolosa per la salute', 'pericoloso per la salute', 'dannosa per la salute', 'fa male alla salute', 'e pericoloso per i bambini', 'e pericolosa per i bambini',
      // rassicurazioni e sicurezza (anche in quota)
      'e pericoloso', 'e pericolosa', 'e grave', 'devo preoccuparmi', 'mi devo preoccupare', 'posso stare tranquillo', 'c e pericolo', 'e rischioso', 'si puo aspettare', 'posso aspettare', 'puo aspettare', 'posso lasciarla cosi', 'posso lasciare cosi', 'e preoccupante', 'e serio', 'cosa grave', 'cosa seria',
      'cosa faccio nel frattempo', 'cosa devo fare intanto', 'nel frattempo cosa faccio', 'cosa posso fare nel frattempo', 'cosa mi consigli di fare', 'cosa mi consiglia di fare', 'cosa mi consigliate di fare',
      'posso montare', 'montare il trabattello', 'montare la scala', 'trabattello da solo', 'ponteggio da solo', 'da solo sulla scala', 'da solo sul ponteggio', 'posso salire sul trabattello', 'posso salire sul tetto', 'posso salire sulla scala', 'posso salirci', 'posso montare il ponteggio', 'come monto il ponteggio', 'posso montare io il ponteggio', 'posso usare una scala', 'posso lavorare in quota', 'posso salire io', 'e sicuro il ponteggio', 'il ponteggio e sicuro', 'e sicuro salire', 'e sicuro stare', 'e a norma il ponteggio', 'il ponteggio e a norma', 'il ponteggio regge', 'regge il peso', 'il balcone regge', 'posso uscire sul balcone', 'posso stare sul balcone', 'posso passare sotto', 'posso camminare sotto',
      // stime a distanza
      'quanti metri quadri', 'quanti metri quadrati', 'quanti mq', 'calcolami i metri', 'calcola i metri', 'calcolare i metri quadri', 'calcolare la superficie', 'che superficie', 'quanta superficie',
      'quanta pittura devo comprare', 'quanta pittura compro', 'quanta pittura devo prendere', 'quante latte', 'quanti barattoli', 'quanta ne devo comprare', 'quanta pittura serve', 'quanta pittura mi serve', 'quanta vernice serve', 'quanta vernice mi serve', 'quanti litri', 'quanti secchi', 'quante mani', 'quante mani servono',
      'ci mettete', 'ci mettete una settimana', 'in una settimana', 'in un giorno', 'in due giorni', 'in tre giorni', 'ci vuole una settimana', 'ci vorra una settimana', 'basta una settimana', 'bastano due giorni', 'bastano tre giorni', 'quanto ci metti', 'quanto ci mettete', 'quanto tempo ci vuole', 'quanto tempo ci vorra', 'quanto tempo servira', 'quanto tempo serve', 'quanto tempo richiede', 'quanto tempo impiegate', 'in quanto tempo finite', 'in quanti giorni', 'quanti giorni servono', 'quanti giorni ci vogliono', 'quanti giorni di lavoro', 'entro quando finite', 'entro quanto finite', 'finite in un giorno', 'finite in giornata', 'fate in un giorno', 'fate in giornata',
      'dammi una cifra', 'mi dai una cifra', 'mi dite una cifra', 'mi dica una cifra', 'una cifra indicativa', 'una cifra orientativa', 'una cifra approssimativa', 'cifra indicativa', 'cifra orientativa', 'prezzo indicativo', 'prezzo orientativo', 'costo indicativo', 'costo orientativo', 'prezzo approssimativo', 'costo approssimativo', 'stima approssimativa', 'stima a occhio', 'a occhio', 'a spanne', 'indicativamente', 'all incirca',
      'piu o meno quanto', 'per farmi un idea del prezzo', 'per farmi un idea del costo', 'per farmi un idea di quanto', 'ordine di grandezza', 'range di prezzo', 'fascia di prezzo', 'quanto spendero', 'quanto potrei spendere', 'quanto devo mettere in conto',
      // promesse sul risultato
      'mi garantite', 'mi garantisci', 'mi assicurate', 'mi assicuri', 'mi promettete', 'potete garantire', 'potete assicurare', 'potete promettere', 'siete sicuri che', 'sei sicuro che',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'bastano due mani', 'bastano tre mani', 'servono due mani', 'servono tre mani', 'basta una mano', 'basta ridipingere', 'serviranno circa', 'saranno circa', 'finiamo in un giorno', 'finiamo in due giorni', 'finiamo in una settimana', 'e un lavoro semplice', 'e un lavoro facile', 'e un lavoretto',
      'e sicuramente umidita', 'e sicuramente muffa', 'e sicuramente condensa', 'e sicuramente salnitro', 'si tratta sicuramente', 'sara sicuramente', 'e sicuramente colpa', 'e colpa del', 'e colpa dell', 'e sicuramente tossica', 'e sicuramente pericolosa per la salute', 'e umidita di risalita', 'e una crepa strutturale',
      'usi la candeggina', 'usi la varechina', 'passi la candeggina', 'passi l aceto', 'puo farlo da solo', 'puoi farlo da solo', 'puo ripararlo da solo', 'dipinga sopra la muffa', 'ridipinga sopra', 'copra la muffa', 'basta coprire',
      'non e pericoloso', 'non e pericolosa', 'non e grave', 'non e nulla', 'non e niente', 'non si preoccupi', 'non si preoccupare', 'puo aspettare', 'puoi aspettare', 'nessun pericolo', 'nessun rischio', 'senza rischi', 'senza alcun rischio',
      'il ponteggio e sicuro', 'il ponteggio e a norma', 'puo salire', 'puoi salire', 'puo stare sul balcone', 'il balcone regge', 'la scala regge',
      'il colore sara identico', 'il colore sara uguale', 'colore identico al campione', 'identico al campione', 'esattamente come il campione', 'esattamente come sul catalogo', 'i ritocchi non si vedranno', 'non si vedranno i ritocchi', 'la muffa non tornera', 'non tornera piu', 'non ricomparira', 'risolve definitivamente', 'risolveremo definitivamente', 'risultato perfetto', 'durera per anni', 'durera a lungo', 'resistera per anni',
      'e a norma', 'e sicuramente a norma',
    ],
    messaggio_sicurezza: 'Per non darle indicazioni sbagliate, non posso fare diagnosi di muffa, umidità o crepe, consigliare prodotti o lavorazioni, giudicare la sicurezza di ponteggi o lavori in altezza, né stimare superfici, quantità, costi e tempi senza vedere i locali, e non posso promettere risultati o colori identici. Serve un sopralluogo: se vuole, la aiuto subito a richiederlo. Se c\'è un pericolo per le persone chiami il 112.',
    messaggio_emergenza: 'La situazione potrebbe essere pericolosa: si allontani subito dalla zona a rischio (ponteggio, scala, balcone, soffitto, impianto elettrico, vapori o fumo), faccia allontanare anche le altre persone e non cerchi di intervenire da solo. Se qualcuno è ferito o sta male, o in caso di fumo, fiamme o crolli, chiami subito il 112 (vigili del fuoco 115). Segnalo subito la sua richiesta al team come urgente.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    tipo_lavoro: ['Di che lavoro ha bisogno? Per esempio imbiancare, rifare una facciata, una decorazione...', 'Mi racconta cosa vorrebbe fare: che tipo di lavoro le serve?', 'Per quale lavoro vuole il nostro sopralluogo?'],
    problema: ['Mi racconta che problema vede? (per esempio macchie, muffa, umidità, crepe...)', 'Che cosa nota esattamente sul muro o sul soffitto?', 'Può descrivermi brevemente cosa succede?'],
    ambienti: ['Quali ambienti o parti vanno fatti? Per esempio soggiorno, camere, bagno, tutta la casa, la facciata...', 'Mi dice quali stanze o zone riguarda il lavoro?', 'Che ambienti vorrebbe sistemare?'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    indirizzo_lavoro: ['Mi dice via e comune dove si trova l\'immobile?', 'In quale indirizzo o zona dovrebbe venire l\'imbianchino?', 'Dove si trova la casa o il locale (via e comune)?'],
    tipo_immobile: ['Si tratta di un appartamento, una villa, un negozio, un condominio o altro?'],
    altezza_lavoro: ['Il lavoro è in altezza, per esempio piani alti, soffitti molto alti o facciata con ponteggio?'],
    urgenza: ['È una cosa urgente o si può programmare?'],
  },

  common_scenarios: [
    'Richiesta di sopralluogo per imbiancare casa, rinfrescare pareti, tinteggiare scale o negozi: raccolta di lavoro, nome e indirizzo, poi disponibilità',
    'Preventivo per imbiancatura, facciata, decorazione o ristrutturazione: raccolta di lavoro, ambienti e nome; nessuna cifra, superficie o tempo anticipati dal bot',
    'Muffa, umidità, macchie, crepe o vecchie infiltrazioni: nessuna diagnosi né rimedio, raccolta dati e sopralluogo',
    'Lavori in altezza (ponteggi, facciate, soffitti alti, piani alti): informazioni generali e valutazione al sopralluogo, nessun giudizio di sicurezza',
    'Scelta di colori e materiali, campioni, finiture: informazioni generali, nessuna promessa sulla resa del colore o sulla durata',
    'Domande su prezzi, orari, zone, pagamenti, garanzie: solo da dati del tenant',
    'Richieste di stime a distanza (metri quadri, litri di pittura, giorni di lavoro, cifre indicative) o di rimedi fai-da-te: rifiuto gentile e proposta di sopralluogo',
    'Urgenze rare (infiltrazione in corso, caduta di intonaco, rischio di caduta o crollo, ponteggio instabile): priorità al team; ferite, vapori, fumo, crolli, acqua con corrente: 112',
    'Disdette, spostamenti, reclami (colore diverso, aloni, sporco, muffa tornata), solleciti: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque impresa. Nessun
// prezzo, orario, tempo di lavoro, zona, nome, marca o indirizzo: quelli stanno
// solo nei dati del tenant. Mai stime, mai promesse sul risultato.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_tecniche', 'Cos\'è il sopralluogo e perché serve?', ['a cosa serve il sopralluogo', 'in cosa consiste il sopralluogo', 'cosa si fa durante il sopralluogo', 'perche serve il sopralluogo', 'perche devo fare il sopralluogo', 'cosa vedete durante il sopralluogo'],
    'Il sopralluogo è una visita sul posto in cui si vedono ambienti, stato di pareti e soffitti, accessi e altezze: serve a capire cosa va fatto e a preparare un preventivo preciso. Condizioni e modalità dipendono dall\'impresa.'),
  f('info_tecniche', 'Posso avere un preventivo senza sopralluogo?', ['si puo fare il preventivo senza sopralluogo', 'preventivo senza venire a vedere', 'preventivo via whatsapp', 'preventivo solo con le foto', 'preventivo a distanza', 'preventivo con le foto'],
    'Per un preventivo affidabile di norma serve vedere i locali, perché l\'importo dipende da superfici, stato dei muri, altezze e lavorazioni necessarie, che a distanza non si possono stimare. Le foto aiutano a capire la richiesta ma non sostituiscono il sopralluogo; cosa è possibile lo decide l\'impresa.'),
  f('info_documenti', 'Cosa devo preparare per il sopralluogo o il preventivo?', ['cosa devo preparare per il sopralluogo', 'cosa serve per il preventivo', 'cosa vi serve per fare il preventivo', 'cosa devo avere pronto', 'cosa devo fare prima che veniate', 'cosa devo preparare'],
    'Per il sopralluogo è utile che gli ambienti siano accessibili e che si sappia indicare cosa si vuole fare (stanze, pareti, soffitti, eventuali ritocchi o decorazioni). Se ha già delle idee su colori o finiture può dirlo, ma non serve avere tutto deciso.'),
  f('info_documenti', 'Posso mandare foto o un video?', ['posso mandarvi delle foto', 'vi mando delle foto delle pareti', 'posso inviarvi un video', 'servono le foto', 'posso mandare una foto della stanza', 'vi mando le foto del soffitto'],
    'Le foto o un breve video degli ambienti e dei punti da sistemare sono utili per capire la richiesta e preparare il sopralluogo. Non permettono però di stimare costi o tempi: per quello serve vedere i locali.'),
  f('info_tecniche', 'Che differenza c\'è tra imbiancare, tinteggiare e verniciare?', ['differenza tra imbiancare e tinteggiare', 'imbiancatura o tinteggiatura', 'cosa significa tinteggiare', 'cosa vuol dire verniciare', 'imbiancare o verniciare', 'differenza tra tinteggiatura e verniciatura'],
    'Nell\'uso comune imbiancare indica dare il bianco o un colore a pareti e soffitti interni; tinteggiare è l\'applicazione di pitture colorate su pareti e soffitti; verniciare riguarda in genere legno e metallo (porte, infissi, ringhiere) con vernici e smalti. I confini tra i termini sono sfumati: quello che conta è descrivere cosa va fatto.'),
  f('info_tecniche', 'Che differenza c\'è tra idropittura e smalto?', ['differenza tra idropittura e smalto', 'idropittura o smalto', 'cos e l idropittura', 'cos e lo smalto', 'cosa significa smalto', 'smalto o pittura'],
    'L\'idropittura è la pittura a base d\'acqua usata di norma per pareti e soffitti interni; lo smalto è una vernice più resistente e lavabile usata in genere su legno e metallo. Quale prodotto sia adatto al caso specifico dipende dal supporto e si valuta con l\'impresa.'),
  f('info_colori_materiali', 'Cosa significa pittura lavabile o traspirante?', ['cos e la pittura lavabile', 'cos e la pittura traspirante', 'cosa significa lavabile', 'cosa significa traspirante', 'differenza tra lavabile e traspirante', 'pittura lavabile o traspirante'],
    'Una pittura lavabile si può pulire con un panno umido senza rovinarsi troppo; una pittura traspirante lascia passare il vapore acqueo del muro invece di sigillarlo. Esistono prodotti con più caratteristiche insieme: la scelta dipende dall\'ambiente e dal supporto e si definisce con l\'impresa.'),
  f('info_colori_materiali', 'Che finitura scegliere: opaca, satinata o lucida?', ['differenza tra opaco e satinato', 'differenza tra opaco e lucido', 'meglio opaco o satinato', 'finitura opaca o lucida', 'cosa cambia tra opaco e lucido', 'che finitura mi consigliate'],
    'La finitura opaca attenua i riflessi e nasconde meglio le irregolarità del muro; la satinata e la lucida riflettono più luce e si puliscono più facilmente, ma mettono in evidenza i difetti. Il consiglio sul caso specifico si ha dopo aver visto gli ambienti.'),
  f('info_colori_materiali', 'Posso scegliere il colore? Avete campioni?', ['posso scegliere il colore', 'mi aiutate a scegliere il colore', 'avete i campioni di colore', 'posso vedere i campioni', 'come scelgo il colore', 'mi consigliate un colore', 'potete aiutarmi con i colori'],
    'Il colore lo sceglie il cliente, spesso con l\'aiuto dell\'imbianchino, che può mostrare campioni o cartelle colore; per orientarsi si può provare la tinta su una piccola porzione di muro. Cosa mette a disposizione la singola impresa lo dice l\'impresa.'),
  f('info_colori_materiali', 'Il colore sul muro sarà uguale al campione o al catalogo?', ['il colore sara uguale al campione', 'il colore sara identico al catalogo', 'il colore viene come nel campione', 'perche il colore sembra diverso', 'il colore cambia con la luce', 'il colore sul muro e diverso dal campione'],
    'Il colore finito può apparire diverso dal campione o dal catalogo: contano la luce dell\'ambiente, il colore e lo stato del muro sotto, la finitura e il numero di mani. Non si può quindi promettere un colore identico; per questo conviene vedere una prova sul muro prima di decidere.'),
  f('info_colori_materiali', 'Si può rifare lo stesso colore di prima?', ['posso avere lo stesso colore di prima', 'abbinare il colore esistente', 'colore uguale a quello esistente', 'ritoccare con lo stesso colore', 'come ritrovate il colore', 'avete il codice del colore'],
    'Per ritrovare un colore già presente si può partire da un codice o da un campione preso dal muro, ma il risultato può non essere perfettamente identico, soprattutto se la pittura è vecchia o sbiadita. Per questo i ritocchi parziali non sono sempre invisibili: lo valuta l\'impresa sul posto.'),
  f('info_preparazione', 'Devo spostare i mobili?', ['devo spostare i mobili', 'i mobili li spostate voi', 'cosa faccio con i mobili', 'dove metto i mobili', 'devo svuotare la stanza', 'devo togliere i quadri'],
    'Di norma gli ambienti vanno resi accessibili: i mobili si spostano al centro o si liberano le pareti, e arredi e pavimenti vengono protetti con teli. Chi si occupa di cosa lo concorda con l\'impresa, che dà le indicazioni precise prima dei lavori.'),
  f('info_preparazione', 'Si può stare in casa durante i lavori?', ['posso stare in casa durante i lavori', 'si puo restare in casa', 'devo uscire di casa', 'si puo dormire in casa durante i lavori', 'con i bambini in casa si puo', 'con gli animali in casa si puo', 'devo essere presente durante i lavori'],
    'Dipende dal lavoro e dagli ambienti coinvolti. Durante i lavori ci sono polvere, teli e odore di pittura: si ventila bene e, se ci sono neonati, animali o persone sensibili, conviene chiedere all\'impresa come organizzarsi. Per questioni di salute ci si rivolge al medico.'),
  f('info_preparazione', 'Si sente odore di vernice?', ['si sente odore di vernice', 'la pittura puzza', 'che odore ha la pittura', 'odore di pittura nelle stanze', 'quanto resta l odore', 'puzza di vernice'],
    'Un po\' di odore di pittura è normale e si riduce ventilando gli ambienti; i prodotti a base d\'acqua tendono ad avere un odore più leggero di quelli a solvente. Per il caso specifico conviene chiedere all\'impresa quali prodotti usa.'),
  f('info_preparazione', 'Pulite e protegge i pavimenti durante i lavori?', ['proteggete i pavimenti', 'coprite i mobili', 'fate pulizia dopo i lavori', 'pulite alla fine', 'sporcate molto', 'fate polvere', 'smaltite voi i rifiuti'],
    'In genere si proteggono pavimenti e arredi con teli e nastri e si lascia l\'ambiente in ordine a fine lavoro, ma cosa è compreso (pulizia finale, smaltimento dei materiali) lo stabilisce l\'impresa e viene indicato nel preventivo.'),
  f('info_tecniche', 'Cos\'è la rasatura o la stuccatura?', ['cos e la rasatura', 'cosa significa rasare', 'cos e la stuccatura', 'cosa vuol dire stuccare', 'a cosa serve la rasatura', 'a cosa serve la stuccatura', 'differenza tra rasatura e stuccatura'],
    'La stuccatura chiude buchi, fessure e piccole imperfezioni con stucco; la rasatura stende uno strato sottile su tutta la parete per renderla più liscia e uniforme. Quanto serva nel caso concreto dipende dallo stato dei muri e si valuta in sopralluogo.'),
  f('info_tecniche', 'Cos\'è lo stucco veneziano o il marmorino?', ['cos e lo stucco veneziano', 'cos e il marmorino', 'che cos e il marmorino', 'cosa sono le finiture decorative', 'cosa sono le pitture decorative', 'cos e lo spatolato', 'come sono le pitture decorative'],
    'Stucco veneziano, marmorino e altre finiture decorative sono rivestimenti lavorati a mano che danno effetti particolari (lucido, materico, velato). Richiedono un\'applicazione specifica e campioni per scegliere l\'effetto: se ne parla con l\'impresa in sopralluogo.'),
  f('info_tecniche', 'Come funziona il cartongesso?', ['cos e il cartongesso', 'a cosa serve il cartongesso', 'che cos e il controsoffitto in cartongesso', 'cartongesso come si finisce', 'come si imbianca il cartongesso', 'differenza tra cartongesso e muratura'],
    'Il cartongesso è un sistema di lastre fissate su una struttura, usato per pareti, controsoffitti e velette. Dopo la posa i giunti vengono stuccati e la superficie viene poi tinteggiata; le fasi e chi le esegue vanno concordati con l\'impresa.'),
  f('info_tecniche', 'Che cos\'è il cappotto termico o l\'impermeabilizzazione?', ['cos e il cappotto', 'cos e il cappotto termico', 'cos e l impermeabilizzazione', 'a cosa serve l impermeabilizzazione', 'a cosa serve il cappotto', 'differenza tra cappotto e tinteggiatura'],
    'Il cappotto termico è un rivestimento isolante applicato all\'esterno dell\'edificio; l\'impermeabilizzazione protegge superfici come balconi e terrazzi dall\'acqua. Sono lavori che vanno valutati sul posto e a volte richiedono tecnici o imprese specifiche: se ne parla in sopralluogo.'),
  f('info_servizi', 'Cosa fate in caso di muffa o umidità?', ['fate trattamenti antimuffa', 'cosa fate per la muffa', 'come intervenite sulla muffa', 'ripristinate le pareti con la muffa', 'ripristino dopo un infiltrazione', 'cosa fate se c e umidita', 'intervenite sull umidita'],
    'La muffa e le macchie di umidità hanno cause diverse, che non si possono stabilire a distanza: prima di ritinteggiare serve vedere la situazione in sopralluogo e capire se c\'è una causa da risolvere, per esempio con un tecnico. Cosa fa nello specifico la singola impresa lo dice l\'impresa.'),
  f('info_tecniche', 'La muffa fa male alla salute?', ['la muffa e pericolosa', 'la muffa e tossica', 'la muffa fa male', 'e pericolosa la muffa', 'muffa e salute', 'la muffa e dannosa'],
    'Non posso fornire valutazioni sulla salute: per dubbi sugli effetti della muffa conviene rivolgersi al medico. Per la parte di imbianchino si può richiedere un sopralluogo, in cui l\'impresa valuta la situazione del muro.'),
  f('info_tecniche', 'Perché si forma la muffa o l\'umidità sui muri?', ['perche viene la muffa', 'perche si forma la muffa', 'da cosa dipende la muffa', 'perche ho umidita sui muri', 'da dove viene l umidita', 'cosa causa la muffa', 'perche ci sono macchie sul soffitto'],
    'Le cause possono essere diverse (condensa, infiltrazioni, scarsa aerazione, problemi dell\'edificio) e non si possono stabilire senza vedere il muro. Per questo serve un sopralluogo ed eventualmente un tecnico: a distanza non posso dare una diagnosi.'),
  f('info_lavori_quota', 'Serve il ponteggio per i lavori in altezza o sulla facciata?', ['serve il ponteggio', 'serve un ponteggio per la facciata', 'ci vuole il ponteggio', 'fate lavori in quota', 'fate lavori in altezza', 'come lavorate in altezza', 'usate il trabattello', 'ho bisogno del ponteggio', 'serve l impalcatura'],
    'Per facciate, soffitti molto alti o piani alti si usano di norma ponteggi, trabattelli, piattaforme o altri mezzi per lavorare in quota: quale serva dipende dall\'altezza e dalla situazione e lo stabilisce l\'impresa in sopralluogo. Chi lavora in quota segue regole di sicurezza specifiche.'),
  f('info_lavori_quota', 'Servono permessi o autorizzazioni per il ponteggio?', ['serve il permesso per il ponteggio', 'serve l autorizzazione per il ponteggio', 'suolo pubblico ponteggio', 'serve il permesso per il suolo pubblico', 'chi si occupa dei permessi del ponteggio', 'occupazione di suolo pubblico'],
    'Quando il ponteggio occupa suolo pubblico o per lavori su parti comuni possono servire permessi o autorizzazioni, che variano da comune a comune e da caso a caso. Chi se ne occupa e come si procede va chiarito con l\'impresa e, per i condomini, con l\'amministratore.'),
  f('info_servizi', 'Lavorate anche per condomini, negozi e aziende?', ['lavorate per i condomini', 'fate lavori anche per le aziende', 'lavorate anche nei negozi', 'fate scale condominiali', 'fate lavori per gli uffici', 'lavorate per i privati e le aziende', 'lavorate per amministratori'],
    'Molte imprese di imbiancatura lavorano sia per privati sia per condomini, negozi, uffici e aziende; per i condomini di norma ci si coordina con l\'amministratore e, per le parti comuni, serve la decisione dell\'assemblea. Cosa tratta nello specifico l\'impresa lo dice l\'impresa.'),
  f('info_pagamenti', 'Ci sono detrazioni fiscali o bonus per questi lavori?', ['ci sono bonus per la facciata', 'ci sono le detrazioni', 'si puo detrarre', 'bonus facciate', 'bonus ristrutturazione', 'sconto in fattura', 'agevolazioni fiscali', 'il lavoro e detraibile'],
    'Per alcuni lavori possono esistere agevolazioni fiscali, ma le regole cambiano nel tempo e dipendono dal tipo di lavoro e dall\'immobile. Per sapere se si applicano al suo caso conviene rivolgersi a un commercialista o a un CAF, e chiedere all\'impresa quali documenti emette.'),
  f('info_servizi', 'C\'è una garanzia sui lavori?', ['avete la garanzia sui lavori', 'cosa succede se dopo ci sono problemi', 'fate assistenza dopo i lavori', 'ritocchi dopo i lavori', 'garanzia sulla pittura', 'se la pittura si rovina dopo'],
    'Le condizioni di garanzia, di assistenza e di eventuali ritocchi dopo i lavori sono stabilite dalla singola impresa. Il risultato finale, come colore e resa, dipende anche da luce e stato del muro e non si può promettere in anticipo.'),
  f('info_tecniche', 'Quante mani di pittura servono e quanto tempo richiede il lavoro?', ['quante mani di pittura servono', 'quanto tempo ci vuole per imbiancare', 'in quanti giorni finite', 'quanta pittura serve', 'quanti metri quadri sono', 'quanto ci mettete a imbiancare', 'quanto tempo serve per un appartamento'],
    'Numero di mani, quantità di prodotto e durata dei lavori dipendono da superfici, colore, stato dei muri e prodotto scelto, quindi non si possono stimare a distanza. Dopo il sopralluogo l\'impresa può indicarli nel preventivo.'),
];
