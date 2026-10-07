// lib/engine/packs/organizzazione_eventi.js
//
// Sector Pack "organizzazione_eventi" v1 (matrimoni, feste private, eventi
// aziendali, cerimonie; Italia) — conoscenza di SETTORE, non di un singolo
// organizzatore. Prezzi, tariffe, pacchetti, preventivi, capienze delle
// location, date libere, orari, fornitori, politiche di caparra/pagamento,
// nomi del personale e indirizzo NON stanno qui: arrivano solo dai dati del
// tenant (config, servizi, KB, calendario).
//
// Note di progetto (specifiche del settore):
//  - Le entità portanti sono data dell'evento, location e numero di ospiti
//    (oltre a tipo di evento e nome del cliente). Il lead si chiude solo con
//    questi dati; la disponibilità di una data si propone SOLO dal calendario
//    del tenant (propose_slot), mai a memoria.
//  - Il bot non stima costi, non fa preventivi, non indica capienze o
//    disponibilità non presenti nelle fonti.
//  - Permessi e licenze (SIAE, suolo pubblico, sicurezza, rumore, fuochi,
//    somministrazione): solo informazioni generali, senza certezza normativa.
//    Le richieste di certezza ("è a norma?", "siamo in regola?", "è legale?")
//    sono richieste SENSIBILI e passano a una persona.
//  - Allergie, celiachia e intolleranze degli ospiti: nessun consiglio e nessuna
//    garanzia; qualunque segnalazione passa a una persona.
//  - Caparre, acconti, saldi, bonifici, contratti, rimborsi: SOLO il titolare.
//    Il bot non comunica importi né coordinate di pagamento.
//  - Evento imminente (oggi, domani, tra poche ore) o problema in corso
//    (fornitore assente, location chiusa, guasto): passaggio immediato a una
//    persona. Pericolo per le persone (malore, incendio, crollo, aggressione):
//    CRITICAL, invito a chiamare il 112 e avviso immediato al responsabile.

export const SETTORE = 'organizzazione_eventi';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack organizzazione_eventi — lessico di tipo evento/data/location/ospiti/servizi/permessi, 26 intent, 15 entità, lead con data+ospiti+tipo evento, disponibilità data solo da calendario, permessi e licenze come informazione generale senza certezza normativa, allergie e pagamenti sempre a una persona, urgenza HIGH per evento imminente o problema in corso e CRITICAL (112) per pericolo alle persone, 24 FAQ di settore.';

// ---- Generatori di voci di lessico (dati, non logica) ----
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI_PER_MESE = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PAROLE_NUM = { 10: 'dieci', 12: 'dodici', 15: 'quindici', 16: 'sedici', 18: 'diciotto', 20: 'venti', 25: 'venticinque', 30: 'trenta', 35: 'trentacinque', 40: 'quaranta', 45: 'quarantacinque', 50: 'cinquanta', 60: 'sessanta', 70: 'settanta', 80: 'ottanta', 90: 'novanta', 100: 'cento', 120: 'centoventi', 150: 'centocinquanta', 200: 'duecento', 250: 'duecentocinquanta', 300: 'trecento', 400: 'quattrocento', 500: 'cinquecento' };

// Numero di ospiti. Niente "per N" (collide con "per 14 giugno") né "di N"
// ("compleanno di 50 anni"); "siamo in N" solo da 10 in su (a un appuntamento
// "siamo in due" sono i partecipanti, non gli ospiti dell evento).
function vociOspiti() {
  const out = [
    { canonical: 'ospiti_circa_20', entity: 'numero_ospiti', value: 20, synonyms: ['una ventina di persone', 'una ventina di ospiti', 'una ventina di invitati', 'una ventina'] },
    { canonical: 'ospiti_circa_30', entity: 'numero_ospiti', value: 30, synonyms: ['una trentina di persone', 'una trentina di ospiti', 'una trentina di invitati', 'una trentina'] },
    { canonical: 'ospiti_circa_40', entity: 'numero_ospiti', value: 40, synonyms: ['una quarantina di persone', 'una quarantina di ospiti', 'una quarantina di invitati', 'una quarantina'] },
    { canonical: 'ospiti_circa_50', entity: 'numero_ospiti', value: 50, synonyms: ['una cinquantina di persone', 'una cinquantina di ospiti', 'una cinquantina di invitati', 'una cinquantina'] },
    { canonical: 'ospiti_circa_60', entity: 'numero_ospiti', value: 60, synonyms: ['una sessantina di persone', 'una sessantina di ospiti', 'una sessantina di invitati', 'una sessantina'] },
    { canonical: 'ospiti_circa_70', entity: 'numero_ospiti', value: 70, synonyms: ['una settantina di persone', 'una settantina di ospiti', 'una settantina di invitati', 'una settantina'] },
    { canonical: 'ospiti_circa_80', entity: 'numero_ospiti', value: 80, synonyms: ['una ottantina di persone', 'una ottantina di ospiti', 'una ottantina di invitati', 'un ottantina', 'una ottantina'] },
    { canonical: 'ospiti_circa_90', entity: 'numero_ospiti', value: 90, synonyms: ['una novantina di persone', 'una novantina di ospiti', 'una novantina di invitati', 'una novantina'] },
    { canonical: 'ospiti_circa_100', entity: 'numero_ospiti', value: 100, synonyms: ['un centinaio di persone', 'un centinaio di ospiti', 'un centinaio di invitati', 'un centinaio'] },
  ];
  for (let n = 2; n <= 500; n++) {
    const syn = [`${n} ospiti`, `${n} invitati`, `${n} persone`, `${n} coperti`, `${n} adulti`, `${n} amici`, `${n} amiche`, `${n} colleghi`, `${n} invitate`, `${n} ragazzi`, `${n} partecipanti`, `${n} dipendenti`, `${n} commensali`, `${n} pax`, `circa ${n}`, `saremo in ${n}`, `saremmo in ${n}`];
    if (n >= 10) syn.push(`siamo in ${n}`, `siamo ${n}`, `saremo ${n}`);
    const w = PAROLE_NUM[n];
    if (w) syn.push(`${w} ospiti`, `${w} invitati`, `${w} persone`, `${w} amici`, `siamo in ${w}`, `saremo in ${w}`, `saremmo in ${w}`);
    out.push({ canonical: `n_ospiti_${n}`, entity: 'numero_ospiti', value: n, synonyms: syn });
  }
  return out;
}

// Data dell evento: prima le date precise (giorno + mese), poi il solo mese,
// poi stagioni, festività e formule relative. Vince la prima voce che combacia.
function vociDate() {
  const out = [];
  MESI.forEach((mese, i) => {
    const m = i + 1;
    for (let d = 1; d <= GIORNI_PER_MESE[i]; d++) {
      const syn = [`${d} ${mese}`, `il ${d} ${mese}`, `il ${d} ${m}`];
      if (m < 10) syn.push(`il ${d} 0${m}`);
      if (d === 1) syn.push(`primo ${mese}`, `il primo ${mese}`);
      out.push({ canonical: `data_${d}_${mese}`, entity: 'data_evento', value: `${d} ${mese}`, synonyms: syn });
    }
  });
  MESI.forEach((mese) => {
    out.push({ canonical: `mese_${mese}`, entity: 'data_evento', value: mese,
      synonyms: [`a ${mese}`, `in ${mese}`, `ad ${mese}`, `${mese} prossimo`, `fine ${mese}`, `inizio ${mese}`, `meta ${mese}`, `di ${mese}`, `per ${mese}`, `entro ${mese}`, `verso ${mese}`, mese] });
  });
  out.push(
    { canonical: 'primavera', entity: 'data_evento', value: 'primavera', synonyms: ['in primavera', 'questa primavera', 'prossima primavera', 'primavera prossima', 'd primavera', 'primavera'] },
    { canonical: 'estate', entity: 'data_evento', value: 'estate', synonyms: ['in estate', 'questa estate', 'quest estate', 'prossima estate', 'estate prossima', 'd estate', 'estate'] },
    { canonical: 'autunno', entity: 'data_evento', value: 'autunno', synonyms: ['in autunno', 'questo autunno', 'prossimo autunno', 'autunno prossimo', 'd autunno', 'autunno'] },
    { canonical: 'inverno', entity: 'data_evento', value: 'inverno', synonyms: ['in inverno', 'questo inverno', 'prossimo inverno', 'inverno prossimo', 'd inverno', 'inverno'] },
    { canonical: 'anno_prossimo', entity: 'data_evento', value: 'anno_prossimo', synonyms: ['anno prossimo', 'l anno prossimo', 'prossimo anno', 'il prossimo anno', 'l anno che viene', 'fra un anno', 'tra un anno', 'tra due anni', 'fra due anni'] },
    { canonical: 'tra_un_mese', entity: 'data_evento', value: 'tra_un_mese', synonyms: ['tra un mese', 'fra un mese', 'tra un paio di mesi', 'fra un paio di mesi', 'tra qualche mese', 'fra qualche mese', 'tra un paio di settimane', 'fra un paio di settimane', 'tra qualche settimana', 'fra qualche settimana'] },
    { canonical: 'natale', entity: 'data_evento', value: 'natale', synonyms: ['natale', 'a natale', 'vigilia di natale', 'santo stefano', 'cena di natale'] },
    { canonical: 'capodanno', entity: 'data_evento', value: 'capodanno', synonyms: ['capodanno', 'ultimo dell anno', 'cenone di capodanno', 'san silvestro', 'notte di san silvestro'] },
    { canonical: 'pasqua', entity: 'data_evento', value: 'pasqua', synonyms: ['pasqua', 'pasquetta', 'lunedi dell angelo'] },
    { canonical: 'ferragosto', entity: 'data_evento', value: 'ferragosto', synonyms: ['ferragosto'] },
    { canonical: 'san_valentino', entity: 'data_evento', value: 'san_valentino', synonyms: ['san valentino'] },
    { canonical: 'weekend', entity: 'data_evento', value: 'weekend', synonyms: ['questo weekend', 'il weekend prossimo', 'weekend prossimo', 'questo fine settimana', 'fine settimana prossimo', 'il prossimo weekend', 'il prossimo fine settimana'] },
  );
  for (let n = 2; n <= 24; n++) {
    out.push({ canonical: `tra_${n}_mesi`, entity: 'data_evento', value: `tra_${n}_mesi`, synonyms: [`tra ${n} mesi`, `fra ${n} mesi`, `tra ${n} settimane`, `fra ${n} settimane`] });
  }
  return out;
}

// Orario di un incontro (consulenza, sopralluogo): solo ore di ufficio.
// Le varianti con minuti vengono PRIMA di quelle senza (vince la prima voce).
const ORE = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
function vociOrari() {
  const out = [];
  for (const h of ORE) {
    for (const m of ['30', '15', '45']) {
      const syn = [`alle ${h} ${m}`, `per le ${h} ${m}`, `verso le ${h} ${m}`, `intorno alle ${h} ${m}`, `ore ${h} ${m}`, `alle ${h} e ${m}`, `per le ${h} e ${m}`];
      if (m === '30') syn.push(`alle ${h} e mezza`, `alle ${h} e mezzo`, `per le ${h} e mezza`, `verso le ${h} e mezza`);
      out.push({ canonical: `ore_${h}_${m}`, entity: 'orario', value: `${h}:${m}`, synonyms: syn });
    }
    out.push({ canonical: `ore_${h}_00`, entity: 'orario', value: `${h}:00`, synonyms: [`alle ${h}`, `per le ${h}`, `verso le ${h}`, `intorno alle ${h}`, `ore ${h}`] });
  }
  for (const h of ORE) {
    out.push({ canonical: `fascia_ore_${h}`, entity: 'fascia_oraria', value: h < 13 ? 'mattina' : h < 18 ? 'pomeriggio' : 'sera', synonyms: [`alle ${h}`, `per le ${h}`, `verso le ${h}`, `intorno alle ${h}`, `ore ${h}`] });
  }
  return out;
}

// Evento imminente: (evento) x (momento ravvicinato). Servono a classificare
// "la festa è domani" come urgenza e a mandare il messaggio a una persona.
const NOMI_EVENTO = ['evento', 'festa', 'matrimonio', 'cerimonia', 'party', 'cena', 'compleanno', 'battesimo', 'comunione', 'cresima', 'laurea', 'convention', 'inaugurazione', 'ricevimento', 'rinfresco', 'banchetto', 'nozze', 'aperitivo'];
const MOMENTI_VICINI = ['domani', 'stasera', 'oggi', 'dopodomani', 'stanotte', 'tra due giorni', 'fra due giorni', 'tra tre giorni', 'tra pochi giorni', 'tra poche ore', 'fra poche ore', 'tra un ora', 'tra due ore', 'fra due ore', 'a breve', 'tra poco', 'fra poco'];
const ARTICOLI = ['il', 'la', 'l'];
const VERBI_POSSESSO = ['c e', 'ho', 'abbiamo'];
// Per gli esempi dell intent bastano due forme (il confronto per sovrapposizione
// e indifferente all ordine delle parole: meno esempi = meno falsi positivi e meno latenza).
const FRASI_IMMINENTE = NOMI_EVENTO.flatMap((n) => MOMENTI_VICINI.flatMap((t) => [`${n} ${t}`, `${n} e ${t}`]));
// Per l urgenza servono anche le forme con altro ordine ("domani c e il matrimonio").
const FRASI_IMMINENTE_URGENZA = NOMI_EVENTO.flatMap((n) => MOMENTI_VICINI.flatMap((t) => [
  `${n} ${t}`, `${n} e ${t}`, `${n} sara ${t}`, `${n} di ${t}`,
  ...VERBI_POSSESSO.flatMap((v) => ARTICOLI.map((a) => `${t} ${v} ${a} ${n}`)),
]));

export const pack = {
  identity: {
    nome_ruolo: 'organizzatore di eventi',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un\'agenzia di organizzazione eventi (matrimoni, feste private, cerimonie, eventi aziendali). Accogli i clienti con tono cordiale, affidabile e chiaro; raccogli le informazioni essenziali (tipo di evento, data, numero di ospiti, location, nome), fissi incontri e inoltri le richieste di preventivo al team. Non sei un consulente legale o di sicurezza e non sei un nutrizionista: sui permessi dai solo informazioni generali senza certezze, sulle allergie non dai consigli e passi a una persona. Non stimi costi, non confermi date, capienze o disponibilità che non risultano dai dati dell\'agenzia, e non gestisci caparre o pagamenti: se ne occupa solo il titolare.',
  },
  mission: 'Capire che evento vuole organizzare il cliente, raccogliere solo le informazioni necessarie (tipo di evento, data, numero di ospiti, location, nome), fissare un incontro o passare la richiesta al team per il preventivo, e far arrivare subito a una persona allergie, pagamenti, modifiche, reclami, eventi imminenti e problemi in corso.',
  tone_default: 'cordiale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, tono cordiale e rassicurante senza promettere nulla che non sia nei dati dell\'agenzia.',
    'Una sola domanda per messaggio e mai su un\'informazione già data (tipo di evento, data, ospiti, location, nome).',
    'Mai inventare prezzi, tariffe, pacchetti, preventivi, capienze delle location, date libere, orari, fornitori o servizi: usa solo i dati dell\'agenzia.',
    'La disponibilità di una data si verifica solo sul calendario dell\'agenzia; finché non c\'è una conferma reale non dire mai che una data è libera, bloccata o riservata.',
    'Permessi e licenze (SIAE, suolo pubblico, sicurezza, rumore, fuochi, somministrazione): solo informazioni generali, con la precisazione che i casi concreti vanno verificati con il team e con gli enti competenti; mai certezze normative.',
    'Allergie, celiachia e intolleranze degli ospiti: nessun consiglio e nessuna garanzia, la richiesta passa a una persona.',
    'Caparre, acconti, saldi, bonifici, contratti e rimborsi: solo il titolare; non comunicare importi né coordinate di pagamento.',
    'Evento imminente o problema in corso: nessuna raccolta dati, passaggio immediato a una persona. Pericolo per le persone: invitare a chiamare il 112.',
  ],
  prohibited_claims: [
    'indicare prezzi, tariffe, pacchetti, sconti o stime di costo non presenti nelle fonti',
    'confermare, bloccare o riservare una data che non risulta libera dal calendario',
    'indicare la capienza di una location o la disponibilità di una location non presente nelle fonti',
    'dare certezze su permessi, licenze, SIAE, sicurezza, normative o sanzioni',
    'dire che un evento, una location o una struttura è a norma, legale o in regola',
    'dare consigli o garanzie su allergie, celiachia, intolleranze o contaminazioni',
    'comunicare importi di caparre o acconti, coordinate di pagamento o confermare pagamenti ricevuti',
    'promettere meteo, risultati, assenza di imprevisti o esiti dell\'evento',
    'dichiarare un evento, un preventivo o una prenotazione come confermati senza un riscontro reale',
  ],
  business_rules: [
    'Il lead di un evento richiede tipo di evento, data, numero di ospiti e nome; la location, i servizi e le esigenze sono utili ma facoltative.',
    'La disponibilità di una data o di un incontro si propone solo se risulta dal calendario del tenant.',
    'Modifiche, spostamenti, disdette, rimborsi e conferme su eventi già avviati vanno passati a una persona.',
    'Caparre, acconti, saldi, bonifici, fatture e contratti: solo il titolare.',
    'Evento nelle prossime ore o nei prossimi giorni e problemi in corso (fornitore assente, location chiusa, guasti, ospiti in numero diverso): passaggio immediato a una persona.',
    'Malore di un ospite, incendio, crollo, aggressione o ferite: invitare a chiamare subito il 112 e avvisare il responsabile.',
    'Le richieste di certezza su permessi, sicurezza, capienza a norma e normative passano a una persona.',
  ],

  entities: [
    { id: 'tipo_evento', descrizione: 'Tipo di evento da organizzare.', tipo: 'enum', priorita: 10,
      valori: ['matrimonio', 'proposta', 'anniversario', 'compleanno', 'diciottesimo', 'laurea', 'battesimo', 'comunione_cresima', 'addio', 'baby_party', 'evento_aziendale', 'evento_pubblico', 'festa_privata', 'altro'],
      domanda_varianti: ['Che tipo di evento vuole organizzare?', 'Di che evento si tratta?', 'Per quale occasione?'] },
    { id: 'data_evento', descrizione: 'Data (o periodo) dell\'evento, anche indicativa.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Ha già una data in mente per l\'evento?', 'Per quale data o periodo?', 'Quando vorrebbe che si svolgesse?'] },
    { id: 'numero_ospiti', descrizione: 'Numero di ospiti (anche approssimativo).', tipo: 'number', priorita: 30,
      domanda_varianti: ['Quanti ospiti pensate di avere, più o meno?', 'Per quante persone circa?', 'Quanti invitati prevedete?'] },
    { id: 'location', descrizione: 'Dove si svolge l\'evento: tipo di location, oppure se è già scelta o da trovare.', tipo: 'enum', priorita: 35,
      valori: ['da_trovare', 'gia_scelta', 'villa', 'casale_agriturismo', 'castello_dimora', 'giardino_parco', 'spiaggia', 'ristorante', 'hotel', 'sala', 'terrazza', 'casa_privata', 'sede_azienda', 'piazza_suolo_pubblico'],
      domanda_varianti: ['Avete già scelto la location o dovete ancora trovarla?', 'Dove vorreste svolgere l\'evento?'] },
    { id: 'giorno', descrizione: 'Giorno richiesto per l\'incontro o la consulenza (non la data dell\'evento).', tipo: 'string', priorita: 38,
      domanda_varianti: ['Per quale giorno preferisce l\'incontro?', 'Che giorno le andrebbe bene?', 'Mi dice per che giorno?'] },
    { id: 'fascia_oraria', descrizione: 'Fascia oraria preferita per l\'incontro.', tipo: 'enum', priorita: 39, valori: ['mattina', 'pomeriggio', 'sera'],
      domanda_varianti: ['Preferisce la mattina o il pomeriggio?', 'In quale fascia della giornata?', 'Meglio mattina o pomeriggio?'] },
    { id: 'orario', descrizione: 'Orario preciso dell\'incontro, se indicato.', tipo: 'string', priorita: 45 },
    { id: 'nome_cliente', descrizione: 'Nome a cui registrare la richiesta.', tipo: 'string', priorita: 40,
      domanda_varianti: ['A che nome registro la richiesta?', 'Mi dice il suo nome?', 'Come si chiama?'] },
    { id: 'tipo_incontro', descrizione: 'Tipo di incontro richiesto: consulenza conoscitiva, sopralluogo, degustazione, call.', tipo: 'enum', priorita: 50, valori: ['consulenza', 'sopralluogo', 'degustazione', 'call'] },
    { id: 'servizi_richiesti', descrizione: 'Servizi richiesti per l\'evento.', tipo: 'enum', priorita: 55,
      valori: ['organizzazione_completa', 'coordinamento_giornata', 'catering', 'allestimento', 'musica_dj', 'foto_video', 'torta', 'animazione', 'service_audio_luci', 'noleggio_attrezzature', 'trasporto', 'inviti_partecipazioni', 'bomboniere', 'personale_sala'] },
    { id: 'esigenze_alimentari', descrizione: 'Esigenze alimentari o allergie degli ospiti (nessun consiglio: inoltro a una persona).', tipo: 'enum', priorita: 60,
      valori: ['celiachia', 'senza_glutine', 'lattosio', 'frutta_a_guscio', 'allergia', 'vegetariano', 'vegano', 'religiosa'] },
    { id: 'esigenze_speciali', descrizione: 'Accessibilità, bambini, animali, anziani, ospiti stranieri.', tipo: 'enum', priorita: 65, valori: ['accessibilita', 'bambini', 'animali', 'anziani', 'stranieri'] },
    { id: 'permesso', descrizione: 'Tema di permesso o licenza di cui il cliente chiede.', tipo: 'enum', priorita: 70,
      valori: ['siae', 'suolo_pubblico', 'sicurezza', 'rumore', 'fuochi_artificio', 'somministrazione', 'assicurazione'] },
    { id: 'problema', descrizione: 'Tipo di problema in corso segnalato dal cliente.', tipo: 'enum', priorita: 75,
      valori: ['fornitore_assente', 'location_problema', 'maltempo', 'guasto', 'ospiti_in_piu', 'ritardo', 'malore_ospite', 'incidente', 'altro'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Numero di ospiti, date, orari (generati) ----
    ...vociOspiti(),
    ...vociDate(),
    ...vociOrari(),

    // ---- Tipo di evento (le voci specifiche PRIMA di quelle generiche) ----
    { canonical: 'proposta', entity: 'tipo_evento', value: 'proposta', synonyms: ['proposta di matrimonio', 'chiedere la mano', 'chiedere di sposarmi', 'proposta di nozze', 'organizzare una proposta', 'surprise proposal'] },
    { canonical: 'anniversario', entity: 'tipo_evento', value: 'anniversario', synonyms: ['anniversario', 'anniversari', 'anniversario di matrimonio', 'anniversario di nozze', 'nozze d argento', 'nozze d oro', 'nozze di argento', 'nozze di oro'] },
    { canonical: 'addio', entity: 'tipo_evento', value: 'addio', synonyms: ['addio al nubilato', 'addio al celibato', 'addio nubilato', 'addio celibato', 'nubilato', 'celibato', 'despedida'] },
    { canonical: 'baby_party', entity: 'tipo_evento', value: 'baby_party', synonyms: ['baby shower', 'gender reveal', 'festa per la nascita', 'festa di nascita', 'welcome baby', 'fiocco rosa', 'fiocco azzurro', 'festa del bebe'] },
    { canonical: 'diciottesimo', entity: 'tipo_evento', value: 'diciottesimo', synonyms: ['diciottesimo', '18esimo', '18 anni', 'festa dei 18', 'festa dei diciotto', 'diciott anni', 'compie 18 anni', 'compie diciotto anni', 'maggiore eta'] },
    { canonical: 'battesimo', entity: 'tipo_evento', value: 'battesimo', synonyms: ['battesimo', 'battesimi', 'festa di battesimo', 'festeggiare il battesimo'] },
    { canonical: 'comunione_cresima', entity: 'tipo_evento', value: 'comunione_cresima', synonyms: ['comunione', 'prima comunione', 'cresima', 'confermazione', 'festa di comunione', 'festa della cresima'] },
    { canonical: 'evento_aziendale', entity: 'tipo_evento', value: 'evento_aziendale', synonyms: ['evento aziendale', 'eventi aziendali', 'cena aziendale', 'pranzo aziendale', 'festa aziendale', 'cena di natale aziendale', 'evento corporate', 'corporate', 'convention', 'team building', 'lancio di un prodotto', 'lancio prodotto', 'presentazione di un prodotto', 'inaugurazione', 'open day', 'congresso', 'convegno', 'conferenza', 'meeting aziendale', 'serata di gala', 'cena di gala', 'gala', 'premiazione', 'cena con i clienti', 'cena con i dipendenti', 'festa per i dipendenti', 'azienda', 'aziendale', 'per la mia societa', 'per la nostra societa', 'per la nostra azienda', 'per la mia azienda', 'fiera', 'stand'], intent: 'richiesta_preventivo' },
    { canonical: 'evento_pubblico', entity: 'tipo_evento', value: 'evento_pubblico', synonyms: ['evento pubblico', 'concerto', 'festival', 'sagra', 'fiera di paese', 'evento in piazza', 'festa di piazza', 'serata in piazza', 'evento all aperto per il pubblico', 'evento per il comune', 'rassegna'] },
    { canonical: 'matrimonio', entity: 'tipo_evento', value: 'matrimonio', synonyms: ['matrimonio', 'matrimoni', 'nozze', 'wedding', 'sposarci', 'sposarmi', 'ci sposiamo', 'mi sposo', 'sposiamo', 'sposi', 'sposa', 'sposo', 'unione civile', 'rito civile', 'rito religioso', 'ricevimento nuziale', 'promessa di matrimonio'], errors: ['matrimnio', 'matrimonoi'] },
    { canonical: 'compleanno', entity: 'tipo_evento', value: 'compleanno', synonyms: ['compleanno', 'compleanni', 'festa di compleanno', 'festeggiare il compleanno', 'compie gli anni', 'compio gli anni', 'compie anni', 'compio anni', 'compiamo gli anni', '40 anni', '50 anni', '60 anni', '70 anni', '30 anni', 'quarant anni', 'cinquant anni', 'sessant anni', 'festa a sorpresa', 'festa a tema'], errors: ['compleano'] },
    // laurea DOPO matrimonio/compleanno: il fuzzy a distanza 1 confonde il nome 'Laura' con 'laurea' (limite del motore)
    { canonical: 'laurea', entity: 'tipo_evento', value: 'laurea', synonyms: ['laurea', 'laureato', 'laureata', 'laurearsi', 'laureati', 'festa di laurea', 'festeggiare la laurea', 'proclamazione'], errors: ['lauera'] },
    { canonical: 'festa_privata', entity: 'tipo_evento', value: 'festa_privata', synonyms: ['festa privata', 'festa', 'feste', 'party', 'evento privato', 'festeggiare', 'festeggiamento', 'festeggiamenti', 'una festa', 'serata', 'cena speciale', 'cena di gruppo', 'cena di classe', 'rimpatriata', 'reunion', 'pensionamento', 'festa di pensione', 'festa di fine anno', 'cena di fine anno', 'cena con i colleghi', 'cena di natale', 'cerimonia', 'cerimonie', 'ricorrenza', 'evento', 'eventi'] },

    // ---- Location (prima da_trovare, poi gia_scelta, poi tipi) ----
    { canonical: 'location_da_trovare', entity: 'location', value: 'da_trovare', synonyms: ['ancora da trovare dove', 'da trovare dove farlo', 'da trovare dove farla', 'non sappiamo ancora dove', 'non sappiamo dove farlo', 'non sappiamo dove farla', 'non abbiamo ancora scelto dove', 'dove farlo ancora da decidere', 'cerchiamo una location', 'cerco una location', 'cercavamo una location', 'ci serve una location', 'mi serve una location', 'ci servirebbe una location', 'dobbiamo trovare la location', 'dobbiamo trovare una location', 'non abbiamo ancora la location', 'non abbiamo la location', 'non abbiamo una location', 'non ho ancora la location', 'non ho una location', 'location da trovare', 'location da cercare', 'ancora senza location', 'senza location', 'trovate voi la location', 'cercate voi la location', 'aiutarci a trovare la location', 'aiutarmi a trovare la location', 'trovare una location', 'trovare la location', 'cercare una location', 'cercare la location', 'cerchiamo un posto', 'cerchiamo una villa', 'cerco una villa', 'cerchiamo un posto per'] },
    { canonical: 'location_scelta', entity: 'location', value: 'gia_scelta', negabile: true, synonyms: ['abbiamo gia la location', 'abbiamo gia scelto la location', 'abbiamo gia una location', 'abbiamo la location', 'ho gia la location', 'ho gia una location', 'ho la location', 'location gia scelta', 'location gia prenotata', 'location gia fissata', 'location gia trovata', 'location scelta', 'location fissata', 'location prenotata', 'la location ce l abbiamo', 'la location ce l ho', 'abbiamo gia prenotato la location', 'abbiamo gia fissato la location'] },
    { canonical: 'villa', entity: 'location', value: 'villa', synonyms: ['villa', 'ville', 'dimora storica', 'villa storica', 'in villa', 'villa con piscina', 'villa privata'] },
    { canonical: 'casale', entity: 'location', value: 'casale_agriturismo', synonyms: ['casale', 'agriturismo', 'masseria', 'una tenuta', 'cascina', 'borgo', 'country house', 'casolare', 'in campagna', 'azienda agricola', 'vigna', 'cantina', 'in cantina'] },
    { canonical: 'castello', entity: 'location', value: 'castello_dimora', synonyms: ['castello', 'castelli', 'palazzo', 'palazzo storico', 'abbazia', 'convento', 'monastero', 'torre', 'rocca'] },
    { canonical: 'giardino', entity: 'location', value: 'giardino_parco', synonyms: ['giardino', 'in giardino', 'parco', 'in un parco', 'parco comunale', 'orto botanico', 'prato', 'bosco', 'all aperto', 'all aria aperta', 'esterno', 'outdoor'] },
    { canonical: 'spiaggia', entity: 'location', value: 'spiaggia', synonyms: ['spiaggia', 'in spiaggia', 'lido', 'stabilimento balneare', 'sul mare', 'al mare', 'sul lago', 'lago', 'barca', 'in barca', 'yacht'] },
    { canonical: 'ristorante', entity: 'location', value: 'ristorante', synonyms: ['ristorante', 'al ristorante', 'trattoria', 'pizzeria', 'locale', 'in un locale', 'lounge bar', 'enoteca', 'bar'] },
    { canonical: 'hotel', entity: 'location', value: 'hotel', synonyms: ['hotel', 'albergo', 'resort', 'in hotel', 'sala dell hotel', 'relais', 'b&b', 'residence'] },
    { canonical: 'sala', entity: 'location', value: 'sala', synonyms: ['sala ricevimenti', 'sala per ricevimenti', 'salone', 'sala eventi', 'sala conferenze', 'sala', 'capannone', 'loft', 'teatro', 'centro congressi', 'palestra', 'oratorio', 'sala parrocchiale', 'circolo'] },
    { canonical: 'terrazza', entity: 'location', value: 'terrazza', synonyms: ['terrazza', 'terrazzo', 'rooftop', 'lastrico solare'] },
    { canonical: 'casa_privata', entity: 'location', value: 'casa_privata', synonyms: ['a casa mia', 'a casa nostra', 'a casa', 'in casa', 'casa privata', 'nel mio giardino', 'nel nostro giardino', 'in casa nostra', 'appartamento', 'in appartamento'] },
    { canonical: 'sede_azienda', entity: 'location', value: 'sede_azienda', synonyms: ['sede aziendale', 'in sede', 'in azienda', 'in ufficio', 'nei nostri uffici', 'nel nostro stabilimento', 'stabilimento', 'showroom', 'nel nostro showroom'] },
    { canonical: 'piazza', entity: 'location', value: 'piazza_suolo_pubblico', synonyms: ['piazza', 'in piazza', 'piazzale', 'in strada', 'strada chiusa', 'suolo pubblico', 'spazio pubblico', 'area pubblica', 'lungomare', 'sul lungomare', 'centro storico', 'nel centro storico', 'villa comunale'] },

    // ---- Tipo di incontro ----
    { canonical: 'sopralluogo', entity: 'tipo_incontro', value: 'sopralluogo', synonyms: ['sopralluogo', 'sopralluoghi', 'visitare la location', 'vedere la location', 'visita alla location', 'visita della location', 'visita in location', 'visitare la villa', 'vedere la villa', 'andare a vedere la location'], intent: 'prenota_consulenza' },
    { canonical: 'degustazione', entity: 'tipo_incontro', value: 'degustazione', synonyms: ['degustazione', 'degustazioni', 'assaggio menu', 'assaggio del menu', 'prova menu', 'prova del menu', 'assaggiare il menu', 'fare una degustazione'], intent: 'prenota_consulenza' },
    { canonical: 'call', entity: 'tipo_incontro', value: 'call', synonyms: ['call', 'videochiamata', 'video chiamata', 'videocall', 'chiamata conoscitiva', 'telefonata conoscitiva', 'zoom', 'google meet', 'meet', 'teams', 'riunione online', 'incontro online', 'online'], intent: 'prenota_consulenza' },
    { canonical: 'consulenza', entity: 'tipo_incontro', value: 'consulenza', synonyms: ['ci vediamo oggi', 'ci vediamo domani', 'ci vediamo dopodomani', 'ci vediamo lunedi', 'ci vediamo martedi', 'ci vediamo mercoledi', 'ci vediamo giovedi', 'ci vediamo venerdi', 'ci vediamo sabato', 'consulenza', 'consulenze', 'prima consulenza', 'incontro conoscitivo', 'primo incontro', 'incontro', 'incontrarvi', 'incontrarci', 'vederci', 'conoscerci', 'conoscervi', 'appuntamento', 'appuntamenti', 'colloquio', 'parlarne di persona', 'passare da voi', 'passare in ufficio', 'passare in sede', 'venire in sede', 'venire da voi', 'venire a trovarvi', 'venire in ufficio', 'vedervi di persona'], intent: 'prenota_consulenza' },

    // ---- Servizi richiesti ----
    { canonical: 'organizzazione_completa', entity: 'servizi_richiesti', value: 'organizzazione_completa', synonyms: ['organizzazione completa', 'chiavi in mano', 'tutto compreso', 'full service', 'wedding planner', 'wedding planning', 'event planner', 'event manager', 'organizzatore di eventi', 'organizzatrice di eventi', 'organizzatore', 'organizzatrice', 'pensate a tutto voi', 'occuparvi di tutto', 'occupate di tutto', 'seguire tutto', 'seguirci in tutto', 'organizzare tutto'], intent: 'info_servizi' },
    { canonical: 'coordinamento_giornata', entity: 'servizi_richiesti', value: 'coordinamento_giornata', synonyms: ['coordinamento', 'coordinatore', 'coordinatrice', 'coordinare la giornata', 'coordinamento del giorno', 'day coordination', 'coordinamento della giornata', 'coordinamento il giorno stesso', 'regia della giornata', 'regia dell evento', 'direzione dell evento'] },
    { canonical: 'catering', entity: 'servizi_richiesti', value: 'catering', synonyms: ['catering', 'banqueting', 'buffet', 'open bar', 'servizio bar', 'barman', 'aperitivo', 'cocktail', 'rinfresco', 'cena seduta', 'pranzo seduto', 'finger food', 'food truck', 'cucina', 'servizio di ristorazione', 'ristorazione', 'cena servita', 'pranzo servito', 'menu', 'tavolo dei dolci', 'sweet table', 'confettata', 'angolo dei dolci'], intent: 'info_catering' },
    { canonical: 'allestimento', entity: 'servizi_richiesti', value: 'allestimento', synonyms: ['allestimento', 'allestimenti', 'allestire', 'addobbi', 'decorazioni', 'decorare', 'fiori', 'fiorista', 'composizioni floreali', 'floral design', 'tableau', 'centrotavola', 'candele', 'wedding design', 'scenografia', 'photo wall', 'photobooth', 'arco di fiori', 'arco floreale', 'palloncini', 'balloon'] },
    { canonical: 'musica_dj', entity: 'servizi_richiesti', value: 'musica_dj', synonyms: ['dj', 'dj set', 'band', 'musica dal vivo', 'musicisti', 'cantante', 'orchestra', 'quartetto', 'quartetto d archi', 'piano bar', 'karaoke', 'intrattenimento musicale', 'musica per la festa', 'musica per il ricevimento', 'selezione musicale', 'dj per la festa'] },
    { canonical: 'foto_video', entity: 'servizi_richiesti', value: 'foto_video', synonyms: ['fotografo', 'fotografa', 'foto', 'servizio fotografico', 'video', 'videomaker', 'videografo', 'riprese', 'drone', 'riprese con drone', 'album fotografico', 'reportage', 'fotografia'] },
    { canonical: 'torta', entity: 'servizi_richiesti', value: 'torta', synonyms: ['torta', 'torta nuziale', 'torta di compleanno', 'torta scenografica', 'wedding cake', 'pasticceria', 'dolci', 'candy bar'] },
    { canonical: 'animazione', entity: 'servizi_richiesti', value: 'animazione', synonyms: ['animazione', 'animatore', 'animatrice', 'animatori', 'intrattenimento per bambini', 'giochi per bambini', 'clown', 'mago', 'truccabimbi', 'baby parking', 'baby sitter', 'baby sitting', 'spettacolo', 'spettacolo per bambini', 'giocoliere', 'gonfiabili', 'castello gonfiabile'] },
    { canonical: 'service_audio_luci', entity: 'servizi_richiesti', value: 'service_audio_luci', synonyms: ['service audio', 'service luci', 'service audio e luci', 'impianto audio', 'impianto luci', 'impianto', 'luci', 'illuminazione', 'palco', 'led wall', 'ledwall', 'maxischermo', 'proiettore', 'microfoni', 'microfono', 'schermo', 'audio video', 'tecnici audio', 'regia tecnica', 'fonico'] },
    { canonical: 'noleggio_attrezzature', entity: 'servizi_richiesti', value: 'noleggio_attrezzature', synonyms: ['noleggio', 'noleggiare', 'tavoli e sedie', 'sedie', 'tavoli', 'tendostruttura', 'tensostruttura', 'tendone', 'gazebo', 'stoviglie', 'tovagliato', 'tovaglie', 'arredi', 'arredo', 'divanetti', 'pedana', 'pista da ballo', 'bagni chimici', 'bagni mobili', 'generatore', 'riscaldamento', 'funghi riscaldanti', 'attrezzature'] },
    { canonical: 'trasporto', entity: 'servizi_richiesti', value: 'trasporto', synonyms: ['navetta', 'navette', 'bus', 'pullman', 'autista', 'noleggio con conducente', 'ncc', 'auto d epoca', 'auto degli sposi', 'macchina degli sposi', 'limousine', 'parcheggiatore', 'servizio parcheggio', 'trasporto ospiti', 'transfer'] },
    { canonical: 'inviti_partecipazioni', entity: 'servizi_richiesti', value: 'inviti_partecipazioni', synonyms: ['partecipazioni', 'inviti', 'invito', 'save the date', 'menu stampati', 'segnaposto', 'libretto messa', 'libretti messa', 'cartoncini', 'grafica', 'coordinato grafico'] },
    { canonical: 'bomboniere', entity: 'servizi_richiesti', value: 'bomboniere', synonyms: ['bomboniere', 'bomboniera', 'confetti', 'regalini', 'gadget', 'ricordini', 'favor', 'wedding favor'] },
    { canonical: 'personale_sala', entity: 'servizi_richiesti', value: 'personale_sala', synonyms: ['camerieri', 'cameriere', 'hostess', 'steward', 'personale di sala', 'personale', 'staff', 'accoglienza', 'security', 'servizio di sicurezza', 'addetti alla sicurezza', 'guardaroba', 'baristi'] },

    // ---- Esigenze alimentari (nessun consiglio: inoltro a una persona) ----
    { canonical: 'celiachia', entity: 'esigenze_alimentari', value: 'celiachia', negabile: true, synonyms: ['celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'intollerante al glutine', 'intolleranti al glutine', 'intolleranza al glutine'], errors: ['celiacco', 'celliaco'] },
    { canonical: 'senza_glutine', entity: 'esigenze_alimentari', value: 'senza_glutine', negabile: true, synonyms: ['senza glutine', 'gluten free', 'glutenfree', 'no glutine', 'privo di glutine', 'glutine'] },
    { canonical: 'lattosio', entity: 'esigenze_alimentari', value: 'lattosio', negabile: true, synonyms: ['senza lattosio', 'intollerante al lattosio', 'intolleranti al lattosio', 'intolleranza al lattosio', 'lattosio', 'latticini'] },
    { canonical: 'frutta_a_guscio', entity: 'esigenze_alimentari', value: 'frutta_a_guscio', negabile: true, synonyms: ['frutta a guscio', 'frutta secca', 'arachidi', 'noccioline', 'nocciole', 'noci', 'mandorle', 'pistacchi', 'allergia alle noci', 'allergia alle arachidi'] },
    { canonical: 'allergia', entity: 'esigenze_alimentari', value: 'allergia', negabile: true, synonyms: ['allergico', 'allergica', 'allergici', 'allergiche', 'allergia', 'allergie', 'allergeni', 'allergene', 'allergia alimentare', 'allergie alimentari', 'intollerante', 'intolleranti', 'intolleranza', 'intolleranze', 'intolleranze alimentari', 'shock anafilattico', 'epipen'], errors: ['alergia', 'alergico', 'alergica'] },
    { canonical: 'vegano', entity: 'esigenze_alimentari', value: 'vegano', negabile: true, synonyms: ['vegano', 'vegana', 'vegani', 'vegane', 'menu vegano', 'piatti vegani', 'dieta vegana'] },
    { canonical: 'vegetariano', entity: 'esigenze_alimentari', value: 'vegetariano', negabile: true, synonyms: ['vegetariano', 'vegetariana', 'vegetariani', 'vegetariane', 'menu vegetariano', 'piatti vegetariani', 'senza carne'] },
    { canonical: 'religiosa', entity: 'esigenze_alimentari', value: 'religiosa', negabile: true, synonyms: ['halal', 'kosher', 'senza maiale', 'senza carne di maiale', 'menu halal', 'menu kosher'] },

    // ---- Esigenze speciali ----
    { canonical: 'accessibilita', entity: 'esigenze_speciali', value: 'accessibilita', synonyms: ['sedia a rotelle', 'carrozzina', 'carrozzella', 'disabile', 'disabili', 'disabilita', 'accessibile', 'accessibilita', 'barriere architettoniche', 'mobilita ridotta', 'non deambulante', 'stampelle', 'ascensore', 'rampa', 'scivolo', 'bagno per disabili'], errors: ['sedia a rotele'] },
    { canonical: 'bambini', entity: 'esigenze_speciali', value: 'bambini', synonyms: ['bambini', 'bambino', 'bambina', 'bambine', 'bimbi', 'bimbo', 'bimba', 'neonato', 'neonata', 'ospiti piccoli', 'tanti bambini', 'area bambini', 'angolo bambini', 'fasciatoio'], errors: ['bambni'] },
    { canonical: 'animali', entity: 'esigenze_speciali', value: 'animali', synonyms: ['cane', 'cani', 'cagnolino', 'animali', 'animale', 'animali domestici', 'gatto', 'amici a quattro zampe', 'pet friendly', 'dog sitter', 'ring bearer dog', 'cane come testimone'] },
    { canonical: 'anziani', entity: 'esigenze_speciali', value: 'anziani', synonyms: ['anziani', 'anziano', 'anziana', 'nonni', 'ospiti anziani', 'persone anziane', 'persone in la con gli anni', 'nonnina', 'nonnino'] },
    { canonical: 'stranieri', entity: 'esigenze_speciali', value: 'stranieri', synonyms: ['ospiti stranieri', 'ospiti dall estero', 'invitati stranieri', 'invitati dall estero', 'ospiti internazionali', 'ospiti inglesi', 'ospiti americani', 'ospiti tedeschi', 'traduttore', 'interprete', 'traduzione simultanea', 'cerimonia in inglese', 'bilingue', 'destination wedding'] },

    // ---- Permessi e licenze (informazioni generali) ----
    { canonical: 'siae', entity: 'permesso', value: 'siae', synonyms: ['pagare i diritti', 'pagare qualche diritto', 'diritti per la musica', 'diritti sulla musica', 'diritti di autore', 'pagare la siae', 'siae', 'diritti d autore', 'diritti musicali', 'scf', 'nuovo imaie', 'borderò', 'bordero', 'permesso per la musica', 'licenza per la musica', 'musica con licenza'], intent: 'info_permessi' },
    { canonical: 'suolo_pubblico', entity: 'permesso', value: 'suolo_pubblico', synonyms: ['chiedere al comune', 'chiedere il permesso', 'chiedere l autorizzazione', 'chiedere un autorizzazione', 'chiedere i permessi', 'chiedere un permesso', 'permesso dal comune', 'autorizzazione al comune', 'suolo pubblico', 'occupazione suolo pubblico', 'occupazione di suolo pubblico', 'occupare il suolo pubblico', 'permesso per la piazza', 'chiusura strada', 'chiudere la strada', 'permesso al comune', 'autorizzazione del comune', 'autorizzazione comunale', 'ordinanza', 'vigili urbani', 'polizia municipale', 'pubblica piazza'], intent: 'info_permessi' },
    { canonical: 'sicurezza', entity: 'permesso', value: 'sicurezza', synonyms: ['piano di sicurezza', 'sicurezza dell evento', 'sicurezza per l evento', 'sicurezza degli ospiti', 'piano di emergenza', 'safety', 'antincendio', 'vie di fuga', 'uscite di sicurezza', 'primo soccorso', 'ambulanza in servizio', 'presidio medico', 'steward della sicurezza', 'commissione di vigilanza', 'cpv', 'agibilita', 'safety plan', 'security'], intent: 'info_permessi' },
    { canonical: 'rumore', entity: 'permesso', value: 'rumore', synonyms: ['rumore', 'rumori', 'quiete pubblica', 'disturbo della quiete', 'limiti di rumore', 'limiti acustici', 'musica fino a tardi', 'musica fino a notte', 'fino a che ora si puo fare musica', 'orari della musica', 'limite orario musica', 'inquinamento acustico', 'musica ad alto volume', 'disturbo ai vicini', 'vicini di casa', 'lamentele dei vicini'], intent: 'info_permessi' },
    { canonical: 'fuochi_artificio', entity: 'permesso', value: 'fuochi_artificio', synonyms: ['fuochi d artificio', 'fuochi artificiali', 'fuochi pirotecnici', 'spettacolo pirotecnico', 'pirotecnica', 'pirotecnico', 'lanterne volanti', 'lanterne cinesi', 'sparkler', 'bengala', 'bengala per sposi', 'petardi', 'botti'], intent: 'info_permessi' },
    { canonical: 'somministrazione', entity: 'permesso', value: 'somministrazione', synonyms: ['somministrazione', 'somministrazione di alimenti', 'somministrazione di bevande', 'licenza per alcolici', 'licenza alcolici', 'servire alcolici', 'servire alcol', 'licenza per bevande alcoliche', 'scia', 'haccp', 'licenza per il catering', 'autorizzazione sanitaria', 'permesso per servire cibo', 'asl', 'licenza di somministrazione'], intent: 'info_permessi' },
    { canonical: 'assicurazione', entity: 'permesso', value: 'assicurazione', synonyms: ['assicurazione', 'assicurazione per l evento', 'responsabilita civile', 'polizza', 'polizza per l evento', 'copertura assicurativa', 'rc evento', 'assicurare l evento'], intent: 'info_permessi' },
    { canonical: 'permessi', synonyms: ['permesso', 'permessi', 'autorizzazione', 'autorizzazioni', 'licenza', 'licenze', 'burocrazia', 'pratiche burocratiche', 'pratiche', 'nulla osta', 'carte da fare', 'documenti da presentare'], intent: 'info_permessi' },

    // ---- Problemi in corso (evento imminente) ----
    { canonical: 'fornitore_assente', entity: 'problema', value: 'fornitore_assente', negabile: true, synonyms: ['non e ancora arrivato', 'non e ancora arrivata', 'non sono ancora arrivati', 'non sono ancora arrivate', 'non e arrivato', 'non e arrivata', 'non sono arrivati', 'non sono arrivate', 'non si e presentato', 'non si e presentata', 'non si presenta', 'non si sono presentati', 'e sparito', 'e sparita', 'non risponde al telefono', 'non risponde piu', 'non risponde', 'non si trova', 'ha dato forfait', 'dato forfait', 'forfait', 'manca il dj', 'manca il fotografo', 'manca il catering', 'mancano i fiori', 'manca la musica'], intent: 'problema_in_corso' },
    { canonical: 'location_problema', entity: 'problema', value: 'location_problema', synonyms: ['la location e chiusa', 'e tutto chiuso', 'location chiusa', 'cancello chiuso', 'non possiamo entrare', 'non riusciamo a entrare', 'non ci fanno entrare', 'non c e nessuno in location', 'non c e nessuno alla location', 'nessuno ha le chiavi', 'non abbiamo le chiavi', 'location non pronta', 'la sala non e pronta', 'sala non pronta', 'non e pronto niente', 'overbooking', 'doppia prenotazione', 'sala occupata', 'hanno dato la sala a un altro'], intent: 'problema_in_corso' },
    { canonical: 'maltempo_in_corso', entity: 'problema', value: 'maltempo', synonyms: ['sta piovendo', 'piove a dirotto', 'sta diluviando', 'diluvia', 'allerta meteo', 'allerta rossa', 'allerta arancione', 'temporale in arrivo', 'sta arrivando un temporale', 'sta arrivando il temporale', 'grandine', 'vento forte', 'tromba d aria', 'bomba d acqua', 'allagamento', 'si e allagato', 'e allagata'] },
    { canonical: 'guasto', entity: 'problema', value: 'guasto', synonyms: ['e saltata la corrente', 'saltata la corrente', 'manca la corrente', 'senza corrente', 'blackout', 'manca la luce', 'manca l acqua', 'l impianto non funziona', 'l audio non funziona', 'non funziona l audio', 'non funziona l impianto', 'la musica non funziona', 'impianto guasto', 'si e rotto l impianto', 'microfono non funziona', 'il proiettore non funziona', 'guasto', 'guasti'], intent: 'problema_in_corso' },
    { canonical: 'ospiti_in_piu', entity: 'problema', value: 'ospiti_in_piu', synonyms: ['stanno arrivando piu ospiti', 'sono arrivati piu ospiti', 'ospiti in piu del previsto', 'piu ospiti del previsto', 'sono di piu del previsto', 'siamo di piu del previsto', 'non c e posto per tutti', 'non ci stiamo tutti', 'mancano i posti', 'mancano le sedie', 'mancano i tavoli'] },
    { canonical: 'ritardo', entity: 'problema', value: 'ritardo', synonyms: ['e in ritardo', 'sono in ritardo', 'siamo in ritardo', 'sta tardando', 'e in forte ritardo', 'in ritardo di', 'ritardo del fornitore', 'ritardo dei fornitori'] },
    { canonical: 'malore_ospite', entity: 'problema', value: 'malore_ospite', negabile: true, synonyms: ['un ospite si e sentito male', 'un invitato si e sentito male', 'un ospite sta male', 'un invitato sta male', 'una persona sta male', 'si e sentito male', 'si e sentita male', 'sta male', 'stanno male', 'ha un malore', 'ha avuto un malore', 'ha perso i sensi', 'perso i sensi', 'non respira', 'non riesce a respirare', 'soffoca', 'sta soffocando', 'infarto', 'sta avendo un infarto', 'crisi epilettica', 'convulsioni', 'reazione allergica', 'shock anafilattico', 'sviene', 'sanguina', 'emorragia', 'collasso', 'e collassato', 'e collassata'] },
    { canonical: 'incidente', entity: 'problema', value: 'incidente', synonyms: ['c e stato un incidente', 'e successo un incidente', 'incidente', 'ci sono feriti', 'c e un ferito', 'c e una persona ferita', 'un ferito', 'feriti', 'e caduto', 'e caduta', 'si e fatto male', 'si e fatta male', 'si e ustionato', 'si e ustionata', 'ustione', 'rissa', 'c e una rissa', 'aggressione', 'sono stato aggredito', 'e stato aggredito', 'hanno aggredito', 'accoltellato', 'armato', 'c e una persona armata', 'minaccia', 'allarme bomba', 'bomba', 'e crollato', 'e crollata', 'sono crollati', 'crollo', 'crollato il palco', 'e caduto il palco', 'e caduto il tendone', 'e volato il tendone', 'principio di incendio', 'incendio', 'c e un incendio', 'ha preso fuoco', 'prende fuoco', 'a fuoco', 'fiamme', 'c e fumo', 'odore di fumo', 'scossa elettrica', 'folgorato', 'elettrocutato', 'annegando', 'sta annegando', 'e caduto in piscina', 'e caduta in piscina'] },

    // ---- Concetti di conversazione (collegano all'intent) ----
    { canonical: 'prezzo', synonyms: ['costa tanto', 'costa molto', 'costano tanto', 'costa troppo', 'e costoso', 'e caro', 'sono cari', 'e economico', 'costa poco', 'prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto vengono', 'quanto si spende', 'quanto spendere', 'quanto spenderei', 'tariffa', 'tariffe', 'listino', 'prezzi indicativi', 'prezzo indicativo', 'a persona', 'a testa', 'per persona', 'costo per ospite', 'sconto', 'sconti', 'scontistica', 'promozione', 'promozioni', 'offerta speciale', 'offerte speciali', 'siete cari', 'quanto prendete', 'quanto chiedete', 'cifre', 'ordine di grandezza'], intent: 'info_prezzi' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'quotazione', 'quotazioni', 'stima dei costi', 'stima del costo', 'proposta economica', 'offerta personalizzata', 'proposta personalizzata', 'budget', 'preventivare'], intent: 'richiesta_preventivo' },
    { canonical: 'disponibilita', synonyms: ['disponibilita', 'disponibile', 'disponibili', 'libero', 'liberi', 'libera', 'libere', 'data libera', 'date libere', 'data disponibile', 'date disponibili', 'siete liberi', 'siete disponibili', 'siete occupati', 'avete la data', 'avete date', 'bloccare la data', 'bloccare una data', 'opzionare la data', 'opzionare una data', 'opzionare', 'tenere la data', 'tenerci la data', 'tenermi la data', 'riservare la data', 'segnare la data', 'prenotare la data', 'prenotare una data', 'fissare la data', 'agenda', 'calendario', 'impegnati'], intent: 'disponibilita_data' },
    { canonical: 'servizi', synonyms: ['servizi', 'cosa fate', 'di cosa vi occupate', 'cosa offrite', 'cosa proponete', 'cosa comprende', 'cosa include', 'cosa e incluso', 'cosa e compreso', 'pacchetto', 'pacchetti', 'formula', 'formule', 'proposte', 'tipologie di eventi', 'che eventi organizzate', 'che tipo di eventi'], intent: 'info_servizi' },
    { canonical: 'location', synonyms: ['dove si puo andare', 'posto da suggerire', 'posti da suggerire', 'location da suggerire', 'qualche posto da suggerire', 'suggerire una location', 'consigliare una location', 'consigliare un posto', 'location', 'locations', 'luogo', 'luoghi', 'posto per l evento', 'posti per l evento', 'dove farlo', 'dove farla', 'location convenzionate', 'location partner'], intent: 'info_location' },
    { canonical: 'capienza', synonyms: ['quanta gente puo starci', 'quanta gente ci puo stare', 'quante persone possono starci', 'quante persone possono entrare', 'quante persone puo contenere', 'quanti ospiti ci possono stare', 'quanti invitati ci possono stare', 'quanti ospiti puo contenere', 'capienza', 'capienze', 'capiente', 'quante persone ci stanno', 'quante persone entrano', 'quanti ospiti ci stanno', 'quanti invitati ci stanno', 'quanta gente ci sta', 'quante persone puo ospitare', 'quanti ospiti puo ospitare', 'posti a sedere', 'metri quadri', 'metri quadrati', 'mq', 'quanto e grande', 'quanto e grande la sala', 'spazio per', 'abbastanza grande', 'e grande abbastanza', 'ospitare', 'ospita'], intent: 'info_capienza' },
    { canonical: 'fornitori', synonyms: ['fornitori', 'fornitore', 'fornitori esterni', 'fornitori di fiducia', 'fornitori nostri', 'portare il mio', 'portare il nostro', 'portare i miei', 'portare i nostri', 'usare i miei', 'usare i nostri', 'nostro fotografo', 'mio fotografo', 'nostro dj', 'mio dj', 'collaborate con', 'lavorate con', 'esclusiva', 'in esclusiva', 'convenzionati', 'convenzione'], intent: 'info_fornitori' },
    { canonical: 'tempistiche', synonyms: ['con quanto anticipo', 'quanto tempo prima', 'quanto tempo serve', 'quanto tempo ci vuole', 'quanto ci vuole', 'tempistiche', 'tempi di organizzazione', 'tempi di preparazione', 'troppo tardi', 'troppo presto', 'in tempo', 'poco tempo', 'quando conviene', 'quando iniziare', 'quando devo iniziare', 'quando bisogna iniziare', 'in tempi stretti', 'last minute'], intent: 'info_tempistiche' },
    { canonical: 'maltempo', synonyms: ['maltempo', 'brutto tempo', 'pioggia', 'piove', 'se piove', 'in caso di pioggia', 'in caso di maltempo', 'piano b', 'piano alternativo', 'meteo', 'previsioni del tempo', 'previsioni meteo', 'allerta meteo', 'temporale', 'temporali', 'vento'], intent: 'info_maltempo' },
    { canonical: 'contatti', synonyms: ['indirizzo', 'dove siete', 'dove vi trovate', 'dove si trova il vostro ufficio', 'dove avete l ufficio', 'avete un ufficio', 'avete una sede', 'sede', 'ufficio', 'numero di telefono', 'a che numero', 'a che numero posso chiamarvi', 'orari di apertura', 'orari dell ufficio', 'portfolio', 'portfolio lavori', 'vostri lavori', 'lavori precedenti', 'eventi precedenti', 'eventi passati', 'recensioni', 'referenze', 'testimonianze', 'sito', 'sito web', 'instagram', 'facebook', 'fuori regione', 'fuori citta', 'in altre regioni', 'in tutta italia', 'all estero', 'zona che coprite', 'zone che coprite', 'che zone coprite', 'in che zone lavorate', 'in che province lavorate'], intent: 'info_contatti' },
    { canonical: 'caparra', synonyms: ['caparra', 'caparre', 'acconto', 'acconti', 'saldo', 'bonifico', 'bonifici', 'iban', 'coordinate bancarie', 'dati per il bonifico', 'rate', 'rateizzare', 'rateizzazione', 'pagare a rate', 'pagamento a rate', 'pagamento', 'pagamenti', 'modalita di pagamento', 'come pagare', 'posso pagare', 'possiamo pagare', 'versare', 'versamento', 'versato', 'ho pagato', 'abbiamo pagato', 'paypal', 'satispay', 'carta di credito', 'assegno', 'fattura', 'fatturazione', 'ricevuta', 'contratto', 'firmare il contratto', 'firma del contratto', 'contratti', 'penale', 'penali', 'clausole', 'condizioni di pagamento'], intent: 'caparra_pagamenti' },
    { canonical: 'modifica', synonyms: ['una settimana dopo', 'una settimana prima', 'un altro giorno', 'un altra data', 'altra data', 'spostarla', 'spostarlo', 'farla dopo', 'farlo dopo', 'farla prima', 'farlo prima', 'cambiare giorno', 'cambiare il giorno', 'spostare', 'spostiamo la data', 'spostiamo il matrimonio', 'spostiamo l evento', 'spostiamo la festa', 'sposto la data', 'sposto il matrimonio', 'sposto l evento', 'lo sposto', 'la sposto', 'rimandare', 'posticipare', 'anticipare', 'rinviare', 'modificare', 'modifica', 'modifiche', 'cambiare data', 'cambiare la data', 'cambiare location', 'cambiare la location', 'cambiare il menu', 'cambiare orario', 'cambiare l orario', 'cambiare programma', 'cambio di programma', 'aggiungere ospiti', 'aggiungere un servizio', 'aggiungere il dj', 'aggiungere il fotografo', 'ospiti in piu', 'siamo in piu', 'siamo di piu', 'ospiti in meno', 'siamo in meno', 'siamo di meno', 'variare', 'variazione', 'variazioni', 'aggiornare il preventivo', 'aggiornare l evento'], intent: 'modifica_evento' },
    { canonical: 'disdetta', synonyms: ['disdire', 'disdetta', 'disdico', 'disdiciamo', 'annullare', 'annullo', 'annulliamo', 'annullamento', 'annullate', 'cancellare', 'cancello', 'cancelliamo', 'cancellazione', 'rimborso', 'rimborsare', 'recedere', 'recesso', 'rinunciare', 'rinunciamo', 'non facciamo piu'], intent: 'annulla_evento' },
    { canonical: 'conferma', synonyms: ['nessuno si e fatto sentire', 'nessuno mi ha richiamato', 'nessuno ci ha richiamato', 'nessuno mi ha contattato', 'nessuno ci ha contattato', 'ancora nessuna risposta', 'non mi avete risposto', 'non ci avete risposto', 'non ho ricevuto risposta', 'non abbiamo ricevuto risposta', 'confermare', 'conferma', 'confermate', 'confermata', 'confermato', 'confermiamo', 'avete ricevuto', 'a che punto', 'novita', 'aggiornamenti', 'aggiornamento', 'stato della richiesta', 'stato dell organizzazione', 'sto aspettando', 'aspetto una risposta', 'aspettiamo una risposta', 'nessuna risposta', 'nessuno mi ha risposto', 'nessuno ci ha risposto', 'mi avete ignorato'], intent: 'verifica_evento' },
    { canonical: 'reclamo', synonyms: ['reclamo', 'reclami', 'lamentarmi', 'lamentarci', 'lamentela', 'lamentele', 'insoddisfatto', 'insoddisfatta', 'insoddisfatti', 'deluso', 'delusa', 'delusi', 'disastro', 'inaccettabile', 'vergogna', 'pessimo', 'pessima', 'arrabbiato', 'arrabbiata', 'arrabbiati', 'indignato', 'indignata', 'trattati male', 'trattato male', 'disservizio', 'denuncia', 'avvocato', 'passo per vie legali', 'vie legali'], intent: 'reclamo' },
    { canonical: 'urgenza_evento', synonyms: ['urgente', 'urgentissimo', 'urgentissima', 'e urgente', 'con urgenza', 'urgenza', 'imprevisto', 'imprevisti', 'emergenza', 'aiuto', 'aiutateci', 'aiutatemi', 'subito', 'immediatamente', 'adesso', 'ora'], intent: 'problema_in_corso' },
    { canonical: 'momento_vicino', synonyms: ['domani c e il', 'domani c e la', 'domani c e l', 'stasera c e il', 'stasera c e la', 'stasera c e l', 'oggi c e il', 'oggi c e la', 'oggi c e l', 'dopodomani c e il', 'dopodomani c e la', 'dopodomani c e l', 'stanotte c e il', 'stanotte c e la', 'stanotte c e l', 'e domani', 'e stasera', 'e oggi', 'e dopodomani', 'e stanotte', 'tra poche ore', 'fra poche ore'], intent: 'evento_imminente' },
    { canonical: 'allergie_ospiti', negabile: true, synonyms: ['ospiti celiaci', 'ospite celiaco', 'invitati celiaci', 'invitato celiaco', 'ospiti allergici', 'ospite allergico', 'invitati allergici', 'invitato allergico', 'ospiti intolleranti', 'menu per celiaci', 'menu senza glutine', 'menu per allergici', 'piatti per intolleranti', 'allergie degli ospiti', 'intolleranze degli ospiti', 'allergie alimentari', 'intolleranze alimentari'], intent: 'info_allergie_ospiti' },
  ],

  intents: [
    { id: 'richiesta_preventivo', nome: 'Richiesta di evento o preventivo', categoria: 'LEAD', priorita: 18, safety_level: 'LOW',
      descrizione: 'Il cliente vuole organizzare un evento (matrimonio, festa, cerimonia, evento aziendale) o chiede un preventivo. Il bot raccoglie tipo di evento, data, numero di ospiti e nome e passa la richiesta al team; non stima mai costi.',
      esempi: ['ho bisogno di qualcuno che mi organizzi', 'ho bisogno di qualcuno che organizzi', 'cerco qualcuno che mi organizzi', 'cerchiamo qualcuno che organizzi', 'chi possa occuparsi del nostro evento', 'cerchiamo chi possa occuparsi', 'cerchiamo chi organizzi', 'cerco chi organizzi la festa', 'festa a sorpresa per i 50 anni', 'festa a sorpresa per mio marito', 'festa a sorpresa per mia moglie', 'vorrei una festa a sorpresa', 'cercavo qualcuno che coordini il matrimonio', 'cercavo qualcuno che organizzi la festa', 'vorrei organizzare un matrimonio', 'vorremmo organizzare il nostro matrimonio', 'stiamo organizzando un matrimonio', 'sto organizzando una festa', 'mi sposo e cerco un organizzatore', 'ci sposiamo e cerchiamo un wedding planner', 'cerco un wedding planner', 'cerchiamo un wedding planner', 'cerco un organizzatore di eventi', 'cerchiamo un organizzatore di eventi', 'ci serve un organizzatore di eventi', 'vorrei organizzare una festa', 'vorremmo organizzare una festa', 'vorrei organizzare un evento', 'vorremmo organizzare un evento', 'devo organizzare una festa di compleanno', 'dobbiamo organizzare una festa', 'organizzare una festa di laurea', 'organizzare un battesimo', 'organizzare una comunione', 'organizzare una cresima', 'organizzare un addio al nubilato', 'organizzare un diciottesimo', 'vorrei organizzare un diciottesimo', 'vorrei organizzare una cena aziendale', 'organizzare un evento aziendale', 'dobbiamo organizzare un evento per la nostra azienda', 'vorrei un preventivo', 'vorremmo un preventivo', 'mi fate un preventivo', 'ci fate un preventivo', 'potete farmi un preventivo', 'potete farci un preventivo', 'vorrei avere un preventivo', 'vorrei chiedere un preventivo', 'richiesta di preventivo', 'richiedere un preventivo', 'vorrei un preventivo per un matrimonio', 'preventivo per una festa', 'preventivo per un evento', 'preventivo per il matrimonio', 'vorrei affidarvi l organizzazione', 'vorrei affidarvi il mio evento', 'vorremmo affidarvi la nostra festa', 'vorrei che organizzaste una festa', 'ci piacerebbe organizzare un evento', 'mi piacerebbe organizzare una festa', 'cerchiamo chi organizza il nostro evento', 'ci serve qualcuno che organizzi la festa', 'ci occupiamo noi dell evento ma ci servono aiuti', 'devo festeggiare i 50 anni di mia madre', 'vorrei fare una festa a sorpresa', 'vorrei fare una festa per i miei 40 anni', 'vorrei fare una proposta di matrimonio speciale', 'vorrei organizzare una proposta di matrimonio', 'organizziamo una festa per i dipendenti'],
      keywords: ['preventivo', 'preventivi', 'wedding planner', 'organizzare un evento', 'organizzare una festa', 'organizzare un matrimonio', 'organizzatore di eventi', 'affidarvi'],
      combinazioni: [
        { entity: 'tipo_evento', con: ['organizzare', 'organizziamo', 'organizzo', 'organizzando', 'festeggiare', 'festeggiamo', 'vorrei', 'vorremmo', 'vogliamo', 'voglio', 'cerchiamo', 'cerco', 'ci serve', 'mi serve', 'ci servirebbe', 'mi servirebbe', 'ci occorre', 'mi occorre', 'ho bisogno', 'abbiamo bisogno', 'dobbiamo fare', 'devo fare', 'dobbiamo organizzare', 'devo organizzare', 'ci piacerebbe', 'mi piacerebbe', 'stiamo organizzando', 'sto organizzando', 'ci sposiamo', 'mi sposo', 'sposiamo', 'sto preparando', 'stiamo preparando', 'stiamo pensando', 'sto pensando', 'pensavamo', 'pensavo', 'volevo', 'volevamo', 'fare una festa'],
          non_con_concepts: ['prezzo', 'disponibilita', 'consulenza', 'permessi', 'capienza', 'caparra', 'modifica', 'disdetta', 'conferma', 'fornitori', 'tempistiche', 'maltempo', 'reclamo', 'urgenza_evento', 'allergie_ospiti', 'contatti', 'momento_vicino'], score: 0.85 },
        { entity: 'tipo_evento', con_entities: ['numero_ospiti'], non_con_concepts: ['prezzo', 'disponibilita', 'consulenza', 'permessi', 'capienza', 'caparra', 'modifica', 'disdetta', 'conferma', 'fornitori', 'tempistiche', 'maltempo', 'reclamo', 'urgenza_evento', 'allergie_ospiti', 'contatti', 'location', 'servizi', 'momento_vicino'], score: 0.9 },
      ],
      required_entities: ['tipo_evento', 'data_evento', 'numero_ospiti', 'nome_cliente'], optional_entities: ['location', 'servizi_richiesti', 'esigenze_alimentari', 'esigenze_speciali'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },

    { id: 'disponibilita_data', nome: 'Disponibilità di una data', categoria: 'BOOKING', priorita: 17, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se l\'agenzia è libera in una data o in un periodo, o vuole bloccare/opzionare una data. La disponibilità si verifica SOLO sul calendario del tenant.',
      esempi: ['vorrei prenotare la data', 'vorremmo prenotare la data', 'vorrei prenotare la data del matrimonio', 'vorrei riservare la data', 'vorremmo riservare la data', 'vorrei fissare la data', 'siete liberi il 14 giugno', 'siete disponibili il 14 giugno', 'siete disponibili per il 14 giugno', 'avete disponibilita per il 14 giugno', 'avete disponibilita a giugno', 'avete disponibilita per giugno', 'avete disponibilita per la mia data', 'avete la data del 14 giugno', 'la data del 14 giugno e libera', 'siete liberi a giugno', 'siete liberi sabato', 'siete liberi per sabato', 'siete liberi quel giorno', 'quel giorno siete liberi', 'quel weekend siete liberi', 'avete ancora date libere', 'avete date libere', 'avete date libere in estate', 'avete date disponibili', 'quali date avete libere', 'avete ancora disponibilita', 'avete disponibilita', 'vorrei sapere se siete liberi', 'vorrei sapere se siete disponibili', 'vorrei verificare la disponibilita', 'vorrei verificare la disponibilita della data', 'controllate la disponibilita', 'potete controllare la disponibilita', 'potete bloccare la data', 'vorrei bloccare la data', 'vorrei opzionare la data', 'potete opzionare la data', 'mi tenete la data', 'tenete la data', 'riuscite a seguire un evento il', 'riuscite a seguirci il', 'siete liberi il giorno del mio matrimonio', 'siete disponibili per il nostro matrimonio', 'siete liberi per il nostro evento', 'siete disponibili per un evento il', 'siete libere il', 'siete liberi in quella data', 'siete disponibili in quella data'],
      keywords: ['disponibilita', 'date libere', 'data libera', 'opzionare', 'bloccare la data', 'siete liberi', 'siete disponibili', 'date disponibili', 'data disponibile'],
      combinazioni: [
        { entity: 'data_evento', con: ['liberi', 'libero', 'libera', 'libere', 'disponibili', 'disponibile', 'disponibilita', 'avete', 'siete', 'c e', 'si puo', 'possiamo', 'posso', 'riuscite', 'riuscireste', 'potreste', 'potete', 'fate'],
          non_con_concepts: ['prezzo', 'preventivo', 'caparra', 'modifica', 'disdetta', 'conferma', 'permessi', 'capienza', 'urgenza_evento', 'maltempo', 'fornitori', 'reclamo', 'consulenza', 'allergie_ospiti', 'momento_vicino'], score: 0.8 },
      ],
      required_entities: ['data_evento', 'nome_cliente'], optional_entities: ['tipo_evento', 'numero_ospiti', 'location'],
      actions: ['ask_missing_information', 'search_calendar', 'propose_slot', 'create_lead', 'notify_owner'] },

    { id: 'prenota_consulenza', nome: 'Incontro, consulenza o sopralluogo', categoria: 'BOOKING', priorita: 19, safety_level: 'LOW',
      descrizione: 'Il cliente vuole fissare un incontro conoscitivo, una consulenza, una call, un sopralluogo o una degustazione con l\'agenzia. Si propone solo ciò che risulta dal calendario del tenant.',
      esempi: ['vorrei fissare un appuntamento', 'vorremmo fissare un appuntamento', 'vorrei prenotare un appuntamento', 'vorrei prenotare una consulenza', 'vorremmo prenotare una consulenza', 'vorrei una consulenza', 'vorremmo una consulenza', 'vorrei un incontro conoscitivo', 'vorremmo un incontro conoscitivo', 'primo incontro', 'prima consulenza', 'vorremmo incontrarvi', 'vorrei incontrarvi', 'possiamo incontrarci', 'possiamo vederci', 'possiamo sentirci', 'possiamo fare una call', 'possiamo fare una videochiamata', 'vorrei fare una videochiamata', 'vorrei parlarne di persona', 'vorremmo venire a trovarvi', 'posso passare in ufficio', 'possiamo passare da voi', 'possiamo venire in sede', 'vorrei fissare un sopralluogo', 'vorremmo fissare un sopralluogo', 'vorrei visitare la location', 'vorremmo visitare la location', 'organizzare un sopralluogo', 'vorremmo vedere la location', 'vorrei fare una degustazione', 'possiamo fare una degustazione', 'prenotare la degustazione', 'quando possiamo vederci', 'quando possiamo incontrarci', 'quando potete ricevermi', 'quando potete riceverci', 'siete disponibili per un appuntamento', 'avete un appuntamento libero', 'avete un appuntamento disponibile', 'avete un buco per una consulenza', 'ci fissate un appuntamento', 'mi fissate un appuntamento', 'vorrei sentirvi per telefono', 'fissiamo una call'],
      keywords: ['appuntamento', 'consulenza', 'incontro conoscitivo', 'sopralluogo', 'videochiamata', 'degustazione', 'prima consulenza', 'primo incontro'],
      combinazioni: [
        { entity: 'tipo_incontro', con: ['vorrei', 'vorremmo', 'possiamo', 'posso', 'prenotare', 'fissare', 'organizzare', 'programmare', 'prenotiamo', 'facciamo', 'fare', 'avete', 'quando'], con_entities: ['giorno', 'fascia_oraria', 'orario'], non_con_concepts: ['prezzo', 'modifica', 'disdetta', 'conferma', 'caparra', 'reclamo', 'urgenza_evento', 'momento_vicino'], score: 0.85 },
      ],
      required_entities: ['giorno', 'fascia_oraria', 'nome_cliente'], optional_entities: ['tipo_incontro', 'tipo_evento', 'orario', 'data_evento', 'numero_ospiti', 'location'],
      actions: ['ask_missing_information', 'search_calendar', 'propose_slot', 'create_booking', 'create_lead'] },

    { id: 'info_servizi', nome: 'Servizi e tipi di evento', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Domande su cosa fa l\'agenzia, quali eventi organizza, pacchetti, organizzazione completa o solo coordinamento. La risposta viene solo dai dati del tenant.',
      esempi: ['che tipo di cerimonie seguite', 'che cerimonie seguite', 'quali cerimonie seguite', 'che tipi di eventi seguite', 'che eventi seguite', 'si possono avere i bambini alla festa', 'c e animazione per bambini', 'fate animazione per bambini', 'fate anche animazione', 'vi occupate anche di fiori', 'vi occupate di fiori e allestimenti', 'avete un dj o una band da consigliare', 'avete un fotografo di fiducia', 'lavorate con un fotografo', 'che servizi offrite', 'quali servizi avete', 'di cosa vi occupate', 'cosa fate', 'cosa offrite', 'che eventi organizzate', 'che tipo di eventi organizzate', 'cosa comprende l organizzazione', 'cosa include il vostro servizio', 'organizzate matrimoni', 'organizzate anche matrimoni', 'organizzate eventi aziendali', 'fate anche eventi aziendali', 'organizzate feste per bambini', 'organizzate feste di compleanno', 'organizzate anche piccoli eventi', 'organizzate anche eventi piccoli', 'organizzate cerimonie', 'vi occupate anche di catering', 'vi occupate di allestimenti', 'vi occupate di tutto', 'occupate di tutto voi', 'fate anche il catering', 'fate anche allestimenti', 'avete pacchetti', 'avete dei pacchetti', 'che pacchetti avete', 'pacchetti per matrimoni', 'cosa fa un wedding planner', 'che differenza c e tra wedding planner e coordinatore', 'seguite l evento il giorno stesso', 'siete presenti il giorno dell evento', 'offrite il coordinamento', 'offrite solo il coordinamento', 'organizzazione completa', 'offrite l organizzazione completa', 'fate organizzazione chiavi in mano', 'vi occupate solo di una parte', 'potete occuparvi solo di una parte', 'fate anche feste a tema', 'organizzate anche feste private', 'fate anche eventi all aperto', 'organizzate anche eventi pubblici'],
      keywords: ['servizi', 'pacchetti', 'cosa fate', 'di cosa vi occupate', 'cosa offrite', 'chiavi in mano', 'coordinamento', 'che eventi organizzate'],
      required_entities: [], optional_entities: ['tipo_evento', 'servizi_richiesti'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_prezzi', nome: 'Prezzi e costi', categoria: 'INFORMATION', priorita: 28, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa organizzare un evento, i prezzi, le tariffe o gli sconti. Il bot non stima mai costi: usa solo i dati del tenant, altrimenti propone il preventivo.',
      esempi: ['quanto costa', 'quanto costa un matrimonio', 'quanto costa organizzare un matrimonio', 'quanto costa organizzare una festa', 'quanto costa organizzare un evento', 'quanto costa un evento', 'quanto costa la vostra organizzazione', 'quanto costa il wedding planner', 'quanto costa il coordinamento', 'che prezzi avete', 'quali sono i prezzi', 'quali sono le tariffe', 'avete un listino', 'mi dite i prezzi', 'mi dite le tariffe', 'prezzi indicativi', 'un prezzo indicativo', 'a partire da quanto', 'quanto si spende per un matrimonio', 'quanto si spende per una festa', 'quanto si spende per un evento', 'quanto viene un evento', 'quanto viene a persona', 'prezzo a persona', 'costo a persona', 'costo per ospite', 'fate sconti', 'avete sconti', 'ci sono promozioni', 'avete promozioni', 'con che budget si parte', 'siete cari', 'quanto costano i vostri servizi', 'tariffe wedding planner', 'quanto chiedete per organizzare', 'che ordine di grandezza di spesa', 'quanto bisogna spendere', 'quanto devo spendere', 'quanto costa una festa di compleanno'],
      keywords: ['prezzo', 'prezzi', 'tariffa', 'tariffe', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto si spende', 'listino', 'sconti', 'promozioni', 'siete cari'],
      required_entities: [], optional_entities: ['tipo_evento', 'numero_ospiti'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_location', nome: 'Location', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente cerca o chiede consigli su una location, o chiede se l\'agenzia ha location o partner. Solo dati del tenant: nessuna location inventata.',
      esempi: ['avete qualche location da suggerire', 'avete qualche posto da suggerire', 'suggerite una location', 'dove si puo fare una festa', 'dove si puo andare per una festa', 'avete delle location', 'avete location', 'avete delle location partner', 'consigliate una location', 'mi consigliate una location', 'ci consigliate una location', 'potete consigliarci una location', 'mi consigliate una villa', 'mi aiutate a trovare la location', 'ci aiutate a trovare la location', 'trovate voi la location', 'cercate voi la location', 'collaborate con delle ville', 'collaborate con delle location', 'avete location convenzionate', 'location in zona', 'location con giardino', 'location sul mare', 'location per matrimoni', 'location per feste', 'location per eventi aziendali', 'ville per matrimoni', 'avete ville', 'avete un agriturismo', 'dove si puo fare un matrimonio', 'dove possiamo fare la festa', 'dove potremmo fare la festa', 'che location avete a disposizione', 'quali location proponete', 'location all aperto', 'location al chiuso', 'avete una location con piscina', 'ho trovato una location, la conoscete', 'conoscete la location'],
      keywords: ['location', 'locations', 'trovare la location', 'cercare la location', 'location convenzionate', 'location partner'],
      required_entities: [], optional_entities: ['location', 'tipo_evento', 'numero_ospiti'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_catering', nome: 'Catering, menu e bevande', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Domande su catering, menu, buffet, open bar, torta. Solo dati del tenant; le allergie passano a una persona.',
      esempi: ['fate catering', 'fate anche catering', 'avete il catering', 'offrite il catering', 'avete un catering di fiducia', 'potete occuparvi del catering', 'che menu proponete', 'mi mandate un menu di esempio', 'avete menu di esempio', 'proposte di menu', 'che tipi di menu avete', 'cosa si mangia', 'fate buffet', 'fate aperitivi', 'organizzate aperitivi', 'fate open bar', 'avete il servizio bar', 'il servizio bar e incluso', 'avete il menu per bambini', 'menu per bambini', 'menu vegetariano', 'avete opzioni vegane', 'menu di pesce', 'menu di carne', 'torta nuziale', 'fate la torta', 'avete la torta', 'la torta e inclusa', 'fate la confettata', 'servite alcolici', 'avete il servizio di sala', 'ci sono i camerieri', 'bevande incluse', 'sono incluse le bevande', 'il vino e incluso', 'cena servita o buffet', 'meglio buffet o cena seduta'],
      keywords: ['catering', 'buffet', 'banqueting', 'open bar', 'menu', 'aperitivo', 'torta nuziale', 'confettata', 'bevande'],
      required_entities: [], optional_entities: ['tipo_evento', 'numero_ospiti', 'esigenze_alimentari'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_allergie_ospiti', nome: 'Allergie e esigenze alimentari degli ospiti', categoria: 'HUMAN_HANDOFF', priorita: 14, safety_level: 'HIGH',
      descrizione: 'Il cliente segnala o chiede di allergie, celiachia, intolleranze degli ospiti. Il bot non dà consigli né garanzie: la richiesta passa SEMPRE a una persona.',
      esempi: ['ho degli ospiti celiaci', 'abbiamo degli ospiti celiaci', 'abbiamo ospiti celiaci', 'un ospite e celiaco', 'uno degli invitati e celiaco', 'ho invitati allergici', 'abbiamo degli invitati allergici', 'abbiamo ospiti con allergie', 'ci sono invitati con allergie alimentari', 'alcuni ospiti sono intolleranti al lattosio', 'un invitato e allergico alle arachidi', 'ci sono delle allergie tra gli ospiti', 'come gestite le allergie degli ospiti', 'come gestite le intolleranze', 'come gestite i celiaci', 'menu per celiaci', 'menu senza glutine', 'avete opzioni senza glutine', 'menu per allergici', 'piatti per intolleranti', 'la sposa e celiaca', 'lo sposo e allergico', 'mia mamma e allergica', 'il festeggiato e allergico', 'devo segnalare delle allergie', 'vorrei segnalare delle intolleranze', 'ho una domanda sulle allergie', 'vorrei informazioni sulle allergie', 'abbiamo delle intolleranze alimentari', 'abbiamo una persona celiaca', 'c e un celiaco tra gli invitati'],
      keywords: ['celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'senza glutine', 'senza lattosio', 'intolleranza', 'intolleranze', 'intolleranti', 'intollerante', 'allergeni', 'allergie alimentari', 'allergia alimentare', 'allergico', 'allergica', 'allergici', 'allergiche'],
      required_entities: [], optional_entities: ['esigenze_alimentari', 'numero_ospiti', 'tipo_evento', 'data_evento'], actions: ['human_handoff'] },

    { id: 'info_permessi', nome: 'Permessi, licenze e sicurezza (informazioni generali)', categoria: 'INFORMATION', priorita: 26, safety_level: 'MEDIUM',
      descrizione: 'Domande generali su SIAE, suolo pubblico, sicurezza, rumore, fuochi, somministrazione, assicurazione. Solo informazioni generali senza certezza normativa; i casi concreti e le richieste di certezza passano a una persona.',
      esempi: ['bisogna pagare qualche diritto per la musica', 'serve chiedere al comune', 'serve chiedere il permesso al comune', 'bisogna chiedere un autorizzazione', 'serve un autorizzazione', 'serve la siae', 'serve la siae per la musica', 'serve la siae per un matrimonio', 'serve la siae per una festa', 'bisogna pagare la siae', 'ci pensate voi alla siae', 've ne occupate voi della siae', 'serve un permesso per fare la festa', 'servono permessi per un evento', 'servono permessi per organizzare un evento', 'serve un permesso per il suolo pubblico', 'posso fare una festa in piazza', 'serve l autorizzazione del comune', 'chi si occupa dei permessi', 'vi occupate voi dei permessi', 'gestite voi i permessi', 'gestite le autorizzazioni', 'servono licenze per un evento', 'serve la licenza per servire alcolici', 'serve un permesso per i fuochi d artificio', 'si possono fare fuochi d artificio', 'fino a che ora si puo fare musica', 'ci sono limiti di orario per la musica', 'serve un piano di sicurezza', 'servono steward', 'serve la sicurezza per un evento', 'vi occupate della sicurezza', 'serve l assicurazione per l evento', 'serve un assicurazione', 'permesso occupazione suolo pubblico', 'servono autorizzazioni per un evento all aperto', 'servono permessi per un concerto', 'cosa serve per fare un evento in piazza', 'quali permessi servono', 'che permessi servono per una festa', 'che autorizzazioni servono'],
      keywords: ['siae', 'permesso', 'permessi', 'autorizzazione', 'autorizzazioni', 'licenza', 'licenze', 'suolo pubblico', 'fuochi d artificio', 'piano di sicurezza', 'quiete pubblica', 'somministrazione'],
      required_entities: [], optional_entities: ['permesso', 'tipo_evento', 'location'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_capienza', nome: 'Capienza della location', categoria: 'INFORMATION', priorita: 27, safety_level: 'LOW',
      descrizione: 'Quante persone ci stanno in una location o in una sala. La capienza arriva SOLO dai dati del tenant; certificazioni e capienze a norma passano a una persona.',
      esempi: ['quanta gente puo starci', 'quanta gente ci puo stare', 'quante persone possono starci', 'quante persone ci stanno', 'quante persone entrano', 'qual e la capienza', 'che capienza ha', 'che capienza ha la location', 'capienza della location', 'capienza della sala', 'quanti ospiti ci stanno', 'quanti invitati ci stanno', 'quanta gente ci sta', 'quanti posti a sedere ci sono', 'riusciamo a starci in 80', 'c e spazio per 120 persone', 'e abbastanza grande per 100 persone', 'quanto e grande la sala', 'quanti metri quadri ha la location', 'quante persone puo ospitare la villa', 'ospita 150 persone', 'ci stanno 100 persone', 'c e posto per tutti gli ospiti'],
      keywords: ['capienza', 'capienze', 'posti a sedere', 'metri quadri', 'quante persone ci stanno', 'quanti ospiti ci stanno', 'quante persone entrano', 'quante persone puo ospitare'],
      required_entities: [], optional_entities: ['location', 'numero_ospiti'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_fornitori', nome: 'Fornitori e partner', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Si possono portare fornitori propri? L\'agenzia ha fotografi, dj, fiorai di fiducia? Solo dati del tenant.',
      esempi: ['posso portare il mio fotografo', 'possiamo portare il nostro dj', 'posso scegliere i miei fornitori', 'posso usare fornitori miei', 'avete fornitori di fiducia', 'collaborate con dei fotografi', 'collaborate con dei fornitori', 'lavorate con fornitori esterni', 'potete consigliarmi un fotografo', 'potete consigliarci un dj', 'avete un fotografo', 'avete un dj', 'avete una band', 'avete un fiorista di fiducia', 'vi occupate voi dei fornitori', 'gestite voi i fornitori', 'cerco un fotografo per il matrimonio', 'cerchiamo un fiorista', 'cerchiamo un dj', 'ho gia un fotografo, va bene', 'abbiamo gia il catering, possiamo tenerlo', 'ho gia un fornitore, posso tenerlo'],
      keywords: ['fornitori', 'fornitore', 'portare il mio', 'portare il nostro', 'fornitori esterni', 'fornitori di fiducia', 'collaborate con', 'lavorate con'],
      required_entities: [], optional_entities: ['servizi_richiesti'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_tempistiche', nome: 'Tempi di organizzazione', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Con quanto anticipo contattare l\'agenzia, quanto tempo serve per organizzare un evento.',
      esempi: ['siamo troppo in ritardo per organizzare', 'siamo in ritardo per organizzare una festa', 'e troppo tardi per organizzare', 'siamo in tempo per organizzare una festa tra due mesi', 'si fa in tempo a organizzare', 'con quanto anticipo devo contattarvi', 'con quanto anticipo bisogna prenotare', 'con quanto anticipo vi devo contattare', 'quanto tempo prima devo contattarvi', 'quanto tempo serve per organizzare un matrimonio', 'quanto tempo ci vuole per organizzare', 'quanto ci vuole per organizzare una festa', 'e troppo tardi per contattarvi', 'siamo in tempo', 'sono in tempo per organizzare', 'e troppo presto per contattarvi', 'quando conviene iniziare', 'quando conviene contattarvi', 'quando devo iniziare a organizzare', 'quando bisogna iniziare a organizzare', 'quali sono i tempi di organizzazione', 'quanto tempo serve', 'e possibile organizzare in poco tempo', 'si puo organizzare in tempi stretti'],
      keywords: ['con quanto anticipo', 'quanto tempo prima', 'tempistiche', 'troppo tardi', 'troppo presto', 'tempi di organizzazione', 'quando conviene'],
      required_entities: [], optional_entities: ['tipo_evento', 'data_evento'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_maltempo', nome: 'Maltempo e piano B', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Cosa succede se piove, piano B per eventi all\'aperto, tendostrutture. Nessuna promessa sul meteo.',
      esempi: ['cosa succede se piove', 'se piove cosa fate', 'avete un piano b per la pioggia', 'piano b in caso di maltempo', 'c e un piano b', 'e previsto un piano b', 'se c e maltempo cosa succede', 'in caso di maltempo cosa fate', 'in caso di pioggia come funziona', 'e se piove il giorno della festa', 'avete tendostrutture', 'avete una tensostruttura', 'avete un tendone', 'la location e coperta', 'cosa succede in caso di brutto tempo', 'e se c e il temporale', 'avete un piano alternativo se piove'],
      keywords: ['maltempo', 'pioggia', 'se piove', 'piano b', 'tendostruttura', 'tensostruttura', 'tendone', 'brutto tempo', 'piano alternativo'],
      required_entities: [], optional_entities: ['location'], actions: ['search_knowledge', 'answer_information'] },

    { id: 'info_contatti', nome: 'Sede, zona, contatti e portfolio', categoria: 'INFORMATION', priorita: 32, safety_level: 'LOW',
      descrizione: 'Dove si trova l\'agenzia, che zone copre, come contattarla, portfolio, recensioni, sito e social.',
      esempi: ['dove siete', 'dove vi trovate', 'dove si trova il vostro ufficio', 'qual e l indirizzo', 'avete un ufficio', 'avete una sede', 'dove vi trovo', 'che zona coprite', 'lavorate anche in altre regioni', 'lavorate anche fuori citta', 'organizzate anche fuori regione', 'organizzate eventi all estero', 'organizzate in tutta italia', 'in che zone operate', 'in che province lavorate', 'numero di telefono', 'a che numero posso chiamarvi', 'avete un sito', 'avete instagram', 'siete su instagram', 'avete un portfolio', 'posso vedere i vostri lavori', 'avete foto di eventi precedenti', 'avete foto di eventi passati', 'avete recensioni', 'avete referenze', 'quali sono gli orari dell ufficio'],
      keywords: ['indirizzo', 'dove siete', 'sede', 'ufficio', 'portfolio', 'instagram', 'recensioni', 'referenze', 'fuori regione', 'all estero', 'orari dell ufficio'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },

    { id: 'caparra_pagamenti', nome: 'Caparre, pagamenti e contratti', categoria: 'HUMAN_HANDOFF', priorita: 12, safety_level: 'MEDIUM',
      descrizione: 'Caparre, acconti, saldi, bonifici, rate, fatture, contratti, penali: SOLO il titolare. Il bot non comunica importi né coordinate di pagamento e non conferma pagamenti ricevuti.',
      esempi: ['quanto devo versare di caparra', 'serve una caparra', 'chiedete la caparra', 'come funziona la caparra', 'vorrei sapere come funzionano i pagamenti', 'come posso pagare', 'posso pagare a rate', 'possiamo pagare a rate', 'si puo rateizzare', 'quando devo pagare il saldo', 'quando si paga l acconto', 'a che punto devo pagare il saldo', 'ho fatto il bonifico', 'ho pagato la caparra', 'vi ho mandato il bonifico', 'ho versato l acconto', 'abbiamo versato la caparra', 'mi date l iban', 'mi mandate l iban', 'dove faccio il bonifico', 'potete mandarmi i dati per il bonifico', 'posso pagare con carta', 'accettate paypal', 'posso pagare in contanti', 'mi fate la fattura', 'mi serve la fattura', 'mi mandate il contratto', 'vorrei firmare il contratto', 'vorrei la ricevuta', 'c e una penale', 'ci sono penali in caso di disdetta', 'e rimborsabile la caparra'],
      keywords: ['caparra', 'caparre', 'acconto', 'acconti', 'saldo', 'bonifico', 'iban', 'rateizzare', 'pagare a rate', 'pagamento', 'pagamenti', 'fattura', 'ricevuta', 'contratto', 'versare', 'versamento', 'penale', 'penali'],
      required_entities: [], optional_entities: ['tipo_evento', 'data_evento'], actions: ['human_handoff'] },

    { id: 'modifica_evento', nome: 'Modifica di un evento già avviato', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Spostare la data, cambiare location, aggiungere o togliere ospiti o servizi, modificare un preventivo o un appuntamento esistente: il sistema non modifica nulla, passa a una persona.',
      esempi: ['si puo fare una settimana dopo', 'possiamo farla una settimana dopo', 'si puo fare un altro giorno', 'si puo spostare di una settimana', 'devo spostare la data', 'vorrei spostare la data del matrimonio', 'dobbiamo cambiare data', 'vorrei cambiare la data', 'possiamo spostare l evento', 'possiamo anticipare l evento', 'dobbiamo posticipare la festa', 'vorrei rimandare l evento', 'vorrei modificare l evento', 'vorrei modificare il preventivo', 'vorrei cambiare il menu', 'vorrei aggiungere un servizio', 'vorrei aggiungere il dj', 'vorrei aggiungere il fotografo', 'vorrei aggiungere degli ospiti', 'abbiamo piu ospiti', 'siamo in piu persone', 'gli ospiti sono aumentati', 'gli ospiti sono diminuiti', 'siamo di meno', 'vorremmo cambiare location', 'vorrei cambiare la location', 'vorrei cambiare l orario', 'vorrei fare delle modifiche', 'dobbiamo fare delle modifiche', 'vorrei spostare l appuntamento', 'possiamo spostare l appuntamento', 'devo cambiare l appuntamento', 'cambio di programma per la festa'],
      keywords: ['spostare', 'rimandare', 'posticipare', 'anticipare', 'rinviare', 'modificare', 'modifiche', 'cambiare data', 'cambiare la data', 'cambiare location', 'cambiare il menu', 'aggiungere ospiti', 'ospiti in piu', 'cambio di programma'],
      required_entities: [], optional_entities: ['data_evento', 'numero_ospiti', 'location'], actions: ['human_handoff'] },

    { id: 'annulla_evento', nome: 'Disdetta o annullamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Annullare un evento, un preventivo o un appuntamento, recedere o chiedere un rimborso: passa a una persona.',
      esempi: ['annullare e rimborso della caparra', 'disdire e rimborso della caparra', 'annullamento e rimborso della caparra', 'se annulliamo perdiamo la caparra', 'se disdico mi restituite la caparra', 'annullo l evento e chiedo il rimborso', 'rimborso della caparra in caso di annullamento', 'ho diritto al rimborso se annullo', 'posso riavere la caparra se disdico', 'devo annullare l evento', 'vorrei annullare il matrimonio', 'dobbiamo annullare la festa', 'vorrei disdire', 'vorrei disdire il contratto', 'vorrei cancellare la prenotazione', 'vorrei annullare la data', 'devo annullare l appuntamento', 'vorrei cancellare l appuntamento', 'non facciamo piu la festa', 'non facciamo piu l evento', 'abbiamo deciso di non farlo piu', 'il matrimonio e annullato', 'abbiamo annullato il matrimonio', 'vorrei il rimborso', 'posso avere il rimborso', 'voglio recedere dal contratto', 'cancellare l evento', 'disdetta', 'devo fare una disdetta', 'purtroppo dobbiamo annullare', 'siamo costretti ad annullare', 'rinunciamo all evento'],
      keywords: ['annullare', 'disdire', 'disdetta', 'cancellare', 'rimborso', 'recedere', 'recesso', 'annullamento', 'rinunciamo'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'verifica_evento', nome: 'Stato della richiesta o conferma', categoria: 'HUMAN_HANDOFF', priorita: 11, safety_level: 'LOW',
      descrizione: 'Il cliente chiede a che punto è la sua richiesta, se la data è confermata, se è arrivato il preventivo: il bot non può confermare nulla.',
      esempi: ['ho mandato la richiesta e nessuno si e fatto sentire', 'nessuno si e fatto sentire', 'non mi avete risposto', 'ancora nessuna risposta', 'a che punto siamo', 'a che punto e l organizzazione', 'novita sull evento', 'avete novita', 'non ho ricevuto il preventivo', 'mi avete mandato il preventivo', 'non ho ricevuto risposta', 'aspetto una vostra risposta', 'sto aspettando una risposta', 'nessuno mi ha risposto', 'nessuno mi ha richiamato', 'avevo chiesto un preventivo', 'vi avevo scritto ieri', 'mi confermate la data', 'la data e confermata', 'e tutto confermato', 'volevo una conferma', 'conferma della prenotazione', 'avete ricevuto la mia richiesta', 'avete ricevuto il mio messaggio', 'stato della mia richiesta', 'sto aspettando che mi richiamiate', 'il mio evento e confermato', 'ho gia un evento con voi'],
      keywords: ['a che punto', 'novita', 'confermate', 'conferma', 'avete ricevuto', 'aspetto una risposta', 'stato della richiesta', 'nessuno mi ha risposto'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per un servizio già reso, un fornitore, un evento già svolto.',
      esempi: ['vorrei fare un reclamo', 'voglio lamentarmi', 'sono molto insoddisfatto', 'siamo rimasti molto delusi', 'l evento e stato un disastro', 'il servizio e stato pessimo', 'il catering era scarso', 'il dj e arrivato in ritardo', 'il fotografo non ha consegnato le foto', 'non ho ricevuto le foto', 'ci avete trattato male', 'siamo molto arrabbiati', 'non e quello che avevamo concordato', 'non avete rispettato gli accordi', 'la festa non e andata come previsto', 'e stato inaccettabile', 'che vergogna', 'sono molto deluso dal servizio', 'siamo molto delusi dall organizzazione', 'il servizio non era quello promesso'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'deluso', 'delusi', 'delusa', 'disastro', 'inaccettabile', 'vergogna', 'pessimo', 'pessima', 'arrabbiato', 'arrabbiati', 'disservizio', 'trattati male'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'problema_in_corso', nome: 'Problema in corso', categoria: 'COMPLAINT', priorita: 4, safety_level: 'HIGH',
      descrizione: 'Un problema che sta accadendo ora (fornitore assente, location chiusa, guasto, maltempo in arrivo, ospiti in più) o una richiesta urgente: passaggio immediato a una persona.',
      esempi: ['il fotografo non si e presentato', 'il catering non si e presentato', 'il fotografo non e arrivato', 'il fornitore non e arrivato', 'la band non e arrivata', 'i camerieri non sono arrivati', 'il pasticcere non ha consegnato la torta', 'la torta non e arrivata', 'c e un problema con l evento', 'abbiamo un problema con l evento', 'abbiamo un problema con la festa', 'abbiamo un problema urgente', 'ho un problema urgente', 'problema urgente', 'e urgente', 'e una cosa urgente', 'urgentissimo', 'il dj non e ancora arrivato', 'il fotografo non e ancora arrivato', 'il catering non e arrivato', 'il catering non e ancora arrivato', 'i fiori non sono arrivati', 'la location e chiusa', 'la location non e pronta', 'non troviamo la location', 'non riusciamo a entrare in location', 'non c e nessuno in location', 'la musica non funziona', 'l impianto audio non funziona', 'e saltata la corrente', 'manca la corrente', 'manca l acqua', 'stanno arrivando piu ospiti del previsto', 'sta piovendo e la festa e all aperto', 'sta per iniziare e manca', 'la sposa e in ritardo', 'il fornitore non risponde', 'non rispondete al telefono', 'e successo un imprevisto', 'abbiamo un imprevisto', 'siamo in emergenza', 'aiutateci', 'aiuto', 'e un disastro, aiutateci', 'il fornitore non si e presentato', 'il dj non si e presentato', 'ha dato forfait il fornitore', 'sta arrivando un temporale e siamo all aperto', 'manca il dj', 'mancano i tavoli', 'sono arrivati piu ospiti del previsto'],
      keywords: ['imprevisto', 'imprevisti', 'problema urgente', 'non e ancora arrivato', 'non e ancora arrivata', 'non sono ancora arrivati', 'non e arrivato', 'non sono arrivati', 'non si e presentato', 'non si presenta', 'e sparito', 'manca la corrente', 'saltata la corrente', 'sta piovendo', 'aiutateci', 'urgentissimo', 'forfait'],
      required_entities: [], optional_entities: ['problema', 'location'], actions: ['human_handoff', 'notify_owner'] },

    { id: 'evento_imminente', nome: 'Evento imminente', categoria: 'HUMAN_HANDOFF', priorita: 5, safety_level: 'HIGH',
      descrizione: 'L\'evento è oggi, domani o tra poche ore, oppure è in corso: nessuna raccolta dati, passaggio immediato a una persona.',
      esempi: [...FRASI_IMMINENTE, 'siamo in location', 'siamo gia in location', 'sono gia in location', 'siamo davanti alla location', 'evento in corso', 'la festa e in corso', 'siamo in piena festa', 'evento imminente', 'l evento e imminente', 'ci serve per domani', 'ci serve per stasera', 'ci serve per oggi', 'ci serve entro domani', 'serve tutto per domani', 'tra due giorni abbiamo l evento', 'tra pochi giorni abbiamo la festa', 'tra poche ore abbiamo l evento', 'domani abbiamo la festa', 'stasera abbiamo la festa', 'domani abbiamo l evento', 'stasera abbiamo l evento', 'oggi abbiamo l evento', 'domani abbiamo il matrimonio', 'stasera abbiamo il matrimonio', 'domani ho il matrimonio', 'domani mi sposo', 'stasera mi sposo', 'oggi mi sposo', 'domani si sposa mia figlia', 'abbiamo l evento tra poche ore', 'l evento comincia tra poco', 'comincia tra poco la festa'],
      keywords: ['evento imminente', 'e imminente', 'evento in corso', 'siamo in location', 'tra poche ore', 'domani mi sposo', 'stasera mi sposo'],
      required_entities: [], optional_entities: ['problema'], actions: ['human_handoff', 'notify_owner'] },

    { id: 'emergenza_evento', nome: 'Pericolo per le persone', categoria: 'EMERGENCY', priorita: 2, safety_level: 'CRITICAL',
      descrizione: 'Malore grave di un ospite, incendio, crollo, aggressione, ferite: pericolo per le persone. Invito a chiamare il 112 e avviso immediato al responsabile.',
      esempi: ['chiamate il 112', 'chiamate il 118', 'chiamate un ambulanza', 'serve un ambulanza', 'c e un incendio', 'sta andando a fuoco', 'ha preso fuoco il tendone', 'un ospite e svenuto', 'un invitato non respira', 'un ospite sta soffocando', 'e crollato il palco', 'e crollato il tendone', 'e caduto il palco', 'una persona e ferita', 'ci sono feriti', 'c e una rissa', 'c e stata un aggressione', 'un ospite ha avuto un infarto', 'un invitato ha perso i sensi', 'un bambino e caduto in piscina', 'abbiamo un ferito', 'c e una persona armata', 'un ospite ha una reazione allergica grave', 'un ospite e stato folgorato', 'c e un allarme bomba', 'chiamate i vigili del fuoco', 'chiamate la polizia', 'chiamate i carabinieri'],
      keywords: ['ambulanza', '112', '118', 'incendio', 'feriti', 'ferito', 'crollato', 'infarto', 'svenuto', 'svenuta', 'soffoca', 'rissa', 'aggressione', 'vigili del fuoco', 'soccorsi'],
      required_entities: [], optional_entities: ['problema'], actions: ['emergency_escalation', 'notify_owner'] },

    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona.',
      esempi: ['voglio parlare con una persona', 'vorrei parlare con qualcuno', 'mi passate qualcuno', 'passatemi il titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con il titolare', 'vorrei parlare con l organizzatore', 'vorrei parlare con il responsabile', 'mi chiamate', 'mi richiamate', 'vorrei essere richiamato', 'vorrei essere richiamata', 'vorrei parlare con un operatore', 'preferisco parlare con una persona', 'con chi posso parlare', 'potete chiamarmi', 'vorrei parlare con voi a voce', 'vorrei sentire una persona vera'],
      keywords: ['operatore', 'persona vera', 'umano', 'titolare'], required_entities: [], optional_entities: [], actions: ['human_handoff'] },

    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'hey', 'ei', 'hei', 'ciao ciao', 'salve a tutti', 'buon giorno', 'buona sera', 'buonasera a tutti'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'a presto', 'ci vediamo', 'grazie a presto', 'grazie ci sentiamo'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'ci_penso', nome: 'Il cliente ci deve pensare', categoria: 'FOLLOW_UP', priorita: 41, safety_level: 'LOW',
      descrizione: 'Il cliente non decide adesso ("ci pensiamo", "vi faccio sapere"): si ringrazia e si lascia la porta aperta, senza insistere e senza promettere nulla.',
      esempi: ['ci pensiamo e vi faccio sapere', 'ci penso e vi faccio sapere', 'ci pensiamo e vi aggiorniamo', 'ci devo pensare', 'ci dobbiamo pensare', 'devo parlarne con il mio compagno', 'devo parlarne con mia moglie', 'ne parlo con mio marito e vi faccio sapere', 'ci riflettiamo un attimo', 'vi faccio sapere', 'vi faremo sapere', 'vi ricontatto io', 'vi ricontatto io appena decidiamo', 'ci sentiamo quando abbiamo deciso', 'ok ci penso e vi scrivo'],
      keywords: ['ci pensiamo', 'ci penso', 'ci devo pensare', 'ci dobbiamo pensare', 'vi faccio sapere', 'vi faremo sapere', 'ci riflettiamo', 'vi ricontatto'],
      required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo per le persone -> escalation immediata, messaggio 112.
    critical: [
      'non respira', 'non riesce a respirare', 'non riesco a respirare', 'fatica a respirare', 'non respiro', 'manca il respiro', 'mi manca il fiato',
      'soffoca', 'sta soffocando', 'si sta strozzando', 'si e strozzato',
      'e svenuto', 'e svenuta', 'ha perso i sensi', 'perso i sensi', 'sono svenuto', 'sono svenuta', 'sviene', 'sta svenendo', 'e collassato', 'e collassata', 'collasso',
      'infarto', 'ha avuto un infarto', 'sta avendo un infarto', 'crisi epilettica', 'convulsioni', 'emorragia', 'sanguina molto',
      'reazione allergica grave', 'ha una reazione allergica', 'sta avendo una reazione allergica', 'shock anafilattico', 'anafilassi',
      'c e un incendio', 'ce un incendio', 'incendio in corso', 'e scoppiato un incendio', 'scoppiato un incendio', 'principio di incendio', 'sta andando a fuoco', 'ha preso fuoco', 'prende fuoco', 'a fuoco', 'ci sono fiamme', 'vedo delle fiamme', 'c e fumo', 'odore di fumo', 'si e incendiato', 'si e incendiata',
      'e crollato', 'e crollata', 'sono crollati', 'crollato il palco', 'crollato il tendone', 'e caduto il palco', 'e caduto il tendone', 'e volato il tendone', 'sta crollando', 'e crollato il soffitto',
      'ci sono feriti', 'c e un ferito', 'c e una persona ferita', 'un ferito', 'feriti gravi', 'ferita grave', 'ferito grave',
      'c e una rissa', 'c e stata una rissa', 'c e stata un aggressione', 'sono stato aggredito', 'e stato aggredito', 'e stata aggredita', 'hanno aggredito', 'accoltellato', 'accoltellata', 'persona armata', 'c e una persona armata', 'allarme bomba', 'minaccia di bomba',
      'folgorato', 'elettrocutato', 'scossa elettrica', 'sta annegando', 'annegando', 'e caduto in piscina', 'e caduta in piscina',
      'chiamate il 112', 'chiamate il 118', 'chiamate un ambulanza', 'chiamate l ambulanza', 'serve un ambulanza', 'serve il 118', 'serve il 112', 'chiamate i soccorsi', 'chiamate i vigili del fuoco', 'chiamate la polizia', 'chiamate i carabinieri',
    ],
    // HIGH: evento imminente o problema in corso -> passaggio immediato a una persona.
    high: [
      ...FRASI_IMMINENTE_URGENZA,
      'siamo in location', 'siamo gia in location', 'sono gia in location', 'siamo davanti alla location', 'evento in corso', 'la festa e in corso', 'siamo in piena festa', 'evento imminente', 'e imminente', 'sta per iniziare', 'sta per cominciare', 'comincia tra poco', 'inizia tra poco',
      'domani mi sposo', 'stasera mi sposo', 'oggi mi sposo', 'domani abbiamo', 'stasera abbiamo', 'oggi abbiamo', 'domani ho il matrimonio', 'stasera ho la festa', 'domani ho la festa',
      'urgente', 'urgentissimo', 'urgentissima', 'e urgente', 'con urgenza', 'molto urgente', 'problema urgente', 'emergenza', 'in emergenza',
      'imprevisto', 'abbiamo un imprevisto', 'e successo un imprevisto', 'c e un problema', 'abbiamo un problema', 'ho un problema', 'aiutateci', 'aiutatemi',
      'non e ancora arrivato', 'non e ancora arrivata', 'non sono ancora arrivati', 'non sono ancora arrivate', 'non e arrivato', 'non e arrivata', 'non sono arrivati', 'non sono arrivate', 'non si e presentato', 'non si e presentata', 'non si presenta', 'non si sono presentati', 'e sparito', 'e sparita', 'ha dato forfait', 'dato forfait', 'forfait',
      'la location e chiusa', 'location chiusa', 'e tutto chiuso', 'non possiamo entrare', 'non riusciamo a entrare', 'non ci fanno entrare', 'non c e nessuno in location', 'nessuno ha le chiavi', 'non abbiamo le chiavi', 'location non pronta', 'la sala non e pronta', 'doppia prenotazione', 'overbooking', 'sala occupata',
      'e saltata la corrente', 'saltata la corrente', 'manca la corrente', 'senza corrente', 'blackout', 'manca la luce', 'manca l acqua', 'l impianto non funziona', 'l audio non funziona', 'non funziona l audio', 'la musica non funziona', 'impianto guasto', 'si e rotto l impianto',
      'sta piovendo', 'piove a dirotto', 'sta diluviando', 'sta arrivando un temporale', 'sta arrivando il temporale', 'allerta rossa', 'allerta arancione', 'tromba d aria', 'bomba d acqua', 'si e allagato', 'e allagata',
      'stanno arrivando piu ospiti', 'sono arrivati piu ospiti', 'piu ospiti del previsto', 'non c e posto per tutti', 'non ci stiamo tutti', 'mancano i posti', 'mancano le sedie', 'mancano i tavoli',
      'manca il dj', 'manca il fotografo', 'manca il catering', 'mancano i fiori', 'manca la musica',
      'sta male', 'stanno male', 'si e sentito male', 'si e sentita male', 'ha un malore', 'ha avuto un malore', 'un ospite sta male', 'un invitato sta male', 'si e fatto male', 'si e fatta male', 'si e ustionato', 'si e ustionata', 'incidente', 'c e stato un incidente', 'e successo un incidente', 'e caduto', 'e caduta',
      'la sposa e in ritardo', 'e in forte ritardo', 'sta tardando',
    ],
    // MEDIUM: allergie/intolleranze, permessi e sicurezza, reclami, caparre.
    medium: [
      'allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergiche', 'allergeni', 'allergene', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti',
      'celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'senza glutine', 'gluten free', 'glutine', 'lattosio', 'arachidi', 'frutta a guscio', 'epipen',
      'siae', 'suolo pubblico', 'fuochi d artificio', 'fuochi artificiali', 'pirotecnico', 'piano di sicurezza', 'antincendio', 'vie di fuga', 'uscite di sicurezza', 'agibilita', 'quiete pubblica', 'licenza per alcolici', 'somministrazione',
      'reclamo', 'lamentarmi', 'insoddisfatto', 'insoddisfatta', 'disastro', 'inaccettabile',
      'caparra', 'bonifico', 'iban', 'rimborso', 'penale',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare col titolare', 'parlare con la titolare', 'parlare con il responsabile', 'parlare con la responsabile', 'parlare con l organizzatore', 'parlare con l organizzatrice', 'parlare con il proprietario', 'parlare con un umano', 'parlare con voi a voce',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi il titolare', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'essere richiamato', 'essere richiamata', 'potete chiamarmi', 'non sei una persona', 'sei un robot', 'sei un bot', 'siete un bot', 'siete un robot',
      'operatore', 'persona vera', 'persona reale', 'parli con me una persona',
      // problemi in corso: una persona deve intervenire subito, a prescindere dall intent riconosciuto
      'non e ancora arrivato', 'non e ancora arrivata', 'non sono ancora arrivati', 'non si e presentato', 'non si e presentata', 'ha dato forfait', 'e sparito',
      'la location e chiusa', 'non riusciamo a entrare', 'non possiamo entrare', 'e saltata la corrente', 'manca la corrente',
    ],
    max_unknown_turns: 2,
    // Allergie, certezze su permessi/sicurezza: una sola richiesta basta per passare a una persona.
    sensitive_insist: 1,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del team, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste di CERTEZZA o di consiglio: allergie/celiachia, normative, sicurezza, permessi, capienze a norma.
    diagnosi_patterns: [
      // allergie, celiachia, intolleranze: nessun consiglio, inoltro a una persona
      'celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'allergico', 'allergica', 'allergici', 'allergiche', 'intollerante', 'intolleranti', 'shock anafilattico', 'epipen',
      'senza glutine al 100', 'glutine al 100', '100 senza glutine', 'al 100', 'al cento per cento', 'sicuro al 100', 'sicura al 100',
      'contaminazione', 'contaminazioni', 'contaminato', 'contaminati', 'cross contaminazione', 'tracce di', 'zero contaminazione', 'nessuna contaminazione',
      'contiene glutine', 'contiene lattosio', 'contiene uova', 'contiene latte', 'contiene arachidi', 'contiene frutta a guscio', 'contiene noci', 'contiene crostacei', 'contiene soia', 'contiene allergeni', 'ci sono allergeni', 'c e glutine', 'c e lattosio',
      'sicuro per un celiaco', 'sicuro per i celiaci', 'sicuro per celiaci', 'sicuro per un allergico', 'sicuro per gli allergici', 'adatto ai celiaci', 'adatto a un celiaco', 'adatto agli allergici',
      'posso mangiare tranquillo', 'posso mangiare tranquilla', 'possono mangiare tranquilli', 'mangiare in sicurezza', 'mangiare tranquillamente', 'senza rischi', 'nessun rischio', 'nessun pericolo', 'e pericoloso', 'e rischioso', 'rischioso',
      'antistaminico', 'cortisone', 'cosa devo prendere', 'diagnosi',
      // richieste di garanzia o certezza
      'potete garantire', 'puoi garantire', 'mi garantite', 'mi puoi garantire', 'garantite che', 'garantisce che', 'mi assicurate', 'assicuratemi', 'mi assicuri', 'potete assicurare', 'ci assicurate', 'ci garantite', 'sicuro al cento per cento', 'sicuramente',
      // permessi, sicurezza e normative: nessuna certezza normativa in chat
      'e legale', 'e illegale', 'e a norma', 'sono a norma', 'a norma di legge', 'a norma', 'in regola', 'siamo in regola', 'e in regola', 'per legge', 'a termini di legge', 'e vietato', 'e consentito', 'e permesso farlo', 'e obbligatorio', 'e obbligatoria', 'sono obbligatori', 'sono obbligatorie', 'obbligo di legge',
      'tanto nessuno controlla', 'nessuno controlla', 'nessuno controllera', 'dimmi che non serve', 'dimmi che e sicuro', 'basta che mi dici', 'risparmiare sulla siae', 'risparmiare sui permessi',
      'multa', 'multe', 'sanzione', 'sanzioni', 'sanzionato', 'denuncia', 'denunciati', 'abusivo', 'abusiva', 'abusivi', 'rischio di multa', 'rischiamo una multa', 'rischiamo qualcosa', 'responsabilita penale', 'responsabile in caso di incidente', 'chi e responsabile', 'chi risponde',
      'senza permesso', 'senza permessi', 'senza autorizzazione', 'senza autorizzazioni', 'senza licenza', 'senza siae', 'non serve nessun permesso', 'non servono permessi', 'si puo fare senza', 'possiamo farlo senza', 'posso farlo senza', 'evitare i permessi', 'evitare la siae', 'aggirare',
      'agibilita', 'antincendio', 'vie di fuga', 'uscite di sicurezza', 'piano di emergenza', 'capienza massima', 'capienza a norma', 'capienza omologata', 'omologata', 'omologato', 'certificazione', 'certificato di', 'certificati di', 'dichiarazione di conformita', 'conformita', 'normativa', 'normative', 'regolamento comunale', 'ordinanza comunale', 'quanto puo durare la musica', 'orario limite per legge',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      // date, conferme e disponibilità non verificate
      'data confermata', 'la data e confermata', 'data riservata', 'data bloccata', 'abbiamo bloccato la data', 'abbiamo riservato la data', 'vi abbiamo riservato la data', 'ho bloccato la data', 'ho riservato la data', 'la data e libera', 'la data e disponibile', 'data libera', 'data disponibile', 'siamo liberi', 'siamo disponibili il', 'siamo sicuramente liberi', 'siamo sicuramente disponibili', 'abbiamo disponibilita', 'abbiamo la data libera', 'nessun problema per la data', 'e tutto confermato', 'evento confermato', 'prenotazione confermata', 'siete confermati', 'vi abbiamo prenotato', 'ho prenotato per voi', 'abbiamo prenotato per voi', 'preventivo approvato', 'preventivo confermato',
      've l ho riservata', 've lo ho riservato', 'vi ho riservato', 'vi abbiamo riservato', 'riservata per voi', 'riservato per voi', 've la riservo', 've la blocco',
      // pagamenti
      'caparra ricevuta', 'pagamento ricevuto', 'abbiamo ricevuto il pagamento', 'abbiamo ricevuto il bonifico', 'abbiamo ricevuto la caparra', 'abbiamo ricevuto l acconto', 'la caparra e', 'la caparra sara', 'l acconto e', 'l acconto sara', 'versi la caparra', 'versi un acconto', 'faccia un bonifico', 'faccia il bonifico', 'mandi il bonifico', 'iban', 'coordinate bancarie', 'dati bancari',
      // permessi, sicurezza, normative
      'puoi stare tranquillo', 'puoi stare tranquilla', 'potete stare tranquilli', 'state tranquilli', 'ospita fino a', 'puo ospitare fino a', 'la capienza e di', 'la capienza massima e', 'ci stanno fino a', 'entrano fino a', 'la siae non serve', 'non e necessaria la siae', 'non e necessario alcun permesso',
      'non serve nessun permesso', 'non servono permessi', 'non servono autorizzazioni', 'non serve la siae', 'non serve l autorizzazione', 'non serve nessuna autorizzazione', 'non serve alcun permesso', 'e tutto in regola', 'siamo in regola', 'e in regola', 'e a norma', 'e legale', 'e consentito', 'e permesso', 'e vietato', 'si puo fare senza', 'puo farlo senza', 'nessuna multa', 'nessuna sanzione', 'non rischia nulla', 'non rischiate nulla', 'nessun problema con il comune', 'la location e a norma', 'la capienza a norma', 'e omologata', 'e omologato', 'nessun rischio', 'senza rischi', 'nessun pericolo',
      // allergie
      'senza glutine al 100', 'e al 100 senza glutine', 'senza glutine garantito', 'garantito senza glutine', 'e sicuramente senza glutine', 'zero glutine', 'nessuna traccia di glutine', 'nessuna traccia di allergeni', 'nessuna contaminazione', 'zero contaminazione', 'non c e contaminazione', 'non contiene glutine', 'non contiene lattosio', 'non contiene arachidi', 'non contiene frutta a guscio', 'non contiene uova', 'non contiene allergeni', 'privo di allergeni', 'non ci sono allergeni', 'senza allergeni', 'e sicuro per i celiaci', 'e sicuro per un celiaco', 'e sicuro per gli allergici', 'e adatto ai celiaci', 'adatto agli allergici', 'puo mangiare tranquillamente', 'puo mangiare tranquillo', 'puo mangiare tranquilla', 'puo mangiare senza problemi', 'prenda un antistaminico', 'assuma', 'assumere',
      // promesse su esito e meteo
      'non piovera', 'non pioverà', 'il tempo sara bello', 'meteo garantito', 'sicuramente non piove', 'non ci saranno imprevisti', 'senza alcun imprevisto', 'nessun imprevisto', 'tutto andra bene', 'andra tutto bene', 'sara tutto perfetto', 'sara un successo', 'sara perfetto', 'ci pensiamo noi a tutto senza problemi', 'sicuramente c e posto', 'c e sicuramente spazio', 'spazio per tutti', 'nessun problema per gli ospiti',
    ],
    messaggio_sicurezza: 'Su allergie, intolleranze, permessi, licenze, sicurezza e normative non posso dare indicazioni certe né garanzie: serve una persona del team. Passo subito la sua richiesta, la ricontatteranno.',
    messaggio_emergenza: 'Capisco, la situazione è seria. Se ci sono persone in pericolo (malore, incendio, crollo, aggressione, feriti) chiami subito il 112, il numero unico di emergenza. Avviso immediatamente il responsabile dell\'organizzazione.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    tipo_evento: ['Che tipo di evento vuole organizzare?', 'Di che evento si tratta?', 'Per quale occasione?'],
    data_evento: ['Ha già una data in mente per l\'evento?', 'Per quale data o periodo?', 'Quando vorrebbe che si svolgesse?'],
    numero_ospiti: ['Quanti ospiti pensate di avere, più o meno?', 'Per quante persone circa?', 'Quanti invitati prevedete?'],
    location: ['Avete già scelto la location o dovete ancora trovarla?', 'Dove vorreste svolgere l\'evento?'],
    giorno: ['Per quale giorno preferisce l\'incontro?', 'Che giorno le andrebbe bene?', 'Mi dice per che giorno?'],
    fascia_oraria: ['Preferisce la mattina o il pomeriggio?', 'In quale fascia della giornata?', 'Meglio mattina o pomeriggio?'],
    nome_cliente: ['A che nome registro la richiesta?', 'Mi dice il suo nome?', 'Come si chiama?'],
  },

  common_scenarios: [
    'Richiesta di evento o preventivo (tipo, data, ospiti, nome) anche in più messaggi: il lead va al team, nessuna stima di costi',
    'Disponibilità di una data: solo dal calendario dell\'agenzia, mai a memoria',
    'Incontro conoscitivo, sopralluogo o degustazione: proposta solo da calendario',
    'Permessi e licenze (SIAE, suolo pubblico, sicurezza): informazioni generali, nessuna certezza normativa; richieste di certezza a una persona',
    'Allergie e celiachia degli ospiti: nessun consiglio, inoltro a una persona',
    'Caparre, acconti, bonifici, contratti, rimborsi: solo il titolare',
    'Modifiche, disdette, conferme e reclami su eventi già avviati: passaggio a una persona',
    'Evento imminente o problema in corso: passaggio immediato a una persona; pericolo per le persone: 112',
    'Location, catering, fornitori, capienza, maltempo, servizi: solo da dati del tenant',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque organizzatore di
// eventi. Nessun importo, orario, prezzo, pacchetto, capienza, politica di
// pagamento o indirizzo: quelli stanno solo nei dati del tenant. Le FAQ su
// permessi e sicurezza sono informazioni generali, senza certezza normativa.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('richiesta_preventivo', 'Cosa serve per avere un preventivo?', ['cosa serve per un preventivo', 'che dati servono per un preventivo', 'cosa devo dirvi per il preventivo', 'come si richiede un preventivo'],
    'Per preparare una proposta il team ha bisogno in genere del tipo di evento, della data o del periodo, del numero approssimativo di ospiti e, se già note, della location e dei servizi desiderati. Con questi dati una persona del team prepara una proposta personalizzata.'),
  f('richiesta_preventivo', 'Il preventivo è personalizzato?', ['il preventivo e su misura', 'i preventivi sono personalizzati', 'preventivo su misura', 'esistono pacchetti fissi o preventivo su misura'],
    'In genere ogni evento è diverso, quindi la proposta viene preparata dal team sulla base delle esigenze raccontate dal cliente. L\'assistente raccoglie le informazioni ma non stima né anticipa importi.'),
  f('info_prezzi', 'Da cosa dipende il costo di un evento?', ['perche i costi variano', 'cosa influenza il costo di un evento', 'da cosa dipende il prezzo di un matrimonio', 'cosa incide sul prezzo di una festa'],
    'Il costo di un evento dipende da molti fattori: numero di ospiti, data e stagione, location, servizi richiesti (catering, allestimenti, musica, foto e video) e livello di personalizzazione. Per questo una cifra generica non è affidabile: la proposta la prepara il team sulla base dei dati dell\'evento.'),
  f('disponibilita_data', 'Come si verifica se una data è libera?', ['come verificate le date libere', 'come funziona la disponibilita delle date', 'come bloccare una data', 'come si opziona una data'],
    'La disponibilità di una data si verifica sul calendario dell\'agenzia ed è sempre confermata da una persona del team. Finché non c\'è una conferma esplicita la data non va considerata riservata.'),
  f('info_tempistiche', 'Con quanto anticipo conviene contattare un organizzatore?', ['quando iniziare a organizzare un matrimonio', 'quanto tempo prima conviene contattare un wedding planner', 'con quanto anticipo organizzare una festa', 'in anticipo di quanto'],
    'In genere per matrimoni e grandi eventi conviene muoversi con largo anticipo, perché le date e le location migliori si esauriscono presto; per eventi più piccoli può bastare meno tempo. Ogni caso va valutato dal team, che dice se è fattibile.'),
  f('info_servizi', 'Cosa fa un organizzatore di eventi o wedding planner?', ['cosa fa un wedding planner', 'di cosa si occupa un event planner', 'a cosa serve un organizzatore di eventi', 'perche scegliere un wedding planner'],
    'Un organizzatore di eventi aiuta a ideare, pianificare e coordinare l\'evento: dalla scelta di location e fornitori alla gestione del programma e della giornata. Quali servizi offre nello specifico lo stabilisce ogni agenzia.'),
  f('info_servizi', 'Che differenza c\'è tra organizzazione completa e coordinamento del giorno?', ['organizzazione completa o solo coordinamento', 'differenza tra full service e coordinamento', 'cos e il coordinamento del giorno', 'day coordination cos e'],
    'L\'organizzazione completa segue l\'evento dall\'inizio alla fine; il coordinamento del giorno interviene soprattutto nella fase finale e il giorno stesso, quando i dettagli sono già definiti. I servizi disponibili e le condizioni dipendono dall\'agenzia.'),
  f('info_servizi', 'Si possono organizzare anche eventi aziendali?', ['organizzate eventi aziendali', 'eventi aziendali cosa comprendono', 'cena aziendale organizzazione', 'si organizzano convention e lanci di prodotto'],
    'Molte agenzie seguono anche eventi aziendali come cene, convention, lanci di prodotto e team building. Per sapere se questa agenzia li gestisce e in che modo conviene chiedere al team.'),
  f('info_servizi', 'Si può affidare solo una parte dell\'evento?', ['posso affidarvi solo una parte', 'solo il catering o solo l allestimento', 'si puo avere solo un servizio', 'servizi a la carte'],
    'Spesso è possibile affidare solo alcune parti dell\'evento invece dell\'organizzazione completa. Le formule disponibili e le condizioni le definisce l\'agenzia.'),
  f('info_location', 'Come si sceglie la location di un evento?', ['come scegliere la location', 'come scegliere una location per un matrimonio', 'cosa valutare nella scelta della location', 'criteri per scegliere la location'],
    'La location si sceglie in base al numero di ospiti, al tipo di evento, all\'accessibilità, ai parcheggi, alla disponibilità di una soluzione in caso di maltempo e alle regole su musica, orari e fornitori. Un sopralluogo aiuta a valutare gli spazi dal vivo.'),
  f('prenota_consulenza', 'Come funziona il primo incontro?', ['primo incontro cosa succede', 'cosa si fa nel primo incontro', 'consulenza conoscitiva come funziona', 'cosa portare al primo incontro'],
    'Il primo incontro serve a raccontare l\'idea dell\'evento e a capire se e come l\'agenzia può aiutare: tipo di evento, data, ospiti, location e desideri. Conviene arrivare con un\'idea di massima, anche non definitiva.'),
  f('info_capienza', 'Cosa si intende per capienza di una location?', ['cos e la capienza', 'cosa significa capienza', 'capienza cosa vuol dire', 'che differenza tra posti a sedere e in piedi'],
    'La capienza è il numero massimo di persone che una location può ospitare, e cambia a seconda della disposizione (cena seduti, buffet, solo in piedi). I dati ufficiali e le eventuali certificazioni sono della location: l\'assistente non indica capienze che non risultano dai dati dell\'agenzia.'),
  f('info_permessi', 'Serve la SIAE per la musica a un evento?', ['serve la siae per un matrimonio', 'siae per musica dal vivo o dj', 'bisogna avere la siae per una festa', 'cos e la siae'],
    'La SIAE è l\'ente che tutela i diritti d\'autore sulla musica. In genere, quando si diffonde musica a un evento possono essere previsti adempimenti sui diritti d\'autore, che variano in base al tipo di evento e al luogo. Si tratta di un\'informazione generale: il caso concreto va verificato con il team.'),
  f('info_permessi', 'Serve un permesso per fare un evento su suolo pubblico?', ['evento in piazza serve autorizzazione', 'occupazione suolo pubblico cosa serve', 'serve il permesso del comune', 'festa in strada permessi'],
    'In generale l\'uso di piazze, strade o aree pubbliche richiede un\'autorizzazione dell\'ente competente, di solito il Comune, con modalità e tempi che cambiano da luogo a luogo. È un\'informazione generale e non una certezza normativa: per il caso concreto serve una verifica con il team.'),
  f('info_permessi', 'Musica ad alto volume, orari e fuochi d\'artificio: ci sono limiti?', ['limiti di orario per la musica', 'fuochi d artificio permessi', 'fino a che ora si puo fare musica', 'rumore e vicini'],
    'Su rumore, orari della musica e fuochi d\'artificio possono esserci limiti e autorizzazioni, che dipendono dal Comune, dal luogo e dal tipo di evento. In chat non è possibile dare indicazioni certe: il team verifica il caso specifico.'),
  f('info_permessi', 'Come si gestisce la sicurezza di un evento con molti ospiti?', ['sicurezza evento con tante persone', 'servono steward e primo soccorso', 'piano di sicurezza evento cos e', 'sicurezza negli eventi'],
    'Quando partecipano molte persone possono essere previste misure di sicurezza, ad esempio su vie di fuga, antincendio, primo soccorso e presenza di personale, che variano in base al tipo di evento, al luogo e al numero di ospiti. L\'assistente non può certificare né garantire nulla: il caso concreto va verificato con il team e con la location.'),
  f('info_allergie_ospiti', 'Come si comunicano allergie e intolleranze degli ospiti?', ['come segnalo le allergie degli ospiti', 'ospiti celiaci cosa devo fare', 'allergie degli invitati come comunicarle', 'menu per allergici evento'],
    'Allergie, celiachia e intolleranze degli ospiti vanno comunicate in anticipo e verificate con una persona del team insieme a chi prepara il cibo. L\'assistente non può dare consigli né garanzie su ingredienti o contaminazioni: la richiesta viene passata a una persona.'),
  f('info_catering', 'Meglio un buffet o una cena servita?', ['buffet o cena seduta', 'differenza tra buffet e cena servita', 'cosa scegliere tra buffet e cena', 'cena seduta o aperitivo'],
    'Il buffet è più informale e lascia gli ospiti liberi di muoversi, la cena servita è più formale e richiede più personale e spazio; la scelta dipende da tipo di evento, numero di ospiti e location. Le proposte disponibili le definisce l\'agenzia con i suoi fornitori.'),
  f('info_fornitori', 'Posso portare i miei fornitori?', ['posso usare i miei fornitori', 'fornitori esterni sono ammessi', 'portare un fotografo mio', 'fornitori propri evento'],
    'Dipende dalle regole dell\'agenzia e della location: alcune lavorano con fornitori propri o in esclusiva, altre accettano fornitori esterni a certe condizioni. Conviene chiederlo prima di prendere accordi.'),
  f('info_maltempo', 'Cosa succede se piove durante un evento all\'aperto?', ['piano b maltempo', 'evento all aperto e pioggia', 'cosa fare se piove il giorno della festa', 'maltempo evento cosa si fa'],
    'Per gli eventi all\'aperto è buona pratica prevedere una soluzione alternativa in caso di maltempo, come uno spazio coperto o una struttura. Il meteo non è prevedibile e non può essere garantito: le soluzioni disponibili le indica il team.'),
  f('caparra_pagamenti', 'Come funzionano caparra e pagamenti?', ['come si paga un evento', 'si versa una caparra', 'acconto e saldo come funzionano', 'condizioni di pagamento evento'],
    'Caparre, acconti, saldi, contratti e modalità di pagamento sono gestiti direttamente dal titolare, che spiega condizioni e tempi. L\'assistente non comunica importi né coordinate di pagamento e non può confermare pagamenti: la richiesta passa al titolare.'),
  f('modifica_evento', 'Posso cambiare data o numero di ospiti dopo aver confermato?', ['si puo spostare la data dopo la conferma', 'posso cambiare il numero di ospiti', 'modifiche dopo la conferma', 'cambiare data matrimonio'],
    'Le modifiche a un evento già confermato, come la data o il numero di ospiti, dipendono dagli accordi presi e dalla disponibilità dei fornitori. Vanno comunicate al più presto a una persona del team, che valuta cosa è possibile.'),
  f('info_tempistiche', 'Quando va comunicato il numero definitivo degli ospiti?', ['numero ospiti definitivo', 'quando confermare gli invitati', 'conferma del numero di invitati', 'quando dare il numero finale degli ospiti'],
    'Il numero definitivo degli ospiti si comunica in genere con un certo anticipo rispetto all\'evento, perché da quello dipendono catering, allestimenti e disposizione. I tempi esatti sono concordati con il team.'),
  f('info_servizi', 'Come si organizza una festa per bambini?', ['festa per bambini cosa serve', 'organizzare una festa di compleanno per bambini', 'animazione per bambini', 'festa di compleanno bambini'],
    'Per una festa per bambini conviene pensare a spazi sicuri, animazione adatta all\'età, menu pensato per i più piccoli e un numero adeguato di adulti. Le proposte disponibili le definisce l\'agenzia.'),
];
