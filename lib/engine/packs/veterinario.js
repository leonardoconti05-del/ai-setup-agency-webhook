// lib/engine/packs/veterinario.js
//
// Sector Pack "veterinario" v1 — conoscenza di SETTORE (clinica/ambulatorio
// veterinario in Italia), non di una singola clinica. Prezzi, orari,
// reperibilita', specie trattate, servizi offerti, personale e indirizzo non
// stanno qui: arrivano solo dai dati del tenant. Il cliente e' il PROPRIETARIO
// (identity.entita_nome = nome_proprietario); il paziente e' l'ANIMALE (specie,
// razza, eta, sesso, nome_animale sono entita' distinte).

export const SETTORE = 'veterinario';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack veterinario — proprietario/animale come entita distinte, lessico clinico/prevenzione/prenotazione, 20 intent, regole urgenza LOW-CRITICAL (tossici, trauma, convulsioni, respiro, torsione, emorragia, parto, collasso, ostruzione urinaria, colpo di calore), sicurezza anti-diagnosi/anti-farmaci, lutto/eutanasia verso operatore umano, FAQ di settore generali.';

// ---- Generatori di frasi (restano dati: il motore confronta frasi esatte) ----
const ART = ['', 'il', 'lo', 'la', 'le', 'i', 'gli', 'un', 'una', 'dei', 'delle', 'del', 'della', 'le mie', 'delle mie', 'alcune', 'qualche', 'tutte le', 'una scatola di', 'una confezione di'];
const combina = (verbi, oggetti) => verbi.flatMap((v) => oggetti.flatMap((o) => ART.map((a) => [v, a, o].filter(Boolean).join(' '))));
const VERBI_ING = ['ha mangiato', 'ha ingerito', 'ha ingoiato', 'ha preso', 'ha leccato', 'ha bevuto', 'si e mangiato', 'si e mangiata', 'ha divorato', 'ha rubato', 'e riuscito a mangiare', 'e riuscita a mangiare'];
const FARMACI_UMANI = ['pastiglie', 'pastiglia', 'compresse', 'compressa', 'pillole', 'pillola', 'farmaci', 'farmaco', 'medicine', 'medicina', 'antidepressivi', 'antidolorifici', 'antidolorifico', 'ibuprofene', 'paracetamolo', 'tachipirina', 'aspirina', 'sonniferi', 'tranquillanti', 'ansiolitici', 'cerotto', 'cerotti', 'sigaretta', 'sigarette', 'mozziconi', 'marijuana', 'cannabis', 'hashish', 'droga', 'nicotina'];
const CIBI_RISCHIO = ['cipolla', 'cipolle', 'aglio', 'macadamia', 'avocado', 'alcol', 'birra', 'vino', 'caffe', 'lievito', 'impasto del pane'];
const CORPI_ESTRANEI = ['osso', 'ossa', 'calzino', 'calza', 'filo', 'ago', 'lenza', 'sasso', 'sassi', 'giocattolo', 'pallina', 'elastico', 'nastro', 'tappo', 'plastica', 'sacchetto', 'stuzzicadenti', 'nocciolo', 'pezzo di stoffa', 'pezzo di plastica'];

const nlist = (a) => [...new Set(a)];
const CADUTE = ['caduto', 'caduta', 'cadute', 'precipitato', 'precipitata', 'volato', 'volata', 'saltato', 'saltata'].flatMap((v) => ['dal balcone', 'dalla finestra', 'dal terrazzo', 'dal tetto', 'dal primo piano', 'dal secondo piano', 'dal terzo piano', 'dal quarto piano', 'dal quinto piano', 'da un piano alto', 'da un ponte', 'da un muro alto', 'dalle scale', 'da un albero', 'dall alto'].map((d) => `${v} ${d}`));

// ---- Razze comuni: ogni razza produce due voci (razza + specie) ----
const RAZZE_CANE = { labrador: ['labrador'], golden_retriever: ['golden retriever', 'golden'], pastore_tedesco: ['pastore tedesco'], chihuahua: ['chihuahua', 'chiuaua'], bulldog_francese: ['bulldog francese', 'bouledogue', 'bulldog'], jack_russell: ['jack russell'], husky: ['husky'], maltese: ['maltese'], yorkshire: ['yorkshire', 'yorkie'], beagle: ['beagle'], cocker: ['cocker'], border_collie: ['border collie'], barboncino: ['barboncino', 'poodle'], carlino: ['carlino'], rottweiler: ['rottweiler', 'rottweiller'], dobermann: ['dobermann', 'doberman'], cane_corso: ['cane corso'], pitbull: ['pitbull', 'pit bull'], shih_tzu: ['shih tzu'], meticcio: ['meticcio', 'meticcia', 'bastardino', 'bastardina'] };
const RAZZE_GATTO = { europeo: ['europeo', 'europea', 'gatto comune'], persiano: ['persiano', 'persiana'], siamese: ['siamese'], maine_coon: ['maine coon'], bengala: ['bengala'], ragdoll: ['ragdoll'], certosino: ['certosino'], british_shorthair: ['british shorthair', 'british'], sphynx: ['sphynx'], norvegese: ['norvegese delle foreste'] };
const razze = [
  ...Object.entries(RAZZE_CANE).flatMap(([v, s]) => [
    { canonical: `razza_${v}`, entity: 'razza', value: v, synonyms: s },
    { canonical: `specie_da_razza_${v}`, entity: 'specie', value: 'cane', synonyms: s },
  ]),
  ...Object.entries(RAZZE_GATTO).filter(([v]) => v !== 'europeo').flatMap(([v, s]) => [
    { canonical: `razza_${v}`, entity: 'razza', value: v, synonyms: s },
    { canonical: `specie_da_razza_${v}`, entity: 'specie', value: 'gatto', synonyms: s },
  ]),
  { canonical: 'razza_europeo', entity: 'razza', value: 'europeo', synonyms: ['gatto europeo', 'europeo comune', 'gatta europea'] },
];

const lessicoServizi = [
  { canonical: 'sterilizzazione', entity: 'servizio', value: 'sterilizzazione', synonyms: ['sterilizzazione', 'sterilizzare', 'sterilizzarla', 'sterilizzarlo', 'castrazione', 'castrare', 'castrarlo', 'castrarla', 'ovarioisterectomia', 'ovariectomia', 'togliere le ovaie', 'fargli la castrazione', 'fare la sterilizzazione'], slang: ['sterilizzata', 'sterlizzazione'], errors: ['sterilizzazzione', 'sterilizazione', 'castazione'] },
  { canonical: 'microchip', entity: 'servizio', value: 'microchip', synonyms: ['microchip', 'micro chip', 'chip', 'microchippare', 'inserire il chip', 'mettere il chip', 'anagrafe canina', 'anagrafe animali', 'iscrizione all anagrafe', 'registrare all anagrafe'], errors: ['microcip', 'micrichip', 'mircochip'] },
  { canonical: 'vaccino', entity: 'servizio', value: 'vaccino', synonyms: ['vaccino', 'vaccini', 'vaccinazione', 'vaccinazioni', 'vaccinare', 'vaccinarlo', 'vaccinarla', 'richiamo', 'richiamo vaccinale', 'il richiamo', 'antirabbica', 'antirabbico', 'trivalente', 'tetravalente', 'leucemia felina', 'polivalente', 'ciclo vaccinale'], errors: ['vacino', 'vaccinno', 'vacinazione', 'vaccinazzione'] },
  { canonical: 'antiparassitario', entity: 'servizio', value: 'antiparassitario', synonyms: ['antiparassitario', 'antiparassitari', 'antipulci', 'antipulce', 'antizecche', 'antizecca', 'vermifugo', 'sverminare', 'sverminazione', 'sverminarlo', 'spot on', 'pipetta', 'pipette', 'collare antiparassitario', 'filaria', 'prevenzione filaria', 'leishmania', 'prevenzione leishmania', 'prevenzione parassiti'], errors: ['antiparasitario', 'antiparassitaro', 'vermifuggo'] },
  { canonical: 'certificato_passaporto', entity: 'servizio', value: 'certificato_passaporto', synonyms: ['passaporto', 'passaporto europeo', 'passaporto del cane', 'passaporto per il gatto', 'certificato', 'certificati', 'certificato di buona salute', 'certificato sanitario', 'certificato per viaggiare', 'per viaggiare', 'viaggiare con il cane', 'viaggiare con il gatto', 'libretto sanitario nuovo', 'rinnovo passaporto'], errors: ['pasaporto', 'passaprto', 'certifcato'] },
  { canonical: 'analisi_diagnostica', entity: 'servizio', value: 'analisi_diagnostica', synonyms: ['analisi del sangue', 'analisi sangue', 'analisi', 'esami del sangue', 'esame del sangue', 'esami', 'prelievo', 'emocromo', 'profilo biochimico', 'ecografia', 'ecografie', 'ecografia addominale', 'eco addome', 'ecocardio', 'ecocardiogramma', 'radiografia', 'radiografie', 'lastra', 'lastre', 'rx', 'esame delle feci', 'coprologico', 'esame delle urine', 'test felv fiv', 'felv fiv', 'esame istologico'], errors: ['ecografa', 'radiografa', 'analisii'] },
  { canonical: 'dentale', entity: 'servizio', value: 'dentale', synonyms: ['pulizia dei denti', 'pulizia denti', 'pulizia dentale', 'igiene dentale', 'detartrasi', 'ablazione tartaro', 'ablazione del tartaro', 'tartaro', 'visita dentale', 'denti del cane', 'denti del gatto', 'pulire i denti'] },
  { canonical: 'chirurgia', entity: 'servizio', value: 'chirurgia', synonyms: ['intervento', 'intervento chirurgico', 'operazione', 'operare', 'operarlo', 'operarla', 'chirurgia', 'togliere una cisti', 'asportare', 'asportazione', 'sedazione', 'anestesia'] },
  { canonical: 'prima_visita_animale', entity: 'servizio', value: 'prima_visita', synonyms: ['prima visita', 'primo controllo', 'visita iniziale', 'primo check up', 'ho appena adottato', 'appena adottato', 'appena adottata', 'abbiamo adottato', 'ho adottato', 'appena preso un cucciolo', 'appena preso un gattino', 'ho trovato un gattino', 'ho trovato un cucciolo', 'ho trovato un cane', 'ho trovato un gatto', 'nuovo arrivato', 'e appena arrivato'] },
  { canonical: 'visita_specialistica', entity: 'servizio', value: 'visita_specialistica', synonyms: ['visita specialistica', 'visita dermatologica', 'dermatologo', 'visita cardiologica', 'cardiologo', 'visita oculistica', 'oculista', 'visita ortopedica', 'ortopedico', 'neurologo', 'visita neurologica', 'visita comportamentale', 'comportamentalista', 'educatore cinofilo', 'visita oncologica'] },
  { canonical: 'visita_generale', entity: 'servizio', value: 'visita_generale', synonyms: ['visita', 'visite', 'visita veterinaria', 'visita di controllo', 'controllo', 'controllo annuale', 'controllo generale', 'check up', 'checkup', 'visita generale', 'farlo visitare', 'farla visitare', 'far visitare', 'farlo vedere', 'farla vedere', 'far vedere', 'dare un occhiata', 'controllo punti', 'togliere i punti', 'controllo post operatorio', 'visita post operatoria', 'visitarlo', 'visitarla'], slang: ['controllino'], errors: ['visia', 'controlo'] },
  { canonical: 'urgenza_veterinaria_servizio', entity: 'servizio', value: 'urgenza_veterinaria', synonyms: ['urgenza', 'urgenza veterinaria', 'emergenza veterinaria', 'visita urgente', 'urgentissimo'], intent: 'urgenza_veterinaria' },
];

const lessicoAnimale = [
  // ---- Specie ----
  { canonical: 'cane', entity: 'specie', value: 'cane', synonyms: ['cane', 'cani', 'cagnolino', 'cagnolina', 'cagnetto', 'cagna', 'cagnone', 'cucciolo di cane', 'quattro zampe', 'cagnoli'], slang: ['bau'], errors: ['canne'] },
  { canonical: 'gatto', entity: 'specie', value: 'gatto', synonyms: ['gatto', 'gatta', 'gatti', 'gatte', 'micio', 'micia', 'gattino', 'gattina', 'gattini', 'micetto', 'felino', 'gattone'], errors: ['gato', 'gata'] },
  { canonical: 'coniglio', entity: 'specie', value: 'coniglio', synonyms: ['coniglio', 'coniglia', 'conigli', 'coniglietto', 'coniglietta', 'coniglio nano'], errors: ['conilio'] },
  { canonical: 'cavia', entity: 'specie', value: 'cavia', synonyms: ['cavia', 'cavie', 'porcellino d india', 'porcellino dindia', 'cavia peruviana'] },
  { canonical: 'uccello', entity: 'specie', value: 'uccello', synonyms: ['uccello', 'uccellino', 'uccelli', 'pappagallo', 'pappagallino', 'canarino', 'cocorita', 'cocorite', 'calopsite', 'cacatua', 'inseparabile', 'inseparabili', 'diamantino', 'pappagalli'] },
  { canonical: 'rettile', entity: 'specie', value: 'rettile', synonyms: ['rettile', 'rettili', 'tartaruga', 'tartarughe', 'testuggine', 'geco', 'iguana', 'serpente', 'serpenti', 'pogona', 'drago barbuto', 'camaleonte', 'biscia', 'pitone', 'rana', 'anfibio'] },
  { canonical: 'animale_altro', entity: 'specie', value: 'altro', synonyms: ['criceto', 'furetto', 'cincilla', 'ratto', 'topolino', 'gerbillo', 'degu', 'riccio', 'cavallo', 'cavalli', 'pony', 'asino', 'capra', 'pecora', 'maialino', 'esotico', 'animale esotico', 'animali esotici', 'pet esotico'] },
  ...razze,
  // ---- Eta, sesso ----
  { canonical: 'eta_cucciolo', entity: 'eta_animale', value: 'cucciolo', synonyms: ['cucciolo', 'cucciola', 'cuccioli', 'cucciolotto', 'cucciolone', 'gattino', 'gattina', 'gattini', 'micetto', 'cucciolata', 'e piccolissimo', 'neonato', 'neonata', 'svezzato', 'svezzata'] },
  { canonical: 'eta_adulto', entity: 'eta_animale', value: 'adulto', synonyms: ['adulto', 'adulta', 'e adulto', 'e adulta'] },
  { canonical: 'eta_anziano', entity: 'eta_animale', value: 'anziano', synonyms: ['anziano', 'anziana', 'vecchio', 'vecchia', 'vecchietto', 'vecchietta', 'senior', 'geriatrico', 'nonnino', 'e avanti con gli anni'] },
  { canonical: 'sesso_femmina', entity: 'sesso', value: 'femmina', synonyms: ['femmina', 'cagna', 'gatta', 'micia', 'coniglia', 'femminuccia'] },
  { canonical: 'sesso_maschio', entity: 'sesso', value: 'maschio', synonyms: ['maschio', 'maschietto', 'maschione'] },
  // ---- Prima volta / gia cliente ----
  { canonical: 'cliente_nuovo', entity: 'prima_visita', value: 'si', synonyms: ['e la prima volta', 'prima volta da voi', 'prima volta che vengo', 'prima volta che lo porto', 'prima volta che la porto', 'non siamo mai stati da voi', 'non sono mai stato da voi', 'non sono mai stata da voi', 'non siamo clienti', 'sono nuovo', 'sono nuova', 'siamo nuovi', 'non vi conosco', 'non l ho mai portato da voi', 'non l ho mai portata da voi', 'mai stato da voi', 'mai stata da voi', 'prima volta in clinica', 'prima volta dal veterinario'] },
  { canonical: 'cliente_esistente', entity: 'prima_visita', value: 'no', synonyms: ['siamo gia clienti', 'sono gia cliente', 'siamo vostri clienti', 'sono un vostro cliente', 'sono una vostra cliente', 'e gia stato da voi', 'e gia stata da voi', 'e gia venuto da voi', 'e gia venuta da voi', 'l ho gia portato da voi', 'l ho gia portata da voi', 'siamo gia stati da voi', 'siamo gia venuti', 'sono gia stato da voi', 'sono gia stata da voi', 'e gia in cura da voi', 'e gia seguito da voi', 'e gia seguita da voi', 'e gia vostro paziente', 'e gia vostra paziente', 'avete gia la sua scheda', 'siete il suo veterinario'] },
];

const S = (canonical, value, synonyms, extra = {}) => ({ canonical, entity: 'sintomo', value, synonyms, intent: 'problema_sintomo', ...extra });
const SU = (canonical, value, synonyms, extra = {}) => ({ canonical, entity: 'sintomo', value, synonyms, intent: 'urgenza_veterinaria', ...extra });

const lessicoSintomi = [
  // ---- Emergenze (collegano all'intent urgenza_veterinaria) ----
  SU('avvelenamento', 'avvelenamento', ['avvelenato', 'avvelenata', 'avvelenamento', 'veleno', 'topicida', 'veleno per topi', 'cioccolato', 'cioccolata', 'cioccolatini', 'xilitolo', 'antigelo', 'anticongelante', 'candeggina', 'lumachicida', 'insetticida', 'bocconi avvelenati', 'esche avvelenate', 'sostanza tossica', 'pianta velenosa', 'giglio', 'processionaria', 'uvetta', 'uva passa'], { errors: ['avvelenao', 'toppicida', 'ciocolato', 'cioccolatto'] }),
  SU('convulsioni', 'convulsioni', ['convulsioni', 'convulsione', 'crisi epilettica', 'attacco epilettico', 'crisi convulsiva', 'schiuma dalla bocca', 'schiuma alla bocca', 'sta avendo una crisi'], { negabile: true, errors: ['convulsoni'] }),
  SU('trauma', 'trauma', ['investito', 'investita', 'investimento', 'preso da una macchina', 'preso da una moto', 'travolto', 'caduto dal balcone', 'caduta dal balcone', 'caduto dalla finestra', 'caduta dalla finestra', 'caduto dall alto', 'trauma', 'trauma cranico', 'calpestato', 'sbranato', 'sbranata', 'aggredito da un cane', 'morso di vipera', 'morso di serpente', 'vipera'], { errors: ['investio', 'investto'] }),
  SU('difficolta_respiro', 'difficolta_respiro', ['non respira', 'respira male', 'respira a fatica', 'difficolta a respirare', 'fatica a respirare', 'difficolta respiratorie', 'difficolta respiratoria', 'respiro affannoso', 'affanno', 'boccheggia', 'respira con la bocca aperta', 'si soffoca', 'soffoca', 'si strozza', 'lingua blu', 'gengive bianche', 'gengive pallide', 'gengive blu'], { negabile: true }),
  SU('gonfiore_addominale', 'gonfiore_addominale', ['pancia gonfia', 'pancia dura', 'pancia tesa', 'addome gonfio', 'addome teso', 'addome duro', 'torsione', 'torsione gastrica', 'torsione allo stomaco', 'dilatazione gastrica', 'stomaco gonfio', 'pancia come un tamburo', 'conati a vuoto', 'cerca di vomitare ma non vomita', 'vomito a vuoto'], { negabile: true }),
  SU('emorragia', 'emorragia', ['emorragia', 'perde molto sangue', 'sanguina molto', 'sangue che non si ferma', 'non smette di sanguinare', 'sanguinamento che non si ferma', 'sanguina e non si ferma', 'vomita sangue', 'vomito con sangue', 'sangue dappertutto'], { errors: ['emoragia', 'emorraggia'] }),
  SU('parto_difficile', 'parto_difficile', ['parto difficile', 'non riesce a partorire', 'partorire da ore', 'travaglio da ore', 'cucciolo bloccato', 'gattino bloccato', 'cucciolo incastrato', 'parto bloccato', 'distocia', 'sta partorendo', 'travaglio lungo', 'contrazioni da ore']),
  SU('collasso', 'collasso', ['collasso', 'collassato', 'collassata', 'e svenuto', 'e svenuta', 'svenuto', 'svenuta', 'e crollato', 'e crollata', 'sembra morto', 'sembra morta', 'non risponde', 'non reagisce', 'privo di sensi', 'priva di sensi', 'incosciente', 'ha perso i sensi', 'non si regge in piedi', 'sta morendo', 'agonizza', 'paralizzato', 'paralizzata', 'paralisi', 'non muove le zampe']),
  SU('ostruzione_urinaria', 'ostruzione_urinaria', ['non riesce a fare la pipi', 'non riesce a urinare', 'non urina', 'non fa la pipi da', 'non fa pipi da', 'non ha fatto la pipi da', 'non ha fatto pipi da', 'non ha urinato', 'fa pipi a gocce', 'si sforza a fare la pipi', 'si sforza per fare la pipi', 'sforza nella lettiera', 'va nella lettiera ma non fa niente', 'va in lettiera ma non fa niente', 'va nella lettiera ma non fa nulla', 'va in lettiera e non fa niente', 'blocco urinario', 'ostruzione urinaria', 'piange nella lettiera'], { errors: ['non urna'] }),
  SU('colpo_di_calore', 'colpo_di_calore', ['colpo di calore', 'colpi di calore', 'colpo di sole', 'golpe di calore', 'surriscaldato', 'surriscaldata', 'lasciato in macchina', 'lasciata in macchina', 'chiuso in macchina', 'chiusa in macchina', 'rimasto in macchina', 'rimasta in macchina', 'ipertermia'], { errors: ['colpo di calor'] }),
  SU('occhio_uscito', 'occhio_uscito', ['occhio fuori dall orbita', 'occhio uscito', 'occhio uscito dall orbita', 'proptosi']),
  SU('ingestione_tossica_farmaci', 'avvelenamento', [...combina(VERBI_ING, FARMACI_UMANI), 'gli ho dato per sbaglio', 'le ho dato per sbaglio', 'gli ho dato per errore', 'le ho dato per errore', 'ha preso per sbaglio', 'ha mangiato per sbaglio', 'ha ingerito per sbaglio', 'ha ingerito sostanze', 'ha ingerito una sostanza', 'ha ingerito un prodotto']),

  // ---- Sintomi non emergenziali ----
  S('vomito', 'vomito', ['vomito', 'vomita', 'vomitato', 'vomitando', 'vomitare', 'continua a vomitare', 'ha vomitato', 'rimette', 'ha rimesso', 'conati di vomito', 'rigurgito', 'rigurgita', 'vomitino'], { negabile: true, slang: ['butta fuori tutto'], errors: ['vomto', 'vomitta'] }),
  S('diarrea', 'diarrea', ['diarrea', 'feci molli', 'feci liquide', 'cacca molle', 'cacca liquida', 'ha la scarica', 'scarica', 'dissenteria', 'pupu molle', 'cacca verde', 'feci con muco'], { negabile: true, slang: ['cacarella'], errors: ['diarea', 'diaria', 'diarrrea'] }),
  S('inappetenza', 'inappetenza', ['non mangia', 'non vuole mangiare', 'non ha appetito', 'inappetenza', 'rifiuta il cibo', 'non tocca il cibo', 'non tocca la pappa', 'ha smesso di mangiare', 'non mangia piu', 'non beve', 'non vuole bere', 'non mangia da', 'disinteressato al cibo'], { errors: ['inapetenza'] }),
  S('zoppia', 'zoppia', ['zoppica', 'zoppia', 'zoppo', 'claudica', 'non appoggia la zampa', 'tiene la zampa alzata', 'zampa gonfia', 'zampa rotta', 'si e rotto la zampa', 'zampa spezzata', 'frattura', 'fratturato', 'fratturata', 'cammina male', 'non cammina bene', 'non cammina'], { negabile: true, errors: ['zopica', 'zoppicca'] }),
  S('orecchie', 'orecchie', ['otite', 'otiti', 'orecchio', 'orecchie', 'scuote la testa', 'si gratta le orecchie', 'orecchie sporche', 'cerume', 'orecchio che puzza', 'mal d orecchi', 'testa inclinata'], { errors: ['otitte', 'orechie', 'orechio'] }),
  S('prurito', 'prurito', ['si gratta', 'prurito', 'grattarsi', 'si lecca continuamente', 'si lecca di continuo', 'pelle arrossata', 'arrossamento', 'dermatite', 'croste', 'perde il pelo', 'perdita di pelo', 'caduta del pelo', 'forfora', 'allergia', 'allergie', 'si morde la pelle', 'macchie sulla pelle', 'pelle secca'], { negabile: true, errors: ['pruritto', 'prurto'] }),
  S('parassiti', 'parassiti', ['pulci', 'pulce', 'zecche', 'zecca', 'ha le pulci', 'ha le zecche', 'ha una zecca', 'pieno di pulci', 'vermi', 'ha i vermi', 'lombrichi', 'scabbia', 'rogna', 'acari'], { errors: ['pulcii', 'zeche'] }),
  S('occhi', 'occhi', ['occhio rosso', 'occhi rossi', 'occhio gonfio', 'occhio che lacrima', 'lacrimazione', 'lacrima', 'occhio chiuso', 'secrezioni agli occhi', 'congiuntivite', 'occhio appiccicoso', 'occhio opaco', 'graffio all occhio', 'occhio blu'], { errors: ['ocho'] }),
  S('respiratorio', 'respiratorio', ['tossisce', 'tosse', 'starnuti', 'starnutisce', 'naso che cola', 'raffreddore', 'respiro rumoroso', 'russa molto', 'tosse del canile', 'naso chiuso'], { negabile: true, errors: ['tossice'] }),
  S('ferita', 'ferita', ['ferita', 'ferite', 'ferita aperta', 'ferita profonda', 'morso', 'morsicato', 'morsicata', 'e stato morso', 'e stata morsa', 'graffio', 'taglio', 'ha un taglio', 'unghia rotta', 'unghia strappata', 'sanguina', 'perde sangue', 'puntura di vespa', 'puntura di ape', 'punto da un calabrone', 'punto da una vespa'], { errors: ['feritta'] }),
  S('nodulo', 'nodulo', ['nodulo', 'noduli', 'bozzo', 'bozzetto', 'massa', 'palletta', 'pallina sotto la pelle', 'cisti', 'gonfiore', 'gonfio', 'gonfia', 'rigonfiamento', 'ascesso', 'ascessi', 'pus', 'tumefazione', 'cresta sulla pelle'], { negabile: true, errors: ['nodolo'] }),
  S('urinario', 'urinario', ['fa tanta pipi', 'fa la pipi spesso', 'fa pipi in casa', 'fa la pipi in casa', 'pipi dappertutto', 'beve tanto', 'beve molto', 'cistite', 'sangue nelle urine', 'urine con sangue', 'pipi con sangue', 'pipi rossa', 'pipi scura', 'incontinenza', 'perde pipi', 'problemi urinari'], { errors: ['sistite'] }),
  S('letargia', 'letargia', ['apatico', 'apatica', 'abbattuto', 'abbattuta', 'letargico', 'letargica', 'spento', 'spenta', 'sta sempre a dormire', 'dorme tutto il giorno', 'giu di tono', 'debole', 'fiacco', 'fiacca', 'svogliato', 'svogliata', 'non gioca piu', 'non si muove', 'molto stanco', 'molto stanca'], { errors: ['apatio'] }),
  S('febbre', 'febbre', ['febbre', 'ha la febbre', 'caldo', 'naso caldo', 'temperatura alta', 'trema', 'tremori', 'brividi'], { negabile: true, errors: ['febre'] }),
  S('dolore', 'dolore', ['dolorante', 'dolori', 'dolore', 'guaisce', 'si lamenta', 'miagola dal dolore', 'urla dal dolore', 'urla di dolore', 'soffre', 'sta soffrendo', 'ha male', 'gli fa male', 'le fa male', 'non si fa toccare', 'ringhia se lo tocco'], { negabile: true }),
  S('ingestione', 'ingestione', [...combina(VERBI_ING.slice(0, 5), CIBI_RISCHIO), ...combina(VERBI_ING.slice(0, 5), CORPI_ESTRANEI), 'corpo estraneo', 'ha qualcosa nello stomaco', 'ha ingerito', 'ha ingoiato', 'ha inghiottito'], { errors: ['ingoiatto'] }),
  S('perdita_peso', 'perdita_peso', ['dimagrito', 'dimagrita', 'dimagrisce', 'perde peso', 'e magrissimo', 'e magrissima', 'ingrassato', 'ingrassata', 'sovrappeso', 'obeso', 'obesa'], { errors: ['dimagrto'] }),
  S('comportamento', 'comportamento', ['aggressivo', 'aggressiva', 'ringhia', 'morde', 'cambiato comportamento', 'comportamento strano', 'si comporta in modo strano', 'ansioso', 'ansiosa', 'abbaia tutto il giorno', 'abbaia sempre', 'si nasconde', 'miagola tutta la notte', 'miagola sempre', 'fa i bisogni in casa', 'sporca in casa', 'disorientato', 'disorientata', 'gira in tondo'], { errors: ['agressivo'] }),
  S('sta_male', 'malessere', ['sta male', 'sta molto male', 'sta malissimo', 'non sta bene', 'sta male da', 'e malato', 'e malata', 'ha qualcosa che non va', 'qualcosa non va'], { errors: ['sta mmale'] }),
];

const lessicoConcetti = [
  { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto viene', 'quanto devo pagare', 'tariffa', 'tariffe', 'listino', 'quanto si paga', 'quanto prendete', 'quanto costano'], intent: 'info_prezzi' },
  { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'fino a che ora', 'a che ora aprite', 'a che ora chiudete', 'orari di apertura', 'aprite', 'chiudete'], intent: 'info_orari' },
  { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'parcheggio', 'posizione', 'zona'], intent: 'info_posizione' },
  { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'rateizzazione', 'finanziamento', 'bancomat', 'carta di credito', 'carte', 'contanti', 'fattura', 'pos', 'satispay', 'assicurazione', 'assicurazione animali', 'polizza', 'polizza per animali'], intent: 'info_pagamenti' },
  { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima dei costi', 'stima del costo', 'stima di spesa', 'stima', 'piano di cura', 'piano di trattamento'], intent: 'richiesta_preventivo' },
  { canonical: 'appuntamento', synonyms: ['appuntamento', 'prenotare', 'prenotazione', 'fissare', 'disponibilita', 'posto libero', 'slot', 'prenoto'], intent: 'prenota_visita' },
  { canonical: 'referto', synonyms: ['referto', 'referti', 'risultati', 'risultato degli esami', 'esiti', 'risposta degli esami', 'esiti delle analisi', 'risultati delle analisi', 'cartella clinica', 'copia della cartella', 'sono pronti gli esami', 'sono arrivati gli esami'], intent: 'ritiro_referti' },
  { canonical: 'eutanasia', synonyms: ['eutanasia', 'addormentarlo', 'addormentarla', 'farlo addormentare', 'farla addormentare', 'sopprimere', 'sopprimerlo', 'fine vita', 'cremazione', 'e morto', 'e morta', 'e mancato', 'e mancata', 'e venuto a mancare', 'e deceduto', 'e deceduta', 'abbiamo perso', 'ho perso il mio cane', 'ho perso il mio gatto', 'salutarlo per sempre', 'non soffra piu'], intent: 'lutto_eutanasia' },
];

const lessicoLessico = [...lessicoServizi, ...lessicoAnimale, ...lessicoSintomi, ...lessicoConcetti];

const intentOperativi = [
  { id: 'prenota_visita', nome: 'Prenotazione visita o prestazione', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
    descrizione: 'Il proprietario vuole fissare una visita, un vaccino o un\'altra prestazione per il suo animale.',
    esempi: ['vorrei prenotare', 'vorrei un appuntamento', 'vorrei prendere un appuntamento', 'vorrei fissare un appuntamento', 'avete posto', 'avete un posto', 'avete posto domani', 'c e posto', 'avete disponibilita', 'posso prenotare', 'mi serve una visita', 'vorrei una visita', 'quando siete liberi', 'prenotazione', 'cerco un appuntamento', 'posso passare domani', 'posso venire', 'vorrei portare il mio cane', 'vorrei portare il mio gatto', 'vorrei far vedere il mio', 'vorrei farlo visitare', 'vorrei farla visitare', 'devo portare il mio cane dal veterinario', 'devo portare il gatto dal veterinario'],
    keywords: ['prenotare', 'prenotazione', 'appuntamento', 'disponibilita', 'fissare'],
    combinazioni: [
      { entity: 'servizio', con: ['vorrei', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo fissare', 'vorrei fare', 'voglio fare', 'mi occorre', 'cerco', 'posso venire', 'posso passare', 'vorrei venire', 'volevo fare', 'dovrei', 'dovrei fare', 'quando potete', 'quando riuscite', 'vorremmo', 'dobbiamo fare', 'dobbiamo', 'bisogna fare', 'volevo', 'dovremmo fare', 'mi piacerebbe fare'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'referto'], score: 0.8 },
      { entity: 'specie', con: ['vorrei farlo', 'vorrei farla', 'far vedere', 'farlo vedere', 'farla vedere', 'farlo visitare', 'farla visitare', 'far visitare', 'portarlo', 'portarla', 'portare il mio', 'portare la mia', 'portare il nostro', 'portare la nostra', 'vorrei portare'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'referto'], score: 0.8 },
      { entity: 'prima_visita', con: ['vorrei una visita', 'mi serve una visita', 'vorrei venire', 'visita'], score: 0.8 },
    ],
    required_entities: ['servizio', 'nome_proprietario', 'specie'], optional_entities: ['nome_animale', 'razza', 'eta_animale', 'sesso', 'giorno', 'fascia_oraria', 'prima_visita'],
    actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
  { id: 'richiesta_preventivo', nome: 'Richiesta preventivo', categoria: 'LEAD', priorita: 25, safety_level: 'LOW',
    descrizione: 'Il proprietario chiede un preventivo o una stima per un intervento o un percorso di cura (es. sterilizzazione).',
    esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'preventivo per una sterilizzazione', 'preventivo per la castrazione', 'mi serve un preventivo', 'quanto verrebbe un preventivo', 'una stima dei costi', 'potete farmi una stima', 'stima del costo', 'quanto mi costerebbe in tutto', 'preventivo per l intervento', 'preventivo per le analisi', 'piano di cura con i costi'],
    keywords: ['preventivo', 'preventivi'],
    required_entities: ['servizio', 'nome_proprietario', 'specie'], optional_entities: ['nome_animale', 'razza', 'eta_animale', 'sesso'],
    actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
  { id: 'problema_sintomo', nome: 'Problema o sintomo dell\'animale', categoria: 'SUPPORT', priorita: 15, safety_level: 'MEDIUM', campi_tenant: true,
    descrizione: 'Il proprietario descrive un disturbo o un comportamento anomalo del suo animale (non necessariamente urgente).',
    esempi: ['il mio cane vomita', 'il mio gatto vomita', 'non mangia', 'non vuole mangiare', 'il mio cane zoppica', 'il mio gatto zoppica', 'scuote la testa', 'ha un occhio rosso', 'ha una zecca', 'ha le pulci', 'perde il pelo', 'ha un bozzo', 'e molto apatico', 'ha un problema', 'il mio cane sta male', 'il mio gatto sta male', 'ha una ferita', 'e dimagrito', 'si lecca continuamente'],
    keywords: ['vomita', 'diarrea', 'zoppica', 'si gratta', 'sintomo', 'sintomi'],
    combinazioni: [
      { entity: 'sintomo', con: ['ha', 'sta', 'il mio', 'la mia', 'il nostro', 'la nostra', 'ha notato', 'da ieri', 'da stamattina', 'da due giorni', 'da tre giorni'], con_entities: ['specie'], score: 0.8 },
    ],
    required_entities: ['sintomo', 'nome_proprietario', 'specie'], optional_entities: ['nome_animale', 'razza', 'eta_animale', 'sesso', 'durata_problema', 'giorno', 'fascia_oraria', 'prima_visita'],
    actions: ['ask_missing_information', 'propose_slot', 'notify_owner', 'create_lead'] },
  { id: 'urgenza_veterinaria', nome: 'Urgenza veterinaria', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
    descrizione: 'Situazione potenzialmente grave: avvelenamento/ingestione tossica, trauma, convulsioni, difficolta respiratoria, pancia gonfia, emorragia, parto difficile, collasso, gatto che non urina, colpo di calore.',
    esempi: ['e un emergenza', 'e urgente', 'devo essere visto subito', 'ho un emergenza', 'il mio cane sta morendo', 'il mio gatto sta morendo', 'il mio cane ha mangiato il cioccolato', 'il mio gatto ha mangiato il topicida', 'e stato investito', 'ha le convulsioni', 'non respira', 'ha la pancia gonfia', 'perde molto sangue', 'e svenuto', 'il mio gatto non riesce a fare la pipi', 'ha preso un colpo di calore', 'sta partorendo e c e un cucciolo bloccato', 'ha ingerito del veleno'],
    keywords: ['urgente', 'urgenza', 'emergenza', 'subito'],
    required_entities: ['nome_proprietario'], optional_entities: ['specie', 'sintomo', 'nome_animale', 'durata_problema'],
    actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
  { id: 'ritiro_referti', nome: 'Referti ed esami', categoria: 'SUPPORT', priorita: 18, safety_level: 'LOW',
    descrizione: 'Il proprietario chiede dei risultati di esami/analisi o della cartella clinica del suo animale.',
    esempi: ['sono pronti gli esami', 'sono pronte le analisi', 'sono arrivati i risultati', 'vorrei i risultati delle analisi', 'posso ritirare il referto', 'mi mandate il referto', 'mi servono i risultati dell ecografia', 'vorrei una copia della cartella clinica', 'potete inviarmi gli esiti', 'ci sono i risultati'],
    keywords: ['referto', 'referti', 'risultati', 'esiti', 'cartella clinica'],
    required_entities: ['nome_proprietario'], optional_entities: ['specie', 'nome_animale'],
    actions: ['ask_missing_information', 'notify_owner'] },
];

const I = (id, nome, categoria, priorita, descrizione, esempi, keywords, extra = {}) => ({
  id, nome, categoria, priorita, safety_level: extra.safety_level || 'LOW', descrizione, esempi, keywords,
  required_entities: [], optional_entities: extra.optional_entities || [], actions: extra.actions || ['search_knowledge', 'answer_information'],
  ...(extra.solo_isolato ? { solo_isolato: true } : {}),
  ...(extra.combinazioni ? { combinazioni: extra.combinazioni } : {}),
});

const intentInformativi = [
  I('info_prezzi', 'Informazioni prezzi', 'INFORMATION', 30, 'Il proprietario chiede quanto costa una visita o una prestazione.',
    ['quanto costa', 'che prezzo avete', 'quanto viene', 'quanto devo pagare', 'mi dici il costo', 'avete un listino', 'quali sono i prezzi', 'quanto costa una visita', 'prezzi', 'costo', 'quanto costa il vaccino', 'quanto costano le analisi'],
    ['prezzo', 'prezzi', 'costo', 'costi', 'tariffe', 'listino'], { optional_entities: ['servizio'] }),
  I('info_orari', 'Informazioni orari', 'INFORMATION', 30, 'Orari di apertura della clinica.',
    ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'siete aperti a pranzo', 'siete aperti domenica', 'siete aperti di sera', 'siete aperti il pomeriggio'],
    ['orari', 'orario', 'aperti', 'chiusi'], { optional_entities: ['giorno'] }),
  I('info_emergenze', 'Pronto soccorso e reperibilita', 'INFORMATION', 28, 'Domande su urgenze fuori orario, pronto soccorso, reperibilita, numero per le emergenze (risposta SOLO da dati del tenant).',
    ['avete il pronto soccorso', 'fate pronto soccorso', 'fate urgenze', 'siete reperibili', 'siete reperibili di notte', 'avete un numero per le urgenze', 'c e un veterinario di turno', 'siete aperti di notte', 'siete aperti nei festivi', 'cosa faccio se sta male di notte', 'dove vado se la clinica e chiusa', 'numero per le emergenze', 'avete un servizio di emergenza', 'urgenze fuori orario', 'avete un veterinario di guardia', 'veterinario di guardia', 'fate visite urgenti'],
    ['pronto soccorso', 'reperibilita', 'reperibili', 'di turno', 'di guardia', 'fuori orario', 'di notte'], { safety_level: 'MEDIUM' }),
  I('info_posizione', 'Informazioni posizione', 'INFORMATION', 30, 'Dove si trova la clinica e come raggiungerla.',
    ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova la clinica', 'c e parcheggio', 'come arrivo da voi', 'indirizzo della clinica', 'dov e la clinica', 'dove posso parcheggiare', 'dov e l ambulatorio', 'indirizzo dell ambulatorio'],
    ['indirizzo', 'parcheggio', 'dove siete', 'dove parcheggiare', 'dov e la clinica', 'dov e l ambulatorio']),
  I('info_servizi', 'Servizi e specie trattate', 'DISCOVERY', 30, 'Quali prestazioni vengono offerte e quali animali vengono visitati (risposta SOLO da dati del tenant).',
    ['che servizi offrite', 'di cosa vi occupate', 'quali servizi avete', 'quali prestazioni fate', 'visitate anche i gatti', 'visitate i conigli', 'visitate animali esotici', 'trattate animali esotici', 'vedete anche i rettili', 'fate visite a domicilio', 'fate la visita a domicilio', 'venite a domicilio', 'avete il laboratorio', 'avete il laboratorio interno', 'fate ecografie in sede', 'fate toelettatura', 'avete la degenza', 'fate ricoveri', 'avete la pensione', 'che animali visitate', 'che animali trattate', 'fate chirurgia', 'fate anche i gatti'],
    ['vi occupate', 'servizi offrite', 'servizi avete', 'prestazioni', 'a domicilio', 'animali esotici', 'esotici'], { optional_entities: ['servizio', 'specie'], combinazioni: [
      { entity: 'servizio', con: ['fate', 'fate anche', 'fate il', 'fate la', 'fate le', 'fate i', 'offrite', 'eseguite', 'effettuate', 'praticate', 'vi occupate di', 'si puo fare', 'si fa'], non_con_concepts: ['prezzo', 'preventivo', 'appuntamento'], score: 0.8 },
      { entity: 'specie', con: ['visitate', 'visitate anche', 'trattate', 'trattate anche', 'curate', 'curate anche', 'vedete', 'vedete anche', 'accettate', 'accettate anche', 'seguite', 'seguite anche', 'prendete anche', 'fate anche'], non_con_concepts: ['prezzo', 'preventivo', 'appuntamento'], score: 0.8 },
    ] }),
  I('info_pagamenti', 'Pagamenti e assicurazioni', 'INFORMATION', 30, 'Modalita di pagamento, rate, assicurazioni per animali.',
    ['accettate carte', 'si puo pagare a rate', 'fate rateizzazione', 'accettate il bancomat', 'avete il finanziamento', 'accettate l assicurazione', 'avete convenzioni', 'fate fattura', 'si paga con la carta', 'accettate satispay', 'posso pagare con il pos', 'accettate le polizze per animali'],
    ['rate', 'rateale', 'finanziamento', 'bancomat', 'convenzione', 'convenzioni', 'convenzionati', 'assicurazione', 'polizza', 'satispay', 'contanti', 'fattura']),
  I('info_documenti', 'Cosa portare alla visita', 'INFORMATION', 30, 'Documenti e materiali da portare (libretto, passaporto, esami precedenti, trasportino).',
    ['cosa devo portare', 'che documenti servono', 'devo portare il libretto', 'serve il libretto sanitario', 'devo portare gli esami precedenti', 'devo portare le analisi precedenti', 'serve il passaporto', 'devo portare il trasportino', 'serve il trasportino', 'devo portare un campione', 'cosa serve per la visita', 'devo portare qualcosa', 'cosa serve per la prima visita', 'serve il guinzaglio', 'devo portare il microchip'],
    ['documenti', 'libretto', 'trasportino', 'guinzaglio', 'campione di feci', 'campione di urine']),
  I('info_accesso', 'Accesso e modalita di visita', 'INFORMATION', 29, 'Si puo venire senza appuntamento, sala d\'attesa, accesso con l\'animale (risposta SOLO da dati del tenant).',
    ['si puo venire senza appuntamento', 'serve l appuntamento', 'devo prenotare', 'ricevete senza appuntamento', 'c e la sala d attesa', 'posso entrare con il cane', 'posso entrare con il gatto', 'devo aspettare fuori', 'posso entrare con il trasportino', 'si entra uno alla volta', 'vengo senza prenotare', 'posso accompagnarlo durante la visita'],
    ['senza appuntamento', 'sala d attesa', 'senza prenotare', 'devo aspettare fuori']),
  I('info_trattamenti', 'Domande generali di settore', 'INFORMATION', 32, 'Domande generali su come funziona una prestazione, frequenza di vaccini e antiparassitari, passaporto, microchip (risposta da FAQ di settore).',
    ['ogni quanto si fa il richiamo', 'ogni quanto va fatto il vaccino', 'ogni quanto si vaccina', 'a che eta si vaccina un cucciolo', 'a che eta si sterilizza', 'quando si sterilizza una gatta', 'cosa serve per il passaporto', 'il microchip e obbligatorio', 'fa male il microchip', 'cosa si fa nella prima visita', 'ogni quanto va fatto l antiparassitario', 'ogni quanto si da il vermifugo', 'ogni quanto va fatto il controllo', 'come funziona la sterilizzazione', 'cos e la sterilizzazione', 'quanto dura la sterilizzazione', 'a cosa servono le analisi del sangue', 'come funziona l ecografia', 'serve il digiuno', 'cosa comporta la pulizia dei denti', 'come faccio a viaggiare con il cane', 'cosa serve per viaggiare con il gatto', 'in cosa consiste la visita', 'quanto dura la visita', 'a cosa serve il richiamo'],
    ['ogni quanto', 'a che eta', 'come funziona', 'quanto dura', 'cos e', 'consiste', 'e obbligatorio', 'a cosa serve', 'a cosa servono', 'cosa comporta', 'cosa serve per'], { safety_level: 'MEDIUM', optional_entities: ['servizio'], combinazioni: [
      { entity: 'servizio', con: ['ogni quanto', 'a che eta', 'come funziona', 'quanto dura', 'cos e', 'e obbligatorio', 'a cosa serve', 'in cosa consiste', 'cosa comporta', 'fa male', 'e doloroso', 'e necessario', 'serve davvero'], non_con_concepts: ['prezzo', 'preventivo'], score: 0.8 },
    ] }),
  I('info_personale', 'Informazioni sui veterinari', 'INFORMATION', 33, 'Chi sono i veterinari della clinica (risposta SOLO da dati del tenant).',
    ['chi sono i veterinari', 'chi mi visita', 'ci sono veterinari donne', 'chi e il veterinario', 'quanti veterinari avete', 'avete un veterinario specializzato in gatti', 'chi e il dottore', 'chi sono i dottori', 'avete un dermatologo', 'avete un cardiologo'],
    ['veterinari', 'veterinario', 'dottore', 'dottoressa', 'specializzato']),
];

const intentGestione = [
  I('cancella_appuntamento', 'Annullamento appuntamento', 'CANCELLATION', 10, 'Il proprietario vuole disdire un appuntamento.',
    ['devo disdire', 'vorrei cancellare l appuntamento', 'non posso venire', 'annullare l appuntamento', 'devo annullare', 'disdire la visita', 'non riesco a venire', 'devo cancellare la visita', 'cancellate l appuntamento', 'non possiamo venire', 'cancella l appuntamento', 'cancella gli appuntamenti', 'cancella tutti gli appuntamenti', 'annulla gli appuntamenti', 'annulla tutti gli appuntamenti', 'annulla la prenotazione', 'cancella la prenotazione', 'annulla la visita'],
    ['disdire', 'disdetta', 'annullare', 'cancellare', 'annullate', 'cancellate', 'cancella', 'annulla', 'disdite', 'disdici'], { actions: ['human_handoff'] }),
  I('sposta_appuntamento', 'Spostamento appuntamento', 'RESCHEDULE', 10, 'Il proprietario vuole spostare un appuntamento gia preso.',
    ['devo spostare l appuntamento', 'posso cambiare giorno', 'vorrei rimandare', 'posso anticipare la visita', 'posso spostare a un altro giorno', 'devo cambiare orario', 'posticipare l appuntamento', 'possiamo spostare la visita', 'spostare la visita', 'sposta l appuntamento', 'spostate la visita'],
    ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'spostiamo', 'sposta', 'spostate'], { actions: ['human_handoff'] }),
  I('reclamo', 'Reclamo', 'COMPLAINT', 8, 'Insoddisfazione per il servizio, i tempi o le cure ricevute dall\'animale.',
    ['sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'il trattamento non e andato bene', 'sono molto arrabbiato', 'ho avuto un brutto servizio', 'non sono contento', 'sono arrabbiato per come siamo stati trattati', 'siamo stati trattati male', 'sono deluso dal servizio', 'ho aspettato troppo', 'il mio cane sta peggio dopo la visita', 'non siete stati professionali', 'vorrei contestare il conto', 'vorrei contestare la fattura', 'il conto e troppo alto'],
    ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'trattati male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'contestare'], { safety_level: 'MEDIUM', actions: ['human_handoff'] }),
  I('lutto_eutanasia', 'Lutto o eutanasia', 'HUMAN_HANDOFF', 1, 'Il proprietario comunica la morte dell\'animale o chiede dell\'eutanasia: gestione delicata, sempre una persona.',
    ['il mio cane e morto', 'il mio gatto e morto', 'e morto il mio cane', 'e morto il mio gatto', 'e mancato il mio cane', 'e mancato il mio gatto', 'e morta la mia gatta', 'e morta la mia cagna', 'il mio cane e morto stanotte', 'devo far addormentare il mio cane', 'devo far addormentare il mio gatto', 'devo addormentare il mio cane', 'vorrei sapere dell eutanasia', 'come funziona l eutanasia', 'eutanasia', 'e arrivato il momento di salutarlo', 'e arrivato il momento di salutarla', 'vorrei fare l eutanasia', 'vorrei la cremazione', 'cremazione', 'non vogliamo farlo soffrire ancora', 'abbiamo perso il nostro cane', 'abbiamo perso il nostro gatto', 'non ce l ha fatta', 'non ce l ha fatta stanotte', 'e mancata', 'e mancato', 'e venuta a mancare', 'e venuto a mancare', 'ci ha lasciati', 'ci ha lasciato'],
    ['eutanasia', 'cremazione', 'e morto', 'e morta', 'e mancato', 'e mancata'], { safety_level: 'MEDIUM', actions: ['human_handoff'] }),
  I('parla_con_persona', 'Richiesta di una persona', 'HUMAN_HANDOFF', 1, 'Il proprietario chiede di parlare con una persona.',
    ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con il veterinario', 'vorrei parlare con il dottore', 'chiamatemi', 'richiamatemi', 'posso parlare con la segretaria', 'mi passate il veterinario', 'preferisco parlare con qualcuno'],
    ['operatore', 'segretaria'], { actions: ['human_handoff'] }),
  I('saluto', 'Saluto', 'DISCOVERY', 40, 'Solo un saluto, senza richiesta.',
    ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi', 'salve a tutti'], [], { solo_isolato: true, actions: ['answer_information'] }),
  I('chiusura', 'Ringraziamento o chiusura', 'FOLLOW_UP', 40, 'Il proprietario ringrazia o chiude la conversazione.',
    ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'grazie di tutto', 'ottimo grazie'], [], { solo_isolato: true, actions: ['answer_information'] }),
];

const intentsTutti = [...intentOperativi, ...intentInformativi, ...intentGestione];

// ---- Regole di urgenza ----
// CRITICAL: situazioni in cui il tempo conta (tossici, trauma, convulsioni,
// respiro, torsione, emorragia, parto, collasso, ostruzione urinaria, colpo di
// calore) -> messaggio_emergenza, nessun consiglio, nessun rimedio.
const CRITICAL = nlist([
  // respiro / soffocamento
  'non respira', 'non riesce a respirare', 'respira male', 'respira a fatica', 'respira con fatica', 'respira con difficolta', 'difficolta a respirare', 'fatica a respirare',
  'difficolta respiratorie', 'difficolta respiratoria', 'respiro affannoso', 'respiro difficoltoso', 'respira con la bocca aperta', 'affanno', 'affannato', 'affannata',
  'boccheggia', 'gengive blu', 'gengive bianche', 'gengive pallide', 'lingua blu', 'lingua viola', 'mucose pallide', 'soffoca', 'si soffoca', 'si sta soffocando', 'si strozza', 'ha qualcosa in gola',
  // convulsioni
  'convulsioni', 'convulsione', 'ha le convulsioni', 'crisi convulsiva', 'crisi epilettica', 'attacco epilettico', 'sta avendo una crisi', 'schiuma dalla bocca', 'schiuma alla bocca',
  // collasso / paralisi
  'collasso', 'collassato', 'collassata', 'e svenuto', 'e svenuta', 'svenuto', 'svenuta', 'e crollato', 'e crollata', 'sembra morto', 'sembra morta', 'non risponde', 'non reagisce',
  'privo di sensi', 'priva di sensi', 'incosciente', 'ha perso i sensi', 'perso i sensi', 'non si regge in piedi', 'sta morendo', 'agonizza',
  'paralizzato', 'paralizzata', 'paralisi', 'non muove le zampe', 'non muove le zampe posteriori', 'non sente le zampe',
  // addome / torsione
  'pancia gonfia', 'pancia dura', 'pancia tesa', 'pancia come un tamburo', 'addome gonfio', 'addome teso', 'addome disteso', 'addome duro', 'torsione', 'torsione gastrica', 'torsione allo stomaco',
  'dilatazione gastrica', 'stomaco gonfio', 'stomaco girato', 'conati a vuoto', 'tenta di vomitare ma non vomita', 'cerca di vomitare ma non vomita', 'cerca di vomitare ma non esce niente', 'vomito a vuoto', 'non riesce a vomitare',
  // emorragia
  'emorragia', 'perde molto sangue', 'sanguina molto', 'sangue che non si ferma', 'sanguinamento che non si ferma', 'non smette di sanguinare', 'sanguina e non si ferma', 'sta sanguinando', 'sangue dappertutto', 'vomita sangue', 'vomito con sangue', 'sangue nel vomito',
  // trauma
  'investito', 'investita', 'investimento', 'e stato investito', 'e stata investita', 'preso da una macchina', 'preso da una moto', 'travolto', 'travolta',
  ...CADUTE, 'volato giu',
  'trauma cranico', 'trauma toracico', 'trauma addominale', 'colpo in testa', 'calpestato', 'schiacciato', 'sbranato', 'sbranata', 'morso di vipera', 'morso di serpente', 'morso da una vipera', 'morsicato da una vipera', 'vipera',
  'occhio fuori dall orbita', 'occhio uscito', 'occhio uscito dall orbita', 'proptosi',
  // parto
  'parto difficile', 'non riesce a partorire', 'partorire da ore', 'travaglio da ore', 'travaglio lungo', 'cucciolo bloccato', 'gattino bloccato', 'cucciolo incastrato', 'parto bloccato', 'distocia', 'contrazioni da ore', 'spinge ma non esce',
  // ostruzione urinaria (gatto)
  'non riesce a fare la pipi', 'non riesce a fare pipi', 'non riesce a urinare', 'non urina', 'non fa la pipi da', 'non fa pipi da', 'non ha fatto la pipi da', 'non ha fatto pipi da', 'non ha urinato',
  'fa pipi a gocce', 'si sforza a fare la pipi', 'si sforza per fare la pipi', 'sforza nella lettiera', 'va nella lettiera ma non fa niente', 'va in lettiera ma non fa niente', 'va nella lettiera ma non fa nulla', 'va in lettiera e non fa niente',
  'blocco urinario', 'ostruzione urinaria', 'piange nella lettiera',
  // colpo di calore
  'colpo di calore', 'colpi di calore', 'colpo di sole', 'golpe di calore', 'surriscaldato', 'surriscaldata', 'lasciato in macchina', 'lasciata in macchina', 'chiuso in macchina', 'chiusa in macchina', 'rimasto in macchina', 'rimasta in macchina', 'ipertermia',
  // tossici e ingestioni pericolose
  'avvelenato', 'avvelenata', 'avvelenamento', 'avvelenarsi', 'veleno', 'veleni', 'topicida', 'topicidi', 'veleno per topi', 'veleno per lumache', 'esche avvelenate', 'bocconi avvelenati', 'boccone avvelenato',
  'cioccolato', 'cioccolata', 'cioccolatini', 'cacao', 'xilitolo', 'antigelo', 'anticongelante', 'candeggina', 'ammoniaca', 'lumachicida', 'insetticida', 'diserbante', 'pesticida', 'sostanza tossica', 'pianta velenosa', 'giglio', 'lilium', 'oleandro',
  'processionaria', 'processionarie', 'uvetta', 'uva passa', 'ha mangiato uva', 'ha mangiato l uva', 'ha mangiato dell uva',
  ...combina(VERBI_ING, FARMACI_UMANI),
  'gli ho dato per sbaglio', 'le ho dato per sbaglio', 'gli ho dato per errore', 'le ho dato per errore', 'ha preso per sbaglio', 'ha mangiato per sbaglio', 'ha ingerito per sbaglio', 'ha ingerito sostanze', 'ha ingerito una sostanza', 'ha ingerito un prodotto',
]);

const HIGH = nlist([
  'febbre', 'ha la febbre', 'trauma', 'ha preso una botta', 'botta forte', 'ha battuto la testa', 'e stato morso', 'e stata morsa', 'morso da un cane', 'morso da un altro cane', 'e stato aggredito', 'e stata aggredita',
  'ferita profonda', 'ferita aperta', 'ferita che sanguina', 'taglio profondo', 'si vede l osso', 'frattura', 'fratturato', 'fratturata', 'zampa rotta', 'si e rotto la zampa', 'zampa spezzata', 'unghia strappata', 'unghia rotta e sanguina',
  'sanguina', 'sanguinamento', 'perde sangue', 'sangue nelle feci', 'feci con sangue', 'sangue nelle urine', 'urine con sangue', 'pipi con sangue', 'pipi rossa', 'sangue dal naso', 'sangue dalla bocca', 'diarrea con sangue', 'diarrea sanguinolenta',
  'non mangia da giorni', 'non mangia da due giorni', 'non mangia da tre giorni', 'non mangia da 2 giorni', 'non mangia da 3 giorni', 'non mangia da una settimana', 'non mangia e non beve', 'non beve da', 'non beve piu',
  'vomita da giorni', 'vomita da due giorni', 'vomita da tre giorni', 'vomita da ieri', 'ha vomitato piu volte', 'ha vomitato tre volte', 'vomita continuamente', 'vomita di continuo', 'vomita tutto', 'vomita sempre', 'vomito continuo', 'vomito ripetuto',
  'vomito e diarrea', 'vomita e ha la diarrea', 'vomita e ha anche la diarrea', 'vomitare e ha la diarrea', 'vomitare e ha anche la diarrea', 'vomitare e diarrea', 'continua a vomitare', 'continua a vomitare e', 'diarrea e vomito', 'diarrea e vomita', 'diarrea da giorni',
  'barcolla', 'non si alza', 'non cammina', 'non riesce a camminare', 'non riesce ad alzarsi', 'trema molto', 'trema tanto', 'tremori forti',
  'urla dal dolore', 'urla di dolore', 'si lamenta tantissimo', 'si lamenta continuamente', 'guaisce dal dolore', 'miagola dal dolore', 'soffre molto', 'sta soffrendo',
  'muso gonfio', 'faccia gonfia', 'viso gonfio', 'graffio all occhio', 'ascesso', 'ascessi', 'pus', 'perde pus', 'sta partorendo', 'punto da un calabrone', 'punto da una vespa', 'puntura di vespa', 'puntura di ape',
  'ha ingerito', 'ha ingoiato', 'ha inghiottito', 'corpo estraneo', 'osso incastrato',
  ...combina(VERBI_ING.slice(0, 5), CIBI_RISCHIO), ...combina(VERBI_ING.slice(0, 5), CORPI_ESTRANEI),
  'sta molto male', 'sta malissimo', 'sta male da', 'e urgente', 'urgentissimo', 'urgenza', 'emergenza', 'devo essere visto subito', 'ha bisogno subito',
]);

const MEDIUM = nlist([
  'vomita', 'vomito', 'vomitato', 'ha vomitato', 'rimette', 'diarrea', 'feci molli', 'feci liquide', 'non mangia', 'non vuole mangiare', 'inappetenza', 'zoppica', 'zoppia', 'non appoggia la zampa',
  'otite', 'scuote la testa', 'si gratta', 'prurito', 'perde il pelo', 'occhio rosso', 'occhi rossi', 'occhio gonfio', 'lacrima', 'tossisce', 'tosse', 'starnuti', 'letargico', 'apatico', 'apatica', 'abbattuto', 'abbattuta',
  'ferita', 'morso', 'morsicato', 'nodulo', 'bozzo', 'gonfiore', 'ha un taglio', 'dimagrito', 'dimagrita', 'perde peso', 'beve tanto', 'beve molto', 'fa tanta pipi', 'cistite', 'dolorante', 'guaisce', 'si lamenta',
  'sta male', 'non sta bene', 'ha una zecca', 'ha le zecche', 'ha le pulci', 'pulci', 'zecche', 'ha i vermi', 'vermi', 'cerume', 'cammina male', 'zampa gonfia', 'si lecca continuamente', 'fa pipi in casa',
  'aggressivo', 'aggressiva', 'ansioso', 'ansiosa', 'non gioca piu',
]);

export const pack = {
  identity: {
    nome_ruolo: 'clinica veterinaria',
    entita_nome: 'nome_proprietario',
    descrizione: 'Sei l\'assistente digitale di una clinica o ambulatorio veterinario. Parli con il PROPRIETARIO dell\'animale, con tono professionale, caldo e rassicurante nel modo, mai nel merito. Gestisci richieste di visita, informazioni e urgenze. Non sei un veterinario: non fai diagnosi, non consigli terapie, farmaci o rimedi (nemmeno "casalinghi" o per uso umano), non stimi la gravita.',
  },
  mission: 'Capire cosa serve al proprietario e al suo animale, raccogliere solo le informazioni necessarie (chi e il proprietario, che animale e, che problema c\'e), organizzare la visita e far arrivare subito alla clinica le situazioni urgenti.',
  tone_default: 'professionale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, niente tecnicismi inutili.',
    'Il cliente e il proprietario; il paziente e l\'animale: non confondere il nome del proprietario con quello dell\'animale. Se conosci il nome dell\'animale usalo.',
    'Con chi e in ansia per il proprio animale: prima una frase di vicinanza, poi la domanda.',
    'Una sola domanda per messaggio e mai su un\'informazione gia data.',
    'Mai diagnosi, mai farmaci o dosaggi (veterinari o umani), mai rimedi fai-da-te, mai valutazioni di gravita o prognosi ("non e niente", "passera da solo", "ce la fara").',
    'Se il proprietario descrive un\'emergenza (avvelenamento, trauma, convulsioni, difficolta respiratoria, pancia gonfia, emorragia, parto difficile, collasso, gatto che non urina, colpo di calore) invitalo a contattare subito la clinica o il pronto soccorso veterinario piu vicino; non provocare il vomito e non dare farmaci o rimedi.',
    'Lutto o eutanasia: tono sobrio e delicato, nessuna frase fatta; passa subito a una persona della clinica.',
  ],
  prohibited_claims: [
    'dire al proprietario cosa ha l\'animale o che cosa e un sintomo',
    'consigliare farmaci, antibiotici, antidolorifici, antiparassitari o dosaggi, compresi farmaci per uso umano',
    'consigliare di provocare il vomito o rimedi casalinghi',
    'dire che un sintomo non e grave o che si puo aspettare',
    'fare previsioni sull\'esito o sulla guarigione',
    'indicare prezzi, sconti, orari, reperibilita, specie trattate, servizi o personale non presenti nelle fonti',
  ],
  business_rules: [
    'Annullamenti e spostamenti di appuntamenti esistenti vanno passati alla clinica.',
    'Le urgenze hanno priorita sulla raccolta dati normale.',
    'Lutto, eutanasia e reclami vanno sempre a una persona.',
    'Se non e noto che la clinica tratti una certa specie, non affermarlo: verificare con la clinica.',
  ],

  entities: [
    { id: 'servizio', descrizione: 'Il tipo di visita o prestazione richiesta per l\'animale.', tipo: 'enum', priorita: 10,
      valori: ['prima_visita', 'visita_generale', 'visita_specialistica', 'vaccino', 'microchip', 'sterilizzazione', 'antiparassitario', 'analisi_diagnostica', 'dentale', 'chirurgia', 'certificato_passaporto', 'urgenza_veterinaria', 'altro'],
      domanda_varianti: ['Di che tipo di visita o prestazione ha bisogno il suo animale?', 'Per cosa vorrebbe venire: un controllo, un vaccino o altro?', 'Mi dica pure di cosa avrebbe bisogno.'] },
    { id: 'nome_proprietario', descrizione: 'Nome del proprietario (chi scrive), NON dell\'animale.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama lei, il proprietario?', 'Mi dice il suo nome, cosi preparo la richiesta?', 'A che nome registro la richiesta?'] },
    { id: 'specie', descrizione: 'Che animale e (cane, gatto, coniglio, cavia, uccello, rettile, altro).', tipo: 'enum', priorita: 22, valori: ['cane', 'gatto', 'coniglio', 'cavia', 'uccello', 'rettile', 'altro'],
      domanda_varianti: ['Che animale e: un cane, un gatto o altro?', 'Di che animale si tratta?', 'Mi dice che animale e, cosi lo segno?'] },
    { id: 'sintomo', descrizione: 'Il problema o disturbo che il proprietario descrive.', tipo: 'string', priorita: 15,
      domanda_varianti: ['Mi racconta che problema ha il suo animale?', 'Che cosa ha notato, esattamente?', 'Puo descrivermi brevemente cosa sta succedendo?'] },
    { id: 'nome_animale', descrizione: 'Il nome dell\'animale (distinto dal nome del proprietario).', tipo: 'string', priorita: 30,
      domanda_varianti: ['Come si chiama il suo animale?', 'Mi dice il nome del suo animale?'] },
    { id: 'razza', descrizione: 'La razza o il tipo di animale (es. labrador, europeo, meticcio).', tipo: 'string', priorita: 35 },
    { id: 'eta_animale', descrizione: 'Eta o fase di vita: cucciolo, adulto, anziano (o eta indicata dal proprietario).', tipo: 'string', priorita: 36 },
    { id: 'sesso', descrizione: 'Maschio o femmina.', tipo: 'enum', priorita: 37, valori: ['maschio', 'femmina'] },
    { id: 'durata_problema', descrizione: 'Da quanto tempo c\'e il problema.', tipo: 'string', priorita: 45 },
    { id: 'giorno', descrizione: 'Giorno preferito per la visita.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'prima_visita', descrizione: 'Se e la prima volta che l\'animale viene nella clinica.', tipo: 'enum', priorita: 50, valori: ['si', 'no'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il proprietario lo fornisce (di norma gia noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: lessicoLessico,
  intents: intentsTutti,

  urgency_rules: { critical: CRITICAL, high: HIGH, medium: MEDIUM },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il veterinario', 'parlare con il dottore', 'parlare con la dottoressa', 'parlare con il dottor', 'parlare col veterinario', 'parlare col dottore',
      'parlare con la segretaria', 'parlare con un umano', 'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'mi passate il veterinario', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate',
      'non sei una persona', 'sei un robot', 'sei un bot', 'operatore', 'persona vera', 'persona reale',
      // lutto / eutanasia: sempre una persona
      'eutanasia', 'cremazione', 'farlo addormentare', 'farla addormentare', 'addormentarlo', 'addormentarla', 'far addormentare', 'sopprimere', 'sopprimerlo', 'fine vita',
      'e morto', 'e morta', 'e mancato', 'e mancata', 'e venuto a mancare', 'e venuta a mancare', 'non ce l ha fatta', 'ci ha lasciati', 'e deceduto', 'e deceduta', 'abbiamo perso il nostro', 'ho perso il mio cane', 'ho perso il mio gatto',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona della clinica, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a chiedere diagnosi, terapia, farmaci, rimedi, triage o prognosi.
    diagnosi_patterns: [
      'che cosa ha', 'che cos ha', 'cosa ha il mio', 'cosa ha la mia', 'cosa potrebbe avere', 'cosa puo avere', 'cosa potrebbe essere', 'cosa puo essere', 'che cosa puo essere', 'che cosa potrebbe essere', 'dimmi cosa ha', 'dimmi almeno cosa ha', 'cosa sara',
      'secondo te e', 'secondo lei e', 'secondo voi e', 'e grave', 'e pericoloso', 'e una cosa grave', 'cosa grave', 'cosa seria', 'e serio', 'e preoccupante', 'devo preoccuparmi', 'mi devo preoccupare', 'e normale che', 'e normale se',
      'puo aspettare', 'posso aspettare', 'posso stare tranquillo', 'posso stare tranquilla', 'passera da solo', 'passa da solo', 'passera da sola', 'si risolve da solo', 'e niente', 'e solo un',
      'devo portarlo subito', 'devo portarla subito', 'devo portarlo dal veterinario', 'devo portarla dal veterinario', 'devo andare al pronto soccorso',
      'che farmaco', 'che medicina', 'quale medicina', 'quale farmaco', 'quale antibiotico', 'cosa posso dargli', 'cosa posso dare', 'cosa gli posso dare', 'cosa le posso dare', 'cosa gli do', 'cosa le do',
      'posso dargli', 'posso dargli la', 'posso dare', 'posso somministrare', 'gli posso dare', 'le posso dare', 'quanto ne do', 'quanto gliene do', 'che dose', 'quale dose', 'dosaggio', 'dose giusta', 'quante gocce', 'quante pastiglie', 'quante compresse', 'quanti mg',
      'rimedio', 'rimedi', 'rimedio casalingo', 'rimedi naturali', 'cura fai da te', 'omeopatia', 'antibiotico', 'antibiotici', 'antidolorifico', 'antidolorifici', 'antinfiammatorio', 'antinfiammatori', 'cortisone',
      'ibuprofene', 'paracetamolo', 'tachipirina', 'aspirina', 'moment', 'buscopan', 'imodium', 'nurofen', 'antistaminico', 'diagnosi',
      'come faccio vomitare', 'far vomitare', 'farlo vomitare', 'farla vomitare', 'fargli vomitare', 'provocare il vomito', 'indurre il vomito', 'acqua ossigenata', 'carbone attivo', 'acqua e sale',
      'cosa mi consigli di fare', 'cosa mi consiglia di fare', 'cosa mi consigliate', 'cosa mi consiglia', 'cosa mi consigli', 'che cura devo fare', 'cosa devo fare per il', 'cosa devo fare per la',
      'ce la fara', 'si salvera', 'guarira', 'quante speranze', 'ha speranze', 'e curabile', 'e guaribile', 'e operabile', 'quanto tempo ha', 'quanto tempo gli rimane', 'quanto tempo le rimane', 'quanto tempo gli resta', 'quanto tempo le resta', 'quanto gli resta', 'quanto vivra', 'quanto ancora ha',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'si tratta di', 'e sicuramente', 'sicuramente e', 'probabilmente e', 'probabilmente ha', 'e solo un', 'e solo una', 'e solo uno', 'ha sicuramente',
      'puo dargli', 'puo dare', 'gli dia', 'le dia', 'gli dai', 'dagli', 'dategli', 'dargli', 'somministri', 'somministrare', 'somministragli', 'prenda', 'prenda un antibiotico', 'prendi un antibiotico',
      'faccia vomitare', 'farlo vomitare', 'farla vomitare', 'acqua e sale', 'carbone attivo', 'acqua ossigenata',
      'tachipirina', 'paracetamolo', 'ibuprofene', 'aspirina', 'cortisone',
      'non e grave', 'non e nulla', 'non e niente', 'non si preoccupi', 'puo aspettare', 'puoi aspettare', 'passera da solo', 'ce la fara', 'guarira', 'si salvera',
      'mg', 'milligrammi',
      // reperibilita e orari non verificabili dal motore: mai dichiararli senza fonte
      'h24', 'h 24', '24 ore su 24', 'ventiquattro ore', 'sempre reperibili', 'sempre reperibile', 'sempre aperti', 'sempre aperto', 'sempre aperta', 'sempre attivo', 'sempre attiva', 'sempre disponibili', 'sempre disponibile', 'aperti anche di notte', 'aperto anche di notte', 'aperta anche di notte', 'reperibile anche di notte', 'reperibili anche di notte', 'anche di notte', 'anche la notte', 'tutta la notte', '24 ore', 'siamo reperibili', 'siamo aperti di notte', 'siamo aperti nei festivi', 'aperti nei festivi',
    ],
    messaggio_sicurezza: 'Non posso dare valutazioni né consigli su cure, farmaci o rimedi, nemmeno quelli che si usano in casa: per questo serve il veterinario, che potrà visitare il suo animale. Se vuole la aiuto subito a fissare una visita; se la situazione le sembra urgente, contatti subito la clinica.',
    messaggio_emergenza: 'Capisco, la situazione potrebbe essere urgente. Contatti subito la clinica o il pronto soccorso veterinario più vicino, senza aspettare. Non provochi il vomito e non dia farmaci o rimedi all\'animale. Avviso immediatamente la clinica.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    servizio: ['Di che tipo di visita o prestazione ha bisogno il suo animale?', 'Per cosa vorrebbe venire: un controllo, un vaccino o altro?', 'Mi dica pure di cosa avrebbe bisogno.'],
    nome_proprietario: ['Come si chiama lei, il proprietario?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    specie: ['Che animale è: un cane, un gatto o altro?', 'Di che animale si tratta?', 'Mi dice che animale è, così lo segno?'],
    sintomo: ['Mi racconta che problema ha il suo animale?', 'Che cosa ha notato, esattamente?', 'Può descrivermi brevemente cosa sta succedendo?'],
    nome_animale: ['Come si chiama il suo animale?', 'Mi dice il nome del suo animale?'],
  },

  common_scenarios: [
    'Vaccino, richiamo, microchip, antiparassitari, controllo (prenotazione con servizio e specie noti)',
    'Sintomo dell\'animale con raccolta dati e priorita',
    'Emergenza (tossici, trauma, convulsioni, respiro, torsione, emorragia, parto, collasso, ostruzione urinaria, colpo di calore): invito immediato a contattare la clinica o il pronto soccorso veterinario',
    'Domande su prezzi, orari, reperibilita, specie trattate: solo da dati del tenant',
    'Richieste di diagnosi, farmaci, dosaggi, rimedi, prognosi: risposta di sicurezza e proposta di visita',
    'Lutto o eutanasia, reclami, spostamenti e annullamenti: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: solo principi generali, validi per qualunque clinica. Nessun
// prezzo, orario, reperibilita, specie trattata, nome o indirizzo: quelli
// stanno solo nei dati del tenant. Mai dosaggi, farmaci o stime di gravita.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_trattamenti', 'Ogni quanto si fa il richiamo del vaccino?', ['ogni quanto va fatto il richiamo', 'ogni quanto si fa il vaccino', 'ogni quanto va fatto il vaccino', 'ogni quanto si vaccina il cane', 'ogni quanto si vaccina il gatto', 'ogni quanto va rifatto il vaccino', 'quando si fa il richiamo'],
    'Dopo il ciclo iniziale da cucciolo si fa in genere un richiamo periodico, spesso annuale. Frequenza e tipo di vaccino però dipendono da specie, età, stile di vita e dal protocollo che indica il veterinario.'),
  f('info_trattamenti', 'A che età si vaccina un cucciolo?', ['quando si vaccina un cucciolo', 'a che eta si fa il primo vaccino', 'quando fare il primo vaccino al cucciolo', 'a che eta si vaccina un gattino', 'primo vaccino del cucciolo'],
    'I cuccioli iniziano in genere un ciclo di vaccinazioni nelle prime settimane di vita, con più dosi a distanza di alcune settimane. Il calendario preciso lo stabilisce il veterinario in visita.'),
  f('info_trattamenti', 'Cosa serve per il passaporto europeo dell\'animale?', ['cosa serve per il passaporto', 'come si fa il passaporto per il cane', 'come si fa il passaporto per il gatto', 'cosa serve per fare il passaporto', 'documenti per il passaporto del cane'],
    'In genere servono il microchip e la vaccinazione antirabbica in regola, e il passaporto viene rilasciato da un veterinario abilitato. I requisiti cambiano in base al Paese di destinazione: conviene informarsi con la clinica con un certo anticipo.'),
  f('info_trattamenti', 'Cosa serve per viaggiare con il cane o il gatto?', ['cosa serve per viaggiare con il cane', 'cosa serve per viaggiare con il gatto', 'come faccio a viaggiare con il cane', 'come viaggiare con il mio animale', 'documenti per viaggiare con il cane', 'certificato per viaggiare'],
    'Dipende da destinazione e mezzo di trasporto: di solito servono identificazione con microchip, vaccinazioni in regola e documenti sanitari. Le regole cambiano, quindi è bene chiedere alla clinica e verificare i requisiti del Paese di arrivo e del vettore.'),
  f('info_trattamenti', 'Il microchip è obbligatorio?', ['il microchip e obbligatorio', 'serve il microchip', 'e obbligatorio il microchip per il cane', 'e obbligatorio il microchip per il gatto', 'devo mettere il microchip'],
    'Per i cani il microchip e l\'iscrizione all\'anagrafe sono previsti dalla normativa italiana. Per gatti e altri animali conviene chiedere alla clinica, anche in base ad esempio ai viaggi.'),
  f('info_trattamenti', 'Il microchip fa male?', ['fa male il microchip', 'come si mette il microchip', 'come funziona il microchip', 'come si inserisce il microchip', 'cos e il microchip'],
    'Il microchip è molto piccolo e viene inserito sotto la pelle con una breve iniezione. Il veterinario spiega come procede e registra i dati.'),
  f('info_trattamenti', 'Quando si sterilizza o castra un animale?', ['a che eta si sterilizza', 'a che eta si castra', 'quando si sterilizza una gatta', 'quando si sterilizza una cagna', 'quando si castra un cane', 'quando si castra un gatto', 'a che eta si fa la sterilizzazione'],
    'Il momento più adatto dipende da specie, razza, taglia, sesso e condizioni dell\'animale: lo stabilisce il veterinario durante la visita.'),
  f('info_trattamenti', 'Come funziona la sterilizzazione?', ['cos e la sterilizzazione', 'come funziona la castrazione', 'in cosa consiste la sterilizzazione', 'in cosa consiste la castrazione', 'differenza tra sterilizzazione e castrazione', 'come si fa la sterilizzazione'],
    'Sterilizzazione e castrazione sono interventi chirurgici eseguiti in anestesia generale, con tecniche diverse per femmine e maschi. Il veterinario spiega modalità, preparazione e decorso dopo la visita.'),
  f('info_trattamenti', 'Serve il digiuno prima di un intervento?', ['serve il digiuno', 'devo far digiunare l animale', 'digiuno prima dell intervento', 'cosa devo fare prima dell intervento', 'preparazione all intervento', 'preparazione alla sterilizzazione'],
    'Prima di un intervento o di una sedazione la clinica dà indicazioni precise su digiuno e preparazione: vanno seguite quelle fornite dalla propria clinica.'),
  f('info_trattamenti', 'Ogni quanto si fa l\'antiparassitario?', ['ogni quanto va fatto l antiparassitario', 'ogni quanto si da l antipulci', 'ogni quanto si mette l antipulci', 'ogni quanto si fa l antizecche', 'ogni quanto si da il vermifugo', 'ogni quanto va fatto il vermifugo', 'ogni quanto si vermifuga', 'ogni quanto si sverma'],
    'La frequenza dipende dal prodotto, dall\'età, dallo stile di vita e dal periodo dell\'anno: il veterinario indica prodotto e cadenza adatti. I prodotti sono specifici per specie e peso, per questo non vanno scambiati tra animali diversi.'),
  f('info_trattamenti', 'Cosa si fa nella prima visita?', ['cosa succede alla prima visita', 'come funziona la prima visita', 'in cosa consiste la prima visita', 'cosa comprende la prima visita', 'come si svolge la prima visita'],
    'In genere il veterinario raccoglie alcune informazioni sull\'animale (età, alimentazione, abitudini, eventuali problemi), fa un controllo generale e imposta con il proprietario vaccini, prevenzione e un piano di controlli.'),
  f('info_documenti', 'Cosa devo portare alla visita?', ['cosa devo portare alla prima visita', 'cosa serve portare dal veterinario', 'cosa devo portare dal veterinario', 'che documenti servono per la visita', 'cosa porto alla visita'],
    'È utile portare il libretto sanitario o il passaporto, il documento del proprietario, eventuali esami o referti precedenti e l\'elenco di farmaci o integratori che l\'animale assume. Per gatti e animali piccoli serve un trasportino, per i cani il guinzaglio. Per indicazioni specifiche verifichi con la clinica.'),
  f('info_trattamenti', 'Ogni quanto è bene fare un controllo?', ['ogni quanto va fatto il controllo', 'ogni quanto si porta il cane dal veterinario', 'ogni quanto si porta il gatto dal veterinario', 'ogni quanto va fatta la visita di controllo', 'quante volte l anno si porta dal veterinario'],
    'Per un animale adulto e in salute si consiglia in genere un controllo periodico, spesso annuale; cuccioli e animali anziani hanno bisogno di controlli più ravvicinati. Il veterinario indica la frequenza giusta per ciascun animale.'),
  f('info_trattamenti', 'A cosa servono le analisi del sangue?', ['a cosa servono le analisi', 'perche si fanno le analisi del sangue', 'cosa controllano le analisi del sangue', 'servono le analisi del sangue', 'come funzionano le analisi del sangue'],
    'Le analisi del sangue aiutano il veterinario a valutare lo stato di salute generale e il funzionamento degli organi. Quali esami fare lo decide il veterinario in base all\'animale.'),
  f('info_trattamenti', 'Come funziona l\'ecografia?', ['cos e l ecografia', 'a cosa serve l ecografia', 'in cosa consiste l ecografia', 'l ecografia fa male', 'come si fa l ecografia'],
    'L\'ecografia è un esame non invasivo che permette di osservare gli organi interni. In alcuni casi serve rasare una piccola zona di pelo; il veterinario indica quando è utile.'),
  f('info_trattamenti', 'Come funziona la pulizia dei denti negli animali?', ['come si fa la pulizia dei denti al cane', 'come si fa la pulizia dei denti al gatto', 'cosa comporta la pulizia dei denti', 'la pulizia dei denti si fa con l anestesia', 'cos e la detartrasi', 'cosa si fa nella pulizia dei denti'],
    'La pulizia dei denti professionale rimuove placca e tartaro e in genere richiede una sedazione o un\'anestesia, per poter lavorare in sicurezza. Il veterinario valuta in visita se è indicata.'),
  f('info_trattamenti', 'Posso portare un animale in gravidanza dal veterinario?', ['la mia cagna e incinta', 'la mia gatta e incinta', 'visita in gravidanza', 'gravidanza del cane', 'gravidanza della gatta', 'cosa fare in gravidanza'],
    'Durante la gravidanza è importante una visita veterinaria per seguirne l\'andamento e organizzarsi per il parto. Per i dettagli conviene prenotare una visita con la clinica.'),
  f('info_trattamenti', 'Il vaccino è necessario per un gatto che vive in casa?', ['serve il vaccino al gatto di casa', 'il gatto che non esce deve vaccinarsi', 'vaccino gatto da appartamento', 'il cane che non esce deve vaccinarsi'],
    'La scelta dei vaccini dipende da specie, età, stile di vita e rischi per quell\'animale, anche se vive in casa. Il veterinario valuta caso per caso.'),
  f('info_trattamenti', 'Quanto dura una visita veterinaria?', ['quanto dura la visita', 'quanto tempo ci vuole per la visita', 'quanto dura la visita dal veterinario', 'quanto dura un controllo'],
    'La durata varia in base al motivo della visita e alle esigenze dell\'animale: per un\'indicazione precisa conviene chiedere alla clinica al momento della prenotazione.'),
  f('info_trattamenti', 'Come porto il gatto dal veterinario?', ['come porto il gatto in clinica', 'come trasportare il gatto', 'trasportino per il gatto', 'come porto il coniglio dal veterinario', 'come trasportare un animale piccolo'],
    'Gatti e animali di piccola taglia vanno portati in un trasportino rigido e ben chiuso, meglio se abituati in anticipo. I cani vanno condotti al guinzaglio.'),
  f('info_emergenze', 'Cosa faccio se l\'animale sta male fuori orario?', ['cosa faccio se sta male di notte', 'cosa faccio se la clinica e chiusa', 'dove vado se sta male e siete chiusi', 'cosa fare in caso di emergenza', 'cosa faccio se e una emergenza', 'cosa fare se e un emergenza fuori orario'],
    'In caso di emergenza è importante contattare subito la clinica o rivolgersi al pronto soccorso veterinario più vicino, senza aspettare. Non provochi il vomito e non dia farmaci o rimedi all\'animale senza indicazione del veterinario.'),
];
