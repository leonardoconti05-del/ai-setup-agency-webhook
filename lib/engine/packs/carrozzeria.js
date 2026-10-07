// lib/engine/packs/carrozzeria.js
//
// Sector Pack "carrozzeria" v1 — conoscenza di SETTORE (carrozzeria, riparazioni
// di carrozzeria per auto in Italia), non di una singola carrozzeria. Prezzi,
// orari, servizi offerti, marchi trattati, ricambi usati, convenzioni con le
// compagnie, garanzie, auto di cortesia, tempi, personale e indirizzo non stanno
// qui: arrivano solo dai dati del tenant. Il motore è identico agli altri
// settori: questo file è solo dati (lessico, intent, entità, regole di urgenza
// e sicurezza, FAQ generali).
//
// Scelte di dominio (da far rivedere a un professionista del settore):
//  - il bot NON stima mai danni, costi o tempi: il preventivo si fa solo dopo la
//    visione del veicolo; "quanto costa riparare X" è trattata come richiesta di
//    stima (risposta di sicurezza), mentre i prezzi del listino dichiarati dal
//    tenant restano una informazione che il tenant può dare;
//  - sinistri e assicurazioni: nessun consiglio legale o assicurativo, nessuna
//    promessa di copertura/rimborso/esito di perizia; CID e perizia solo come
//    informazioni generali; chi racconta un incidente o una pratica in corso viene
//    passato a una persona;
//  - veicolo non marciante o dopo un incidente -> persona; feriti, fumo, fiamme,
//    carburante -> messaggio di emergenza (112) senza chiamate al modello;
//  - auto di cortesia: solo se dichiarata nei dati del tenant.

export const SETTORE = 'carrozzeria';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack carrozzeria — lessico di carrozzeria (ammaccature, graffi, verniciatura, ritocchi, lucidatura, grandine, paraurti, specchietti, fari, cristalli, ruggine, cerchi, raddrizzatura, restauro, wrapping, parti, origine del danno, marche/modelli/anni/alimentazione), 27 intent, 16 entità, urgenze LOW-CRITICAL (feriti, fumo/fiamme, carburante, batteria alta tensione, incidente, veicolo non marciante, parti pericolanti), sicurezza anti-stima di danni/costi/tempi, anti consigli assicurativi e legali, anti fai-da-te, 30 FAQ di settore.';

// ---------------------------------------------------------------------------
// Dati ripetitivi del lessico (marche, modelli, anni) generati da tabelle.
// ---------------------------------------------------------------------------
const MARCHE = [
  ['fiat', ['fiat']],
  ['lancia', ['lancia']],
  ['alfa_romeo', ['alfa romeo', 'alfa', 'alfaromeo']],
  ['ford', ['ford']],
  ['volkswagen', ['volkswagen', 'vw', 'wolksvagen', 'volskwagen', 'wolkswagen']],
  ['audi', ['audi']],
  ['bmw', ['bmw', 'bmv']],
  ['mercedes', ['mercedes', 'mercedez', 'merceds', 'mercedes benz']],
  ['opel', ['opel']],
  ['peugeot', ['peugeot', 'pegeot', 'peugeout', 'peugot']],
  ['citroen', ['citroen']],
  ['renault', ['renault']],
  ['dacia', ['dacia']],
  ['toyota', ['toyota']],
  ['nissan', ['nissan']],
  ['honda', ['honda']],
  ['mazda', ['mazda']],
  ['hyundai', ['hyundai', 'hiunday']],
  ['kia', ['kia']],
  ['suzuki', ['suzuki']],
  ['skoda', ['skoda']],
  ['seat', ['seat']],
  ['cupra', ['cupra']],
  ['volvo', ['volvo']],
  ['jeep', ['jeep']],
  ['mini', ['mini cooper', 'mini countryman', 'la mia mini']],
  ['smart', ['smart fortwo', 'smart forfour', 'la mia smart']],
  ['tesla', ['tesla']],
  ['land_rover', ['land rover', 'range rover']],
  ['mitsubishi', ['mitsubishi']],
  ['porsche', ['porsche']],
  ['maserati', ['maserati']],
  ['lexus', ['lexus']],
  ['subaru', ['subaru']],
  ['chevrolet', ['chevrolet']],
];

// Modelli frequenti sul parco circolante italiano. Le forme ambigue con
// parole comuni ("punto", "tipo", "corsa", "polo") richiedono la marca.
// [valore, forme, marca implicita]
const MODELLI = [
  ['panda', ['panda'], 'fiat'],
  ['500', ['fiat 500', 'cinquecento', '500x', '500l', 'la mia 500', 'mia 500'], 'fiat'],
  ['punto', ['fiat punto', 'grande punto'], 'fiat'],
  ['tipo', ['fiat tipo'], 'fiat'],
  ['ypsilon', ['ypsilon'], 'lancia'],
  ['doblo', ['doblo'], 'fiat'],
  ['ducato', ['ducato'], 'fiat'],
  ['fiorino', ['fiorino'], 'fiat'],
  ['golf', ['golf'], 'volkswagen'],
  ['polo', ['vw polo', 'volkswagen polo'], 'volkswagen'],
  ['tiguan', ['tiguan'], 'volkswagen'],
  ['clio', ['clio'], 'renault'],
  ['captur', ['captur'], 'renault'],
  ['megane', ['megane'], 'renault'],
  ['twingo', ['twingo'], 'renault'],
  ['sandero', ['sandero'], 'dacia'],
  ['duster', ['duster'], 'dacia'],
  ['yaris', ['yaris'], 'toyota'],
  ['qashqai', ['qashqai'], 'nissan'],
  ['juke', ['juke'], 'nissan'],
  ['focus', ['ford focus'], 'ford'],
  ['fiesta', ['fiesta'], 'ford'],
  ['kuga', ['kuga'], 'ford'],
  ['astra', ['astra'], 'opel'],
  ['corsa', ['opel corsa'], 'opel'],
  ['mokka', ['mokka'], 'opel'],
  ['208', ['peugeot 208', 'la mia 208', 'mia 208'], 'peugeot'],
  ['308', ['peugeot 308', 'la mia 308', 'mia 308'], 'peugeot'],
  ['berlingo', ['berlingo'], 'citroen'],
  ['a3', ['audi a3'], 'audi'],
  ['a4', ['audi a4'], 'audi'],
  ['serie_1', ['bmw serie 1', 'serie 1'], 'bmw'],
  ['serie_3', ['bmw serie 3', 'serie 3'], 'bmw'],
  ['giulietta', ['giulietta'], 'alfa_romeo'],
  ['stelvio', ['stelvio'], 'alfa_romeo'],
  ['renegade', ['renegade'], 'jeep'],
  ['compass', ['jeep compass'], 'jeep'],
  ['picanto', ['picanto'], 'kia'],
  ['sportage', ['sportage'], 'kia'],
  ['swift', ['suzuki swift'], 'suzuki'],
  ['vitara', ['vitara'], 'suzuki'],
  ['octavia', ['octavia'], 'skoda'],
  ['ibiza', ['ibiza'], 'seat'],
];

const ANNI = Array.from({ length: 32 }, (_, i) => 1995 + i);

// ---------------------------------------------------------------------------
// Frasi condivise tra lessico (entità), urgenza e intent: un incidente
// raccontato in prima persona e un veicolo che non può circolare.
// ATTENZIONE alle forme con una sola parola: il motore tollera un refuso sulle
// parole lunghe ("sinistro" ~ "sinistra", "scontro" ~ "contro"): per questo
// "sinistro" e "scontro" compaiono SOLO in frasi più lunghe.
// ---------------------------------------------------------------------------
const INCIDENTE_PERSONALE = [
  'ho fatto un incidente', 'ho avuto un incidente', 'ho fatto un sinistro', 'ho avuto un sinistro', 'ho subito un incidente', 'ho subito un sinistro',
  'ho appena fatto un incidente', 'ho appena avuto un incidente', 'ho fatto incidente', 'ho avuto incidente',
  'sono stato coinvolto in un incidente', 'sono stata coinvolta in un incidente', 'coinvolto in un incidente', 'coinvolta in un incidente',
  'e successo un incidente', 'e capitato un incidente', 'abbiamo avuto un incidente', 'abbiamo fatto un incidente',
  'incidente ieri', 'incidente di ieri', 'incidente stamattina', 'incidente di stamattina', 'incidente stanotte', 'incidente di stanotte', 'incidente oggi', 'incidente con un altra', 'incidente con un camion', 'incidente con uno scooter', 'incidente con una moto',
  'tamponato', 'tamponata', 'tamponamento', 'mi hanno tamponato', 'mi hanno tamponata', 'mi ha tamponato', 'mi ha tamponata', 'sono stato tamponato', 'sono stata tamponata', 'ho tamponato', 'tamponamento a catena',
  'mi sono venuti addosso', 'mi e venuto addosso', 'mi e venuta addosso', 'mi e finito addosso', 'mi e finita addosso', 'mi hanno urtato', 'mi hanno urtata', 'mi ha urtato', 'mi ha urtata',
  'mi hanno speronato', 'mi ha speronato', 'speronato', 'speronata', 'mi hanno preso in pieno', 'mi ha preso in pieno', 'scontro frontale',
  'mi ha tagliato la strada', 'mi hanno tagliato la strada', 'non mi ha dato la precedenza', 'non mi hanno dato la precedenza', 'non ha rispettato lo stop', 'non ha rispettato la precedenza', 'ha bruciato lo stop', 'ha bruciato il semaforo', 'ha bruciato il rosso',
  'ho investito', 'ho preso un cinghiale', 'ho preso un capriolo', 'ho preso un cane', 'ho preso un animale', 'ho urtato un animale', 'fauna selvatica', 'cinghiale', 'capriolo', 'cervo', 'daino', 'mi e saltato davanti', 'mi e uscito davanti', 'mi ha attraversato',
  'incidentata', 'incidentato', 'auto incidentata', 'macchina incidentata', 'veicolo incidentato',
  'sono andato a sbattere', 'sono andata a sbattere', 'sono finito contro', 'sono finita contro', 'sono finito fuori strada', 'sono finita fuori strada', 'sono uscito di strada', 'sono uscita di strada', 'sono andato fuori strada', 'sono andata fuori strada', 'ho perso il controllo',
];
// Forme che indicano un sinistro ma NON sono, da sole, un'urgenza.
const INCIDENTE_ENTITA_EXTRA = [
  'incidente stradale', 'sinistro stradale', 'dopo un incidente', 'dopo l incidente', 'dopo lo scontro', 'dopo il tamponamento', 'dopo l urto', 'dopo il sinistro', 'dopo un sinistro',
  'a seguito di un incidente', 'a seguito dell incidente', 'a seguito del sinistro', 'a causa di un incidente', 'a causa dell incidente', 'a causa del sinistro',
  'in seguito a un incidente', 'in seguito all incidente', 'in seguito al sinistro', 'per colpa di un incidente', 'per l incidente di', 'a un incidente',
];

const NON_MARCIANTE_MECCANICA = ['non parte', 'non parte piu', 'non si accende', 'non si avvia', 'non si mette in moto', 'non vuole partire', 'macchina morta', 'auto morta'];
const NON_MARCIANTE_STRADA = [
  'non cammina', 'non si muove', 'non riesco a muoverla', 'non si riesce a muovere', 'non riesco a muovere la macchina', 'non riesco a muovere l auto', 'non puo muoversi', 'non e marciante', 'non marciante', 'non marcia',
  'non e in grado di muoversi', 'non puo circolare', 'non circolabile', 'non e circolabile', 'non riesco a guidarla', 'non riesco a guidare', 'non si guida', 'non e guidabile', 'non guidabile',
  'ruota bloccata', 'ruote bloccate', 'ruota storta', 'ruota piegata', 'ruota anteriore piegata', 'ruota posteriore piegata', 'ruota anteriore storta', 'ruota posteriore storta', 'la ruota e piegata', 'la ruota e storta', 'ruota anteriore e piegata', 'ruota anteriore e storta', 'ruota rotta', 'la ruota e rotta', 'ruota che non gira', 'ruota incastrata', 'si e staccata la ruota', 'ruota staccata', 'sospensione rotta', 'sospensione piegata', 'asse piegato', 'assale piegato',
  'mi serve il carro attrezzi', 'ho bisogno del carro attrezzi', 'serve il carro attrezzi', 'devo chiamare il carro attrezzi', 'devo farla trainare', 'farla trainare', 'trainarla', 'portarla col carro attrezzi', 'portarla con il carro attrezzi', 'e stata trainata', 'trainata', 'carro attrezzi per portarla', 'mi serve il soccorso stradale', 'ho bisogno del soccorso stradale',
  'sono in panne', 'macchina in panne', 'auto in panne', 'sono rimasto a piedi', 'sono rimasta a piedi', 'mi ha lasciato a piedi', 'mi ha lasciata a piedi',
  'e ferma in strada', 'e ferma sul ciglio', 'e ferma in autostrada', 'sono fermo sul ciglio', 'sono ferma sul ciglio', 'sono fermo in strada', 'sono ferma in strada', 'sono bloccato in strada', 'sono bloccata in strada', 'sono fermo in autostrada', 'sono ferma in autostrada', 'sono fermo a bordo strada', 'si e fermata in mezzo alla strada', 'si e fermata in autostrada',
  'macchina allagata', 'auto allagata', 'vettura allagata', 'e finita sott acqua', 'auto e allagata', 'macchina e allagata', 'vettura e allagata', 'e rimasta sott acqua', 'e rimasta nell acqua', 'e finita nell acqua', 'e finita in acqua',
];

const SINTESI_FERITI = [
  // Nessuna forma "nuda" ("feriti", "persone ferite", "e ferito"): il motore ignora una negazione solo nelle 2 parole
  // precedenti, quindi "non ci sono feriti" / "per fortuna nessuno e ferito" scatterebbero per errore.
  'ci sono feriti', 'ci sono dei feriti', 'ci sono feriti gravi', 'c e un ferito', 'ci sono persone ferite', 'ci sono due persone ferite', 'c e una persona ferita', 'c e una persona ferita', 'abbiamo feriti', 'abbiamo dei feriti', 'abbiamo un ferito', 'abbiamo due feriti', 'ho dei feriti', 'ho feriti', 'con dei feriti', 'con feriti', 'feriti nell incidente', 'feriti nello scontro', 'feriti nel tamponamento', 'sono ferito', 'sono ferita', 'ho un ferito', 'ci sono due feriti', 'ci sono tre feriti', 'ferito grave', 'siamo feriti', 'siamo rimasti feriti', 'e rimasto ferito', 'e rimasta ferita', 'sono rimasto ferito', 'sono rimasta ferita', 'il mio compagno e ferito', 'la mia compagna e ferita', 'il mio amico e ferito', 'mio padre e ferito', 'mia madre e ferita', 'mio fratello e ferito', 'mia sorella e ferita', 'la mia ragazza e ferita', 'il mio ragazzo e ferito',
  'mio figlio e ferito', 'mia moglie e ferita', 'mio marito e ferito', 'il passeggero e ferito', 'la passeggera e ferita', 'il conducente e ferito', 'la conducente e ferita', 'ha battuto la testa', 'ho battuto la testa', 'perde sangue', 'sanguina', 'sta sanguinando', 'sanguino',
  'e svenuto', 'e svenuta', 'sono svenuto', 'sono svenuta', 'non respira', 'non respira piu', 'sono incastrato', 'sono incastrata', 'siamo incastrati', 'incastrato nell auto', 'incastrata nell auto', 'incastrato dentro', 'incastrata dentro', 'incastrato nell abitacolo', 'incastrata nell abitacolo', 'intrappolato', 'intrappolata', 'bloccato nell abitacolo', 'bloccata nell abitacolo', 'non riesce a uscire dall auto', 'non riesco a uscire dall auto',
  'ho investito un pedone', 'ho investito una persona', 'ho investito un ciclista', 'ho investito un motociclista', 'ho investito un bambino', 'investito un pedone', 'investito un ciclista', 'investito una persona', 'mi ha investito', 'sono stato investito', 'sono stata investita',
  'serve un ambulanza', 'serve l ambulanza', 'chiamare l ambulanza', 'chiamo l ambulanza', 'ho chiamato l ambulanza', 'hanno chiamato l ambulanza', 'sto male', 'mi fa male il collo', 'mi fa male la schiena', 'mi fa male la testa dopo',
];

export const pack = {
  identity: {
    settore: 'carrozzeria',
    nome_ruolo: 'carrozzeria',
    entita_nome: 'nome_cliente',
    descrizione: "Sei l'assistente digitale di una carrozzeria italiana. Accogli i clienti con tono cortese, concreto e diretto; gestisci richieste di visione del veicolo, preventivi, informazioni sui lavori e segnalazioni di danni. Non sei un carrozziere né un perito né un consulente assicurativo o legale: non stimi danni, costi o tempi di riparazione a distanza, non dici se un'auto si può guidare, non dai consigli su assicurazione, responsabilità, rimborsi o denunce, non prometti coperture. Il preventivo si fa solo dopo che la carrozzeria ha visto il veicolo.",
  },
  mission: "Capire che danno o che lavoro riguarda l'auto, raccogliere solo le informazioni necessarie (nome, tipo di danno o di lavoro, marca e modello), organizzare la visione del veicolo e far arrivare subito alla carrozzeria le situazioni di pericolo, gli incidenti, i veicoli che non possono circolare e le pratiche assicurative in corso.",
  tone_default: 'professionale',
  conversation_rules: [
    "Messaggi brevi (2-3 frasi), linguaggio semplice e concreto, senza tecnicismi inutili.",
    "Se il cliente parla di feriti, fumo o fiamme, odore di carburante o di gas, cavi o batteria di un'auto elettrica danneggiati, airbag aperti, auto ribaltata: la prima frase invita a mettersi in sicurezza lontano dal veicolo e dalla carreggiata e, se ci sono persone ferite o un pericolo immediato, a chiamare il 112. Solo dopo si raccolgono i dati per la carrozzeria.",
    "Se il cliente racconta un incidente appena avvenuto, un veicolo che non può muoversi o una pratica assicurativa in corso: non chiedere dettagli sulla dinamica, passa la richiesta a una persona della carrozzeria.",
    "Una sola domanda per messaggio e mai su un'informazione già data (nome, marca, modello, tipo di danno).",
    "Mai stimare a distanza l'entità di un danno, se sia riparabile o da sostituire, quanto costerà o quanto tempo servirà: lo dice solo la carrozzeria dopo aver visto il veicolo. Il preventivo si fa dopo la visione.",
    "Mai dire se l'auto si può guidare, se si può aspettare o se il danno è grave: nel dubbio si invita a non muovere il veicolo e a parlare con la carrozzeria.",
    "Mai consigli legali o assicurativi: non dire di chi è la colpa, se conviene o no aprire un sinistro, se l'assicurazione pagherà o rimborserà, cosa scrivere o se firmare il modulo di constatazione amichevole (CID), se fare denuncia. CID, perizia, franchigia e risarcimento si spiegano solo in termini generali e si rimanda alla propria compagnia.",
    "Mai promettere coperture, rimborsi, esiti di perizia, risultati estetici perfetti, colori identici o assenza di differenze.",
    "Mai istruzioni di riparazione o rimedi fai-da-te (levabolli, ventose, dentifricio, bombolette, stucco, pasta abrasiva, smontaggio di parti).",
    "L'auto di cortesia (o sostitutiva) si menziona solo se è dichiarata nei dati della carrozzeria: altrimenti si dice che si verifica con lo staff.",
    "Per lo stato di un'auto già in carrozzeria non inventare nulla: passa la richiesta allo staff.",
  ],
  prohibited_claims: [
    "stimare o anticipare l'entità di un danno, un costo o un tempo di riparazione senza che la carrozzeria abbia visto il veicolo",
    "dire che un danno è solo estetico, che non è grave, che è riparabile oppure che va sostituito",
    "dire che l'auto si può continuare a guidare o che si può aspettare",
    "dare consigli legali o assicurativi: colpa, responsabilità, convenienza di aprire un sinistro, cosa scrivere o firmare nel CID, denunce",
    "promettere che l'assicurazione pagherà, rimborserà o coprirà il danno, o prevedere l'esito di una perizia",
    "dire che l'auto di cortesia o sostitutiva è disponibile, inclusa o gratuita se non è nei dati della carrozzeria",
    "dire che la carrozzeria è convenzionata con una compagnia, tratta una marca, usa certi ricambi o offre una garanzia se non è nei dati della carrozzeria",
    "dare istruzioni di riparazione o rimedi fai-da-te",
    "indicare costi, sconti, tempi di lavorazione o di consegna, orari o disponibilità non presenti nelle fonti",
    "garantire risultati estetici, colori identici all'originale o l'assenza di differenze",
  ],
  business_rules: [
    "Il preventivo si formula solo dopo la visione del veicolo: la richiesta di preventivo porta alla visione, mai a una cifra data dal bot.",
    "Annullamenti e spostamenti di appuntamenti esistenti vanno passati allo staff.",
    "Le richieste sullo stato di un'auto in carrozzeria (\"è pronta?\") vanno passate allo staff: il sistema non conosce lo stato dei lavori.",
    "Incidente raccontato dal cliente, veicolo non marciante o pratica assicurativa in corso (perito, numero di sinistro, compagnia) vanno passati a una persona.",
    "Incidente con feriti o pericolo immediato: invito a chiamare il 112, avviso immediato alla carrozzeria.",
    "Auto di cortesia, convenzioni con le compagnie, ricambi, garanzia sui lavori, anticipi e tempi di consegna sono dati del tenant: se non ci sono si dice che si verifica con lo staff.",
    "Le situazioni di pericolo (feriti, fumo, fiamme, carburante, batteria di un'auto elettrica danneggiata, parti che si staccano) hanno priorità sulla raccolta dati normale.",
  ],

  entities: [
    { id: 'servizio', descrizione: 'Il danno o il lavoro di carrozzeria richiesto (ammaccatura, graffi, verniciatura, paraurti, grandine...).', tipo: 'enum', priorita: 10,
      valori: ['valutazione_danni', 'riparazione_carrozzeria', 'ammaccatura', 'graffi', 'verniciatura', 'ritocco', 'lucidatura', 'grandine', 'paraurti', 'specchietto', 'fanaleria', 'cristalli', 'sostituzione_parti', 'ruggine', 'cerchi', 'raddrizzatura', 'restauro', 'wrapping', 'altro'],
      domanda_varianti: ["Di che danno o lavoro si tratta: un graffio, un'ammaccatura, una verniciatura, altro?", "Mi racconta che danno ha l'auto o che lavoro vorrebbe fare?", "Che tipo di intervento le serve sulla carrozzeria?"] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'] },
    { id: 'parte', descrizione: "Parte dell'auto interessata (paraurti, portiera, cofano, parafango, tetto...).", tipo: 'enum', priorita: 25,
      valori: ['paraurti', 'portiera', 'cofano', 'parafango', 'tetto', 'portellone', 'fiancata', 'specchietto', 'fanale', 'cerchio', 'parabrezza', 'lunotto', 'finestrino'],
      domanda_varianti: ["In che punto dell'auto si trova il danno?", 'Mi dice quale parte dell\'auto è interessata?'] },
    { id: 'origine_danno', descrizione: 'Come si è prodotto il danno (parcheggio, grandine, vandalismo, urto contro un ostacolo, maltempo, usura).', tipo: 'enum', priorita: 28,
      valori: ['parcheggio', 'grandine', 'vandalismo', 'urto', 'maltempo', 'usura'] },
    { id: 'marca', descrizione: "Marca dell'auto.", tipo: 'string', priorita: 30,
      domanda_varianti: ["Che auto ha? Mi dice marca e modello?", "Di che marca e modello è l'auto?"] },
    { id: 'modello', descrizione: "Modello dell'auto.", tipo: 'string', priorita: 32,
      domanda_varianti: ['Che modello è?'] },
    { id: 'anno', descrizione: "Anno di immatricolazione dell'auto.", tipo: 'string', priorita: 34 },
    { id: 'alimentazione', descrizione: 'Alimentazione: diesel, benzina, gpl, metano, ibrida, elettrica.', tipo: 'enum', priorita: 36, valori: ['diesel', 'benzina', 'gpl', 'metano', 'ibrida', 'elettrica'] },
    { id: 'targa', descrizione: "Targa dell'auto (se il cliente la fornisce).", tipo: 'string', priorita: 38,
      domanda_varianti: ["Mi può dare la targa dell'auto?"] },
    { id: 'sinistro', descrizione: 'Il cliente racconta di un incidente o sinistro (valore: si).', tipo: 'enum', priorita: 80, valori: ['si'] },
    { id: 'non_marciante', descrizione: 'Il veicolo non può muoversi o circolare con mezzi propri (valore: si).', tipo: 'enum', priorita: 81, valori: ['si'] },
    { id: 'giorno', descrizione: "Giorno preferito per portare l'auto.", tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'cliente_nuovo', descrizione: "Se è la prima volta che il cliente porta l'auto in questa carrozzeria.", tipo: 'enum', priorita: 50, valori: ['si', 'no'] },
    { id: 'auto_sostitutiva', descrizione: "Se il cliente chiede un'auto sostitutiva o di cortesia.", tipo: 'enum', priorita: 70, valori: ['richiesta'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Danni e lavori (l'ordine conta: a parità di entità vince la prima voce trovata; le più specifiche per prime) ----
    { canonical: 'grandine', entity: 'servizio', value: 'grandine', negabile: true, synonyms: ['grandine', 'grandinata', 'danni da grandine', 'colpita dalla grandine', 'colpito dalla grandine', 'bolli da grandine', 'auto grandinata', 'macchina grandinata', 'chicchi di grandine', 'e caduta la grandine', 'e venuta la grandine', 'sotto la grandine', 'sotto una grandinata'], errors: ['grandne', 'grandinatta'] },
    { canonical: 'ammaccatura', entity: 'servizio', value: 'ammaccatura', negabile: true, synonyms: ['ammaccatura', 'ammaccature', 'ammaccato', 'ammaccata', 'ammaccati', 'ammaccate', 'ammaccarla', 'ammaccarlo', 'bozzo', 'bozzi', 'bozza', 'bozze', 'botta', 'botte', 'bolla', 'bolli', 'sbalzo', 'sbalzi', 'avvallamento', 'schiacciato', 'schiacciata', 'smart repair', 'levabolli', 'sbollatura', 'riparazione senza verniciatura', 'senza verniciare', 'senza riverniciare', 'ripristino senza verniciatura', 'ho preso una botta'], slang: ['una botta', 'un bozzo'], errors: ['amaccatura', 'ammacatura', 'ammaccatua', 'ammacato', 'amaccato', 'ammaccatra'] },
    { canonical: 'graffi', entity: 'servizio', value: 'graffi', negabile: true, synonyms: ['graffietto', 'graffietti', 'graffio', 'graffi', 'graffiata', 'graffiato', 'graffiate', 'graffiati', 'graffiatura', 'graffiature', 'rigata', 'rigato', 'rigate', 'rigati', 'rigatura', 'rigature', 'striscio', 'strisciata', 'strisciato', 'segni sulla vernice', 'segni di vernice', 'sfregio', 'graffio profondo', 'graffio sulla fiancata', 'segni sulla carrozzeria', 'sfregi'], slang: ['una rigata', 'una graffiata'], errors: ['grafio', 'graffo', 'graffiio', 'rigatua'] },
    { canonical: 'verniciatura', entity: 'servizio', value: 'verniciatura', synonyms: ['verniciatura', 'verniciature', 'verniciare', 'riverniciare', 'riverniciatura', 'riverniciata', 'riverniciato', 'verniciata', 'verniciato', 'passata di vernice', 'mano di vernice', 'mani di vernice', 'rifare la vernice', 'vernice scrostata', 'vernice rovinata', 'vernice che si stacca', 'vernice opaca', 'vernice sbiadita', 'vernice bruciata dal sole', 'vernice screpolata', 'vernice che si scrosta', 'pitturare', 'pitturata', 'verniciatura completa', 'verniciatura totale', 'cambio colore', 'cambiare colore', 'cambiare il colore', 'cambiare il colore dell auto', 'dare una mano di colore', 'laccatura', 'vernice', 'trasparente rovinato', 'trasparente opaco', 'trasparente che si stacca', 'clear coat'], errors: ['verniciatua', 'vernicatura', 'veniciatura', 'verniciaura'] },
    { canonical: 'lucidatura', entity: 'servizio', value: 'lucidatura', synonyms: ['lucidatura', 'lucidature', 'lucidare', 'lucidata', 'lucidato', 'lucidatura carrozzeria', 'levigatura', 'levigare', 'ceratura', 'cerare', 'trattamento ceramico', 'trattamento nanoceramico', 'ceramica', 'polish', 'detailing', 'carrozzeria opaca', 'auto opaca', 'macchina opaca', 'ripristino della vernice opaca', 'micrograffi', 'micro graffi', 'ologrammi', 'aloni sulla vernice', 'lucidatura fari', 'lucidare i fari'], errors: ['lucidatua', 'lucidatrua', 'lucdatura'] },
    { canonical: 'cristalli', entity: 'servizio', value: 'cristalli', negabile: true, synonyms: ['parabrezza', 'cristallo', 'cristalli', 'vetro rotto', 'vetro crepato', 'vetro scheggiato', 'lunotto', 'finestrino', 'finestrino rotto', 'finestrino spaccato', 'vetro del finestrino', 'sostituzione parabrezza', 'sostituire il parabrezza', 'parabrezza crepato', 'parabrezza scheggiato', 'sasso sul parabrezza', 'crepa sul parabrezza', 'scheggiatura sul parabrezza', 'scheggiatura parabrezza', 'vetro posteriore', 'vetro anteriore'], errors: ['parabrzza', 'parabreza', 'cristali'] },
    { canonical: 'specchietto', entity: 'servizio', value: 'specchietto', negabile: true, synonyms: ['specchietto', 'specchietti', 'specchietto rotto', 'specchietto retrovisore', 'retrovisore', 'retrovisori', 'specchio retrovisore', 'calotta dello specchietto', 'calotta dello specchio', 'specchietto penzolante', 'specchietto staccato', 'specchietto spaccato', 'specchietto ripiegato'], errors: ['specchieto', 'spechietto', 'specchetto'] },
    { canonical: 'fanaleria', entity: 'servizio', value: 'fanaleria', negabile: true, synonyms: ['fanale', 'fanali', 'faro rotto', 'fanale rotto', 'faro crepato', 'faro appannato', 'fanale posteriore', 'fanale anteriore', 'gruppo ottico', 'gruppi ottici', 'faro scheggiato', 'fanalino', 'faro opaco', 'fari opachi', 'fari ingialliti', 'faro ingiallito', 'faro staccato', 'faro rotto dopo', 'faro anteriore', 'fari', 'faro', 'fanale spaccato'], errors: ['fanalle', 'fanalee'] },
    { canonical: 'ritocco', entity: 'servizio', value: 'ritocco', negabile: true, synonyms: ['ritocco', 'ritocchi', 'ritoccare', 'ritocco vernice', 'ritocco di vernice', 'schegge di vernice', 'sasso sul cofano', 'sassolino sul cofano', 'scheggiatura', 'scheggiature', 'scheggiato', 'scheggiata', 'scheggia', 'schegge', 'sassolini', 'micro scheggiature', 'puntini sul cofano', 'puntini di vernice'], errors: ['ritoco', 'ritoccco'] },
    { canonical: 'sostituzione_parti', entity: 'servizio', value: 'sostituzione_parti', synonyms: ['sostituire la portiera', 'cambiare la portiera', 'sostituzione portiera', 'portiera da sostituire', 'cofano da sostituire', 'sostituire il cofano', 'cambiare il cofano', 'sostituzione cofano', 'sostituire il parafango', 'cambiare il parafango', 'sostituzione parafango', 'parafango da sostituire', 'sostituire il portellone', 'portellone da sostituire', 'sostituzione portellone', 'ricambi carrozzeria', 'ricambio carrozzeria', 'pezzi di ricambio carrozzeria', 'montare un paraurti nuovo', 'montare una portiera nuova', 'portiera nuova', 'cofano nuovo', 'parafango nuovo', 'sostituire il tetto', 'sostituzione di una parte', 'sostituzione del cofano', 'sostituzione della portiera', 'sostituzione del parafango', 'sostituzione del portellone', 'sostituzione del tetto', 'sostituzione del paraurti', 'cambio della portiera', 'cambio del cofano'], errors: ['sostituire la portierra'] },
    { canonical: 'paraurti', entity: 'servizio', value: 'paraurti', negabile: true, synonyms: ['paraurti', 'paraurti rotto', 'paraurti crepato', 'paraurti staccato', 'paraurti graffiato', 'paraurti anteriore', 'paraurti posteriore', 'sostituire il paraurti', 'riparare il paraurti', 'riparazione paraurti', 'paraurti a pezzi', 'paraurti scollato', 'paraurti che penzola', 'paraurti penzolante', 'paraurti spaccato', 'paraurti danneggiato'], errors: ['paraurty', 'paraurtti', 'paraurt'] },
    { canonical: 'ruggine', entity: 'servizio', value: 'ruggine', negabile: true, synonyms: ['ruggine', 'arrugginito', 'arrugginita', 'arrugginiti', 'arrugginite', 'bolle di ruggine', 'ossidazione', 'ossidata', 'ossidato', 'corrosione', 'trattamento antiruggine', 'antiruggine', 'bolle sulla vernice', 'bollicine sulla vernice', 'passaruota arrugginiti', 'sottoscocca arrugginito', 'soglie arrugginite', 'soglie arrugginite'], errors: ['rugine', 'rugggine', 'arruginito', 'arruginita'] },
    { canonical: 'cerchi', entity: 'servizio', value: 'cerchi', negabile: true, synonyms: ['cerchi', 'cerchio', 'cerchi in lega', 'cerchio in lega', 'cerchio ammaccato', 'cerchi rigati', 'ripristino cerchi', 'ripristino dei cerchi', 'riparazione cerchi', 'verniciatura cerchi', 'cerchi danneggiati', 'cerchio storto', 'cerchio rovinato', 'ho preso il cordolo', 'cordolo'], errors: ['cherchi', 'cerchii'] },
    { canonical: 'raddrizzatura', entity: 'servizio', value: 'raddrizzatura', negabile: true, synonyms: ['raddrizzare', 'raddrizzatura', 'banco di raddrizzatura', 'banco raddrizzatura', 'telaio', 'telaio piegato', 'scocca', 'scocca piegata', 'traversa', 'longherone', 'longheroni', 'riportare in squadra', 'messa in squadra', 'squadratura', 'controllo del telaio', 'misurazione del telaio', 'banco dime', 'sul banco'], errors: ['radrizzatura', 'raddrizatura', 'raddrizzatrua'] },
    { canonical: 'restauro', entity: 'servizio', value: 'restauro', synonyms: ['restauro', 'restaurare', 'restauro auto d epoca', 'auto d epoca', 'macchina d epoca', 'auto storica', 'auto storiche', 'da restaurare', 'ripristino auto storica', 'restauro conservativo', 'youngtimer', 'oldtimer', 'restauro completo'], errors: ['restuaro', 'restauo'] },
    { canonical: 'wrapping', entity: 'servizio', value: 'wrapping', synonyms: ['wrapping', 'wrap', 'car wrap', 'carwrapping', 'pellicola', 'pellicole', 'pellicolatura', 'pellicolare', 'pellicola protettiva', 'ppf', 'cambio colore con pellicola', 'oscuramento vetri', 'vetri oscurati', 'pellicola oscurante', 'pellicola colorata', 'rivestimento adesivo'], errors: ['wrappng', 'raping'] },
    { canonical: 'valutazione_danni', entity: 'servizio', value: 'valutazione_danni', synonyms: ['valutazione danni', 'valutazione dei danni', 'valutazione del danno', 'valutare i danni', 'valutare il danno', 'visione della macchina', 'visione dell auto', 'visione del veicolo', 'visione danni', 'visione del danno', 'farvi vedere la macchina', 'farvi vedere l auto', 'far vedere la macchina', 'far vedere l auto', 'far vedere il danno', 'farvi vedere il danno', 'mostrarvi la macchina', 'mostrarvi l auto', 'mostrarvi il danno', 'dare un occhiata ai danni', 'dare un occhiata al danno', 'controllo danni', 'controllare i danni', 'vedere i danni', 'vedere il danno', 'guardare il danno', 'guardare i danni', 'portarvi l auto per vedere', 'portarvi la macchina per vedere', 'sopralluogo', 'visione e preventivo', 'vedere la macchina', 'vedere l auto', 'controllata ai danni'], errors: ['valutazone danni', 'valutazione dani'] },
    { canonical: 'riparazione_carrozzeria', entity: 'servizio', value: 'riparazione_carrozzeria', synonyms: ['lavori di carrozzeria', 'lavoro di carrozzeria', 'lavori in carrozzeria', 'lavoro in carrozzeria', 'riparazione di carrozzeria', 'riparazioni di carrozzeria', 'riparazione carrozzeria', 'riparazioni carrozzeria', 'lavorazione di carrozzeria', 'lattoneria', 'battilastra', 'battitura', 'lamiera', 'lamiere', 'sistemare la carrozzeria', 'riparare la carrozzeria', 'rifare la carrozzeria', 'riparare l auto', 'riparare la macchina', 'sistemare la macchina', 'sistemare l auto', 'riparare il danno', 'sistemare il danno', 'riparazione del danno', 'riparazione dell auto', 'riparazione della macchina', 'fare un lavoro di carrozzeria', 'lavori di lattoneria', 'far sistemare', 'far riparare', 'farla sistemare', 'farla riparare', 'farlo sistemare', 'farlo riparare', 'da sistemare', 'da riparare', 'far rifare'], errors: ['carozzeria', 'carrozzria'] },

    // ---- Parti dell'auto (entità `parte`) ----
    { canonical: 'parte_paraurti', entity: 'parte', value: 'paraurti', synonyms: ['paraurti', 'paraurti anteriore', 'paraurti posteriore'] },
    { canonical: 'parte_portiera', entity: 'parte', value: 'portiera', synonyms: ['portiera', 'portiere', 'sportello', 'porta anteriore', 'porta posteriore', 'portiera anteriore', 'portiera posteriore', 'portiera del guidatore', 'portiera del passeggero', 'portiera destra', 'portiera sinistra'], errors: ['portierra'] },
    { canonical: 'parte_cofano', entity: 'parte', value: 'cofano', synonyms: ['cofano', 'cofano anteriore', 'cofano motore'] },
    { canonical: 'parte_parafango', entity: 'parte', value: 'parafango', synonyms: ['parafango', 'parafanghi', 'parafango anteriore', 'parafango posteriore', 'passaruota'] },
    { canonical: 'parte_tetto', entity: 'parte', value: 'tetto', synonyms: ['tetto', 'tettuccio', 'tetto dell auto', 'tetto della macchina'] },
    { canonical: 'parte_portellone', entity: 'parte', value: 'portellone', synonyms: ['portellone', 'bagagliaio', 'baule', 'cofano posteriore', 'portellone posteriore', 'portabagagli'] },
    { canonical: 'parte_fiancata', entity: 'parte', value: 'fiancata', synonyms: ['fiancata', 'fiancate', 'fianco', 'laterale', 'fiancata destra', 'fiancata sinistra', 'lato destro', 'lato sinistro', 'lato guidatore', 'lato passeggero', 'montante', 'soglia'] },
    { canonical: 'parte_specchietto', entity: 'parte', value: 'specchietto', synonyms: ['specchietto', 'specchietti', 'retrovisore', 'retrovisori'] },
    { canonical: 'parte_fanale', entity: 'parte', value: 'fanale', synonyms: ['fanale', 'fanali', 'faro', 'fari', 'gruppo ottico', 'fanalino', 'luci posteriori'] },
    { canonical: 'parte_cerchio', entity: 'parte', value: 'cerchio', synonyms: ['cerchio', 'cerchi', 'cerchione', 'cerchioni'] },
    { canonical: 'parte_parabrezza', entity: 'parte', value: 'parabrezza', synonyms: ['parabrezza'] },
    { canonical: 'parte_lunotto', entity: 'parte', value: 'lunotto', synonyms: ['lunotto', 'vetro posteriore', 'lunotto posteriore'] },
    { canonical: 'parte_finestrino', entity: 'parte', value: 'finestrino', synonyms: ['finestrino', 'finestrini', 'vetro della portiera'] },

    // ---- Origine del danno ----
    { canonical: 'origine_vandalismo', entity: 'origine_danno', value: 'vandalismo', synonyms: ['vandali', 'vandalismo', 'vandalizzata', 'vandalizzato', 'atto vandalico', 'atti vandalici', 'rigata con la chiave', 'graffiata con la chiave', 'con una chiave', 'tentato furto', 'tentativo di furto', 'scasso', 'effrazione', 'hanno forzato', 'hanno rotto il vetro', 'hanno rotto lo specchietto', 'hanno spaccato'] },
    { canonical: 'origine_parcheggio', entity: 'origine_danno', value: 'parcheggio', synonyms: ['in parcheggio', 'nel parcheggio', 'dal parcheggio', 'al parcheggio', 'in un parcheggio', 'nel parcheggio del', 'parcheggiata', 'parcheggiato', 'mentre parcheggiavo', 'mentre ero parcheggiato', 'mentre era parcheggiata', 'al supermercato', 'parcheggio del supermercato', 'trovata cosi', 'l ho trovata cosi', 'l ho trovato cosi', 'qualcuno ha urtato', 'qualcuno mi ha urtato la macchina', 'da ferma', 'mentre ero fermo', 'mentre ero ferma', 'mentre manovravo', 'in manovra', 'durante una manovra', 'sotto casa', 'e stata colpita'] },
    { canonical: 'origine_grandine', entity: 'origine_danno', value: 'grandine', synonyms: ['grandine', 'grandinata', 'sotto la grandine', 'chicchi di grandine', 'colpita dalla grandine', 'colpito dalla grandine'] },
    { canonical: 'origine_urto', entity: 'origine_danno', value: 'urto', synonyms: ['ho urtato', 'ho sbattuto', 'ho strisciato', 'ho preso un palo', 'ho preso un muretto', 'ho preso un marciapiede', 'ho preso un muro', 'ho toccato un muro', 'ho toccato il muro', 'ho toccato un palo', 'ho battuto', 'ho dato una botta', 'contro un muretto', 'contro un palo', 'contro un muro', 'contro un cancello', 'contro una colonna', 'contro il guard rail', 'contro il guardrail', 'contro un cartello', 'contro un paletto', 'ho preso un paletto', 'ho preso una colonna', 'ho preso un cancello', 'ho graffiato contro'] },
    { canonical: 'origine_maltempo', entity: 'origine_danno', value: 'maltempo', synonyms: ['albero caduto', 'e caduto un albero', 'e caduto un ramo', 'ramo caduto', 'caduto un ramo', 'caduto un albero', 'un albero sulla macchina', 'un ramo sulla macchina', 'tegola', 'e caduta una tegola', 'cornicione', 'vento forte', 'tromba d aria', 'nubifragio', 'temporale', 'cade un pezzo', 'e caduto un cartello', 'frana', 'caduta massi'] },
    { canonical: 'origine_usura', entity: 'origine_danno', value: 'usura', synonyms: ['col tempo', 'con il tempo', 'sbiadita dal sole', 'bruciata dal sole', 'rovinata dal sole', 'per il sole', 'dopo anni', 'invecchiata', 'dall usura', 'per l usura', 'da anni', 'negli anni'] },

    // ---- Sinistro e veicolo non marciante (entità di instradamento) ----
    { canonical: 'sinistro_evento', entity: 'sinistro', value: 'si', negabile: true, synonyms: [...INCIDENTE_PERSONALE, ...INCIDENTE_ENTITA_EXTRA], intent: 'incidente_recente' },
    { canonical: 'non_marciante_evento', entity: 'non_marciante', value: 'si', negabile: true, synonyms: [...NON_MARCIANTE_STRADA, ...NON_MARCIANTE_MECCANICA], intent: 'veicolo_non_marciante' },

    // ---- Auto sostitutiva / tipo cliente ----
    { canonical: 'auto_sostitutiva', entity: 'auto_sostitutiva', value: 'richiesta', synonyms: ['auto sostitutiva', 'macchina sostitutiva', 'vettura sostitutiva', 'auto di cortesia', 'macchina di cortesia', 'vettura di cortesia', 'auto in prestito', 'macchina in prestito', 'auto muletto', 'muletto', 'macchina a noleggio', 'auto a noleggio', 'auto di scorta', 'una macchina per i giorni', 'una macchina mentre', 'un auto mentre', 'un auto per i giorni', 'auto sostitutiva'], intent: 'info_auto_sostitutiva', errors: ['auto sostitutia', 'auto sostituiva'] },
    { canonical: 'cliente_nuovo', entity: 'cliente_nuovo', value: 'si', synonyms: ['sono nuovo', 'sono nuova', 'prima volta che vengo', 'non sono mai venuto', 'non sono mai venuta', 'non sono mai stato da voi', 'non sono mai stata da voi', 'non vi conosco', 'sono un nuovo cliente', 'sono una nuova cliente', 'e la prima volta', 'prima volta da voi', 'prima volta in questa carrozzeria', 'prima volta che porto l auto'] },
    { canonical: 'cliente_esistente', entity: 'cliente_nuovo', value: 'no', synonyms: ['sono gia cliente', 'sono gia venuto', 'sono gia venuta', 'sono gia stato da voi', 'sono gia stata da voi', 'sono un vostro cliente', 'sono una vostra cliente', 'sono vostro cliente', 'vengo da voi da anni', 'sono cliente da anni', 'sono gia stato in carrozzeria da voi'] },

    // ---- Alimentazione (forme prudenti: "benzina" da sola compare in "odore di benzina") ----
    { canonical: 'diesel', entity: 'alimentazione', value: 'diesel', synonyms: ['diesel', 'turbodiesel', 'a gasolio', 'e a gasolio', 'motore diesel', 'versione diesel', 'e un diesel', 'tdi', 'hdi', 'jtd', 'multijet', 'cdti', 'dci', 'crdi'], errors: ['disel', 'diessel'] },
    { canonical: 'benzina', entity: 'alimentazione', value: 'benzina', synonyms: ['a benzina', 'e a benzina', 'motore a benzina', 'motore benzina', 'versione benzina', 'e una benzina', 'una benzina', 'tsi', 'tfsi', 'tce', 'puretech'] },
    { canonical: 'gpl', entity: 'alimentazione', value: 'gpl', synonyms: ['gpl', 'a gpl', 'bifuel', 'bi fuel', 'impianto gpl'] },
    { canonical: 'metano', entity: 'alimentazione', value: 'metano', synonyms: ['a metano', 'e a metano', 'impianto a metano', 'metano'] },
    { canonical: 'ibrida', entity: 'alimentazione', value: 'ibrida', synonyms: ['ibrida', 'ibrido', 'hybrid', 'mild hybrid', 'full hybrid', 'plug in', 'phev', 'hev'], errors: ['ibirda'] },
    { canonical: 'elettrica', entity: 'alimentazione', value: 'elettrica', synonyms: ['auto elettrica', 'auto elettriche', 'macchina elettrica', 'macchine elettriche', 'veicoli elettrici', 'vettura elettrica', 'veicolo elettrico', 'full electric', 'bev', 'e una elettrica', 'la mia elettrica', 'elettriche'] },

    // ---- Concetti di conversazione (collegano all'intent, nessuna entità) ----
    // Nota: "prezzo/prezzi" NON sono forme di lessico perché il motore tollera un refuso ("pezzo" ~ "prezzo")
    // e in carrozzeria "pezzo" è una parola comunissima.
    { canonical: 'prezzo', synonyms: ['costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto mi viene', 'quanto mi costa', 'quanto devo pagare', 'quanto spendo', 'tariffa', 'tariffe', 'listino', 'quanto si paga', 'quanto prendete', 'quanto vi prendete', 'costo orario', 'manodopera'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'fino a che ora', 'a che ora aprite', 'a che ora chiudete', 'pausa pranzo'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove vi trovate', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'avete parcheggio', 'c e parcheggio', 'dove posso parcheggiare', 'posizione', 'dov e la carrozzeria'], intent: 'info_posizione' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'rateizzare', 'rateizzazione', 'finanziamento', 'bancomat', 'carta di credito', 'carte di credito', 'contanti', 'fattura', 'pos', 'satispay', 'assegno', 'ricevuta', 'acconto', 'anticipo'], intent: 'info_pagamenti' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'preventivare', 'un offerta', 'un offerta per', 'darmi un offerta', 'fare un offerta', 'una valutazione economica', 'stima dei costi', 'stima del costo', 'stima di spesa', 'quanto mi costerebbe'], intent: 'richiesta_preventivo' },
    { canonical: 'appuntamento', synonyms: ['appuntamento', 'prenotare', 'prenotazione', 'prenoto', 'fissare', 'disponibilita', 'posto libero', 'slot'], intent: 'prenota_visione' },
    { canonical: 'stato_lavori', synonyms: ['e pronta la mia auto', 'e pronta la macchina', 'a che punto siete', 'ritirare la macchina', 'ritirare l auto', 'ritirare la mia auto', 'ritiro l auto', 'ritiro la macchina'], intent: 'stato_lavori' },
    { canonical: 'assicurazione_pratica', synonyms: ['il perito', 'dal perito', 'la perizia', 'numero di sinistro', 'numero del sinistro', 'numero sinistro', 'pratica assicurativa', 'la mia compagnia', 'la compagnia mi', 'liquidatore', 'la liquidazione', 'ho il cid', 'ho fatto il cid', 'ho compilato il cid', 'ho gia fatto il cid', 'ho gia compilato il cid', 'ho gia il cid', 'cid compilato', 'cid gia compilato', 'cid gia fatto', 'ho fatto la constatazione', 'ho gia fatto la constatazione', 'ho compilato la constatazione', 'constatazione amichevole compilata', 'constatazione gia compilata', 'ho gia aperto il sinistro', 'ho aperto il sinistro', 'ho gia fatto denuncia', 'ho fatto denuncia alla compagnia'], intent: 'pratica_assicurativa' },
    { canonical: 'perdita_liquidi', entity: undefined, synonyms: ['perde olio', 'perde acqua', 'perde liquido', 'perde liquidi', 'perde refrigerante', 'perdita di olio', 'perdita di liquido', 'perdita di liquidi', 'macchia sotto la macchina', 'macchia sotto l auto', 'pozza sotto la macchina', 'pozza sotto l auto', 'liquido sotto la macchina', 'liquido sotto l auto', 'olio per terra', 'gocciola', 'sgocciola', 'chiazza sotto la macchina', 'chiazza sotto l auto'], intent: 'emergenza_veicolo' },

    // ---- Marche (entità `marca`), modelli (`modello`) e anni (`anno`) generati dalle tabelle ----
    ...MARCHE.map(([valore, forme]) => ({ canonical: `marca_${valore}`, entity: 'marca', value: valore, synonyms: forme })),
    ...MODELLI.map(([valore, forme]) => ({ canonical: `modello_${valore}`, entity: 'modello', value: valore, synonyms: forme })),
    // Il modello implica la marca ("la mia Panda" -> Fiat): così non si richiede una marca già nota.
    ...MODELLI.map(([valore, forme, marca]) => ({ canonical: `marca_da_modello_${valore}`, entity: 'marca', value: marca, synonyms: forme })),
    ...ANNI.map((a) => ({ canonical: `anno_${a}`, entity: 'anno', value: String(a), synonyms: [String(a)] })),
  ],

  intents: [
    { id: 'prenota_visione', nome: 'Prenotazione visione del veicolo', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: "Il cliente vuole portare l'auto in carrozzeria per farla vedere o per un lavoro (visione del veicolo, riparazione, verniciatura, lucidatura) o chiede disponibilità. Il preventivo si fa dopo la visione.",
      esempi: ['vorrei prenotare', 'vorrei un appuntamento', 'vorrei prendere un appuntamento', 'vorrei fissare un appuntamento', 'mi serve un appuntamento', 'avete posto domani', 'avete posto oggi', 'avete posto questa settimana', 'avete disponibilita', 'avete disponibilita questa settimana', 'quando posso portare l auto', 'quando posso portare la macchina', 'posso portare l auto', 'posso portare la macchina', 'devo portare l auto', 'devo portare la macchina', 'vorrei portare l auto in carrozzeria', 'vorrei portare la macchina in carrozzeria', 'posso passare domani', 'quando posso passare', 'quando posso venire', 'posso venire', 'quando posso portarla', 'quando riuscite a vedere la macchina', 'quando siete liberi', 'cerco un appuntamento', 'posso prenotare', 'prenotazione', 'vorrei farvi vedere la macchina', 'vorrei farvi vedere l auto', 'vorrei farvi vedere il danno', 'posso farvi vedere la macchina', 'posso farvi vedere l auto', 'quando posso farvi vedere la macchina', 'quando posso farvi vedere l auto', 'vorrei far vedere l auto', 'posso lasciarvi la macchina', 'posso lasciarvi l auto', 'vorrei lasciarvi la macchina', 'vorrei lasciarvi l auto', 'posso lasciare la macchina da voi', 'posso lasciare l auto da voi', 'quando posso lasciarvi l auto', 'quando posso lasciarvi la macchina'],
      keywords: ['prenotare', 'prenotazione', 'appuntamento', 'disponibilita', 'fissare'],
      combinazioni: [
        { entity: 'servizio', con: ['vorrei', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo far', 'devo portare', 'vorrei fare', 'voglio fare', 'vorrei far', 'voglio far', 'mi occorre', 'cerco', 'posso portare', 'posso passare', 'portare la macchina', 'portare l auto', 'volevo fare', 'volevo far', 'dovrei', 'quando potete', 'quando riuscite', 'prenotare', 'prenotazione', 'prenoto', 'appuntamento', 'fissare', 'devo sistemare', 'vorrei sistemare', 'voglio sistemare', 'devo riparare', 'vorrei riparare', 'voglio riparare', 'devo togliere', 'vorrei togliere', 'voglio togliere', 'vorrei eliminare', 'devo eliminare', 'vorrei rimuovere', 'devo rimuovere', 'da fare', 'da sistemare', 'da riparare', 'da sostituire', 'devo cambiare', 'devo sostituire', 'vorrei cambiare', 'vorrei sostituire', 'vorrei rifare', 'devo rifare', 'voglio rifare', 'vorrei verniciare', 'devo verniciare', 'vorrei lucidare', 'devo lucidare', 'vorrei ripristinare', 'devo ripristinare', 'vorrei ritoccare', 'devo ritoccare', 'voglio solo', 'vorrei solo', 'devo solo', 'mi serve solo', 'solo il', 'solo la', 'solo un', 'solo una', 'solo per'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.8 },
        // Verbi alla prima persona + lavoro: prevalgono su "fate/riparate/lucidate..." di info_servizi (stessa radice del verbo all'infinito).
        { entity: 'servizio', con: ['devo far', 'vorrei far', 'voglio far', 'devo riparare', 'vorrei riparare', 'voglio riparare', 'devo sistemare', 'vorrei sistemare', 'voglio sistemare', 'devo sostituire', 'vorrei sostituire', 'devo cambiare', 'vorrei cambiare', 'devo lucidare', 'vorrei lucidare', 'devo verniciare', 'vorrei verniciare', 'devo ritoccare', 'vorrei ritoccare', 'devo rifare', 'vorrei rifare', 'dovrei far', 'dovrei riparare', 'dovrei sistemare', 'dovrei sostituire', 'dovrei lucidare', 'dovrei verniciare', 'mi serve far', 'mi serve riparare', 'mi serve sistemare', 'mi serve sostituire', 'mi serve lucidare'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.92 },
        { entity: 'parte', con: ['far sistemare', 'far riparare', 'far rifare', 'devo sistemare', 'vorrei sistemare', 'devo riparare', 'vorrei riparare', 'devo rifare', 'vorrei rifare', 'farla sistemare', 'farla riparare'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.85 },
        { entity: 'cliente_nuovo', con: ['vorrei venire', 'vorrei portare', 'vorrei un appuntamento'], score: 0.7 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['parte', 'origine_danno', 'marca', 'modello', 'anno', 'alimentazione', 'targa', 'giorno', 'fascia_oraria', 'cliente_nuovo', 'auto_sostitutiva'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_preventivo', nome: 'Richiesta preventivo', categoria: 'LEAD', priorita: 25, safety_level: 'LOW',
      descrizione: "Il cliente chiede un preventivo per un danno o un lavoro. Il preventivo si formula solo dopo la visione del veicolo: l'azione di chiusura porta alla visione, mai a una cifra.",
      esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'mi serve un preventivo', 'mi fate un preventivo per', 'mi potete fare un preventivo', 'avrei bisogno di un preventivo', 'vorrei un preventivo per la verniciatura', 'preventivo per il paraurti', 'preventivo per la portiera', 'preventivo per il graffio', 'preventivo per l ammaccatura', 'preventivo per i danni', 'preventivo per la grandine', 'preventivo per la lucidatura', 'preventivo per la riparazione', 'una stima dei costi', 'potete farmi una stima', 'stima del costo', 'preventivo per l auto', 'mi fate un preventivo per l auto', 'vorrei un preventivo per la macchina', 'mi serve un preventivo per la carrozzeria', 'vorrei sapere quanto mi costerebbe', 'potete farmi un offerta', 'potete darmi un offerta', 'mi fate un offerta', 'un offerta per', 'preventivo per i lavori di carrozzeria'],
      keywords: ['preventivo', 'preventivi', 'offerta'],
      combinazioni: [
        { entity: 'servizio', con: ['preventivo', 'preventivi', 'preventivare', 'un offerta', 'una offerta', 'offerta per', 'una stima', 'stima dei costi', 'stima del costo'], score: 0.85 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['parte', 'origine_danno', 'marca', 'modello', 'anno', 'alimentazione', 'targa', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'propose_slot', 'create_lead', 'notify_owner'] },
    { id: 'segnala_danno', nome: 'Segnalazione di un danno', categoria: 'SUPPORT', priorita: 22, safety_level: 'LOW', campi_tenant: true,
      descrizione: "Il cliente descrive un danno alla carrozzeria (graffio, ammaccatura, paraurti rotto, grandine, vandalismo) senza raccontare un incidente. Si raccolgono i dati e si organizza la visione del veicolo: nessuna valutazione a distanza.",
      esempi: ['ho un graffio sulla portiera', 'ho un graffio sul paraurti', 'ho un ammaccatura sulla portiera', 'ho un ammaccatura sul cofano', 'ho il paraurti rotto', 'ho il paraurti rovinato', 'ho lo specchietto rotto', 'ho il faro rotto', 'ho il parabrezza crepato', 'ho il vetro rotto', 'mi hanno rigato la macchina', 'mi hanno graffiato la macchina', 'mi hanno ammaccato la macchina', 'mi hanno ammaccato la portiera', 'mi hanno rotto lo specchietto', 'la macchina ha dei graffi', 'la macchina ha delle ammaccature', 'l auto ha dei graffi', 'l auto ha delle ammaccature', 'la macchina e stata colpita dalla grandine', 'l auto e stata colpita dalla grandine', 'ho preso la grandine', 'si e rotto il paraurti', 'si e staccato il paraurti', 'si sta staccando la vernice', 'mi si sta staccando la vernice', 'ho un problema di carrozzeria', 'ho un danno alla macchina', 'ho un danno all auto', 'ho rigato la macchina', 'ho graffiato la macchina', 'ho ammaccato la macchina', 'ho graffiato il paraurti', 'ho ammaccato il paraurti', 'ho ammaccato la portiera', 'ho rotto lo specchietto', 'ho rotto il faro', 'c e un ammaccatura', 'c e un graffio', 'ci sono dei graffi', 'ci sono delle ammaccature'],
      keywords: ['danno alla macchina', 'danno all auto', 'danni alla macchina', 'danni all auto', 'danneggiata la macchina', 'danneggiato la macchina', 'danneggiata l auto'],
      combinazioni: [
        { entity: 'servizio', con: ['ho un', 'ho una', 'ho dei', 'ho delle', 'ho il', 'ho la', 'ho lo', 'ho preso', 'ho fatto', 'mi hanno fatto', 'mi hanno rigato', 'mi hanno graffiato', 'mi hanno ammaccato', 'mi hanno rovinato', 'mi hanno danneggiato', 'ho danneggiato', 'ho rovinato', 'ho rigato', 'ho graffiato', 'ho ammaccato', 'ho scheggiato', 'ho rotto', 'ho spaccato', 'ho crepato', 'si e rotto', 'si e rotta', 'si e crepato', 'si e crepata', 'si e scheggiato', 'si e scheggiata', 'si e rovinata', 'si e rovinato', 'si e ammaccata', 'si e ammaccato', 'si e staccato', 'si e staccata', 'si sta staccando', 'si sta scrostando', 'e rotto', 'e rotta', 'e crepato', 'e crepata', 'e rovinata', 'e rovinato', 'e ammaccata', 'e ammaccato', 'e graffiata', 'e graffiato', 'e scheggiata', 'e scheggiato', 'c e un', 'c e una', 'ci sono dei', 'ci sono delle', 'ci sono', 'presenta', 'ha un', 'ha una', 'ha dei', 'ha delle', 'con un', 'con una', 'con dei', 'con delle', 'mi sono accorto', 'mi sono accorta', 'ho notato', 'ho trovato', 'hanno rigato', 'hanno graffiato', 'hanno ammaccato', 'hanno rotto', 'hanno spaccato', 'hanno rovinato', 'rovinata', 'rovinato', 'rotto', 'rotta', 'rotti', 'rotte', 'spaccato', 'spaccata', 'crepato', 'crepata', 'danneggiato', 'danneggiata', 'danneggiati', 'danneggiate', 'ammaccato', 'ammaccata', 'graffiato', 'graffiata', 'rigato', 'rigata', 'scheggiato', 'scheggiata', 'staccato', 'staccata', 'penzola', 'penzolante', 'scollato', 'scollata', 'colpita dalla grandine', 'appannato', 'appannata', 'appannati', 'opaco', 'opaca', 'opachi', 'ingiallito', 'ingialliti', 'scrostata', 'scrostato', 'sbiadita', 'sbiadito', 'arrugginito', 'arrugginita', 'arrugginiti', 'arrugginite', 'ossidato', 'ossidata'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.8 },
        // Urto raccontato senza altro ("ho preso un muro con la fiancata"): segnalazione di danno, si chiede quale lavoro serve.
        { entity: 'origine_danno', con: ['ho preso', 'ho urtato', 'ho sbattuto', 'ho strisciato', 'ho toccato', 'ho battuto'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.8 },
        // Scoperta del danno ("ho trovato la macchina con dei graffi, me ne sono accorto stamattina"): segnalazione, non prenotazione.
        { entity: 'servizio', con: ['ho trovato', 'mi sono accorto', 'mi sono accorta', 'ho notato', 'me ne sono accorto', 'me ne sono accorta', 'l ho trovata cosi', 'l ho trovato cosi', 'stamattina ho trovato', 'stamattina ho visto', 'ho visto che', 'ho scoperto'], non_con_concepts: ['preventivo', 'prezzo', 'sinistro_evento', 'non_marciante_evento', 'assicurazione_pratica'], score: 0.86 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['parte', 'origine_danno', 'marca', 'modello', 'anno', 'alimentazione', 'targa', 'giorno', 'fascia_oraria', 'cliente_nuovo'],
      actions: ['ask_missing_information', 'propose_slot', 'notify_owner', 'create_lead'] },
    { id: 'emergenza_veicolo', nome: 'Emergenza o pericolo', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: "Situazione di pericolo o urgenza: feriti, fumo, fiamme, carburante, batteria di un'auto elettrica danneggiata, parti che si staccano, cofano o portiere che non si chiudono. Serve contatto rapido con la carrozzeria e, se c'è pericolo, soccorso.",
      esempi: ['ho un problema urgente con la macchina', 'ho un problema urgente con l auto', 'e urgente', 'e un emergenza', 'ho un emergenza con la macchina', 'ho bisogno di aiuto subito', 'mi serve subito aiuto', 'ho bisogno subito di aiuto', 'il cofano non si chiude', 'il cofano si e aperto', 'la portiera non si chiude', 'il paraurti penzola', 'si e staccato un pezzo', 'si sta staccando un pezzo', 'ho un pezzo che penzola', 'fumo dalla batteria', 'la batteria fuma'],
      keywords: ['urgente', 'urgenza', 'emergenza', 'penzola'],
      required_entities: ['nome_cliente'], optional_entities: ['servizio', 'parte', 'marca', 'modello', 'targa'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'incidente_recente', nome: 'Incidente o sinistro raccontato dal cliente', categoria: 'HUMAN_HANDOFF', priorita: 6, safety_level: 'HIGH',
      descrizione: "Il cliente racconta di aver avuto un incidente o un sinistro (tamponamento, urto con un altro veicolo, animale investito, uscita di strada). Non si chiedono dettagli sulla dinamica e non si danno indicazioni legali o assicurative: passa a una persona. Se ci sono feriti o pericolo scatta il 112.",
      esempi: ['ho fatto un incidente', 'ho avuto un incidente', 'ho fatto un sinistro', 'ho avuto un sinistro', 'ho subito un incidente', 'mi hanno tamponato', 'mi hanno tamponata', 'mi ha tamponato', 'sono stato tamponato', 'sono stata tamponata', 'ho tamponato', 'mi sono venuti addosso', 'mi hanno urtato', 'mi hanno speronato', 'sono andato a sbattere', 'sono andata a sbattere', 'sono finito fuori strada', 'sono uscito di strada', 'ho investito un cinghiale', 'ho preso un cinghiale', 'ho preso un capriolo', 'ho urtato un animale', 'e successo un incidente', 'sono stato coinvolto in un incidente', 'dopo un incidente devo riparare la macchina', 'dopo l incidente devo riparare la macchina', 'l auto e incidentata', 'la macchina e incidentata'],
      keywords: ['incidente', 'tamponato', 'tamponata', 'tamponamento', 'incidentata', 'incidentato'],
      combinazioni: [
        { entity: 'sinistro', con_entities: ['sinistro'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['servizio', 'parte', 'marca', 'modello', 'targa', 'non_marciante'], actions: ['human_handoff'] },
    { id: 'veicolo_non_marciante', nome: 'Veicolo che non può muoversi', categoria: 'HUMAN_HANDOFF', priorita: 7, safety_level: 'HIGH',
      descrizione: "L'auto non può muoversi o circolare con mezzi propri (ruota bloccata, panne, ferma in strada, serve il carro attrezzi, auto allagata). Il bot non dà indicazioni su come muoverla e non valuta se sia guidabile: passa a una persona.",
      esempi: ['la macchina non cammina', 'l auto non cammina', 'la macchina non si muove', 'l auto non si muove', 'non riesco a muovere la macchina', 'non riesco a guidare la macchina', 'l auto non e guidabile', 'la macchina non e marciante', 'ho la ruota bloccata', 'ho la ruota storta', 'si e staccata la ruota', 'mi serve il carro attrezzi', 'ho bisogno del carro attrezzi', 'devo chiamare il carro attrezzi', 'devo farla trainare', 'devo far trainare la macchina', 'sono in panne', 'sono rimasto a piedi', 'sono ferma in strada', 'sono fermo in strada', 'la macchina e ferma in strada', 'la macchina e ferma sul ciglio', 'la macchina e allagata', 'l auto e allagata', 'non posso portarla da voi con le mie gambe', 'non riesco a portarla da voi'],
      keywords: ['non marciante', 'non circolabile', 'trainarla', 'trainata', 'in panne'],
      combinazioni: [
        { entity: 'non_marciante', con_entities: ['non_marciante'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['servizio', 'parte', 'marca', 'modello', 'targa'], actions: ['human_handoff'] },
    { id: 'pratica_assicurativa', nome: 'Pratica assicurativa in corso', categoria: 'HUMAN_HANDOFF', priorita: 9, safety_level: 'LOW',
      descrizione: "Il cliente parla di una pratica assicurativa già avviata (perito, numero di sinistro, compagnia che lo ha indirizzato, CID già compilato, liquidazione). La carrozzeria non fa consulenza assicurativa a distanza e il bot non conosce la pratica: passa a una persona.",
      esempi: ['mi ha mandato l assicurazione da voi', 'mi ha mandato la compagnia da voi', 'la mia compagnia mi ha indirizzato da voi', 'l assicurazione mi ha detto di venire da voi', 'la compagnia mi ha detto di venire da voi', 'devo far vedere l auto al perito', 'il perito deve vedere la macchina', 'il perito vuole vedere la macchina', 'il perito mi ha chiesto di portare l auto da voi', 'il perito mi ha chiesto di portare la macchina da voi', 'il perito mi ha detto di venire da voi', 'il perito mi ha mandato da voi', 'il perito mi ha chiesto di portarvi l auto', 'il perito deve passare', 'devo portare la macchina dal perito', 'ho il numero di sinistro', 'ho il numero del sinistro', 'ho aperto il sinistro', 'ho gia aperto il sinistro', 'ho gia fatto la denuncia alla compagnia', 'ho gia la perizia', 'la perizia e stata fatta', 'e arrivata la perizia', 'e arrivata la liquidazione', 'ho gia la liquidazione', 'ho il cid compilato', 'ho gia compilato il cid', 'ho fatto la constatazione amichevole', 'ho gia fatto il cid', 'ho una pratica con l assicurazione', 'ho una pratica aperta con la compagnia', 'ho una pratica di sinistro', 'riparazione in convenzione con la mia compagnia', 'ho il riferimento della pratica', 'ho il numero di pratica'],
      keywords: ['perito', 'perizia', 'liquidazione', 'liquidatore', 'numero di sinistro', 'pratica assicurativa'],
      required_entities: [], optional_entities: ['servizio', 'marca', 'modello', 'targa'], actions: ['human_handoff'] },
    { id: 'stato_lavori', nome: "Stato dell'auto in carrozzeria", categoria: 'HUMAN_HANDOFF', priorita: 12, safety_level: 'LOW',
      descrizione: "Il cliente chiede se l'auto è pronta, a che punto è la riparazione o quando può ritirarla. Il sistema non conosce lo stato dei lavori: passa allo staff.",
      esempi: ['e pronta la mia auto', 'e pronta la macchina', 'la mia auto e pronta', 'la macchina e pronta', 'posso ritirare la macchina', 'posso ritirare l auto', 'quando posso ritirare la macchina', 'quando posso ritirare l auto', 'quando e pronta la macchina', 'quando e pronta l auto', 'a che punto siete con la mia auto', 'a che punto siete con la macchina', 'a che punto e la riparazione', 'a che punto e la verniciatura', 'ci sono novita sulla macchina', 'ci sono novita sull auto', 'avete finito con la macchina', 'avete finito con l auto', 'sono pronti i lavori', 'e finita la macchina', 'e finita l auto', 'quando consegnate l auto', 'quando mi consegnate la macchina', 'per quando e pronta la macchina', 'per quando e pronta l auto', 'siete arrivati a verniciarla', 'e arrivato il pezzo', 'sono arrivati i ricambi', 'e arrivato il ricambio', 'avete finito con la mia macchina', 'avete finito con la mia auto', 'avete finito con la mia panda', 'avete finito con la mia', 'avete finito con quella macchina', 'avete finito di sistemare', 'avete finito di riparare', 'avete finito i lavori'],
      keywords: ['ritirare', 'a che punto siete', 'a che punto e', 'novita sulla macchina', 'novita sull auto', 'e pronta', 'e pronto', 'consegnate', 'avete finito'],
      required_entities: [], optional_entities: ['marca', 'modello', 'targa'], actions: ['human_handoff'] },
    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede quanto costa un servizio (lucidatura, verniciatura, ecc.). Si risponde solo con i dati del listino del tenant; mai stime sul danno specifico.",
      esempi: ['quanto costa', 'che prezzo avete', 'quanto viene', 'quanto mi viene', 'quanto devo pagare', 'mi dici il costo', 'avete un listino', 'quali sono i prezzi', 'listino prezzi', 'quanto costa la lucidatura', 'quanto costa la verniciatura', 'quanto costa un ritocco', 'quanto costa lucidare', 'quanto costa il wrapping', 'quanto costa verniciare', 'quanto costa la lucidatura dei fari', 'costo', 'quanto prendete', 'quanto costano', 'qual e il costo della manodopera', 'quanto vi prendete', 'avete delle tariffe', 'prezzi della carrozzeria'],
      keywords: ['costo', 'costi', 'tariffe', 'listino', 'manodopera'],
      required_entities: [], optional_entities: ['servizio', 'marca', 'modello'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede gli orari di apertura della carrozzeria.",
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'siete aperti a pranzo', 'siete aperti domenica', 'fate orario continuato', 'a che ora posso portare l auto', 'a che ora posso passare', 'siete aperti ad agosto', 'siete aperti a ferragosto', 'quando siete aperti', 'lavorate anche il sabato', 'lavorate il sabato', 'lavorate di sabato', 'lavorate anche di sabato', 'lavorate anche il sabato pomeriggio', 'lavorate la domenica', 'lavorate a ferragosto', 'lavorate in agosto', 'lavorate di pomeriggio', 'lavorate a pranzo', 'lavorate tutto il giorno', 'lavorate anche il pomeriggio'],
      keywords: ['orari', 'orario', 'aperti', 'chiusi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_posizione', nome: 'Informazioni posizione', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede dove si trova la carrozzeria o come raggiungerla.",
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova la carrozzeria', 'c e parcheggio', 'come arrivo da voi', 'indirizzo della carrozzeria', 'dov e la carrozzeria', 'dove posso parcheggiare', 'dove lascio la macchina', 'dove vi trovate', 'avete un parcheggio', 'dove devo portare l auto', 'dove devo portare la macchina', 'mi mandate la posizione'],
      keywords: ['indirizzo', 'dove siete', 'dove vi trovate', 'dov e la carrozzeria', 'dove posso parcheggiare', 'dove devo portare'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Informazioni servizi e marchi trattati', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede quali lavori fa la carrozzeria, quali marche tratta, se ha un certo servizio (verniciatura, grandine, cristalli, wrapping, carro attrezzi, gestione della pratica con l'assicurazione, meccanica).",
      esempi: ['che servizi offrite', 'che lavori fate', 'di cosa vi occupate', 'fate la verniciatura', 'fate le verniciature', 'fate verniciature complete', 'fate le ammaccature', 'riparate le ammaccature', 'togliete le ammaccature', 'fate lo smart repair', 'fate il levabolli', 'riparate i danni da grandine', 'trattate i danni da grandine', 'fate i danni da grandine', 'fate la lucidatura', 'fate le lucidature', 'lucidate le auto', 'fate i ritocchi', 'fate ritocchi di vernice', 'sostituite i paraurti', 'riparate i paraurti', 'fate i paraurti', 'riparate gli specchietti', 'sostituite gli specchietti', 'sostituite i fari', 'riparate i fari', 'lucidate i fari', 'fate il parabrezza', 'sostituite i parabrezza', 'fate i cristalli', 'sostituite i vetri', 'fate il wrapping', 'fate il wrap', 'fate le pellicole', 'fate la raddrizzatura', 'avete il banco di raddrizzatura', 'avete il banco', 'riparate le scocche', 'fate la verniciatura dei cerchi', 'riparate i cerchi in lega', 'fate il restauro', 'restaurate auto d epoca', 'fate la carrozzeria', 'fate carrozzeria', 'fate meccanica', 'fate anche la meccanica', 'fate anche i tagliandi', 'fate anche le revisioni', 'fate il carro attrezzi', 'avete il carro attrezzi', 'fate soccorso stradale', 'recuperate le auto', 'trattate la mia marca', 'trattate tutte le marche', 'lavorate su tutte le marche', 'lavorate sulle auto elettriche', 'lavorate sulle ibride', 'trattate le auto ibride', 'riparate le auto elettriche', 'usate ricambi originali', 'montate ricambi originali', 'avete ricambi originali', 'usate ricambi equivalenti', 'fate anche i furgoni', 'riparate anche i furgoni', 'riparate i furgoni', 'riparate anche i camper', 'riparate i camper', 'riparate anche le moto', 'riparate i camion', 'lavorate sui furgoni', 'lavorate sui camper', 'lavorate sui camion', 'fate anche i camper', 'fate anche le moto', 'fate anche i mezzi pesanti', 'gestite voi la pratica con l assicurazione', 'vi occupate voi della pratica con l assicurazione', 'seguite voi la pratica con l assicurazione', 'fate pratiche assicurative', 'avete un verniciatore interno', 'verniciate in forno', 'avete la cabina di verniciatura', 'avete il forno'],
      keywords: ['servizi', 'vi occupate', 'trattate', 'lavorate su', 'ricambi', 'smart repair', 'wrapping', 'furgoni', 'furgone', 'camper', 'camion'],
      combinazioni: [
        { entity: 'marca', con: ['trattate', 'lavorate', 'riparate', 'fate assistenza', 'seguite', 'avete esperienza', 'fate carrozzeria'], score: 0.8 },
        { entity: 'alimentazione', con: ['trattate', 'lavorate', 'riparate', 'fate assistenza', 'seguite', 'avete esperienza', 'fate carrozzeria'], score: 0.8 },
      ],
      required_entities: [], optional_entities: ['servizio', 'marca', 'alimentazione'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Pagamenti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Modalità di pagamento, rate, fattura, anticipo o acconto (solo dati del tenant).",
      esempi: ['accettate carte', 'si puo pagare a rate', 'fate rateizzazione', 'accettate il bancomat', 'avete il finanziamento', 'accettate carte di credito', 'fate fattura', 'si paga con la carta', 'si puo pagare con il pos', 'pagamento in contanti', 'si puo pagare dopo', 'pagamento alla consegna', 'si paga alla consegna', 'si puo pagare con la carta', 'si puo pagare anche con la carta', 'si puo pagare con carta', 'si puo pagare con il bancomat', 'si paga con la carta', 'pagare con la carta', 'pagare con carta', 'pagare con il bancomat', 'accettate pagamenti con carta', 'serve un anticipo', 'bisogna lasciare un acconto', 'si paga un acconto', 'pagamento a lavori finiti'],
      keywords: ['rate', 'rateale', 'finanziamento', 'bancomat', 'contanti', 'fattura', 'rateizzare', 'acconto', 'anticipo'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_auto_sostitutiva', nome: 'Auto sostitutiva o di cortesia', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede se è disponibile un'auto sostitutiva o di cortesia mentre la carrozzeria lavora sulla sua. Si risponde solo se il servizio è dichiarato nei dati del tenant; altrimenti si verifica con lo staff. Mai promettere disponibilità o gratuità.",
      esempi: ['avete l auto sostitutiva', 'avete un auto sostitutiva', 'avete una macchina sostitutiva', 'date l auto sostitutiva', 'c e l auto sostitutiva', 'mi date un auto di cortesia', 'avete auto di cortesia', 'avete un auto di cortesia', 'avete un muletto', 'mi serve un auto sostitutiva', 'mi serve l auto sostitutiva', 'se lascio la macchina mi date un auto', 'ho bisogno di una macchina mentre la lascio', 'senza macchina per qualche giorno', 'mi date una macchina mentre ripara', 'mi date una macchina mentre la riparate', 'c e l auto di cortesia', 'date l auto di cortesia', 'macchina di cortesia'],
      keywords: ['sostitutiva', 'di cortesia', 'muletto', 'auto in prestito'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_documenti', nome: 'Cosa portare', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Cosa serve portare in carrozzeria (documenti dell'auto, chiavi, documenti assicurativi se presenti).",
      esempi: ['cosa devo portare', 'che documenti servono', 'devo portare il libretto', 'serve la carta di circolazione', 'serve il libretto', 'serve il libretto di circolazione', 'devo portare qualcosa', 'servono i documenti', 'serve la targa', 'devo lasciare le chiavi', 'devo portare i documenti dell assicurazione', 'devo portare la polizza', 'devo portare il cid', 'serve il cid', 'devo portare la constatazione amichevole', 'serve la constatazione', 'servono le chiavi', 'cosa serve per lasciare l auto', 'cosa devo portare con me', 'serve un documento', 'devo portare qualche documento', 'devo portare qualche documento quando lascio l auto', 'qualche documento', 'quali documenti', 'che documenti devo portare', 'documento quando lascio l auto', 'cosa devo avere con me', 'servono documenti per lasciare l auto'],
      keywords: ['documenti', 'documento', 'libretto', 'carta di circolazione', 'libretto di circolazione'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_lavorazioni', nome: 'Come funzionano le lavorazioni', categoria: 'INFORMATION', priorita: 32, safety_level: 'MEDIUM',
      descrizione: "Domande generali sui lavori di carrozzeria: cos'è lo smart repair, differenza tra ritocco e verniciatura, grandine, ruggine, colore, riparazione o sostituzione, ricambi, tempi in generale. Mai stime sul veicolo specifico.",
      esempi: ['cos e lo smart repair', 'cos e il levabolli', 'come funziona lo smart repair', 'cos e la riparazione senza verniciatura', 'che differenza c e tra ritocco e verniciatura', 'differenza tra ritocco e verniciatura', 'differenza tra lucidatura e verniciatura', 'cos e la lucidatura', 'a cosa serve la lucidatura', 'cos e il ritocco', 'cos e la raddrizzatura', 'cos e il banco di raddrizzatura', 'cos e il wrapping', 'cos e il ppf', 'cos e la pellicola protettiva', 'cos e il trattamento ceramico', 'come funziona la riparazione dei danni da grandine', 'come si valutano i danni da grandine', 'come vengono valutati i danni da grandine', 'cos e la ruggine', 'perche viene la ruggine', 'come trovate il colore giusto', 'come scegliete il colore', 'cos e il codice colore', 'dove trovo il codice colore', 'come funziona la verniciatura', 'che differenza c e tra riparare e sostituire', 'differenza tra riparazione e sostituzione', 'cosa vuol dire parte originale', 'cosa sono i ricambi equivalenti', 'differenza tra ricambi originali ed equivalenti', 'cosa sono i ricambi di recupero', 'cosa succede dopo la visione', 'come funziona la riparazione', 'come si svolge un lavoro di carrozzeria', 'perche i fari diventano opachi', 'cos e la lucidatura dei fari', 'come funziona la riparazione del parabrezza', 'quanto tempo ci vuole per una riparazione', 'quanto tempo ci vuole per riparare', 'quanto tempo ci vuole per una verniciatura', 'quanti giorni ci vogliono', 'quanto ci mettete', 'quanto tempo serve per riparare la macchina', 'quanto dura una riparazione', 'quanto dura la verniciatura', 'per quanti giorni devo lasciare l auto', 'per quanti giorni devo lasciarvi l auto', 'quanto resta in carrozzeria', 'tempi di riparazione', 'tempi di lavorazione', 'tempi di consegna', 'quanto tempo resto senza macchina', 'le auto elettriche si riparano in carrozzeria', 'come funziona la riparazione di un auto elettrica', 'la vernice si vede diversa dopo la riparazione'],
      keywords: ['cos e', 'a cosa serve', 'a cosa servono', 'cosa significa', 'cosa vuol dire', 'differenza', 'quanto dura', 'quanto tempo ci vuole', 'quanto ci vuole', 'consiste', 'come funziona'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_preventivo', nome: 'Come funziona il preventivo', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: "Domande su come si fa il preventivo: serve vedere l'auto, si può mandare qualche foto, che informazioni servono, è vincolante. Il preventivo definitivo si fa dopo la visione del veicolo.",
      esempi: ['come funziona il preventivo', 'come si fa il preventivo', 'il preventivo e gratuito', 'il preventivo e gratis', 'il preventivo si paga', 'il preventivo costa', 'il preventivo e a pagamento', 'il preventivo e vincolante', 'quanto vale il preventivo', 'quanto e valido il preventivo', 'il preventivo e senza impegno', 'devo portare l auto per il preventivo', 'serve portare l auto per il preventivo', 'serve vedere l auto per il preventivo', 'bisogna vedere l auto per il preventivo', 'potete fare il preventivo dalle foto', 'posso mandare le foto per il preventivo', 'posso mandarvi delle foto', 'preventivo con le foto', 'preventivo via whatsapp', 'preventivo a distanza', 'preventivo online', 'preventivo per telefono', 'preventivo senza portare l auto', 'cosa serve per il preventivo', 'che informazioni servono per un preventivo', 'cosa vi serve per fare il preventivo', 'quanto ci mettete a fare il preventivo', 'il preventivo lo fate subito', 'perche serve vedere l auto', 'perche non potete dirmi il prezzo', 'perche non mi dite una cifra'],
      keywords: [],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_sinistri', nome: 'Informazioni generali su sinistri, CID e perizie', categoria: 'INFORMATION', priorita: 31, safety_level: 'MEDIUM',
      descrizione: "Domande generali su incidenti, constatazione amichevole (CID), perizia, franchigia, risarcimento diretto, scelta della carrozzeria. Solo informazioni generali: nessun consiglio legale o assicurativo, nessuna promessa di copertura o rimborso; per il proprio caso si rimanda alla propria compagnia.",
      esempi: ['cos e la constatazione amichevole', 'cos e il cid', 'cosa e il cid', 'cosa vuol dire cid', 'come si compila la constatazione amichevole', 'come si compila il cid', 'cosa serve per la constatazione amichevole', 'cosa devo fare in caso di incidente', 'cosa si fa in caso di incidente', 'cosa fare in caso di incidente', 'cosa fare dopo un incidente', 'cosa fare se faccio un incidente', 'cosa bisogna fare dopo un incidente', 'cos e la perizia', 'come funziona la perizia', 'cosa fa il perito', 'chi e il perito', 'cos e il perito', 'cos e la franchigia', 'cosa significa franchigia', 'cos e la kasko', 'cosa copre la kasko', 'cosa copre la polizza', 'come funziona la riparazione con l assicurazione', 'come funziona il risarcimento diretto', 'cos e il risarcimento diretto', 'cosa significa risarcimento diretto', 'posso scegliere la carrozzeria', 'posso scegliere io la carrozzeria', 'posso scegliere dove riparare', 'posso scegliere il carrozziere', 'posso far riparare dove voglio', 'cosa sono le carrozzerie convenzionate', 'cosa significa carrozzeria convenzionata', 'cos e una carrozzeria convenzionata', 'cosa vuol dire convenzionata', 'cosa serve per riparare con l assicurazione', 'come funziona un sinistro', 'come funziona la riparazione dopo un incidente', 'cos e un sinistro', 'chi decide se il danno e coperto', 'chi stabilisce l importo del danno', 'cosa fa la carrozzeria in caso di sinistro'],
      keywords: ['constatazione amichevole', 'franchigia', 'kasko', 'risarcimento diretto', 'perito', 'perizia'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_convenzioni', nome: 'Convenzioni con le assicurazioni', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede se la carrozzeria è convenzionata o lavora con una compagnia assicurativa. Si risponde solo con i dati del tenant; mai affermare convenzioni non dichiarate né promettere condizioni.",
      esempi: ['siete convenzionati', 'siete convenzionati con le assicurazioni', 'siete convenzionati con la mia assicurazione', 'siete convenzionati con la mia compagnia', 'siete una carrozzeria convenzionata', 'siete in convenzione', 'avete convenzioni con le assicurazioni', 'avete delle convenzioni', 'avete una convenzione con la mia compagnia', 'lavorate con le assicurazioni', 'lavorate con tutte le assicurazioni', 'lavorate con la mia compagnia', 'lavorate con la mia assicurazione', 'accettate la mia assicurazione', 'accettate la mia compagnia', 'accettate tutte le assicurazioni', 'siete convenzionati unipol', 'siete convenzionati generali', 'siete convenzionati allianz'],
      keywords: ['convenzionati', 'convenzionata', 'convenzione', 'convenzioni'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_garanzia', nome: 'Garanzia sui lavori', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: "Il cliente chiede se i lavori hanno una garanzia e quale. Si risponde solo con i dati del tenant; mai promettere garanzie non dichiarate.",
      esempi: ['avete garanzia sui lavori', 'c e garanzia sul lavoro', 'garanzia sulla verniciatura', 'quanto dura la garanzia', 'garanzia sulla riparazione', 'date la garanzia', 'il lavoro e garantito', 'i lavori hanno garanzia', 'che garanzia date', 'c e la garanzia sulla vernice', 'avete una garanzia', 'i lavori sono garantiti'],
      keywords: ['garanzia', 'garantito', 'garantiti'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_personale', nome: 'Informazioni sul personale', categoria: 'INFORMATION', priorita: 33, safety_level: 'LOW',
      descrizione: "Chi sono i carrozzieri o il titolare della carrozzeria.",
      esempi: ['chi sono i carrozzieri', 'chi lavora sulla mia macchina', 'chi e il titolare', 'chi e il carrozziere', 'quanti carrozzieri avete', 'avete un verniciatore', 'avete un battilastra', 'chi e il responsabile della carrozzeria', 'con chi parlo per i preventivi', 'chi fa i preventivi', 'chi segue il lavoro'],
      keywords: ['carrozzieri', 'carrozziere', 'titolare', 'battilastra', 'verniciatore', 'responsabile'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'cancella_appuntamento', nome: 'Annullamento appuntamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: "Il cliente vuole disdire un appuntamento già preso.",
      esempi: ['devo disdire', 'vorrei cancellare l appuntamento', 'non posso venire', 'annullare l appuntamento', 'devo annullare', 'disdire la prenotazione', 'non riesco a venire', 'non posso portare l auto domani', 'cancellate la prenotazione', 'vorrei disdire', 'devo cancellare', 'vorrei annullare', 'annullate la prenotazione', 'annulla la prenotazione', 'annullare la prenotazione', 'annullate l appuntamento', 'cancella la prenotazione', 'disdico la prenotazione', 'annullare la visione', 'cancellare la visione', 'disdire la visione', 'annullare il preventivo', 'disdire l appuntamento', 'cancellate l appuntamento', 'cancellare l appuntamento', 'cancella l appuntamento', 'cancello l appuntamento', 'cancellate la visione', 'cancellate la prenotazione', 'cancellate l appuntamento di'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'cancellate'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_appuntamento', nome: 'Spostamento appuntamento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: "Il cliente vuole spostare un appuntamento già preso.",
      esempi: ['devo spostare l appuntamento', 'posso cambiare giorno', 'vorrei rimandare', 'posso anticipare l appuntamento', 'posso spostare a un altro giorno', 'devo cambiare orario', 'posticipare l appuntamento', 'posso portare l auto un altro giorno', 'posso spostare', 'devo spostare', 'vorrei spostare', 'spostare la prenotazione', 'posso anticipare', 'posso posticipare', 'posso rimandare', 'vorrei anticipare', 'vorrei posticipare', 'spostare la visione', 'posso spostare la visione'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'slittare'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: "Insoddisfazione per un lavoro, un preventivo o un servizio ricevuto: colore diverso, vernice che si stacca dopo la riparazione, segni rimasti, prezzo finale diverso dal preventivo, danni causati in carrozzeria.",
      esempi: ['sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'il lavoro non e andato bene', 'sono molto arrabbiato', 'ho avuto un brutto servizio', 'non sono contento del lavoro', 'sono stato trattato male', 'sono deluso dal servizio', 'il colore e diverso', 'il colore non e uguale', 'la tinta non e uguale', 'si vede la differenza di colore', 'dopo la riparazione la vernice si stacca', 'dopo la riparazione si e staccata la vernice', 'ci sono ancora i graffi dopo la riparazione', 'il paraurti non e allineato', 'il paraurti non combacia', 'la portiera non chiude bene dopo la riparazione', 'avete graffiato la macchina', 'avete rigato la macchina', 'avete rovinato la macchina', 'avete danneggiato la mia auto', 'la macchina e peggio di prima', 'lavoro fatto male', 'non avete risolto il problema', 'mi avete fatto pagare troppo', 'il conto e diverso dal preventivo', 'il prezzo finale e diverso dal preventivo', 'mi avete restituito la macchina sporca', 'dopo essere stata da voi'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'non avete risolto', 'peggio di prima'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: "Il cliente chiede di parlare con una persona o con il carrozziere.",
      esempi: ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con il carrozziere', 'vorrei parlare con il titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con la carrozzeria'],
      keywords: ['operatore', 'carrozziere', 'titolare'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: "Solo un saluto, senza richiesta.",
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: "Il cliente ringrazia o chiude la conversazione.",
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'ottimo grazie'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo immediato per le persone -> risposta predefinita (mettersi in
    // sicurezza, 112) senza chiamate al modello.
    critical: [
      ...SINTESI_FERITI,
      // fumo, fuoco, carburante, gas
      'fumo dal cofano', 'fumo sotto il cofano', 'dal cofano esce fumo', 'dal cofano esce del fumo', 'dal cofano esce un sacco di fumo', 'dal motore esce fumo', 'fumo dal motore', 'fumo dal vano motore', 'fuma il cofano', 'fuma il motore', 'esce fumo dal cofano', 'esce fumo dal motore', 'cofano che fuma', 'fumo dal radiatore', 'fumo dall abitacolo', 'fumo dal cruscotto', 'esce fumo dal cruscotto', 'esce fumo', 'esce del fumo', 'esce un po di fumo', 'esce tanto fumo', 'esce un sacco di fumo', 'c e fumo', 'ho visto del fumo', 'vedo del fumo', 'vedo fumo', 'fa fumo', 'fumo bianco', 'fumo nero', 'fumo dalla macchina', 'fumo dall auto', 'fuma la macchina', 'fuma l auto', 'fuma dal cofano', 'fuma dal cruscotto', 'fuma dal vano motore', 'fuma dal motore', 'fuma da sotto', 'fuma dalla ruota', 'fuma dal paraurti',
      'fiamme', 'ha preso fuoco', 'prende fuoco', 'va a fuoco', 'sta andando a fuoco', 'sta bruciando', 'in fiamme', 'incendio', 'incendiata', 'incendiato', 'scintille',
      'odore di benzina', 'puzza di benzina', 'odore di carburante', 'puzza di carburante', 'odore di gasolio forte', 'perde benzina', 'perdita di benzina', 'perdita di carburante', 'perde carburante', 'benzina per terra', 'carburante per terra', 'odore di gas', 'puzza di gas',
      // auto elettriche e ibride dopo un urto
      'fumo dalla batteria', 'la batteria fuma', 'batteria che fuma', 'fuma dalla batteria', 'fuma la batteria', 'esce fumo dalla batteria', 'dalla batteria esce fumo', 'fumo dal sottoscocca', 'fumo da sotto la macchina', 'fumo da sotto l auto', 'batteria in fiamme', 'la batteria brucia', 'batteria che brucia', 'cavi arancioni scoperti', 'cavi arancioni tranciati', 'cavi arancioni danneggiati', 'cavi arancioni a vista', 'cavo arancione scoperto', 'liquido dalla batteria', 'odore dolciastro dalla batteria',
      // dinamica grave
      'airbag scoppiati', 'si sono aperti gli airbag', 'airbag aperti', 'airbag esplosi', 'si sono gonfiati gli airbag', 'si e ribaltata', 'si e ribaltato', 'mi sono ribaltato', 'mi sono ribaltata', 'macchina ribaltata', 'auto ribaltata', 'cappottata', 'cappottato', 'capottata', 'si e cappottata',
      // freni e sterzo persi in marcia
      'non frena', 'non frenano', 'senza freni', 'ho perso i freni', 'ho perso lo sterzo', 'sterzo bloccato', 'volante bloccato',
    ],
    // HIGH: auto da non muovere / intervento urgente -> priorità alla carrozzeria.
    high: [
      ...INCIDENTE_PERSONALE,
      ...NON_MARCIANTE_STRADA,
      // parti che si staccano o non si chiudono: pericolo sulla strada
      'cofano che si apre', 'il cofano si e aperto', 'cofano non si chiude', 'il cofano non si chiude', 'il cofano non chiude', 'cofano aperto in marcia', 'portiera non chiude', 'portiera non si chiude', 'la portiera non si chiude', 'la portiera non chiude', 'portellone non si chiude', 'il portellone non chiude', 'il portellone non si chiude',
      'paraurti che penzola', 'paraurti penzolante', 'il paraurti penzola', 'paraurti che si stacca', 'paraurti a terra', 'paraurti e a terra', 'il paraurti e a terra', 'paraurti per terra', 'lo trascino', 'la trascino', 'pezzo che penzola', 'pezzi che cadono', 'parte staccata', 'si e staccato un pezzo', 'si e staccata una parte', 'si sta staccando un pezzo', 'specchietto penzolante', 'trascina il paraurti', 'trascina un pezzo', 'lamiera che sporge', 'lamiera tagliente', 'vetri rotti ovunque', 'parabrezza esploso', 'parabrezza sfondato', 'lunotto esploso', 'e entrata l acqua', 'acqua nell abitacolo', 'alluvione', 'allagamento',
      // liquidi e batteria alta tensione dopo un urto
      'perde olio', 'perde acqua', 'perde liquido', 'perde liquidi', 'perde refrigerante', 'perdita di olio', 'perdita di liquido', 'perdita di liquidi', 'macchia sotto la macchina', 'macchia sotto l auto', 'pozza sotto la macchina', 'pozza sotto l auto', 'liquido sotto la macchina', 'liquido sotto l auto', 'olio per terra', 'gocciola', 'sgocciola', 'chiazza sotto la macchina',
      'batteria alta tensione danneggiata', 'batteria danneggiata dopo l urto', 'batteria dell auto elettrica danneggiata', 'sotto la batteria e ammaccato', 'sottoscocca della batteria danneggiato',
      // urgenza dichiarata
      'e urgente', 'urgentissimo', 'urgentissima', 'emergenza', 'e un emergenza', 'ho bisogno subito', 'mi serve subito aiuto',
    ],
    // MEDIUM: danno che merita priorità (può rendere l'auto non a norma o esporla ad altri danni) senza pericolo dichiarato.
    medium: [
      ...NON_MARCIANTE_MECCANICA,
      'vandalizzata', 'vandalizzato', 'atto vandalico', 'atti vandalici', 'hanno rigato', 'tentato furto', 'tentativo di furto', 'hanno forzato', 'hanno rotto il vetro', 'hanno spaccato',
      'grandinata', 'sotto la grandine', 'colpita dalla grandine', 'colpito dalla grandine',
      'albero caduto', 'e caduto un albero', 'e caduto un ramo', 'tromba d aria', 'nubifragio',
      'specchietto rotto', 'specchietto staccato', 'faro rotto', 'fanale rotto', 'faro crepato', 'fanale spaccato', 'faro staccato', 'vetro rotto', 'vetro crepato', 'parabrezza crepato', 'parabrezza scheggiato', 'finestrino rotto', 'finestrino spaccato', 'crepa sul parabrezza', 'stop rotto', 'luce rotta', 'vetro spaccato',
      'ho urtato', 'ho sbattuto', 'ho strisciato', 'ho preso un palo', 'ho preso un muretto', 'ho preso un muro', 'ho toccato un muro',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con un umano', 'parlare con un carrozziere', 'parlare con il carrozziere', 'parlare con il titolare', 'parlare con il responsabile', 'parlare con la carrozzeria', 'parlare con il capo officina', 'parlare con un tecnico',
      'sentire il carrozziere', 'sentire il titolare', 'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi il carrozziere', 'mi passate il carrozziere', 'passatemi il titolare',
      'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi richiami', 'mi chiamate', 'mi chiama qualcuno', 'non sei una persona', 'sei un robot', 'sei un bot', 'sei una macchina',
      'operatore', 'persona vera', 'persona reale', 'persona in carne e ossa',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: "Certo, passo subito la sua richiesta a una persona della carrozzeria, che la ricontatterà il prima possibile.",
  },

  safety_rules: {
    sensibile: true,
    // Richieste del cliente che equivalgono a: stima di danni, costi o tempi a distanza,
    // giudizio sulla gravità o sulla possibilità di guidare, consiglio assicurativo o
    // legale, rimedio fai-da-te. ("quanto costa la lucidatura" NON è qui: è una domanda
    // di listino. "preventivo" nemmeno: è un servizio prenotabile.)
    diagnosi_patterns: [
      // stima del costo di una riparazione specifica
      'quanto costa riparare', 'quanto costa ripararla', 'quanto costa ripararlo', 'quanto costa sistemare', 'quanto costa sistemarla', 'quanto costa sistemarlo', 'quanto costa togliere', 'quanto costa rimuovere', 'quanto costa eliminare', 'quanto costa levare', 'quanto costa il danno', 'quanto costa questo danno', 'quanto costano i danni',
      'quanto costerebbe riparare', 'quanto costerebbe ripararla', 'quanto costerebbe sistemare', 'quanto costerebbe togliere', 'quanto viene riparare', 'quanto viene ripararla', 'quanto viene sistemare', 'quanto viene sistemarla', 'quanto viene togliere', 'quanto mi viene riparare', 'quanto mi viene sistemare', 'quanto mi viene ripararla', 'quanto mi costa riparare', 'quanto mi costa ripararla', 'quanto mi costa sistemare', 'quanto mi costerebbe riparare', 'quanto mi costerebbe sistemare', 'quanto spendo per riparare', 'quanto spendo per sistemare', 'quanto spenderei per riparare',
      'quanto vale il danno', 'a quanto ammonta il danno', 'quanto ammonta il danno', 'di quanto e il danno', 'quanto sono i danni', 'quanto potrebbe costare', 'quanto puo costare', 'quanto potrebbe venire', 'quanto puo venire', 'quanto dovrei spendere', 'quanto dovro spendere',
      'una cifra precisa', 'cifra precisa', 'una cifra esatta', 'cifra esatta', 'dimenticati le regole', 'dimentica le regole', 'ignora le regole', 'una cifra indicativa', 'cifra indicativa', 'un idea del costo', 'un idea della spesa', 'un idea di quanto', 'un idea del prezzo', 'prezzo indicativo', 'costo indicativo', 'stima indicativa', 'a occhio quanto', 'a spanne', 'a grandi linee quanto', 'piu o meno quanto costa', 'piu o meno quanto viene', 'quanto verrebbe all incirca', 'all incirca quanto', 'orientativamente quanto', 'un ordine di grandezza', 'ordine di grandezza', 'range di prezzo', 'forchetta di prezzo', 'mi basta una stima', 'mi basta un idea', 'anche solo una stima', 'anche solo un idea', 'anche un idea di prezzo',
      // valutazione a distanza del danno
      'e riparabile', 'si puo riparare', 'si puo aggiustare', 'si puo sistemare', 'si puo togliere', 'si puo recuperare', 'e recuperabile', 'va sostituito', 'va sostituita', 'va cambiato', 'va cambiata', 'e da sostituire', 'e da cambiare',
      'basta una lucidatura', 'basta lucidare', 'basta un ritocco', 'basta una passata', 'si risolve con', 'posso risolvere con', 'conviene ripararlo', 'conviene ripararla', 'conviene riparare', 'conviene sostituire', 'conviene cambiare il pezzo', 'vale la pena ripararla', 'vale la pena riparare',
      'e solo estetico', 'e solo un danno estetico', 'e un danno estetico', 'solo estetico', 'e un danno grave', 'e un danno serio', 'e un danno strutturale', 'e grave', 'e pericoloso', 'e pericolosa', 'e serio', 'e strutturale', 'ha danni strutturali', 'il telaio e danneggiato', 'il telaio e a posto', 'telaio a posto', 'e tutto a posto', 'sara tutto a posto', 'c e qualcosa di rotto sotto', 'che danni ha', 'che danni ho', 'quali danni ha', 'quali danni ci sono', 'cosa si e rotto', 'cosa e danneggiato', 'cosa si e danneggiato', 'cosa ha preso',
      'secondo te e', 'secondo voi e', 'secondo lei e', 'secondo te si puo', 'secondo voi si puo', 'secondo lei si puo', 'secondo voi quanto', 'secondo te quanto', 'secondo lei quanto', 'secondo voi conviene', 'secondo te conviene', 'dammi una diagnosi', 'dimmi cosa ho', 'dimmi cosa ha', 'dimmi almeno cosa',
      // si può guidare / si può aspettare
      'posso guidare', 'posso ancora guidare', 'posso continuare a guidare', 'si puo guidare', 'si puo ancora guidare', 'posso usare la macchina', 'posso usare l auto', 'posso circolare', 'posso andare in giro', 'posso viaggiare', 'posso fare il viaggio', 'posso arrivare fino', 'posso arrivare da voi guidando', 'posso venire guidando', 'posso venire da voi guidando', 'posso venire da voi con la macchina', 'posso venire da voi in macchina', 'posso venire con la macchina', 'posso venire in macchina', 'posso guidare fino da voi', 'posso portarla guidando', 'posso portarla da voi guidando', 'si puo portare guidando', 'posso arrivare guidando', 'e sicura da guidare', 'e sicuro guidare', 'e sicuro viaggiare', 'e a norma', 'sono a norma', 'passo la revisione', 'passa la revisione', 'posso fare la revisione cosi', 'mi fermano', 'mi multano', 'rischio la multa', 'rischio una multa', 'posso essere multato',
      'posso aspettare', 'si puo aspettare', 'posso rimandare', 'posso farlo piu avanti', 'posso lasciarlo cosi', 'posso tenerla cosi', 'posso tenere la macchina cosi', 'posso lasciare cosi', 'si puo lasciare cosi', 'fino a quando posso aspettare', 'devo preoccuparmi', 'mi devo preoccupare', 'e preoccupante',
      // fai-da-te
      'posso farlo da solo', 'posso farlo io', 'posso ripararlo', 'posso ripararla', 'come si ripara', 'come posso riparare', 'come faccio a riparare', 'come si toglie', 'come tolgo', 'come posso togliere', 'come faccio a togliere', 'come rimuovo', 'come levo', 'come sistemo', 'come aggiusto', 'come lo sistemo', 'come la sistemo', 'come lo aggiusto', 'come la aggiusto', 'come lucidare', 'come si lucida', 'come posso lucidare', 'come faccio a lucidare', 'come ritoccare', 'come si ritocca', 'come faccio a ritoccare', 'come si stucca', 'come stuccare', 'come posso verniciare', 'come si vernicia', 'come verniciare', 'come faccio a verniciare', 'come rimuovere un graffio', 'come togliere un graffio', 'come tolgo il graffio', 'come tolgo l ammaccatura', 'come togliere l ammaccatura', 'con il fon', 'con il phon', 'con l acqua calda', 'con il ghiaccio', 'trucchetto', 'rimedio casalingo', 'rimedi casalinghi', 'fai da te', 'pasta abrasiva', 'dentifricio', 'bicarbonato', 'ventosa', 'sturalavandini', 'kit levabolli', 'kit per togliere le ammaccature', 'bomboletta', 'vernice spray', 'penna ritocco', 'posso smontare', 'come smonto', 'come smontare', 'come si smonta', 'posso togliere il paraurti da solo', 'istruzioni per riparare',
      // altre domande "si può lucidare / togliere / ritoccare" sul danno
      'si puo lucidare', 'si puo ritoccare', 'si puo verniciare', 'si puo levigare', 'si puo eliminare', 'si puo rimuovere', 'si puo cancellare', 'si toglie', 'va via', 'va via con', 'posso lucidarlo', 'posso lucidarla', 'basta lucidarlo', 'basta lucidarla', 'si puo togliere con',
      // garanzie e rassicurazioni pretese
      'garantiscimi', 'garantitemi', 'mi garantite', 'mi garantisci', 'mi prometti', 'mi promettete', 'mi giuri', 'mi giurate', 'rassicurami', 'mi rassicuri', 'mi rassicurate', 'tranquillizzami', 'mi tranquillizzi', 'dimmi che e', 'dimmi che non', 'e solo un graffio', 'e solo un graffietto', 'solo un graffietto', 'e solo una botta', 'e solo un bozzo', 'e solo un ammaccatura', 'e solo un segno', 'paga tutto', 'mi paga tutto', 'paghera tutto', 'mi rimborsano tutto',
      // consigli assicurativi e legali
      'mi paga l assicurazione', 'mi rimborsa l assicurazione', 'mi rimborsano', 'mi risarciscono', 'mi risarcisce', 'sara risarcito', 'sara rimborsato', 'mi spetta un risarcimento', 'ho diritto al risarcimento', 'ho diritto a un rimborso', 'e coperto', 'sara coperto', 'e coperta', 'sara coperta', 'sono coperto', 'copre l assicurazione', 'copre la mia polizza', 'lo copre la kasko', 'mi copre la kasko', 'me lo copre', 'rientra nella copertura', 'rientra nella mia polizza', 'rientra nella kasko', 'e incluso nella polizza', 'la mia polizza copre', 'la mia assicurazione copre', 'la polizza copre', 'l assicurazione copre', 'mi coprono', 'coprono il danno', 'pagano loro', 'paga la compagnia', 'paga l assicurazione', 'chi deve pagare', 'chi paga il danno', 'quanto mi rimborsano', 'quanto mi da l assicurazione', 'quanto mi paga l assicurazione', 'mi pagano il danno',
      'di chi e la colpa', 'di chi e la responsabilita', 'chi ha ragione', 'chi ha torto', 'ho ragione io', 'ho torto', 'e colpa mia', 'e colpa sua', 'la colpa e', 'chi e il responsabile del danno',
      'conviene fare il sinistro', 'conviene aprire il sinistro', 'conviene pagare io', 'conviene pagare di tasca mia', 'conviene pagare di tasca', 'conviene far pagare l assicurazione', 'devo aprire il sinistro', 'devo fare il sinistro', 'devo aprire un sinistro', 'posso aprire un sinistro', 'devo denunciare il sinistro', 'devo fare la denuncia', 'devo denunciare', 'posso denunciare', 'serve la denuncia', 'fare denuncia', 'fare la denuncia', 'devo fare denuncia', 'denuncia ai carabinieri', 'denuncia alla polizia', 'avvisare i carabinieri', 'avvisare la polizia', 'rivolgermi ai carabinieri', 'andare dai carabinieri', 'andare alla polizia', 'chiamare i carabinieri', 'chiamare la polizia', 'devo andare dai carabinieri', 'devo chiamare i carabinieri', 'devo chiamare la polizia', 'devo chiamare i vigili',
      'la classe di merito', 'perdo la classe', 'mi aumenta il premio', 'aumenta il premio', 'mi sale il premio', 'mi aumenta la polizza', 'bonus malus',
      'cosa scrivo nel cid', 'cosa devo scrivere nel cid', 'cosa scrivo nella constatazione', 'come compilo il cid', 'come compilo la constatazione', 'devo firmare il cid', 'posso firmare il cid', 'posso firmare la constatazione', 'devo firmare la constatazione', 'firmo il cid', 'firmo la constatazione', 'e valido il cid', 'il cid e valido', 'posso rifiutare la perizia', 'posso rifiutare il perito', 'posso riparare prima della perizia', 'posso riparare prima del perito',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      // stime di danno, valutazioni a distanza, rassicurazioni
      'e solo estetico', 'e solo un danno estetico', 'solo un danno estetico', 'e un danno estetico', 'e un danno lieve', 'e un danno grave', 'e un danno serio', 'danno strutturale', 'nessun danno strutturale', 'non ha danni strutturali', 'telaio a posto', 'nessun danno al telaio',
      'e sicuramente riparabile', 'sicuramente riparabile', 'si ripara facilmente', 'si ripara senza problemi', 'si risolve facilmente', 'va sicuramente sostituito', 'va sicuramente sostituita', 'basta una lucidatura', 'basta un ritocco', 'basta una passata', 'basta lucidare',
      'non e grave', 'non e niente', 'non e nulla', 'non si preoccupi', 'non ti preoccupare', 'stia tranquillo', 'stia tranquilla', 'puo stare tranquillo', 'puo stare tranquilla', 'non c e pericolo', 'nessun pericolo', 'non e pericoloso', 'puo aspettare', 'puoi aspettare', 'puo andare avanti', 'puoi andare avanti', 'puo proseguire', 'puo guidare', 'puoi guidare', 'guidare tranquillamente', 'guidare senza problemi', 'puo guidare senza',
      // risultati estetici
      'come nuova', 'come nuovo', 'come se non fosse mai successo', 'risultato perfetto', 'finitura perfetta', 'colore identico', 'tinta identica', 'identica all originale', 'identico all originale', 'nessuna differenza di colore', 'non si notera', 'non si vedra', 'non si vedra niente', 'sparira del tutto', 'scomparira', 'invisibile',
      // fai-da-te
      'il fon', 'il phon', 'la ventosa', 'una ventosa', 'il dentifricio', 'la pasta abrasiva', 'una bomboletta', 'il bicarbonato', 'acqua calda', 'smonti', 'smontare', 'svita', 'svitare', 'stacchi la batteria', 'stacca la batteria', 'scolleghi la batteria', 'scollega la batteria', 'con il fon', 'con il phon', 'con la ventosa', 'con il dentifricio', 'con la pasta abrasiva', 'con una bomboletta', 'con il bicarbonato', 'sostituisca lei', 'sostituisci tu', 'faccia da solo', 'fai da te',
      // assicurazione e responsabilità
      'l assicurazione paghera', 'l assicurazione coprira', 'l assicurazione rimborsera', 'l assicurazione le pagher', 'la compagnia paghera', 'la compagnia coprira', 'la compagnia rimborsera', 'sara coperto', 'sara coperta', 'sara rimborsato', 'sara risarcito', 'sara risarcita', 'e coperto dall assicurazione', 'e coperta dall assicurazione', 'il danno e coperto', 'il sinistro e coperto', 'rientra nella copertura', 'avra il rimborso', 'le spetta', 'ha diritto al risarcimento', 'ha diritto al rimborso', 'non paghera nulla', 'non paga niente', 'non paga nulla', 'non spendera niente', 'non spendera nulla', 'senza spendere nulla', 'senza costi per lei', 'a costo zero', 'tutto a carico dell assicurazione', 'tutto a carico della compagnia',
      'la colpa e sua', 'non e colpa sua', 'e colpa sua', 'e colpa dell altro', 'e responsabilita dell altro', 'ha torto', 'ha ragione', 'lei non ha colpa', 'conviene aprire il sinistro', 'conviene fare il sinistro', 'non conviene aprire il sinistro', 'firmi il cid', 'non firmi il cid', 'scriva nel cid', 'faccia denuncia', 'faccia la denuncia', 'deve fare la denuncia',
      // costi, tempi, promozioni, claim sul tenant
      'costera circa', 'costa circa', 'dovrebbe costare', 'verra circa', 'spenderebbe circa', 'si aggira intorno', 'sara pronta', 'sara pronto', 'pronta in giornata', 'pronto in giornata', 'pronta domani', 'pronto domani', 'pronta entro', 'pronto entro', 'ci vogliono', 'ci vorranno', 'ci vorra', 'ci vuole circa', 'un paio di giorni', 'un paio d ore', 'in un paio di giorni', 'in pochi giorni', 'entro la settimana', 'in giornata',
      'gratis', 'gratuito', 'gratuita', 'in omaggio', 'tutte le marche', 'tutti i marchi', 'tutti i modelli', 'carrozzeria autorizzata', 'concessionaria ufficiale', 'ricambi originali garantiti',
      // auto di cortesia: solo se dichiarata dal tenant
      'auto di cortesia inclusa', 'auto sostitutiva inclusa', 'auto sostitutiva e inclusa', 'auto di cortesia e inclusa', 'auto di cortesia e garantita', 'auto sostitutiva e garantita', 'e inclusa per tutti', 'inclusa per tutti i lavori', 'sempre disponibile', 'auto sostitutiva sempre disponibile', 'auto di cortesia garantita', 'auto sostitutiva garantita', 'auto di cortesia per tutti', 'auto sostitutiva per tutti', 'vi diamo l auto di cortesia', 'vi diamo un auto di cortesia', 'le diamo un auto di cortesia', 'le diamo l auto sostitutiva', 'le diamo un auto sostitutiva', 'avra un auto di cortesia', 'avra un auto sostitutiva', 'avra l auto di cortesia', 'avra l auto sostitutiva', 'le forniamo un auto sostitutiva', 'le forniamo un auto di cortesia',
    ],
    messaggio_sicurezza: "Non posso valutare a distanza i danni, i costi o i tempi di riparazione, né dire se sia sicuro guidare l'auto o come ripararla da soli, né dare indicazioni su assicurazione, responsabilità, rimborsi o denunce: per questo la carrozzeria deve prima vedere il veicolo. Se vuole, la aiuto a fissare la visione, oppure passo la sua domanda a una persona.",
    messaggio_emergenza: "Capisco, la situazione può essere pericolosa. Si metta in sicurezza lontano dal veicolo e dalla carreggiata e non rimanga in mezzo alla strada. Se ci sono feriti o un pericolo immediato chiami subito il 112; se vede fumo o fiamme o sente odore di carburante o di gas si allontani dall'auto. Avviso immediatamente la carrozzeria.",
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    servizio: ["Di che danno o lavoro si tratta: un graffio, un'ammaccatura, una verniciatura, altro?", "Mi racconta che danno ha l'auto o che lavoro vorrebbe fare?", "Che tipo di intervento le serve sulla carrozzeria?"],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    parte: ["In che punto dell'auto si trova il danno?", "Mi dice quale parte dell'auto è interessata?"],
    marca: ["Che auto ha? Mi dice marca e modello?", "Di che marca e modello è l'auto?"],
  },

  common_scenarios: [
    'Danno di carrozzeria (graffio, ammaccatura, paraurti, grandine, vandalismo): raccolta di nome e danno e organizzazione della visione del veicolo',
    'Richiesta di preventivo: nessuna cifra a distanza, il preventivo si fa dopo la visione del veicolo',
    "Pericolo (feriti, fumo, fiamme, carburante, batteria di un'auto elettrica danneggiata): invito a mettersi in sicurezza, 112 e passaggio rapido alla carrozzeria",
    'Incidente raccontato, veicolo non marciante o pratica assicurativa in corso: passaggio a una persona',
    'Domande su sinistri, CID, perizia, franchigia: solo informazioni generali, nessun consiglio assicurativo o legale',
    'Richieste di stima del danno, dei costi o dei tempi, di poter guidare o di rimedi fai-da-te: risposta di sicurezza e proposta di visione',
    'Prezzi, orari, auto di cortesia, convenzioni, garanzia, pagamenti: solo da dati del tenant',
    "Stato dell'auto in carrozzeria, spostamenti, annullamenti, reclami: passaggio a una persona",
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque carrozzeria. Nessun
// prezzo, orario, tempo di lavorazione, convenzione, garanzia, marchio trattato,
// nome o indirizzo: quelli stanno solo nei dati del tenant. Le FAQ su sinistri e
// assicurazioni sono SOLO informazioni generali e vanno riviste da un professionista.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_preventivo', 'Perché serve vedere l\'auto per il preventivo?', ['perche serve vedere l auto', 'perche serve vedere la macchina per il preventivo', 'serve vedere l auto per il preventivo', 'perche non potete dirmi il prezzo', 'perche non mi dite una cifra', 'bisogna vedere l auto per il preventivo', 'serve portare l auto per il preventivo'],
    "Un danno di carrozzeria può nascondere parti rovinate sotto la superficie, e la differenza tra riparare, ritoccare o sostituire un pezzo si capisce solo guardando il veicolo da vicino. Per questo il preventivo si formula dopo la visione dell'auto: prima, qualunque cifra sarebbe solo un'ipotesi."),
  f('info_preventivo', 'Come funziona il preventivo?', ['come funziona il preventivo', 'come si fa il preventivo', 'come funziona la visione', 'cosa succede dopo la visione', 'come vi muovete per il preventivo', 'come funziona la visione del veicolo'],
    "Si porta l'auto in carrozzeria, il carrozziere osserva i danni, decide che lavori servono e poi formula il preventivo. I tempi e le condizioni (validità, eventuali costi della visione) li stabilisce la carrozzeria: si possono chiedere direttamente a lei."),
  f('info_preventivo', 'Che informazioni servono per un preventivo?', ['che informazioni servono per un preventivo', 'cosa serve per il preventivo', 'cosa vi serve per fare il preventivo', 'cosa devo dirvi per il preventivo', 'cosa serve sapere per il preventivo'],
    "Per organizzare la visione servono di solito marca, modello e anno dell'auto, la targa e una descrizione chiara del danno: dove si trova, di che tipo è e, se lo si sa, come si è prodotto. Il preventivo vero e proprio lo fa la carrozzeria dopo aver visto il veicolo."),
  f('info_preventivo', 'Posso mandare delle foto per il preventivo?', ['posso mandare le foto per il preventivo', 'posso mandarvi delle foto', 'preventivo con le foto', 'preventivo dalle foto', 'preventivo via whatsapp', 'preventivo a distanza', 'preventivo online', 'preventivo per telefono', 'preventivo senza portare l auto', 'potete fare il preventivo dalle foto'],
    "Le foto possono aiutare lo staff a farsi un'idea del danno, ma non sostituiscono la visione del veicolo: il preventivo definitivo si formula dopo averlo visto. Se e come la carrozzeria usa le foto lo decide la carrozzeria stessa."),
  f('info_lavorazioni', 'Che differenza c\'è tra riparare e sostituire un pezzo?', ['che differenza c e tra riparare e sostituire', 'differenza tra riparazione e sostituzione', 'meglio riparare o sostituire', 'quando si sostituisce un pezzo', 'quando si ripara un pezzo', 'riparare o sostituire'],
    "Riparare significa riportare il pezzo alla forma originale, di solito con raddrizzatura, stucco e verniciatura; sostituire significa montarne uno nuovo (o di recupero) e verniciarlo se serve. Cosa convenga lo decide il carrozziere in base a entità del danno, tipo di materiale e disponibilità dei ricambi, dopo aver visto l'auto."),
  f('info_lavorazioni', 'Cos\'è lo smart repair o il levabolli?', ['cos e lo smart repair', 'cos e il levabolli', 'come funziona lo smart repair', 'cos e la riparazione senza verniciatura', 'smart repair cos e', 'riparazione ammaccature senza verniciare', 'come funziona il levabolli'],
    "Sono tecniche per riparare piccoli danni, come certe ammaccature o graffi leggeri, senza rifare la verniciatura di tutto il pezzo. Si possono usare solo se la vernice è integra e il danno rientra in certi limiti: lo stabilisce il carrozziere guardando l'auto."),
  f('info_lavorazioni', 'Che differenza c\'è tra ritocco, lucidatura e verniciatura?', ['differenza tra ritocco e verniciatura', 'che differenza c e tra ritocco e verniciatura', 'differenza tra lucidatura e verniciatura', 'cos e il ritocco', 'cos e la lucidatura', 'a cosa serve la lucidatura', 'lucidatura o verniciatura'],
    "La lucidatura leviga lo strato superficiale della vernice e può attenuare segni leggeri; il ritocco copre con poca vernice piccoli punti, come le scheggiature; la verniciatura rifà lo strato di colore su una parte più ampia. Quale serve dipende dalla profondità del danno e si capisce guardando l'auto."),
  f('info_lavorazioni', 'Come si valutano i danni da grandine?', ['come si valutano i danni da grandine', 'come vengono valutati i danni da grandine', 'come funziona la riparazione dei danni da grandine', 'danni da grandine come funziona', 'grandine auto cosa si fa', 'come si ripara la grandine'],
    "I danni da grandine si valutano guardando l'auto: contano il numero e la dimensione delle ammaccature, dove si trovano e se la vernice è rimasta integra. A seconda dei casi si possono riparare senza verniciatura o rifare i pannelli più colpiti; la scelta e il preventivo spettano alla carrozzeria dopo la visione."),
  f('info_lavorazioni', 'Perché viene la ruggine e cosa si fa?', ['cos e la ruggine', 'perche viene la ruggine', 'ruggine sulla macchina cosa si fa', 'ruggine auto', 'bolle di ruggine', 'perche la macchina arrugginisce'],
    "La ruggine nasce quando la lamiera resta senza protezione, per esempio dopo una scheggiatura o un graffio profondo, e a contatto con umidità si ossida. In carrozzeria si valuta quanto è estesa e si interviene pulendo la parte e ripristinando la protezione e la verniciatura: l'entità si vede solo dal vivo."),
  f('info_lavorazioni', 'Come viene scelto il colore della verniciatura?', ['come trovate il colore giusto', 'come scegliete il colore', 'cos e il codice colore', 'dove trovo il codice colore', 'come si sceglie il colore della vernice', 'il colore viene uguale'],
    "Il carrozziere parte dal codice colore del costruttore e lo confronta con l'auto, perché la vernice cambia nel tempo con sole e usura. Di solito non serve che il cliente conosca il codice; il risultato si verifica a lavoro concluso."),
  f('info_lavorazioni', 'Quanto tempo ci vuole per una riparazione?', ['quanto tempo ci vuole per una riparazione', 'quanto tempo ci vuole per riparare', 'quanto tempo ci vuole per una verniciatura', 'quanti giorni ci vogliono', 'quanto ci mettete', 'quanto tempo serve per riparare la macchina', 'quanto dura una riparazione', 'quanto dura la verniciatura', 'tempi di riparazione', 'tempi di lavorazione', 'tempi di consegna', 'per quanti giorni devo lasciare l auto', 'quanto tempo resto senza macchina'],
    "I tempi dipendono dal tipo di danno, dai pezzi da riparare o sostituire, dalla disponibilità dei ricambi, dalle fasi di verniciatura e dal carico di lavoro della carrozzeria, quindi non si possono indicare in modo generale né a distanza. La carrozzeria può dare un'indicazione concreta dopo aver visto l'auto."),
  f('info_lavorazioni', 'Cosa sono i ricambi originali, equivalenti e di recupero?', ['cosa vuol dire parte originale', 'cosa sono i ricambi equivalenti', 'differenza tra ricambi originali ed equivalenti', 'cosa sono i ricambi di recupero', 'ricambi originali o equivalenti', 'usate ricambi originali'],
    "I ricambi originali sono prodotti dal costruttore dell'auto o per suo conto; quelli equivalenti sono prodotti da altre aziende secondo specifiche analoghe; quelli di recupero provengono da veicoli demoliti. Quali ricambi usa una carrozzeria, e se il cliente può scegliere, lo dice la carrozzeria stessa."),
  f('info_lavorazioni', 'A cosa serve il banco di raddrizzatura?', ['cos e la raddrizzatura', 'cos e il banco di raddrizzatura', 'a cosa serve il banco di raddrizzatura', 'raddrizzatura telaio', 'cos e la messa in squadra', 'come si controlla il telaio'],
    "Il banco di raddrizzatura permette di misurare la struttura portante dell'auto e di riportarla alle quote del costruttore dopo un urto importante. Se un veicolo ne abbia bisogno lo stabilisce il carrozziere con una verifica sul veicolo."),
  f('info_lavorazioni', 'Cosa sono le pellicole e il wrapping?', ['cos e il wrapping', 'cos e il ppf', 'cos e la pellicola protettiva', 'cosa sono le pellicole', 'wrapping auto cos e', 'cambio colore con pellicola'],
    "Il wrapping è il rivestimento della carrozzeria con una pellicola adesiva colorata o decorativa, mentre le pellicole protettive proteggono la vernice da piccoli urti e graffi. Durata e risultato dipendono dal materiale, dalla posa e dalla cura dell'auto, e li indica la carrozzeria che esegue il lavoro."),
  f('info_lavorazioni', 'Come si ripara il parabrezza scheggiato?', ['come funziona la riparazione del parabrezza', 'scheggiatura parabrezza cosa si fa', 'parabrezza scheggiato riparare o sostituire', 'sasso sul parabrezza', 'parabrezza crepato cosa fare', 'parabrezza si ripara o si sostituisce'],
    "Nelle scheggiature piccole il vetro si può a volte riparare con una resina, mentre quando la crepa è estesa o in una zona critica si sostituisce il parabrezza. Una scheggiatura tende ad allargarsi nel tempo, per questo è meglio farla vedere presto a un professionista, che stabilisce cosa serve."),
  f('info_lavorazioni', 'Perché i fari diventano opachi?', ['perche i fari diventano opachi', 'fari opachi cosa si fa', 'fari ingialliti', 'cos e la lucidatura dei fari', 'faro opaco come si risolve', 'si possono lucidare i fari'],
    "La plastica dei fari con gli anni si opacizza per sole, agenti atmosferici e usura del trattamento protettivo, riducendo la luce emessa. In molti casi una lucidatura con nuovo trattamento protettivo li migliora, ma se la plastica è danneggiata in profondità può servire la sostituzione: lo valuta il professionista guardandoli."),
  f('info_lavorazioni', 'Come si ripara un\'auto elettrica o ibrida dopo un urto?', ['le auto elettriche si riparano in carrozzeria', 'come funziona la riparazione di un auto elettrica', 'auto elettrica dopo un urto', 'auto ibrida carrozzeria', 'riparate auto elettriche', 'batteria auto elettrica urto'],
    "Le auto elettriche e ibride hanno componenti ad alta tensione, per cui dopo un urto serve personale formato e attrezzato che verifichi la sicurezza del veicolo prima di lavorarci. Se una carrozzeria sia abilitata a lavorare su questi veicoli lo può dire solo la carrozzeria. Se dopo un urto si vedono fumo, cavi arancioni scoperti o odori strani, ci si allontana dall'auto e si chiamano i soccorsi."),
  f('info_sinistri', 'Cos\'è la constatazione amichevole (CID)?', ['cos e la constatazione amichevole', 'cos e il cid', 'cosa e il cid', 'cosa vuol dire cid', 'come si compila la constatazione amichevole', 'come si compila il cid', 'cosa serve per la constatazione amichevole', 'a cosa serve il modulo blu', 'modulo blu'],
    "La constatazione amichevole, detta anche CID o modulo blu, è il modulo con cui i conducenti coinvolti in un incidente descrivono le circostanze e i dati dei veicoli, e che di norma si invia alla propria compagnia. Come compilarlo e quali conseguenze abbia nel proprio caso lo spiegano la compagnia assicurativa o un professionista: la carrozzeria non può dare indicazioni su questo."),
  f('info_sinistri', 'Cosa si fa in caso di incidente?', ['cosa devo fare in caso di incidente', 'cosa si fa in caso di incidente', 'cosa fare in caso di incidente', 'cosa fare dopo un incidente', 'cosa fare se faccio un incidente', 'cosa bisogna fare dopo un incidente'],
    "In generale la prima cosa è la sicurezza di tutti: ci si ferma, si mette in sicurezza il veicolo e, se ci sono feriti o pericolo, si chiama subito il 112. Per le questioni assicurative e legali il riferimento è la propria compagnia o un professionista; la carrozzeria interviene sul veicolo."),
  f('info_sinistri', 'Come funziona la perizia dell\'assicurazione?', ['cos e la perizia', 'come funziona la perizia', 'cosa fa il perito', 'chi e il perito', 'cos e il perito', 'perizia assicurazione', 'come funziona un sinistro', 'cos e un sinistro'],
    "Dopo un sinistro la compagnia può incaricare un perito che verifica il danno e ne valuta l'entità secondo il contratto. Tempi, modalità ed esito della perizia dipendono dalla compagnia e dal contratto: la carrozzeria non decide gli importi del risarcimento e non può prevederne l'esito."),
  f('info_sinistri', 'Posso scegliere la carrozzeria dove riparare?', ['posso scegliere la carrozzeria', 'posso scegliere io la carrozzeria', 'posso scegliere dove riparare', 'posso scegliere il carrozziere', 'posso far riparare dove voglio', 'cosa sono le carrozzerie convenzionate', 'cosa significa carrozzeria convenzionata', 'cos e una carrozzeria convenzionata', 'cosa vuol dire convenzionata'],
    "In generale il cliente può rivolgersi alla carrozzeria che preferisce, ma alcune polizze prevedono reti di carrozzerie convenzionate con condizioni proprie. Cosa preveda il suo contratto lo deve verificare con la propria compagnia: la carrozzeria non può dare indicazioni su questo."),
  f('info_sinistri', 'Cos\'è la franchigia?', ['cos e la franchigia', 'cosa significa franchigia', 'franchigia assicurazione', 'cosa vuol dire franchigia', 'cos e lo scoperto'],
    "La franchigia (o lo scoperto) è la parte di danno che, secondo il contratto di assicurazione, resta a carico di chi è assicurato. Se e quanto si applichi nel suo caso dipende solo dal contratto: lo si verifica con la propria compagnia."),
  f('info_sinistri', 'Cosa sono la kasko e il risarcimento diretto?', ['cos e la kasko', 'cosa copre la kasko', 'cosa copre la polizza', 'come funziona il risarcimento diretto', 'cos e il risarcimento diretto', 'cosa significa risarcimento diretto', 'garanzie accessorie assicurazione', 'copertura grandine vandalismo'],
    "La kasko è una garanzia facoltativa che può coprire danni al proprio veicolo anche senza colpa di altri; il risarcimento diretto è la procedura con cui, in certi casi di incidente tra veicoli, ci si rivolge alla propria compagnia per il danno. Cosa è coperto, e in che misura, dipende dal contratto e dalle circostanze: lo chiarisce la compagnia."),
  f('info_sinistri', 'Cosa fa la carrozzeria in caso di sinistro?', ['cosa fa la carrozzeria in caso di sinistro', 'come funziona la riparazione con l assicurazione', 'come funziona la riparazione dopo un incidente', 'cosa serve per riparare con l assicurazione', 'chi decide se il danno e coperto', 'chi stabilisce l importo del danno'],
    "La carrozzeria si occupa della riparazione del veicolo: vede i danni e formula il preventivo dei lavori. Se il danno sia coperto e quanto venga riconosciuto lo decide la compagnia assicurativa; per questo la carrozzeria non può promettere coperture o rimborsi. Le modalità pratiche si concordano direttamente con la carrozzeria."),
  f('info_documenti', 'Cosa devo portare in carrozzeria?', ['cosa devo portare', 'che documenti servono', 'devo portare il libretto', 'serve la carta di circolazione', 'servono i documenti', 'cosa serve per lasciare l auto', 'devo portare i documenti dell assicurazione', 'devo portare il cid', 'cosa devo portare con me'],
    "In genere servono la carta di circolazione dell'auto, un documento di identità e le chiavi; in caso di sinistro può servire anche la documentazione relativa (per esempio il modulo di constatazione amichevole o i dati della compagnia), se già disponibile. L'elenco preciso lo dà la carrozzeria."),
  f('info_auto_sostitutiva', 'C\'è un\'auto sostitutiva mentre riparano la mia?', ['avete l auto sostitutiva', 'mi date un auto di cortesia', 'c e l auto di cortesia', 'auto sostitutiva carrozzeria', 'macchina di cortesia', 'senza macchina per qualche giorno', 'avete un muletto'],
    "La disponibilità di un'auto di cortesia o sostitutiva, e le condizioni per averla, dipendono da ogni singola carrozzeria e talvolta anche dal contratto assicurativo del cliente. Se la carrozzeria offre il servizio lo comunica direttamente; in caso contrario conviene chiedere allo staff."),
  f('info_garanzia', 'I lavori di carrozzeria hanno una garanzia?', ['avete garanzia sui lavori', 'c e garanzia sul lavoro', 'garanzia sulla verniciatura', 'garanzia sulla riparazione', 'che garanzia date', 'il lavoro e garantito', 'quanto dura la garanzia'],
    "Se, per quanto tempo e a quali condizioni un lavoro sia coperto da garanzia lo stabilisce la singola carrozzeria. Conviene chiedere allo staff le condizioni applicate, in particolare per la verniciatura."),
  f('info_servizi', 'Una carrozzeria fa anche meccanica o soccorso stradale?', ['fate meccanica', 'fate anche la meccanica', 'fate anche i tagliandi', 'fate il carro attrezzi', 'avete il carro attrezzi', 'fate soccorso stradale', 'recuperate le auto'],
    "Alcune carrozzerie offrono anche servizi di meccanica, revisione o carro attrezzi, altre no: i servizi offerti dipendono dalla singola attività, quindi per sapere se li offre conviene chiedere allo staff."),
  f('info_lavorazioni', 'Cosa succede se la vernice si vede diversa dopo la riparazione?', ['la vernice si vede diversa dopo la riparazione', 'il colore dopo la riparazione e diverso', 'differenza di colore dopo la verniciatura', 'la tinta e diversa', 'colore non uguale dopo la riparazione'],
    "Il carrozziere lavora per uniformare il colore al resto dell'auto, ma il risultato si valuta a lavoro concluso, perché dipende dalla vernice originale, dall'usura e dalla luce. Se dopo un lavoro il colore non convince, il passo giusto è segnalarlo alla carrozzeria, che può guardare l'auto e valutare il da farsi."),
  f('info_lavorazioni', 'Cos\'è la lucidatura e cosa può fare?', ['cos e la lucidatura', 'a cosa serve la lucidatura', 'la lucidatura toglie i graffi', 'si puo lucidare un graffio', 'lucidatura carrozzeria cosa fa', 'trattamento ceramico cos e'],
    "La lucidatura riduce i segni più superficiali nello strato trasparente della vernice e restituisce brillantezza, mentre non elimina i danni che arrivano più in profondità. Se un segno si possa togliere con la lucidatura lo valuta il carrozziere guardando l'auto."),
];
