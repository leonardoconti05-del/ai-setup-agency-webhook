// lib/engine/packs/bar_caffetteria.js
//
// Sector Pack "bar_caffetteria" v1 — conoscenza di SETTORE (bar, caffetteria,
// pasticceria-bar, aperitivi; Italia), non di un singolo locale. Prezzi,
// orari, giorno di chiusura, prodotti e menù, disponibilità, tempi minimi per
// gli ordini, promozioni, personale e indirizzo NON stanno qui: arrivano solo
// dai dati del tenant. Il motore non cambia: un nuovo settore è solo dati.
//
// Differenza dal ristorante: qui contano velocità, ordini su ordinazione
// (torte, vassoi, pasticcini con data di ritiro), eventi e rinfreschi,
// aperitivi; non il tavolo da cena. Gli allergeni sono una richiesta
// SENSIBILE (mai garanzie di assenza: li conferma il personale) e una
// reazione allergica in corso è un'emergenza.

export const SETTORE = 'bar_caffetteria';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack bar/caffetteria — lessico colazione/aperitivo/ordini su ordinazione/eventi, 21 intent, 13 entità (numero persone, giorno/data, ora, quantità, tipo di ordine, occasione, esigenze alimentari), urgenza LOW-CRITICAL con allergie come richiesta sensibile e reazione allergica = 118, anti-promesse su fattibilità/disponibilità, 23 FAQ di settore.';

// ===== Generatori di lessico (solo dati: nessuna logica nel motore) =====
const PAROLE_NUM = { 1: 'uno', 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci', 11: 'undici', 12: 'dodici', 13: 'tredici', 14: 'quattordici', 15: 'quindici', 16: 'sedici', 17: 'diciassette', 18: 'diciotto', 19: 'diciannove', 20: 'venti', 30: 'trenta', 40: 'quaranta', 50: 'cinquanta', 60: 'sessanta', 100: 'cento' };

// numero_persone: solo in contesti inequivocabili ("6 persone", "siamo in 4",
// "tavolo per 5"). Mai "per 4" nudo ("per 2 giorni" non è un numero di persone).
function vociPersone() {
  const out = [];
  for (let n = 1; n <= 120; n++) {
    const w = PAROLE_NUM[n];
    const forme = [`${n} persone`, `${n} persona`, `${n} pax`, `${n} amici`, `${n} ospiti`, `${n} invitati`, `${n} adulti`, `${n} pers`, `${n} colleghi`, `${n} dipendenti`, `${n} ragazzi`, `${n} bambini`, `${n} bimbi`, `siamo in ${n}`, `saremo in ${n}`, `siamo ${n}`, `saremo ${n}`, `tavolo per ${n}`, `tavolo da ${n}`, `tavolo x ${n}`, `tavolino per ${n}`, `tavolata da ${n}`, `posto per ${n}`, `posti per ${n}`, `prenotare per ${n}`, `prenotazione per ${n}`, `aperitivo per ${n}`, `colazione per ${n}`, `brunch per ${n}`, `apericena per ${n}`, `gruppo di ${n}`, `gruppo da ${n}`];
    if (w) forme.push(`${w} persone`, `${w} amici`, `${w} ospiti`, `${w} invitati`, `${w} colleghi`, `${w} bambini`, `siamo in ${w}`, `saremo in ${w}`, `siamo ${w}`, `saremo ${w}`, `tavolo per ${w}`, `tavolo da ${w}`, `tavolo x ${w}`, `posto per ${w}`, `posti per ${w}`, `prenotare per ${w}`, `prenotazione per ${w}`, `aperitivo per ${w}`, `colazione per ${w}`, `brunch per ${w}`, `gruppo di ${w}`);
    out.push({ canonical: `persone_${n}`, entity: 'numero_persone', value: String(n), synonyms: forme });
  }
  return out;
}

const UNITA = ['cornetti', 'brioche', 'paste', 'pasticcini', 'mignon', 'tramezzini', 'pezzi', 'porzioni', 'fette', 'vassoi', 'torte', 'bomboloni', 'panini', 'salatini', 'pizzette', 'dolcetti', 'bignole', 'sfogliatelle'];
function vociQuantita() {
  const out = [
    { canonical: 'quantita_due_dozzine', entity: 'quantita', value: '24', synonyms: ['due dozzine', '2 dozzine'] },
    { canonical: 'quantita_mezza_dozzina', entity: 'quantita', value: '6', synonyms: ['mezza dozzina', 'mezza dozzina di'] },
    { canonical: 'quantita_dozzina', entity: 'quantita', value: '12', synonyms: ['una dozzina', 'dozzina', 'una dozzina di'] },
  ];
  for (let n = 2; n <= 200; n++) {
    const w = PAROLE_NUM[n];
    const forme = UNITA.map((u) => `${n} ${u}`);
    if (w) forme.push(...UNITA.map((u) => `${w} ${u}`));
    out.push({ canonical: `quantita_${n}`, entity: 'quantita', value: String(n), synonyms: forme });
  }
  return out;
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MESI_ABBR = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
// Date esplicite ("il 15 ottobre", "15/10", "3 nov"): il motore estrae da solo
// solo i nomi dei giorni; qui le date entrano nella stessa entità `giorno`.
function vociDate() {
  const out = [];
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= 31; d++) {
      out.push({ canonical: `data_${d}_${MESI[m]}`, entity: 'giorno', value: `${d} ${MESI[m]}`, synonyms: [`${d} ${MESI[m]}`, `${d} ${MESI_ABBR[m]}`, `il ${d} ${m + 1}`, `per il ${d} ${m + 1}`] });
    }
  }
  return out;
}

// Orari: "alle 20", "alle 20:30", "alle 9 e mezza". Il valore è l'ora come
// scritta dal cliente (H:MM): non si indovina AM/PM.
function vociOre() {
  const out = [];
  const prefissi = ['alle', 'ore', 'per le', 'verso le', 'intorno alle', 'dalle', 'entro le', 'dopo le'];
  const minuti = [['15', ['e un quarto', 'e quindici']], ['30', ['e mezza', 'e mezzo', 'e trenta']], ['45', ['e quarantacinque']]];
  for (let h = 1; h <= 24; h++) {
    for (const [mm, extra] of minuti) {
      const forme = prefissi.flatMap((p) => [`${p} ${h} ${mm}`, ...extra.map((e) => `${p} ${h} ${e}`)]);
      out.push({ canonical: `ora_${h}_${mm}`, entity: 'ora', value: `${h}:${mm}`, synonyms: forme });
    }
  }
  for (let h = 1; h <= 24; h++) {
    out.push({ canonical: `ora_${h}_00`, entity: 'ora', value: `${h}:00`, synonyms: prefissi.map((p) => `${p} ${h}`) });
  }
  out.push({ canonical: 'ora_mezzogiorno', entity: 'ora', value: '12:00', synonyms: ['a mezzogiorno', 'per mezzogiorno', 'verso mezzogiorno'] });
  return out;
}

const GIORNI_VOCI = [
  ['lunedi', ['lun']], ['martedi', []], ['mercoledi', ['mer']], ['giovedi', ['gio']], ['venerdi', ['ven']], ['sabato', ['sab']], ['domenica', ['dom']],
];

// ===== Pack =====
const MALESSERE = [
  'sto male', 'sono stato male', 'sono stata male', 'mi sono sentito male', 'mi sono sentita male', 'ci siamo sentiti male', 'siamo stati male',
  'e stato male', 'e stata male', 'sta male', 'si e sentito male', 'si e sentita male', 'e stata male dopo',
  'ho vomitato', 'ha vomitato', 'ho il vomito', 'vomito', 'nausea', 'mal di pancia', 'mal di stomaco', 'dolori addominali', 'crampi', 'diarrea',
  'intossicazione', 'intossicato', 'intossicata', 'avvelenamento', 'orticaria', 'eruzione cutanea', 'macchie sulla pelle', 'prurito',
  'mi si e gonfiata la faccia', 'mi si e gonfiato il viso', 'mi si e gonfiata la bocca', 'mi si e gonfiata la guancia', 'faccia gonfia', 'viso gonfio', 'bocca gonfia', 'labbra gonfie', 'mi si sono gonfiate le labbra', 'mi si gonfia la faccia', 'mi si sta gonfiando la faccia', 'mi si gonfia la bocca',
];

export const pack = {
  identity: {
    nome_ruolo: 'bar e caffetteria',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un bar-caffetteria (colazioni, aperitivi, pasticceria, torte e vassoi su ordinazione, eventi e rinfreschi). Rispondi in modo veloce, cordiale e concreto, come una persona dello staff. Raccogli le richieste (tavolo, ordine da ritirare, evento) ma non confermi nulla: disponibilità, tempi e fattibilità le conferma il locale. Non sei un nutrizionista né un medico: su allergie e intolleranze non dai garanzie, passi al personale.',
  },
  mission: 'Capire in fretta cosa serve al cliente (tavolo, ordine da ritirare, evento, informazioni), raccogliere solo i dati necessari e far arrivare allo staff richieste, ordini e situazioni di sicurezza alimentare.',
  tone_default: 'amichevole',
  conversation_rules: [
    'Messaggi brevi (1-3 frasi), tono cordiale e veloce: i clienti scrivono dal telefono, spesso di fretta.',
    'Una sola domanda per messaggio e mai su un\'informazione già data (numero di persone, giorno, nome, tipo di ordine).',
    'Per ordini su ordinazione, eventi e gruppi grandi non promettere mai che si può fare: raccogli i dati e di\' che li conferma il locale.',
    'Mai garanzie su allergeni, intolleranze, celiachia o assenza di ingredienti: per queste richieste serve il personale.',
    'Se qualcuno sta male dopo aver mangiato o ha una reazione allergica, la sicurezza viene prima di tutto: niente raccolta dati normale.',
    'Prezzi, orari, giorno di chiusura, prodotti, menù e disponibilità si dicono solo se sono nei dati del locale.',
  ],
  prohibited_claims: [
    'garantire l\'assenza di allergeni, glutine, lattosio o altri ingredienti',
    'dire che un prodotto è adatto a celiaci, allergici o intolleranti',
    'confermare un tavolo, una prenotazione o un ordine (lo conferma il locale)',
    'promettere che un ordine grande o last-minute sia fattibile o pronto per una certa data',
    'indicare prezzi, sconti, promozioni, orari, giorno di chiusura o disponibilità non presenti nelle fonti',
    'consigli medici su malesseri, reazioni allergiche o intossicazioni',
  ],
  business_rules: [
    'Disdette, spostamenti e modifiche di prenotazioni e ordini vanno passati allo staff.',
    'Le reazioni allergiche e i malesseri dopo il consumo hanno priorità su qualunque altra richiesta.',
    'Ordini su ordinazione ed eventi: il sistema raccoglie la richiesta, la fattibilità la conferma il locale.',
  ],

  entities: [
    { id: 'tipo_ordine', descrizione: 'Cosa il cliente vuole ordinare/ritirare o chiede (torta, vassoio di pasticcini, salati, cornetti e brioche).', tipo: 'enum', priorita: 8,
      valori: ['torta', 'pasticcini', 'salati', 'cornetti_brioche', 'altro'],
      domanda_varianti: ['Cosa vorrebbe ordinare: una torta, un vassoio di pasticcini, dei salati?', 'Mi dice che prodotto le serve?', 'Di che cosa avrebbe bisogno?'] },
    { id: 'occasione', descrizione: 'L\'occasione o il tipo di evento (compleanno, laurea, rinfresco, festa privata...).', tipo: 'enum', priorita: 12,
      valori: ['compleanno', 'laurea', 'cerimonia', 'matrimonio', 'addio_nubilato_celibato', 'anniversario', 'evento_aziendale', 'nascita', 'festa_privata', 'altro'],
      domanda_varianti: ['Per quale occasione?', 'Che tipo di evento è: compleanno, laurea, un rinfresco?', 'Mi racconta di cosa si tratta?'] },
    { id: 'numero_persone', descrizione: 'Numero di persone (tavolo, gruppo o ospiti dell\'evento).', tipo: 'number', priorita: 15,
      domanda_varianti: ['In quanti siete?', 'Per quante persone?', 'Quante persone sarete circa?'] },
    { id: 'giorno', descrizione: 'Giorno o data desiderata: del tavolo, del ritiro dell\'ordine o dell\'evento (nome del giorno oppure data come "15 ottobre").', tipo: 'string', priorita: 20,
      domanda_varianti: ['Per quale giorno?', 'Per quando le serve?', 'Mi dice il giorno o la data?'] },
    { id: 'quantita', descrizione: 'Quantità o porzioni dell\'ordine (numero di pezzi, vassoi, porzioni).', tipo: 'number', priorita: 25,
      domanda_varianti: ['Quanti pezzi o porzioni le servono?', 'Per quante porzioni?'] },
    { id: 'momento', descrizione: 'Momento della giornata/consumo: colazione, brunch, pranzo, aperitivo, apericena, dopocena, merenda.', tipo: 'enum', priorita: 30,
      valori: ['colazione', 'brunch', 'pranzo', 'aperitivo', 'apericena', 'dopocena', 'merenda'] },
    { id: 'esigenze_alimentari', descrizione: 'Esigenze alimentari dichiarate dal cliente (senza glutine, senza lattosio, vegano, vegetariano, allergie). Mai da usare per garantire nulla: le conferma il personale.', tipo: 'enum', priorita: 35,
      valori: ['senza_glutine', 'senza_lattosio', 'latte_vegetale', 'vegano', 'vegetariano', 'allergia'] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente (a cui intestare prenotazione, ordine o richiesta).', tipo: 'string', priorita: 40,
      domanda_varianti: ['Come si chiama?', 'A che nome registro la richiesta?', 'Mi dice il suo nome?'] },
    { id: 'ora', descrizione: 'Orario indicato dal cliente (come lo scrive).', tipo: 'string', priorita: 45 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 46, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'prodotto', descrizione: 'Prodotto o bevanda citati nelle domande sul menù (caffè, cappuccino, drink da aperitivo, bibite, panini, gelato).', tipo: 'enum', priorita: 50,
      valori: ['caffe', 'cappuccino', 'aperitivo_drink', 'bibite', 'panino_toast', 'gelato'] },
    { id: 'modalita', descrizione: 'Ritiro/asporto oppure consegna a domicilio.', tipo: 'enum', priorita: 55, valori: ['ritiro', 'consegna'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Giorni (abbreviazioni e refusi; il motore riconosce già i nomi interi) ----
    ...GIORNI_VOCI.map(([g, abbr]) => ({ canonical: g, entity: 'giorno', value: g, abbreviations: abbr })),
    { canonical: 'oggi_sera', entity: 'giorno', value: 'oggi', synonyms: ['stasera', 'questa sera', 'stamattina', 'stamani', 'questa mattina', 'stanotte', 'oggi pomeriggio', 'in giornata'], slang: ['stasera stessa'] },
    ...vociDate(),

    // ---- Orari ----
    ...vociOre(),

    // ---- Numero di persone / quantità ----
    ...vociPersone(),
    ...vociQuantita(),

    // ---- Momento ----
    { canonical: 'apericena', entity: 'momento', value: 'apericena', synonyms: ['apericena', 'apericene', 'aperi cena', 'apericenare'], errors: ['apericena'] },
    { canonical: 'aperitivo', entity: 'momento', value: 'aperitivo', synonyms: ['aperitivo', 'aperitivi', 'happy hour', 'apertivo', 'drink serale'], abbreviations: ['aperi'], slang: ['spritzino'], errors: ['aperitvo', 'aperittivo'] },
    { canonical: 'brunch', entity: 'momento', value: 'brunch', synonyms: ['brunch', 'colazione lunga'], errors: ['brunc'] },
    { canonical: 'colazione', entity: 'momento', value: 'colazione', synonyms: ['colazione', 'colazioni', 'fare colazione', 'breakfast', 'caffe e brioche', 'cornetto e cappuccino'], abbreviations: ['colaz'], errors: ['colazone', 'colzione'] },
    { canonical: 'pranzo', entity: 'momento', value: 'pranzo', synonyms: ['pranzo', 'pausa pranzo', 'pranzetto', 'light lunch'] },
    { canonical: 'dopocena', entity: 'momento', value: 'dopocena', synonyms: ['dopocena', 'dopo cena', 'after dinner', 'dopo cena'] },
    { canonical: 'merenda', entity: 'momento', value: 'merenda', synonyms: ['merenda', 'merende', 'tea time', 'the delle cinque'] },

    // ---- Tipo di ordine / prodotto ordinabile ----
    { canonical: 'torta', entity: 'tipo_ordine', value: 'torta', synonyms: ['torta', 'torte', 'tortina', 'torta di compleanno', 'torta personalizzata', 'torta nuziale', 'torta da cerimonia', 'crostata', 'crostate', 'cheesecake', 'millefoglie', 'sacher', 'torta gelato', 'semifreddo', 'cake', 'cake design', 'torta salata', 'torta con scritta', 'torta con la scritta'], slang: ['tortina'], errors: ['totra', 'tora di compleanno'] },
    { canonical: 'pasticcini', entity: 'tipo_ordine', value: 'pasticcini', synonyms: ['pasticcini', 'pasticcino', 'paste', 'pastine', 'paste mignon', 'pasticceria mignon', 'mignon', 'mignon dolci', 'dolcetti', 'dolci', 'vassoio di dolci', 'vassoio di paste', 'vassoio di pasticcini', 'vassoio misto', 'vassoio dolce', 'bignole', 'sfogliatelle', 'cannoli', 'bignè', 'bigne', 'pasticceria', 'dolce'], errors: ['pasticini', 'pastcini', 'pasticcni'] },
    { canonical: 'salati', entity: 'tipo_ordine', value: 'salati', synonyms: ['salati', 'salatini', 'tramezzini', 'tramezzino', 'pizzette', 'rustici', 'finger food', 'vassoio salato', 'vassoio di salati', 'vassoio di tramezzini', 'panini', 'paninetti', 'focaccine', 'stuzzichini', 'sfizi'], errors: ['tramezini'] },
    { canonical: 'cornetti_brioche', entity: 'tipo_ordine', value: 'cornetti_brioche', synonyms: ['cornetti', 'cornetto', 'brioche', 'brioches', 'croissant', 'bomboloni', 'bombolone', 'krapfen', 'cornetti vuoti', 'cornetti per colazione', 'box colazione', 'colazione per ufficio'], slang: ['brioscia', 'cornettino'], errors: ['cornnetti', 'cornetti'] },
    { canonical: 'vassoio', entity: 'tipo_ordine', value: 'altro', synonyms: ['vassoio', 'vassoi', 'vassoietto', 'cestino', 'box', 'confezione regalo', 'pacco regalo'], slang: ['vassoietto'] },

    // ---- Occasione (dal più specifico al più generico: vince il primo) ----
    { canonical: 'compleanno', entity: 'occasione', value: 'compleanno', synonyms: ['compleanno', 'compleanni', 'festa di compleanno', 'buon compleanno', 'diciottesimo', '18 anni', 'diciotto anni', 'cinquantesimo', 'sessantesimo', 'quarantesimo', 'trentesimo', 'settantesimo', ...[30, 40, 50, 60, 70, 80, 90].flatMap((n) => [`i ${n} anni`, `compie ${n} anni`, `${n} anni di`, `compiamo ${n} anni`])], abbreviations: ['compl'], errors: ['compleano', 'compleanno'] },
    { canonical: 'laurea', entity: 'occasione', value: 'laurea', synonyms: ['laurea', 'laureato', 'laureata', 'laurearsi', 'si laurea', 'mi laureo', 'festa di laurea', 'proclamazione', 'dottore in'], errors: ['lauera'] },
    { canonical: 'cerimonia', entity: 'occasione', value: 'cerimonia', synonyms: ['battesimo', 'comunione', 'prima comunione', 'cresima', 'cerimonia'] },
    { canonical: 'matrimonio', entity: 'occasione', value: 'matrimonio', synonyms: ['matrimonio', 'nozze', 'sposi', 'promessa di matrimonio', 'fidanzamento', 'sposalizio'] },
    { canonical: 'addio_nubilato_celibato', entity: 'occasione', value: 'addio_nubilato_celibato', synonyms: ['addio al nubilato', 'addio al celibato', 'nubilato', 'celibato'] },
    { canonical: 'anniversario', entity: 'occasione', value: 'anniversario', synonyms: ['anniversario', 'anniversari', 'pensione', 'pensionamento', 'festa di pensione'] },
    { canonical: 'evento_aziendale', entity: 'occasione', value: 'evento_aziendale', synonyms: ['evento aziendale', 'festa aziendale', 'aperitivo aziendale', 'aziendale', 'azienda', 'ufficio', 'colleghi', 'team building', 'riunione', 'meeting', 'convegno', 'inaugurazione', 'presentazione', 'brindisi aziendale'] },
    { canonical: 'nascita', entity: 'occasione', value: 'nascita', synonyms: ['baby shower', 'gender reveal', 'nascita', 'festa della nascita', 'bimbo in arrivo'] },
    { canonical: 'festa_privata', entity: 'occasione', value: 'festa_privata', synonyms: ['festa privata', 'feste private', 'festa', 'feste', 'festeggiare', 'festeggiamento', 'festeggiamenti', 'party', 'festicciola', 'serata privata', 'evento privato', 'evento', 'eventi'], errors: ['fseta'] },

    // ---- Esigenze alimentari (richieste SENSIBILI: vedi safety_rules) ----
    { canonical: 'senza_glutine', entity: 'esigenze_alimentari', value: 'senza_glutine', intent: 'info_esigenze', synonyms: ['senza glutine', 'gluten free', 'glutenfree', 'no glutine', 'celiaco', 'celiaca', 'celiaci', 'celiachia', 'glutine', 'per celiaci', 'privo di glutine', 'privi di glutine'], errors: ['senza glutinne', 'celiachi'] },
    { canonical: 'senza_lattosio', entity: 'esigenze_alimentari', value: 'senza_lattosio', intent: 'info_esigenze', synonyms: ['senza lattosio', 'lactose free', 'no lattosio', 'lattosio', 'intollerante al lattosio', 'intolleranza al lattosio', 'delattosato', 'zero lattosio'], errors: ['senza lattosoi'] },
    { canonical: 'latte_vegetale', entity: 'esigenze_alimentari', value: 'latte_vegetale', synonyms: ['latte di soia', 'latte di avena', 'latte di mandorla', 'latte vegetale', 'latte di riso', 'bevanda di soia', 'bevanda di avena'] },
    { canonical: 'vegano', entity: 'esigenze_alimentari', value: 'vegano', intent: 'info_esigenze', synonyms: ['vegano', 'vegana', 'vegani', 'vegane', 'vegan', 'plant based', 'a base vegetale', 'senza uova e latte', 'senza derivati animali'], errors: ['vegaano'] },
    { canonical: 'vegetariano', entity: 'esigenze_alimentari', value: 'vegetariano', intent: 'info_esigenze', synonyms: ['vegetariano', 'vegetariana', 'vegetariani', 'vegetariane', 'veggie', 'senza carne'] },
    { canonical: 'allergia', entity: 'esigenze_alimentari', value: 'allergia', intent: 'info_esigenze', synonyms: ['allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergeni', 'allergene', 'frutta a guscio', 'arachidi', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti', 'intolleranza alimentare', 'senza noci', 'senza frutta secca', 'senza uova'], errors: ['alergia', 'allergiaa', 'allergico'] },

    // ---- Modalità di ritiro / consegna ----
    { canonical: 'ritiro', entity: 'modalita', value: 'ritiro', synonyms: ['da ritirare', 'ritiro', 'ritirare', 'ritirarla', 'ritirarlo', 'asporto', 'da asporto', 'da portare via', 'take away', 'takeaway', 'porto via', 'passo a ritirare', 'vengo a ritirare', 'passare a ritirare', 'ritiro in negozio', 'ritiro al banco'] },
    { canonical: 'consegna', entity: 'modalita', value: 'consegna', synonyms: ['consegna', 'consegne', 'consegnare', 'consegnate', 'consegnarla', 'a domicilio', 'domicilio', 'delivery', 'portare a casa', 'recapitare', 'spedire'] },

    // ---- Prodotti citati nelle domande di menù ----
    { canonical: 'caffe', entity: 'prodotto', value: 'caffe', synonyms: ['caffe', 'caffe espresso', 'espresso', 'caffettino', 'caffe lungo', 'ristretto', 'macchiato', 'caffe macchiato', 'marocchino', 'caffe d orzo', 'orzo', 'ginseng', 'decaffeinato', 'deca', 'caffe corretto', 'corretto', 'shakerato', 'caffe shakerato'], slang: ['caffettino', 'caffe'], errors: ['cafe', 'caffe\''] },
    { canonical: 'cappuccino', entity: 'prodotto', value: 'cappuccino', synonyms: ['cappuccino', 'cappuccini', 'cappuccio', 'latte macchiato', 'caffelatte', 'caffe latte', 'cioccolata calda', 'cioccolata', 'the caldo'], abbreviations: ['cappu', 'cappuc'], errors: ['capuccino', 'cappucino', 'cappuccinoo'] },
    { canonical: 'aperitivo_drink', entity: 'prodotto', value: 'aperitivo_drink', synonyms: ['spritz', 'aperol', 'campari', 'negroni', 'prosecco', 'cocktail', 'cocktails', 'drink', 'vino', 'birra', 'birre', 'bollicine', 'calice', 'calici', 'amaro', 'gin tonic', 'bevande alcoliche', 'analcolico', 'analcolici'], errors: ['sprits', 'spriz'] },
    { canonical: 'bibite', entity: 'prodotto', value: 'bibite', synonyms: ['succo', 'succhi', 'spremuta', 'spremute', 'centrifugato', 'frullato', 'frullati', 'smoothie', 'tisana', 'tisane', 'bibita', 'bibite', 'acqua', 'coca cola', 'cola', 'aranciata', 'te freddo', 'the freddo', 'granita', 'granite'] },
    { canonical: 'panino_toast', entity: 'prodotto', value: 'panino_toast', synonyms: ['toast', 'tost', 'piadina', 'piadine', 'insalata', 'insalatona', 'bruschetta', 'bruschette', 'focaccia', 'pizza', 'pizzetta', 'sandwich', 'club sandwich', 'hamburger', 'avocado toast', 'uova', 'pancake', 'pancakes', 'yogurt', 'granola', 'porridge'] },
    { canonical: 'gelato', entity: 'prodotto', value: 'gelato', synonyms: ['gelato', 'gelati', 'affogato', 'coppa gelato', 'cono'] },

    // ---- Concetti di conversazione (collegano all'intent) ----
    { canonical: 'prezzo', synonyms: ['prezzo', 'i prezzi', 'dei prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto vengono', 'quanto si spende', 'quanto spendo', 'quanto fa', 'listino', 'quanto prendete', 'tariffa', 'tariffe', 'a quanto', 'quanto verrebbe', 'quanto costerebbe', 'quanto mi costa'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'chiuso', 'apertura', 'chiusura', 'a che ora aprite', 'a che ora chiudete', 'a che ora apre', 'a che ora chiude', 'fino a che ora', 'giorno di chiusura', 'giorno di riposo', 'riposo settimanale', 'quando chiudete', 'quando aprite', 'aprite', 'chiudete'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'come si arriva', 'parcheggio', 'parcheggiare', 'posizione', 'google maps', 'maps', 'siete vicino a', 'siete in centro', 'mappa', 'autobus', 'metro', 'fermata', 'mezzi pubblici', 'stazione'], intent: 'info_posizione' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'pagare', 'bancomat', 'carta di credito', 'carte', 'contanti', 'pos', 'satispay', 'buoni pasto', 'buono pasto', 'ticket', 'ticket restaurant', 'scontrino', 'fattura', 'apple pay', 'postepay', 'paypal', 'welfare'], intent: 'info_pagamenti' },
    { canonical: 'wifi', synonyms: ['wifi', 'wi fi', 'internet', 'password del wifi', 'connessione', 'prese', 'presa', 'caricare il telefono', 'caricare il pc', 'lavorare con il pc', 'studiare'], abbreviations: ['wfi'], intent: 'info_spazi' },
    { canonical: 'dehors', synonyms: ['dehors', 'tavolini fuori', 'tavolini all aperto', 'all aperto', 'giardino', 'terrazza', 'plateatico', 'posti fuori', 'tavolo fuori', 'sala interna', 'veranda', 'aria condizionata', 'condizionatore', 'riscaldamento', 'stufe'], errors: ['dehor', 'deor'], intent: 'info_spazi' },
    { canonical: 'cani', synonyms: ['cane', 'cani', 'cagnolino', 'cagnolini', 'animali', 'animali domestici', 'a quattro zampe', 'pet friendly', 'il mio cane', 'cane di piccola taglia', 'cani ammessi', 'cuccioli'], intent: 'info_spazi' },
    { canonical: 'accessibilita', synonyms: ['sedia a rotelle', 'carrozzina', 'disabili', 'disabile', 'accessibile', 'accessibilita', 'scivolo', 'gradini', 'passeggino', 'passeggini', 'seggiolone', 'fasciatoio', 'bagno', 'toilette', 'bagni'], intent: 'info_spazi' },
    { canonical: 'partita_tv', synonyms: ['partita', 'partite', 'calcio', 'champions', 'serie a', 'derby', 'sky', 'dazn', 'maxischermo', 'schermo', 'tv', 'televisione', 'formula 1', 'gp', 'mondiali', 'europei'], intent: 'info_serate' },
    { canonical: 'musica_live', synonyms: ['musica dal vivo', 'live music', 'live', 'dj', 'dj set', 'karaoke', 'serata', 'serate', 'serata a tema', 'serate a tema', 'concerto', 'concerti', 'band', 'piano bar', 'stasera cosa fate', 'cosa fate stasera'], intent: 'info_serate' },
    { canonical: 'menu_info', synonyms: ['menu', 'la carta', 'cosa avete', 'che cosa avete', 'cosa servite', 'cosa c e da mangiare', 'che dolci', 'che gusti', 'che torte', 'cosa comprende', 'cosa viene con', 'com e composto'], intent: 'info_menu' },
    { canonical: 'ordinazione', synonyms: ['su ordinazione', 'ordinare', 'ordinazione', 'ordinarla', 'ordinarlo', 'ordinarvi', 'ordine', 'ordino', 'ordinerei', 'da ritirare', 'su prenotazione', 'su richiesta'], intent: 'ordine_su_ordinazione' },
    { canonical: 'evento_catering', synonyms: ['catering', 'buffet', 'rinfresco', 'rinfreschi', 'banchetto', 'open bar', 'servizio catering', 'preventivo', 'preventivi', 'noleggio sala', 'affittare la sala', 'affittare il locale'], intent: 'richiesta_evento' },
    { canonical: 'tavolo', synonyms: ['tavolo', 'tavoli', 'tavolino', 'prenotare', 'prenotazione', 'prenoto', 'prenotiamo', 'prenotarvi', 'riservare', 'riserva', 'riservarmi'], intent: 'prenota_tavolo' },
    // Marcatore di domanda informativa: "avete...", "fate...", "vorrei sapere se..." (non è un ordine).
    { canonical: 'chiede_info', synonyms: ['vorrei sapere', 'volevo sapere', 'vorrei informazioni', 'volevo informazioni', 'sapere se', 'mi dite se', 'mi sapete dire', 'avete', 'fate', 'fanno', 'c e', 'ci sono', 'servite', 'vendete', 'si trova', 'avete anche', 'fate anche'] },
  ],

  intents: [
    { id: 'prenota_tavolo', nome: 'Prenotazione tavolo o aperitivo', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole prenotare un tavolo o un posto (colazione, brunch, aperitivo, apericena) o chiede se c\'è posto.',
      esempi: ['vorrei prenotare un tavolo', 'vorrei prenotare', 'prenotare un tavolo', 'prenoto un tavolo', 'vorrei riservare un tavolo', 'riservare un tavolo', 'avete un tavolo', 'avete un tavolo libero', 'avete posto', 'c e posto', 'c e un tavolo libero', 'si puo prenotare', 'posso prenotare', 'posso prenotare un tavolo', 'vorrei una prenotazione', 'fare una prenotazione', 'vorrei fare una prenotazione', 'tavolo per stasera', 'tavolo per domani', 'vorremmo prenotare', 'vorremmo un tavolo', 'vorrei un tavolo', 'mi tenete un tavolo', 'mi tenete un posto', 'tenete un tavolo', 'riservate un tavolo', 'riservarmi un tavolo', 'prenotarvi un tavolo', 'tavolo libero', 'un tavolo per', 'prenotazione per', 'prenotare area', 'prenotare un tavolino', 'un tavolino per'],
      keywords: ['prenotare', 'prenotazione', 'prenoto', 'prenotiamo', 'riservare', 'tavolo', 'tavolino'],
      combinazioni: [
        { entity: 'numero_persone', con: ['tavolo', 'tavolino', 'posto per', 'posti per', 'un posto', 'prenotare', 'prenotazione', 'riservare', 'avete posto', 'c e posto', 'siamo in', 'saremo in', 'passiamo', 'veniamo', 'verremmo', 'vorremmo venire', 'ci siete'], non_con_concepts: ['prezzo', 'ordinazione', 'evento_catering'], score: 0.8 },
        { entity: 'momento', con: ['prenotare', 'prenotazione', 'tavolo', 'posto', 'posti', 'riservare', 'vorremmo venire', 'vorrei venire', 'passare', 'passiamo', 'passo', 'veniamo', 'ci siete', 'ci siamo'], non_con_concepts: ['prezzo', 'menu_info', 'orari', 'chiede_info', 'evento_catering', 'ordinazione'], score: 0.8 },
        { entity: 'numero_persone', con_entities: ['giorno', 'ora', 'momento', 'fascia_oraria'], non_con_concepts: ['prezzo', 'ordinazione', 'evento_catering', 'menu_info'], score: 0.75 },
        { entity: 'momento', con_entities: ['giorno', 'ora'], non_con_concepts: ['prezzo', 'menu_info', 'orari', 'chiede_info', 'evento_catering', 'ordinazione'], score: 0.7 },
      ],
      required_entities: ['numero_persone', 'giorno', 'nome_cliente'], optional_entities: ['ora', 'fascia_oraria', 'momento', 'occasione', 'esigenze_alimentari'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },

    { id: 'ordine_su_ordinazione', nome: 'Ordine su ordinazione da ritirare', categoria: 'LEAD', priorita: 18, safety_level: 'LOW',
      descrizione: 'Il cliente vuole ordinare una torta, un vassoio di pasticcini o salati, cornetti per un gruppo, da ritirare in una data. La fattibilità la conferma il locale.',
      esempi: ['vorrei ordinare', 'volevo ordinare', 'devo ordinare', 'ordinare una torta', 'ordinare dei pasticcini', 'ordinare un vassoio', 'ordinare dei cornetti', 'ordinare dei dolci', 'vorrei fare un ordine', 'fare un ordine', 'avrei un ordine da fare', 'vorrei una torta', 'vorrei una torta di compleanno', 'mi serve una torta', 'mi servirebbe una torta', 'mi servono dei pasticcini', 'vorrei un vassoio', 'vorrei un vassoio di pasticcini', 'vorrei dei pasticcini', 'vorrei prenotare una torta', 'prenotare una torta', 'prenotare dei pasticcini', 'prenotare un vassoio', 'prenotare dei cornetti', 'mi preparate una torta', 'potete preparare una torta', 'potreste preparare', 'mi fate una torta', 'potete farmi una torta', 'torta personalizzata', 'torta con scritta', 'torta con la scritta', 'ordine da ritirare', 'una torta per', 'un vassoio di', 'un vassoio per', 'vorrei un ordine'],
      keywords: ['ordinare', 'ordinazione', 'ordinarvi', 'vassoio', 'vassoi'],
      combinazioni: [
        { entity: 'tipo_ordine', con: ['vorrei', 'vorremmo', 'mi serve', 'mi servono', 'mi servirebbe', 'mi servirebbero', 'avrei bisogno', 'ho bisogno', 'dovrei', 'devo', 'ordinare', 'ordino', 'ordinerei', 'prenotare', 'prenoto', 'mi preparate', 'mi fate', 'mi farebbe', 'potete preparare', 'potreste preparare', 'mi prepara', 'preparatemi', 'servirebbe', 'servirebbero', 'servono', 'cerco', 'cercavo', 'volevo', 'mi occorre', 'ci serve', 'ci servono', 'mi occorrono'], con_entities: ['quantita', 'modalita'], non_con_concepts: ['prezzo', 'chiede_info', 'menu_info'], score: 0.9 },
        { entity: 'tipo_ordine', con_entities: ['quantita'], non_con_concepts: ['prezzo', 'chiede_info', 'menu_info', 'orari'], score: 0.75 },
      ],
      required_entities: ['tipo_ordine', 'giorno', 'nome_cliente'], optional_entities: ['quantita', 'numero_persone', 'occasione', 'esigenze_alimentari', 'ora', 'modalita'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },

    { id: 'richiesta_evento', nome: 'Evento, rinfresco o festa privata', categoria: 'LEAD', priorita: 19, safety_level: 'LOW',
      descrizione: 'Il cliente vuole organizzare una festa, un rinfresco, un buffet o un catering, o chiede un preventivo per un evento. Fattibilità e prezzi li stabilisce il locale.',
      esempi: ['vorrei organizzare una festa', 'organizzare una festa', 'organizzare un evento', 'vorrei organizzare un rinfresco', 'organizzare un rinfresco', 'organizzare un compleanno', 'organizzare una festa di compleanno', 'festa privata', 'fare una festa privata', 'vorrei fare una festa', 'vorremmo fare una festa', 'vorrei fare un rinfresco', 'festa di laurea', 'rinfresco per', 'mi fate un rinfresco', 'servizio catering', 'catering per', 'vorrei un catering', 'buffet per', 'vorrei un buffet', 'vorrei un preventivo', 'preventivo per', 'mi fate un preventivo', 'preventivo per un evento', 'preventivo per una festa', 'affittare la sala', 'prenotare la sala', 'prenotare tutto il locale', 'prenotare il locale', 'riservare il locale', 'riservare tutto il locale', 'riservare la sala', 'sala per una festa', 'locale per una festa', 'area per una festa', 'area riservata', 'festeggiare un compleanno', 'festeggiare la laurea', 'vorrei festeggiare', 'vorremmo festeggiare', 'quanto costa un rinfresco', 'quanto costa il catering', 'quanto costerebbe un rinfresco', 'quanto viene un rinfresco', 'quanto viene il buffet', 'quanto costa un buffet', 'costo del catering', 'costo del rinfresco', 'prezzo del buffet', 'quanto verrebbe un rinfresco', 'info per una festa', 'informazioni per una festa', 'info per un evento', 'informazioni per un evento', 'info per un rinfresco', 'informazioni per un rinfresco'],
      keywords: ['catering', 'rinfresco', 'rinfreschi', 'buffet', 'preventivo', 'preventivi', 'festeggiare', 'banchetto', 'open bar'],
      combinazioni: [
        { entity: 'occasione', con: ['vorrei organizzare', 'organizzare', 'vorremmo organizzare', 'vorrei fare', 'vorremmo fare', 'dobbiamo fare', 'devo fare', 'dobbiamo organizzare', 'devo organizzare', 'abbiamo una', 'ho una', 'si laurea', 'mi laureo', 'faccio la', 'faccio una', 'organizziamo', 'facciamo', 'area', 'sala', 'locale', 'spazio', 'festeggiamo'], non_con_concepts: ['chiede_info', 'prezzo', 'tavolo'], score: 0.8 },
        { entity: 'occasione', con_entities: ['numero_persone', 'quantita'], non_con_concepts: ['chiede_info', 'prezzo', 'tavolo', 'ordinazione'], score: 0.8 },
      ],
      required_entities: ['occasione', 'numero_persone', 'nome_cliente'], optional_entities: ['giorno', 'ora', 'quantita', 'esigenze_alimentari', 'momento'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },

    { id: 'ritiro_ordine', nome: 'Ritiro o stato di un ordine già fatto', categoria: 'SUPPORT', priorita: 12, safety_level: 'LOW',
      descrizione: 'Il cliente ha già un ordine e chiede se è pronto, o avvisa che passa a ritirarlo. Solo lo staff sa lo stato: si avvisa il titolare.',
      esempi: ['e pronto il mio ordine', 'l ordine e pronto', 'a che punto e il mio ordine', 'a che punto e l ordine', 'posso ritirare l ordine', 'passo a ritirare', 'vengo a ritirare', 'sono qui per ritirare', 'sono venuto a ritirare', 'sono venuta a ritirare', 'e pronta la torta', 'e pronto il vassoio', 'ho gia ordinato', 'ho fatto un ordine', 'ho un ordine a nome', 'ritiro ordine', 'ritirare la torta', 'ritirare l ordine', 'ritirare il vassoio', 'sono sotto per il ritiro', 'ho ordinato una torta', 'ho ordinato i pasticcini', 'ho ordinato un vassoio'],
      keywords: ['ritiro ordine', 'stato ordine'],
      required_entities: [], optional_entities: ['nome_cliente', 'tipo_ordine', 'giorno', 'ora'],
      actions: ['notify_owner'] },

    { id: 'info_menu', nome: 'Informazioni su menù e prodotti', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede cosa c\'è nel menù o se il locale ha/fa un certo prodotto, o cosa comprende l\'aperitivo/la colazione.',
      esempi: ['cosa avete', 'che cosa avete', 'cosa c e nel menu', 'avete il menu', 'mi mandate il menu', 'mi manda il menu', 'mi mandi il menu', 'vorrei vedere il menu', 'che dolci avete', 'che dolci fate', 'che colazioni fate', 'cosa fate per colazione', 'avete i cornetti', 'avete cornetti', 'avete le brioche', 'che torte avete', 'che gusti avete', 'che gusti', 'cosa c e per aperitivo', 'cosa viene con l aperitivo', 'cosa c e con l aperitivo', 'cosa comprende l aperitivo', 'com e l aperitivo', 'cosa si mangia', 'avete il caffe', 'avete il decaffeinato', 'avete qualcosa di salato', 'avete qualcosa di dolce', 'che panini avete', 'che cocktail avete', 'che vini avete', 'cosa mi consigliate', 'cosa consigliate', 'cosa mi consiglia', 'cosa consiglia', 'cosa consigli', 'cosa prendere', 'cosa ordinare', 'cos e l apericena', 'cos e il brunch', 'cos e lo spritz', 'cos e il marocchino', 'cos e il macchiato', 'cos e il caffe corretto', 'cosa e l apericena', 'cosa e il brunch', 'differenza tra cappuccino', 'differenza tra aperitivo e apericena', 'che differenza c e tra'],
      keywords: ['menu'],
      combinazioni: [
        { entity: 'prodotto', con: ['avete', 'fate', 'fanno', 'c e', 'ci sono', 'servite', 'vendete', 'preparate', 'si trova'], score: 0.8 },
        { entity: 'tipo_ordine', con: ['avete', 'fate', 'fanno', 'c e', 'ci sono', 'servite', 'vendete', 'preparate', 'avete anche', 'fate anche'], non_con_concepts: ['ordinazione', 'evento_catering', 'prezzo'], score: 0.8 },
        { entity: 'momento', con: ['avete', 'fate', 'fanno', 'servite', 'fate anche', 'avete anche', 'cosa c e', 'cosa si mangia'], non_con_concepts: ['tavolo', 'prezzo', 'orari'], score: 0.8 },
      ],
      required_entities: [], optional_entities: ['prodotto', 'tipo_ordine', 'momento', 'esigenze_alimentari'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_servizi', nome: 'Servizi offerti dal locale', categoria: 'DISCOVERY', priorita: 31, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se il locale fa asporto, consegna, catering, torte su ordinazione, feste o eventi.',
      esempi: ['fate catering', 'fate anche catering', 'fate rinfreschi', 'fate asporto', 'fate l asporto', 'si puo ordinare da portare via', 'fate consegna a domicilio', 'consegnate a domicilio', 'fate delivery', 'fate torte su ordinazione', 'fate torte personalizzate', 'fate feste', 'fate feste private', 'organizzate eventi', 'organizzate feste', 'fate compleanni', 'si possono fare feste', 'fate servizio catering', 'fate vassoi', 'preparate torte su ordinazione', 'accettate ordini', 'fate anche le torte', 'fate buffet', 'fate cerimonie', 'fate lauree', 'come funziona una torta', 'come funziona l ordine', 'come si ordina', 'come ordinare', 'cos e un rinfresco', 'cos e un buffet', 'cos e il catering', 'cosa e il catering', 'come si organizza una festa', 'come organizzare una festa', 'con quanto anticipo', 'quanto anticipo', 'quanto prima devo ordinare', 'come si conserva', 'come conservare', 'serve prenotare', 'bisogna prenotare', 'conviene prenotare', 'meglio prenotare', 'posso portare una torta', 'posso portare la mia torta', 'quante porzioni', 'per quante persone e una torta'],
      keywords: ['asporto', 'catering', 'delivery', 'domicilio'],
      combinazioni: [
        { entity: 'modalita', con: ['fate', 'fanno', 'avete', 'si puo', 'possibile', 'e possibile', 'fate anche', 'accettate', 'c e'], score: 0.8 },
        { entity: 'occasione', con: ['fate', 'organizzate', 'si possono fare', 'si puo fare', 'ospitate', 'e possibile fare', 'fate anche', 'ospitate anche'], score: 0.8 },
      ],
      required_entities: [], optional_entities: ['modalita', 'occasione', 'tipo_ordine'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa un prodotto, un aperitivo o un servizio.',
      esempi: ['quanto costa', 'quanto costano', 'quanto viene', 'quanto vengono', 'che prezzi avete', 'quali sono i prezzi', 'prezzo', 'costo', 'listino prezzi', 'quanto si spende', 'quanto spendo', 'quanto costa il caffe', 'quanto costa un cappuccino', 'quanto costa l aperitivo', 'quanto costa una torta', 'a quanto'],
      keywords: ['prezzo', 'costo', 'costi', 'listino', 'tariffe'],
      required_entities: [], optional_entities: ['prodotto', 'tipo_ordine', 'momento'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede orari di apertura/chiusura o il giorno di chiusura.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'a che ora apre', 'a che ora chiude', 'siete aperti', 'siete aperti oggi', 'siete aperti domenica', 'siete aperti a pranzo', 'siete aperti la sera', 'fino a che ora siete aperti', 'fino a che ora', 'orari', 'orari di apertura', 'che orari fate', 'quali sono gli orari', 'giorno di chiusura', 'giorno di riposo', 'quando chiudete', 'quando aprite', 'siete chiusi', 'siete aperti ad agosto', 'aperti a ferragosto', 'aperti a natale', 'siete aperti ora', 'siete ancora aperti', 'aprite presto'],
      keywords: ['orari', 'orario', 'aperti', 'chiusi', 'chiusura', 'aprite', 'chiudete'],
      required_entities: [], optional_entities: ['giorno', 'momento'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_posizione', nome: 'Informazioni posizione', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Dove si trova il locale e come raggiungerlo.',
      esempi: ['dove siete', 'dov e il bar', 'dov e il locale', 'qual e l indirizzo', 'indirizzo', 'come vi raggiungo', 'come arrivo', 'come si arriva', 'c e parcheggio', 'dove parcheggio', 'dove posso parcheggiare', 'siete vicino a', 'siete in centro', 'mi mandate la posizione', 'mi mandi la posizione', 'mandami la posizione', 'link google maps', 'dove vi trovate', 'in che zona siete', 'come faccio ad arrivare', 'come faccio a raggiungervi', 'mezzi pubblici', 'fermata dell autobus', 'con i mezzi', 'in autobus', 'in metro'],
      keywords: ['indirizzo', 'parcheggio', 'posizione', 'dove siete', 'come arrivo', 'maps'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_pagamenti', nome: 'Pagamenti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento: carte, contanti, buoni pasto, scontrino/fattura.',
      esempi: ['accettate carte', 'accettate la carta', 'accettate carte di credito', 'si puo pagare con la carta', 'si puo pagare con il bancomat', 'accettate il bancomat', 'accettate satispay', 'accettate buoni pasto', 'accettate i buoni pasto', 'accettate ticket', 'avete il pos', 'pagamento con carta', 'solo contanti', 'fate lo scontrino', 'fate fattura', 'emettete fattura', 'come si paga', 'accettate apple pay', 'si paga con', 'posso pagare con'],
      keywords: ['bancomat', 'satispay', 'buoni pasto', 'ticket', 'contanti', 'pos', 'scontrino', 'fattura', 'pagamento', 'pagare', 'carte', 'carta di credito'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_spazi', nome: 'Spazi e comodità del locale', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Wifi, dehors, cani ammessi, accessibilità, bagno, prese, passeggini, aria condizionata.',
      esempi: ['avete il wifi', 'c e il wifi', 'avete wifi', 'wifi gratis', 'password wifi', 'c e il dehors', 'avete il dehors', 'avete tavolini fuori', 'avete un giardino', 'avete la terrazza', 'siete pet friendly', 'accettate cani', 'si possono portare i cani', 'ammettete cani', 'posso portare il cane', 'cani ammessi', 'animali ammessi', 'posso portare il mio cane', 'avete il seggiolone', 'avete un fasciatoio', 'c e il bagno', 'siete accessibili', 'accessibile in sedia a rotelle', 'avete lo scivolo', 'ci sono gradini', 'ci sono prese', 'posso lavorare con il pc', 'si puo studiare', 'si puo lavorare', 'avete aria condizionata', 'avete sala interna', 'avete posti all aperto', 'entra il passeggino'],
      keywords: ['wifi', 'dehors', 'cani', 'cane', 'seggiolone', 'fasciatoio', 'carrozzina', 'passeggino', 'terrazza', 'giardino', 'prese'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_serate', nome: 'Serate, musica e partite', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Musica dal vivo, serate a tema, partite in TV, eventi in programma.',
      esempi: ['c e musica dal vivo', 'fate musica dal vivo', 'avete musica dal vivo', 'fate serate', 'fate serate a tema', 'che serate fate', 'c e il dj', 'fate karaoke', 'trasmettete la partita', 'avete la partita', 'date la partita', 'c e la partita', 'si vede la partita', 'fate vedere la partita', 'avete sky', 'avete dazn', 'c e la champions', 'trasmettete la champions', 'mettete la partita', 'avete eventi', 'cosa fate stasera', 'cosa c e stasera', 'programma delle serate', 'c e qualche evento', 'stasera c e musica', 'c e il derby'],
      keywords: ['musica dal vivo', 'karaoke', 'partita', 'serata', 'serate', 'dj', 'concerto', 'live'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_esigenze', nome: 'Esigenze alimentari e allergeni', categoria: 'INFORMATION', priorita: 25, safety_level: 'MEDIUM',
      descrizione: 'Domande su senza glutine, senza lattosio, vegano, vegetariano, allergeni e intolleranze. Mai garanzie: lo conferma il personale.',
      esempi: ['avete opzioni senza glutine', 'avete cose senza glutine', 'avete prodotti senza glutine', 'avete cornetti senza glutine', 'avete senza lattosio', 'avete latte senza lattosio', 'avete latte vegetale', 'avete latte di soia', 'avete latte di avena', 'avete opzioni vegane', 'avete qualcosa di vegano', 'avete cornetti vegani', 'avete cose vegane', 'avete opzioni vegetariane', 'avete cose per celiaci', 'avete per celiaci', 'siete attrezzati per celiaci', 'siete attrezzati per le intolleranze', 'menu per celiaci', 'avete qualcosa per intolleranti', 'avete qualcosa per allergici', 'cosa avete senza glutine', 'cosa avete per vegani', 'cosa c e senza glutine', 'sono celiaca', 'sono celiaco', 'sono vegano', 'sono vegana', 'sono vegetariano', 'sono allergico', 'sono allergica', 'ho un allergia', 'ho allergia', 'sono intollerante', 'per intolleranti', 'per allergici'],
      keywords: ['senza glutine', 'senza lattosio', 'vegano', 'vegana', 'vegani', 'vegane', 'vegetariano', 'celiaci', 'celiaco', 'celiaca', 'allergeni', 'allergico', 'allergica', 'intolleranza', 'intolleranze', 'intollerante'],
      combinazioni: [
        { entity: 'esigenze_alimentari', con: ['avete', 'fate', 'fanno', 'c e', 'ci sono', 'servite', 'vendete', 'avete anche', 'fate anche', 'cosa avete', 'che cosa avete'], score: 0.9 },
      ],
      required_entities: [], optional_entities: ['esigenze_alimentari', 'prodotto', 'tipo_ordine'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'cancella_prenotazione', nome: 'Disdetta prenotazione o ordine', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole disdire un tavolo o annullare un ordine.',
      esempi: ['devo disdire', 'vorrei disdire', 'disdire la prenotazione', 'disdire il tavolo', 'annullare la prenotazione', 'annullare il tavolo', 'cancellare la prenotazione', 'cancellare il tavolo', 'annullare l ordine', 'cancellare l ordine', 'disdire l ordine', 'annullare la torta', 'non possiamo piu venire', 'non riusciamo a venire', 'non posso piu venire', 'non veniamo piu', 'non vengo piu', 'disdetta', 'annullare', 'non verremo', 'siamo costretti a disdire', 'disdico', 'annullo', 'cancello la prenotazione', 'non ci serve piu la torta', 'non ci serve piu l ordine'],
      keywords: ['disdire', 'disdetta', 'annullare', 'annullamento', 'cancellare', 'disdico', 'annullo'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'sposta_prenotazione', nome: 'Spostamento o modifica di prenotazione/ordine', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole spostare, anticipare, posticipare o modificare un tavolo o un ordine già presi (anche numero di persone, ritardo).',
      esempi: ['devo spostare la prenotazione', 'spostare la prenotazione', 'spostare il tavolo', 'spostare l ordine', 'posso spostare', 'cambiare giorno', 'cambiare orario', 'cambiare data', 'cambiare la data', 'posso cambiare data', 'cambiare il giorno', 'posticipare', 'anticipare', 'rimandare', 'spostare a', 'spostare alle', 'cambiare il numero di persone', 'siamo in piu', 'siamo in meno', 'aggiungere persone', 'aggiungere una persona', 'aggiungere un posto', 'modificare la prenotazione', 'modificare l ordine', 'modifica ordine', 'modificare ordine', 'cambiare l ordine', 'aggiungere alla prenotazione', 'togliere una persona', 'cambiare il ritiro', 'spostare il ritiro', 'ritirare un altro giorno', 'ritirare piu tardi', 'saremo in ritardo', 'arriviamo in ritardo', 'faccio tardi', 'siamo in ritardo', 'arrivo in ritardo', 'cambiare l orario del ritiro', 'invece di', 'al posto di', 'in piu rispetto', 'siamo in piu di', 'ci siamo aggiunti', 'ci saremo in piu'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'modificare', 'modifica', 'ritardo'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per servizio, prodotto, attesa, ordine sbagliato o conto.',
      esempi: ['vorrei fare un reclamo', 'voglio lamentarmi', 'sono insoddisfatto', 'sono molto arrabbiato', 'servizio pessimo', 'servizio scandaloso', 'ordine sbagliato', 'torta sbagliata', 'conto sbagliato', 'ho aspettato troppo', 'ho aspettato un ora', 'il cornetto era vecchio', 'il cornetto era stantio', 'il caffe era bruciato', 'mi avete fatto pagare', 'voglio un rimborso', 'sono stato trattato male', 'sono stata trattata male', 'sono deluso dal servizio', 'siete stati maleducati', 'che delusione', 'vorrei un rimborso', 'era sbagliata', 'era sbagliato', 'non era quello che ho ordinato', 'mi avete risposto male', 'ordine sbagliato', 'sbagliate l ordine', 'avete sbagliato l ordine'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'scandaloso', 'pessimo', 'pessima', 'schifo', 'disgustoso', 'stantio', 'stantia', 'maleducato', 'maleducati', 'rimborso', 'rimborsare', 'delusione'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'emergenza_alimentare', nome: 'Malessere o reazione allergica', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Reazione allergica, difficoltà respiratorie o malessere dopo aver consumato: priorità assoluta, passaggio immediato al personale.',
      esempi: ['ho una reazione allergica', 'sto avendo una reazione allergica', 'mi sono sentito male dopo aver mangiato', 'mi sono sentita male dopo', 'ho mal di pancia dopo il cornetto', 'sono stato male dopo', 'sta male dopo aver mangiato', 'intossicazione alimentare', 'credo di avere un intossicazione', 'ho vomitato dopo', 'mi e venuta l orticaria', 'mi si sta gonfiando la faccia', 'ho difficolta a respirare', 'non riesco a respirare dopo aver mangiato', 'dopo aver mangiato da voi sto male'],
      keywords: ['intossicazione', 'reazione allergica', 'orticaria', 'anafilassi', 'soffoca'],
      required_entities: [], optional_entities: ['nome_cliente'],
      actions: ['notify_owner', 'human_handoff', 'emergency_escalation'] },

    { id: 'oggetto_dimenticato', nome: 'Oggetto dimenticato o smarrito', categoria: 'SUPPORT', priorita: 14, safety_level: 'LOW',
      descrizione: 'Il cliente ha dimenticato o perso un oggetto nel locale: solo lo staff può cercarlo, si avvisa il titolare.',
      esempi: ['ho dimenticato', 'ho lasciato da voi', 'ho perso', 'oggetto smarrito', 'oggetto dimenticato', 'ho dimenticato la giacca', 'ho dimenticato l ombrello', 'ho dimenticato il portafoglio', 'ho lasciato il telefono', 'ho perso il portafoglio da voi', 'ho lasciato la borsa', 'abbiamo dimenticato', 'avete trovato un', 'avete trovato una', 'avete trovato il', 'avete trovato la'],
      keywords: ['dimenticato', 'dimenticata', 'smarrito', 'smarrita'],
      required_entities: [], optional_entities: ['nome_cliente', 'giorno'],
      actions: ['notify_owner'] },

    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona o con il titolare.',
      esempi: ['voglio parlare con una persona', 'parlare con qualcuno', 'parlare con il titolare', 'parlare con il responsabile', 'parlare con il gestore', 'parlare con il proprietario', 'mi passate qualcuno', 'chiamatemi', 'richiamatemi', 'potete chiamarmi', 'posso parlare con'],
      keywords: ['operatore', 'titolare', 'responsabile', 'gestore', 'proprietario'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi', 'hey'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'a presto', 'ci vediamo', 'ottimo grazie'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo per la vita (reazione allergica, difficoltà respiratoria, soffocamento) -> 118.
    critical: [
      'non riesco a respirare', 'non riesce a respirare', 'non respira', 'non respiro', 'difficolta a respirare', 'difficolta respiratorie', 'fatica a respirare', 'respiro male', 'respira male', 'affanno', 'fiato corto', 'mi manca il respiro', 'manca il respiro',
      'gola che si chiude', 'mi si chiude la gola', 'gola chiusa', 'gola gonfia', 'gonfiore alla gola', 'lingua gonfia', 'mi si gonfia la lingua', 'mi si e gonfiata la lingua',
      'shock anafilattico', 'anafilassi', 'anafilattico', 'reazione allergica', 'attacco allergico', 'crisi allergica',
      'sta soffocando', 'soffoca', 'mi sono strozzato', 'mi sono strozzata', 'si e strozzato', 'si e strozzata', 'si sta strozzando', 'sta strozzando',
      'e svenuto', 'e svenuta', 'sono svenuto', 'sono svenuta', 'ha perso i sensi', 'ho perso i sensi', 'perso conoscenza', 'convulsioni', 'non e cosciente', 'non risponde',
    ],
    // HIGH: malessere dopo il consumo, sintomi cutanei/gonfiori -> priorità e passaggio a una persona.
    high: [...MALESSERE, 'mi sento male', 'ci sentiamo male', 'sentito male dopo', 'stato male dopo'],
    // MEDIUM: allergie/intolleranze dichiarate (il personale deve saperlo).
    medium: ['contiene allergeni', 'non contiene allergeni', 'senza allergeni', 'allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergeni', 'celiaco', 'celiaca', 'celiaci', 'celiachia', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti'],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare con il responsabile', 'parlare con il gestore', 'parlare con il proprietario', 'parlare con un umano', 'parlare con la direzione',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'mi chiami', 'potete chiamarmi', 'non sei una persona', 'sei un robot', 'sei un bot', 'sei una macchina', 'operatore', 'persona vera', 'persona reale',
      // Malessere dopo il consumo: HIGH + passaggio immediato a una persona.
      ...MALESSERE,
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del locale, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste su allergeni, intolleranze, celiachia, ingredienti: mai garanzie, le conferma il personale.
    diagnosi_patterns: [
      'allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergeni', 'allergene', 'celiaco', 'celiaca', 'celiaci', 'celiachia', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti',
      'senza glutine', 'gluten free', 'glutenfree', 'privo di glutine', 'privi di glutine', 'per celiaci', 'senza lattosio', 'lactose free', 'delattosato', 'zero lattosio',
      'frutta a guscio', 'arachidi', 'senza noci', 'senza frutta secca', 'tracce di', 'puo contenere', 'contaminazione', 'contaminazioni', 'contaminato', 'contaminata',
      'contiene glutine', 'contiene lattosio', 'contiene uova', 'contiene latte', 'contiene noci', 'contiene frutta a guscio', 'contiene arachidi', 'cosa contiene', 'che ingredienti', 'ingredienti',
      'potete garantire', 'mi garantite', 'garantite che', 'sicuro che non', 'sono sicuri', 'e sicuro per', 'adatto ai celiaci', 'adatto a un celiaco', 'va bene per un celiaco', 'lo posso mangiare', 'posso mangiarlo',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'non contiene glutine', 'non contiene lattosio', 'non contiene allergeni', 'non contiene frutta a guscio', 'non contiene uova', 'non contiene latte',
      'e sicuramente senza glutine', 'e sicuramente senza lattosio', 'e di sicuro senza glutine', 'e di sicuro senza lattosio', 'e tutto senza glutine', 'e tutto senza lattosio', 'e tutto vegano', 'sicuramente senza',
      'nessuna traccia', 'senza tracce', 'nessun rischio', 'nessuna contaminazione', 'puo mangiarlo tranquillamente', 'puoi mangiarlo tranquillamente', 'puo stare tranquillo', 'puo stare tranquilla', 'puoi stare tranquillo', 'puoi stare tranquilla', 'e adatto ai celiaci', 'e adatto per celiaci', 'adatto a chi e allergico',
      'tavolo riservato', 'tavolo confermato', 'prenotazione confermata', 'ordine confermato', 'e gia confermato', 'e stato confermato', 'tutto confermato', 'ho prenotato', 'ho riservato', 'vi aspettiamo', 'si c e posto', 'certo c e posto', 'c e sicuramente posto', 'abbiamo posto per voi', 'abbiamo un tavolo libero', 'posto garantito',
      'sara sicuramente pronta', 'sara sicuramente pronto', 'sara di sicuro pronta', 'sara di sicuro pronto', 'nessun problema per', 'non c e problema', 'non ci sono problemi', 'si puo fare sicuramente', 'e sicuramente fattibile', 'sicuramente possibile', 'e sicuramente disponibile', 'certo che si puo fare', 'senz altro fattibile',
      'abbiamo una promozione', 'abbiamo uno sconto', 'siamo in offerta', 'offerta speciale',
      'prenda un antistaminico', 'prendi un antistaminico', 'prenda un farmaco', 'non e niente', 'non e grave', 'non si preoccupi',
    ],
    messaggio_sicurezza: 'Su allergie, intolleranze, celiachia e ingredienti non posso darle conferme né garanzie: dipendono da ricette e preparazione, e la risposta sicura può darla solo il personale del locale. Passo la sua richiesta allo staff. Intanto posso aiutarla con altro?',
    messaggio_emergenza: 'Mi dispiace, la situazione sembra seria. Se ha difficoltà a respirare, la gola o il viso si gonfiano o qualcuno ha perso i sensi, chiami subito il 118. Avviso immediatamente il personale del locale.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    tipo_ordine: ['Cosa vorrebbe ordinare: una torta, un vassoio di pasticcini, dei salati?', 'Mi dice che prodotto le serve?', 'Di che cosa avrebbe bisogno?'],
    occasione: ['Per quale occasione?', 'Che tipo di evento è: compleanno, laurea, un rinfresco?', 'Mi racconta di cosa si tratta?'],
    numero_persone: ['In quanti siete?', 'Per quante persone?', 'Quante persone sarete circa?'],
    giorno: ['Per quale giorno?', 'Per quando le serve?', 'Mi dice il giorno o la data?'],
    quantita: ['Quanti pezzi o porzioni le servono?', 'Per quante porzioni?'],
    nome_cliente: ['Come si chiama?', 'A che nome registro la richiesta?', 'Mi dice il suo nome?'],
  },

  common_scenarios: [
    'Tavolo per aperitivo, colazione o brunch (persone, giorno, nome)',
    'Torta, vassoio o pasticcini su ordinazione con data di ritiro (nessuna promessa di fattibilità)',
    'Evento, rinfresco, festa privata o catering: raccolta richiesta e preventivo a cura del locale',
    'Domande su menù, orari, posizione, pagamenti, wifi, dehors, cani, partite e serate: solo da dati del tenant',
    'Allergie e intolleranze: nessuna garanzia, passaggio al personale',
    'Reazione allergica o malessere dopo il consumo: emergenza e passaggio immediato',
    'Disdette, spostamenti, modifiche e reclami: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque bar. Nessun
// prezzo, orario, prodotto del menù, tempo minimo per gli ordini, promozione,
// nome o indirizzo: quelli stanno solo nei dati del tenant.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_menu', 'Cos\'è l\'apericena?', ['cosa e l apericena', 'cosa significa apericena', 'che differenza c e tra aperitivo e apericena', 'cos e un apericena', 'apericena cosa comprende'],
    'L\'apericena è un aperitivo più ricco, con una proposta di cibo abbastanza abbondante da poter sostituire la cena. Cosa comprende e come funziona lo decide ogni locale.'),
  f('info_menu', 'Cos\'è il brunch?', ['cosa e il brunch', 'cosa significa brunch', 'che cos e il brunch', 'brunch cosa vuol dire'],
    'Il brunch è un pasto a metà tra colazione e pranzo, di solito con proposte dolci e salate. Se e come lo propone il locale lo trova nelle informazioni dell\'attività.'),
  f('info_menu', 'Che differenza c\'è tra cappuccino e caffè macchiato?', ['differenza tra cappuccino e macchiato', 'cappuccino o macchiato', 'che differenza c e tra cappuccino e macchiato', 'cos e il macchiato'],
    'Il cappuccino è un espresso con latte caldo e schiuma in quantità abbondante; il caffè macchiato è un espresso con solo una goccia di latte (o di schiuma).'),
  f('info_menu', 'Cos\'è il caffè corretto?', ['cosa e il caffe corretto', 'cosa significa caffe corretto', 'che cos e il corretto', 'caffe corretto cos e'],
    'Il caffè corretto è un espresso con una piccola aggiunta di liquore, di solito grappa o sambuca, a scelta del cliente.'),
  f('info_menu', 'Cos\'è il marocchino?', ['cosa e il marocchino', 'che cos e il marocchino', 'cosa c e nel marocchino', 'marocchino cos e'],
    'Il marocchino è una bevanda a base di espresso con cacao e schiuma di latte, servita in bicchierino di vetro. Le ricette possono variare da locale a locale.'),
  f('info_menu', 'Cos\'è lo spritz?', ['cosa e lo spritz', 'che cos e lo spritz', 'cosa c e nello spritz', 'spritz cos e'],
    'Lo spritz è un aperitivo a base di vino bianco frizzante o prosecco, un liquore (come aperol o campari) e acqua gassata, servito con ghiaccio e una fetta d\'arancia. La ricetta può cambiare da locale a locale.'),
  f('info_servizi', 'Come funziona una torta su ordinazione?', ['come si ordina una torta', 'come funziona l ordine di una torta', 'come si fa a ordinare una torta', 'come ordinare una torta di compleanno', 'come funzionano le torte su ordinazione'],
    'Per una torta su ordinazione in genere servono la data del ritiro, il numero di persone o di porzioni, i gusti e le eventuali esigenze alimentari. La richiesta va poi confermata dal locale, che verifica se è fattibile per la data indicata.'),
  f('info_servizi', 'Con quanto anticipo conviene ordinare una torta o un vassoio?', ['quanto prima devo ordinare una torta', 'con quanto anticipo ordinare', 'quanto tempo prima si ordina una torta', 'serve ordinare in anticipo', 'quanto anticipo serve per un vassoio'],
    'In generale per torte, vassoi e ordini grandi conviene muoversi con un po\' di anticipo, soprattutto in periodi di maggiore richiesta. I tempi minimi li stabilisce il locale e la fattibilità la conferma lui.'),
  f('info_servizi', 'Come si calcolano le porzioni di una torta?', ['quante porzioni ha una torta', 'per quante persone e una torta', 'che torta serve per tot persone', 'come scelgo la dimensione della torta', 'quanto grande deve essere la torta'],
    'Le porzioni dipendono dalla dimensione e dal tipo di torta, e da come viene servita (fetta grande o piccola, dopo un pasto o come dolce unico). Per scegliere la misura giusta il locale può consigliarla in base agli ospiti.'),
  f('info_servizi', 'Cos\'è un rinfresco o un buffet?', ['cosa e un rinfresco', 'che cos e un buffet', 'cosa significa rinfresco', 'differenza tra rinfresco e buffet', 'cos e un buffet'],
    'Il rinfresco è un piccolo ricevimento con stuzzichini, dolci e bevande, di solito senza pasto seduto; il buffet è la modalità con cui il cibo è disposto su un tavolo e ciascuno si serve da solo. Cosa propone il locale e a quali condizioni lo comunica il locale stesso.'),
  f('info_servizi', 'Cos\'è il servizio di catering?', ['cosa e il catering', 'che cos e il catering', 'cosa significa catering', 'fare catering cosa vuol dire'],
    'Il catering è la preparazione di cibo e bevande per un evento, a volte con consegna o allestimento nel luogo scelto dal cliente. Se e come lo offre il locale va chiesto allo staff.'),
  f('info_servizi', 'Cosa serve per organizzare una festa privata in un bar?', ['come si organizza una festa privata', 'come organizzare un compleanno al bar', 'cosa serve per una festa al bar', 'come funziona una festa privata', 'come si prenota il locale per una festa'],
    'In genere servono la data, il numero di ospiti, il tipo di evento e le eventuali esigenze alimentari. Il locale valuta se può ospitarla e comunica condizioni e costi: non si danno per scontati prima della sua conferma.'),
  f('prenota_tavolo', 'Conviene prenotare per aperitivo o brunch?', ['serve prenotare per l aperitivo', 'bisogna prenotare per il brunch', 'conviene prenotare il fine settimana', 'meglio prenotare il tavolo', 'devo prenotare per l aperitivo'],
    'Nei momenti di maggiore affluenza, per esempio aperitivo serale o fine settimana, prenotare aiuta a non trovare il locale pieno. Se la prenotazione è necessaria o possibile lo stabilisce il locale.'),
  f('prenota_tavolo', 'Si può prenotare per un gruppo numeroso?', ['prenotare per un gruppo grande', 'tavolo per tante persone', 'si prenota per gruppi', 'avete tavoli per gruppi numerosi', 'tavolata grande'],
    'Per i gruppi numerosi è meglio avvisare in anticipo: il locale verifica gli spazi disponibili e conferma. Non si può dare per scontata la disponibilità prima della conferma.'),
  f('info_esigenze', 'Che differenza c\'è tra vegano e vegetariano?', ['differenza tra vegano e vegetariano', 'cosa significa vegano', 'cosa significa vegetariano', 'vegano o vegetariano', 'cosa mangia un vegano'],
    'Chi è vegetariano non mangia carne né pesce, ma in genere consuma uova, latte e derivati. Chi è vegano esclude tutti i prodotti di origine animale. Quali opzioni ha il locale lo trova nelle informazioni dell\'attività.'),
  f('info_esigenze', 'Cosa significa senza lattosio?', ['cosa vuol dire senza lattosio', 'che differenza c e tra senza lattosio e vegano', 'senza lattosio cosa significa', 'prodotti delattosati cosa sono', 'lattosio cos e'],
    'Un prodotto senza lattosio contiene latte e derivati in cui il lattosio è stato scomposto o ridotto: non è la stessa cosa di un prodotto vegano. Per qualsiasi intolleranza o allergia la conferma sui singoli prodotti spetta al personale del locale.'),
  f('info_esigenze', 'Gli allergeni vanno dichiarati dai locali?', ['i bar devono dichiarare gli allergeni', 'obbligo allergeni', 'quali sono gli allergeni', 'come faccio a sapere gli allergeni', 'dove trovo gli allergeni'],
    'In Italia e in Europa i locali che servono alimenti devono poter fornire informazioni sugli allergeni presenti. Per sapere cosa contiene un prodotto specifico è necessario chiedere al personale: io non posso darle garanzie sugli ingredienti.'),
  f('info_esigenze', 'Un prodotto senza glutine va bene per i celiaci?', ['senza glutine e adatto ai celiaci', 'posso mangiare senza glutine se sono celiaco', 'i celiaci possono mangiare', 'la celiachia e il senza glutine', 'prodotti per celiaci'],
    'Per le persone celiache conta anche il rischio di contaminazione durante la preparazione, non solo gli ingredienti. Per questo la conferma deve arrivare dal personale del locale: io non posso dare garanzie.'),
  f('info_esigenze', 'Si può avere il latte vegetale nel cappuccino?', ['cappuccino con latte di soia', 'cappuccino con latte di avena', 'si puo avere il latte vegetale', 'latte alternativo nel caffe', 'cappuccino senza latte vaccino'],
    'Molti bar offrono alternative vegetali al latte vaccino, ma non tutti: se e quali dipende dal locale. Per allergie o intolleranze serve la conferma del personale.'),
  f('info_servizi', 'Come si conserva una torta con creme o panna?', ['come conservare la torta', 'la torta va in frigo', 'come si conserva una torta', 'quanto dura una torta', 'conservazione torta con panna'],
    'In generale le torte con creme, panna o mascarpone vanno tenute in frigorifero fino al momento di servirle. Per i tempi di conservazione precisi chieda indicazioni al locale al momento del ritiro.'),
  f('info_spazi', 'Posso portare il cane al bar?', ['i cani sono ammessi nei bar', 'posso entrare con il cane', 'si puo andare al bar con il cane', 'cani ammessi nei locali'],
    'Dipende dal locale e dagli spazi (interno, dehors): ogni attività stabilisce le proprie regole sui cani. Se sono ammessi lo trova nelle informazioni dell\'attività.'),
  f('info_pagamenti', 'Cosa sono i buoni pasto?', ['come funzionano i buoni pasto', 'cosa sono i ticket restaurant', 'si possono usare i buoni pasto al bar', 'buoni pasto cosa sono'],
    'I buoni pasto sono strumenti di pagamento del welfare aziendale, cartacei o elettronici. Ogni locale decide quali circuiti accetta: va verificato con il locale.'),
  f('info_servizi', 'Posso portare una torta mia per una festa?', ['posso portare la mia torta', 'si puo portare il dolce da fuori', 'posso portare cibo da casa', 'portare una torta da fuori'],
    'Dipende dal locale: alcuni lo consentono, altri no, a volte a condizioni particolari. Meglio chiedere allo staff prima.'),
];
