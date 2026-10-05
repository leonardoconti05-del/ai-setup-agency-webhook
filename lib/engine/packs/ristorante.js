// lib/engine/packs/ristorante.js
//
// Sector Pack "ristorante" v1 (ristorante / trattoria / pizzeria, Italia) —
// conoscenza di SETTORE, non di un singolo locale. Prezzi, menu, piatti,
// orari, giorno di chiusura, disponibilità dei tavoli, politiche (caparra,
// animali, seggioloni), promozioni, nomi del personale e indirizzo NON stanno
// qui: arrivano solo dai dati del tenant.
//
// Sicurezza alimentare: allergeni, celiachia e intolleranze sono richieste
// SENSIBILI. Il bot non garantisce mai l'assenza di allergeni né di
// contaminazione: la conferma spetta al personale di sala/cucina (handoff).
// Reazione allergica in corso, difficoltà respiratoria, soffocamento,
// svenimento = CRITICAL (118). Malessere dopo il pasto = HIGH + handoff.

export const SETTORE = 'ristorante';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack ristorante — lessico di sala (coperti, fasce pranzo/cena, zona sala, occasioni, esigenze alimentari), 22 intent, 11 entità, urgenza CRITICAL/HIGH per reazioni allergiche e malesseri, sicurezza allergeni (nessuna garanzia, handoff al personale), FAQ di settore generali.';

// ---- Generatori di voci di lessico (dati, non logica) ----
const PAROLE = { 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci', 11: 'undici', 12: 'dodici', 15: 'quindici', 20: 'venti' };

function vociPersone() {
  const out = [{ canonical: 'n_persone_1', entity: 'numero_persone', value: 1, synonyms: ['una persona', 'tavolo per una persona', 'tavolo per uno', 'sono da solo', 'sono da sola', 'siamo in uno', 'un coperto'] }];
  for (let n = 2; n <= 40; n++) {
    const syn = [`siamo in ${n}`, `saremo in ${n}`, `saremmo in ${n}`, `in ${n} persone`, `${n} persone`, `${n} coperti`, `${n} adulti`, `${n} commensali`, `${n} ospiti`, `tavolo da ${n}`, `tavolo per ${n}`, `tavolata di ${n}`, `gruppo di ${n}`, `comitiva di ${n}`];
    if (n <= 10) syn.push(`per ${n}`);
    if (n <= 8) syn.push(`in ${n}`);
    const w = PAROLE[n];
    if (w) syn.push(`siamo in ${w}`, `saremo in ${w}`, `saremmo in ${w}`, `${w} persone`, `per ${w}`, `tavolo per ${w}`, `tavolo da ${w}`, `${w} coperti`, `in ${w}`, `siamo ${w}`);
    out.push({ canonical: `n_persone_${n}`, entity: 'numero_persone', value: n, synonyms: syn });
  }
  return out;
}

// Orari comuni di pranzo/cena -> entità `orario` (HH:MM) e fascia_oraria.
// Le varianti con minuti vengono PRIMA di quelle senza (vince la prima voce).
const ORE = [12, 13, 14, 19, 20, 21, 22];
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
    out.push({ canonical: `fascia_ore_${h}`, entity: 'fascia_oraria', value: h <= 15 ? 'pranzo' : 'cena', synonyms: [`alle ${h}`, `per le ${h}`, `verso le ${h}`, `intorno alle ${h}`, `ore ${h}`] });
  }
  return out;
}

export const pack = {
  identity: {
    nome_ruolo: 'ristorante',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un ristorante (ristorante, trattoria o pizzeria). Accogli i clienti con tono cordiale e chiaro; gestisci richieste di prenotazione, informazioni, eventi e asporto. Non sei un medico né un nutrizionista: non garantisci l\'assenza di allergeni e non dai consigli sanitari. Non confermi tavoli o disponibilità che non risultano dal calendario.',
  },
  mission: 'Capire cosa serve al cliente, raccogliere solo le informazioni necessarie (persone, giorno, pranzo o cena, nome), organizzare la prenotazione e passare subito al personale allergie, reclami, modifiche e urgenze.',
  tone_default: 'cordiale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice e cordiale.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Per allergie, celiachia e intolleranze: mai garantire l\'assenza di allergeni o di contaminazione; la conferma spetta al personale di sala o cucina.',
    'Mai inventare prezzi, piatti, menu, orari, giorno di chiusura o disponibilità: usa solo i dati del locale.',
    'Mai confermare un tavolo come "riservato" o "confermato" senza un riscontro reale del calendario.',
  ],
  prohibited_claims: [
    'garantire l\'assenza di allergeni, glutine o contaminazioni',
    'dire che un piatto è sicuro per celiaci o allergici',
    'dare consigli medici o dietetici (gravidanza, patologie, intolleranze)',
    'confermare un tavolo o una disponibilità non presente nelle fonti',
    'indicare prezzi, coperto, sconti, orari, giorno di chiusura o piatti non presenti nelle fonti',
    'promettere regole del locale (animali, caparra, seggioloni) non presenti nelle fonti',
  ],
  business_rules: [
    'Disdette, spostamenti, modifiche e ritardi su prenotazioni esistenti vanno passati al personale.',
    'Allergie, intolleranze e celiachia: sempre conferma del personale di sala/cucina.',
    'Reazione allergica in corso, difficoltà respiratoria, soffocamento o svenimento: invitare a chiamare subito il 118 e avvisare il personale.',
    'Malessere o intossicazione dopo un pasto: avvisare subito il personale (handoff).',
  ],

  entities: [
    { id: 'numero_persone', descrizione: 'Numero di persone (coperti) del tavolo.', tipo: 'number', priorita: 10,
      domanda_varianti: ['Per quante persone?', 'In quanti siete?', 'Quanti coperti devo segnare?'] },
    { id: 'giorno', descrizione: 'Giorno richiesto (oggi, domani, un giorno della settimana, weekend o festività).', tipo: 'string', priorita: 20,
      domanda_varianti: ['Per quale giorno?', 'Che giorno preferite?', 'Mi dice per che giorno?'] },
    { id: 'fascia_oraria', descrizione: 'Pranzo o cena (o sera/mattina/pomeriggio). "sera" e "cena" sono equivalenti per il locale.', tipo: 'enum', priorita: 30, valori: ['pranzo', 'cena', 'sera', 'mattina', 'pomeriggio'],
      domanda_varianti: ['Preferite pranzo o cena?', 'A pranzo o a cena?', 'Per pranzo o per cena?'] },
    { id: 'orario', descrizione: 'Orario preciso richiesto, se indicato.', tipo: 'string', priorita: 35 },
    { id: 'occasione', descrizione: 'Occasione speciale o tipo di evento.', tipo: 'enum', priorita: 36,
      valori: ['compleanno', 'laurea', 'cena_aziendale', 'anniversario', 'cena_romantica', 'cerimonia', 'addio', 'cena_di_classe', 'festa', 'altro'],
      domanda_varianti: ['Per quale occasione?', 'È per un\'occasione particolare?', 'Di che evento si tratta?'] },
    { id: 'nome_cliente', descrizione: 'Nome a cui registrare la richiesta.', tipo: 'string', priorita: 40,
      domanda_varianti: ['A che nome segno la richiesta?', 'Mi dice il suo nome?', 'Come si chiama?'] },
    { id: 'zona_sala', descrizione: 'Preferenza di posizione: interno, esterno, terrazza, sala privata, bancone.', tipo: 'enum', priorita: 50, valori: ['interno', 'esterno', 'terrazza', 'sala_privata', 'bancone', 'finestra', 'tranquillo'] },
    { id: 'esigenze_alimentari', descrizione: 'Esigenze alimentari o allergie dichiarate dal cliente (da confermare SEMPRE con il personale).', tipo: 'enum', priorita: 60,
      valori: ['celiachia', 'senza_glutine', 'lattosio', 'frutta_a_guscio', 'crostacei', 'uova', 'allergia', 'vegetariano', 'vegano'],
      domanda_varianti: ['Ci sono allergie o intolleranze di cui il personale deve tenere conto?'] },
    { id: 'esigenze_speciali', descrizione: 'Seggiolone, bambini, animali, passeggino, accessibilità (sedia a rotelle).', tipo: 'enum', priorita: 65, valori: ['seggiolone', 'bambini', 'animali', 'passeggino', 'accessibilita'] },
    { id: 'malessere', descrizione: 'Tipo di malessere segnalato dopo un pasto.', tipo: 'enum', priorita: 70,
      valori: ['reazione_allergica', 'difficolta_respiratoria', 'intossicazione', 'vomito', 'mal_di_pancia', 'malessere_generico', 'corpo_estraneo'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Numero di persone, orari (generati) ----
    ...vociPersone(),
    ...vociOrari(),

    // ---- Fascia: pranzo / cena ----
    { canonical: 'pranzo', entity: 'fascia_oraria', value: 'pranzo', synonyms: ['a pranzo', 'pranzo', 'pranzare', 'ora di pranzo', 'a mezzogiorno', 'mezzogiorno', 'pranzetto'], errors: ['pranso'] },
    { canonical: 'cena', entity: 'fascia_oraria', value: 'cena', synonyms: ['a cena', 'cena', 'cenare', 'cenetta', 'cenone', 'a cenare'], errors: ['cenna'] },

    // ---- Giorno: stasera, weekend, festività ----
    { canonical: 'stasera', entity: 'giorno', value: 'oggi', synonyms: ['stasera', 'questa sera', 'stanotte', 'stamattina', 'stamani', 'in giornata'], slang: ['stasera stessa'] },
    { canonical: 'weekend', entity: 'giorno', value: 'weekend', synonyms: ['weekend', 'week end', 'fine settimana', 'nel weekend', 'questo weekend', 'sabato o domenica', 'sabato e domenica'] },
    { canonical: 'san_valentino', entity: 'giorno', value: 'san_valentino', synonyms: ['san valentino', 'san valentino'] },
    { canonical: 'capodanno', entity: 'giorno', value: 'capodanno', synonyms: ['capodanno', 'ultimo dell anno', 'cenone di capodanno', 'notte di san silvestro', 'san silvestro'] },
    { canonical: 'natale', entity: 'giorno', value: 'natale', synonyms: ['natale', 'vigilia di natale', 'santo stefano', 'pranzo di natale', 'cena della vigilia'] },
    { canonical: 'pasqua', entity: 'giorno', value: 'pasqua', synonyms: ['pasqua', 'pasquetta', 'lunedi dell angelo', 'pranzo di pasqua'] },
    { canonical: 'ferragosto', entity: 'giorno', value: 'ferragosto', synonyms: ['ferragosto', 'pranzo di ferragosto'] },
    { canonical: 'festa_mamma', entity: 'giorno', value: 'festa_della_mamma', synonyms: ['festa della mamma', 'festa del papa', 'festa della donna', 'otto marzo', 'l 8 marzo'] },

    // ---- Zona sala ----
    { canonical: 'sala_privata', entity: 'zona_sala', value: 'sala_privata', synonyms: ['sala privata', 'saletta privata', 'saletta', 'sala riservata', 'sala a parte', 'stanza privata', 'salone privato', 'sala dedicata'], intent: 'richiesta_evento' },
    { canonical: 'terrazza', entity: 'zona_sala', value: 'terrazza', synonyms: ['terrazza', 'terrazzo', 'in terrazza', 'sulla terrazza', 'rooftop'] },
    { canonical: 'esterno', entity: 'zona_sala', value: 'esterno', synonyms: ['all aperto', 'tavolo fuori', 'tavoli fuori', 'posto fuori', 'mangiare fuori', 'preferiamo fuori', 'meglio fuori', 'fuori se possibile', 'fuori se c e posto', 'sala fuori', 'esterno', 'all esterno', 'dehors', 'giardino', 'in giardino', 'veranda', 'plateatico', 'patio', 'spazio esterno', 'tavolino fuori'], errors: ['dehor'] },
    { canonical: 'interno', entity: 'zona_sala', value: 'interno', synonyms: ['dentro', 'tavolo dentro', 'posto dentro', 'all interno', 'interno', 'sala interna', 'al chiuso', 'dentro se possibile', 'nella sala', 'in sala'] },
    { canonical: 'bancone', entity: 'zona_sala', value: 'bancone', synonyms: ['al bancone', 'bancone', 'al banco', 'sgabelli'] },
    { canonical: 'finestra', entity: 'zona_sala', value: 'finestra', synonyms: ['vicino alla finestra', 'tavolo vicino alla finestra', 'tavolo con vista', 'con vista', 'accanto alla finestra'] },
    { canonical: 'tranquillo', entity: 'zona_sala', value: 'tranquillo', synonyms: ['tavolo tranquillo', 'angolo tranquillo', 'angolino', 'posto tranquillo', 'in disparte', 'piu riservato', 'zona tranquilla'] },

    // ---- Occasione ----
    { canonical: 'compleanno', entity: 'occasione', value: 'compleanno', synonyms: ['compleanno', 'compleanni', 'festeggiare il compleanno', 'buon compleanno', 'festeggiare i miei anni', 'compie gli anni', 'compio gli anni', 'compie anni', 'compio anni'], errors: ['compleano'] },
    { canonical: 'laurea', entity: 'occasione', value: 'laurea', synonyms: ['laurea', 'laureato', 'laureata', 'laurearsi', 'laureati', 'festa di laurea', 'festeggiare la laurea', 'proclamazione'], errors: ['lauera'] },
    { canonical: 'cena_aziendale', entity: 'occasione', value: 'cena_aziendale', synonyms: ['cena aziendale', 'pranzo aziendale', 'cena di lavoro', 'pranzo di lavoro', 'cena con i colleghi', 'cena con colleghi', 'pranzo con i colleghi', 'cena di azienda', 'cena con i clienti', 'pranzo con i clienti', 'cena di ufficio', 'evento aziendale', 'team building', 'cena di fine anno aziendale', 'azienda', 'aziendale', 'dipendenti', 'colleghi', 'per i dipendenti'], intent: 'richiesta_evento' },
    { canonical: 'anniversario', entity: 'occasione', value: 'anniversario', synonyms: ['anniversario', 'anniversari', 'anniversario di matrimonio', 'anniversario di nozze'] },
    { canonical: 'cena_romantica', entity: 'occasione', value: 'cena_romantica', synonyms: ['cena romantica', 'serata romantica', 'romantica', 'proposta di matrimonio', 'chiedere la mano', 'fidanzamento', 'cena a lume di candela'] },
    { canonical: 'cerimonia', entity: 'occasione', value: 'cerimonia', synonyms: ['comunione', 'prima comunione', 'cresima', 'battesimo', 'matrimonio', 'rinfresco', 'nozze', 'cerimonia', 'banchetto'], intent: 'richiesta_evento' },
    { canonical: 'addio', entity: 'occasione', value: 'addio', synonyms: ['addio al nubilato', 'addio al celibato', 'addio nubilato', 'addio celibato', 'nubilato', 'celibato'] },
    { canonical: 'cena_di_classe', entity: 'occasione', value: 'cena_di_classe', synonyms: ['cena di classe', 'rimpatriata', 'reunion', 'cena di gruppo', 'cena tra amici di sempre', 'cena di leva'] },
    { canonical: 'festa', entity: 'occasione', value: 'festa', synonyms: ['festa', 'una festa', 'festa privata', 'festeggiare', 'festeggiamento', 'festeggiamenti', 'party'] },

    // ---- Esigenze alimentari (sempre da confermare col personale) ----
    { canonical: 'celiachia', entity: 'esigenze_alimentari', value: 'celiachia', negabile: true, synonyms: ['celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'intollerante al glutine', 'intolleranza al glutine', 'intolleranti al glutine'], errors: ['celiacco', 'celliaco'] },
    { canonical: 'senza_glutine', entity: 'esigenze_alimentari', value: 'senza_glutine', negabile: true, synonyms: ['senza glutine', 'gluten free', 'glutenfree', 'no glutine', 'privo di glutine', 'glutine'], errors: ['senza glutinne'] },
    { canonical: 'lattosio', entity: 'esigenze_alimentari', value: 'lattosio', negabile: true, synonyms: ['senza lattosio', 'intollerante al lattosio', 'intolleranza al lattosio', 'lattosio', 'intolleranti al lattosio', 'latticini', 'intollerante ai latticini'] },
    { canonical: 'frutta_a_guscio', entity: 'esigenze_alimentari', value: 'frutta_a_guscio', negabile: true, synonyms: ['frutta a guscio', 'frutta secca', 'arachidi', 'noccioline', 'nocciole', 'noci', 'mandorle', 'pistacchi'] },
    { canonical: 'crostacei', entity: 'esigenze_alimentari', value: 'crostacei', negabile: true, synonyms: ['crostacei', 'gamberi', 'molluschi', 'frutti di mare', 'allergia al pesce', 'allergica al pesce', 'allergico al pesce'] },
    { canonical: 'uova', entity: 'esigenze_alimentari', value: 'uova', negabile: true, synonyms: ['allergia alle uova', 'allergico alle uova', 'allergica alle uova', 'senza uova'] },
    { canonical: 'allergia', entity: 'esigenze_alimentari', value: 'allergia', negabile: true, synonyms: ['allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergiche', 'allergeni', 'allergene', 'allergia alimentare', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti', 'intolleranze alimentari'], errors: ['alergia', 'alergico', 'alergica'] },
    { canonical: 'vegetariano', entity: 'esigenze_alimentari', value: 'vegetariano', negabile: true, synonyms: ['vegetariano', 'vegetariana', 'vegetariani', 'vegetariane', 'piatti vegetariani', 'menu vegetariano', 'non mangia carne', 'non mangiamo carne', 'senza carne'], slang: ['veg'] },
    { canonical: 'vegano', entity: 'esigenze_alimentari', value: 'vegano', negabile: true, synonyms: ['vegano', 'vegana', 'vegani', 'vegane', 'piatti vegani', 'menu vegano', 'plant based', 'dieta vegana'] },

    // ---- Esigenze speciali ----
    { canonical: 'seggiolone', entity: 'esigenze_speciali', value: 'seggiolone', synonyms: ['seggiolone', 'seggioloni', 'seggiolino', 'sedia alta', 'seggiolone per bambini'], errors: ['segiolone', 'seggiolne'] },
    { canonical: 'passeggino', entity: 'esigenze_speciali', value: 'passeggino', synonyms: ['passeggino', 'passeggini', 'carrozzina per bambini', 'carrozzina del bambino'] },
    { canonical: 'accessibilita', entity: 'esigenze_speciali', value: 'accessibilita', synonyms: ['sedia a rotelle', 'carrozzina', 'carrozzella', 'disabile', 'disabili', 'accessibile', 'accessibilita', 'barriere architettoniche', 'scivolo', 'rampa', 'bagno disabili', 'ascensore', 'gradini', 'mobilita ridotta', 'non deambulante', 'stampelle', 'sedia rotelle'], errors: ['sedia a rotele'] },
    { canonical: 'animali', entity: 'esigenze_speciali', value: 'animali', synonyms: ['cane', 'cani', 'cagnolino', 'cagnolina', 'cucciolo', 'animali', 'animale', 'animali domestici', 'con il cane', 'pet friendly', 'amici a quattro zampe', 'gatto', 'cagnone', 'labrador', 'golden retriever', 'barboncino', 'bassotto', 'chihuahua', 'pastore tedesco', 'bulldog', 'beagle', 'husky', 'carlino', 'il mio cucciolo', 'il mio cagnolino'] },
    { canonical: 'bambini', entity: 'esigenze_speciali', value: 'bambini', synonyms: ['bambini', 'bambino', 'bambina', 'bambine', 'bimbo', 'bimba', 'bimbi', 'figli piccoli', 'neonato', 'neonata', 'piccoli', 'menu bambini', 'menu per bambini', 'con i bimbi', 'con i bambini'], errors: ['bambni'] },

    // ---- Malessere dopo il pasto (sicurezza alimentare) ----
    { canonical: 'reazione_allergica', entity: 'malessere', value: 'reazione_allergica', negabile: true, synonyms: ['reazione allergica', 'shock anafilattico', 'anafilassi', 'anafilattico', 'orticaria', 'gonfiore alle labbra', 'labbra gonfie', 'lingua gonfia', 'gola gonfia', 'si gonfia la lingua', 'si gonfiano le labbra', 'mi si gonfiano le labbra', 'prurito dopo aver mangiato', 'pieno di bolle', 'pieno di macchie'] },
    { canonical: 'difficolta_respiratoria', entity: 'malessere', value: 'difficolta_respiratoria', negabile: true, synonyms: ['non riesco a respirare', 'non riesce a respirare', 'non respira', 'fatica a respirare', 'difficolta a respirare', 'difficolta respiratoria', 'difficolta respiratorie', 'respira male', 'respiro male', 'manca il respiro', 'mi manca il fiato', 'gola si chiude', 'si chiude la gola', 'mi si chiude la gola', 'gola chiusa', 'gola che si chiude', 'gli si chiude la gola', 'le si chiude la gola', 'soffoca', 'sta soffocando', 'si sta soffocando', 'strozzato', 'si e strozzato', 'si sta strozzando', 'senza fiato'] },
    { canonical: 'intossicazione', entity: 'malessere', value: 'intossicazione', negabile: true, synonyms: ['intossicazione', 'intossicazione alimentare', 'intossicato', 'intossicata', 'intossicati', 'intossicate', 'avvelenato', 'avvelenata', 'avvelenamento', 'salmonella'], errors: ['intossicazzione'] },
    { canonical: 'vomito', entity: 'malessere', value: 'vomito', negabile: true, synonyms: ['vomito', 'vomitato', 'vomitare', 'ho vomitato', 'abbiamo vomitato', 'ha vomitato', 'nausea'] },
    { canonical: 'mal_di_pancia', entity: 'malessere', value: 'mal_di_pancia', negabile: true, synonyms: ['mal di pancia', 'mal di stomaco', 'diarrea', 'crampi', 'dolori addominali', 'dolore alla pancia', 'dolore allo stomaco', 'mal di pancia terribile'] },
    { canonical: 'malessere_generico', entity: 'malessere', value: 'malessere_generico', negabile: true, synonyms: ['sto male', 'stiamo male', 'sta male', 'stanno male', 'siamo stati male', 'sono stato male', 'sono stata male', 'ci siamo sentiti male', 'ci siamo sentite male', 'mi sono sentito male', 'mi sono sentita male', 'mi sento male', 'si e sentita male', 'si e sentito male', 'malessere', 'non mi sento bene', 'e stata male', 'e stato male', 'svenuto', 'svenuta', 'sono svenuto', 'sono svenuta', 'e svenuto', 'e svenuta', 'ha perso i sensi', 'ho perso i sensi', 'perso i sensi', 'sviene'] },
    { canonical: 'corpo_estraneo', entity: 'malessere', value: 'corpo_estraneo', synonyms: ['pezzo di vetro', 'pezzetto di vetro', 'scheggia di vetro', 'schegge di vetro', 'vetro nel piatto', 'vetro nel bicchiere', 'pezzo di plastica', 'pezzo di metallo'] },

    // ---- Concetti di conversazione (collegano all'intent) ----
    { canonical: 'menu', synonyms: ['menu', 'la carta', 'carta dei vini', 'lista dei vini', 'piatti', 'antipasti', 'primi piatti', 'secondi piatti', 'dolci', 'degustazione', 'menu degustazione', 'piatto del giorno', 'specialita', 'cosa si mangia', 'cosa mangiate', 'cosa cucinate'], intent: 'info_menu' },
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto si spende', 'quanto spendiamo', 'a testa', 'a persona', 'prezzo medio', 'conto medio', 'listino', 'quanto si paga', 'costo del coperto', 'quanto e il coperto', 'il coperto costa', 'si paga il coperto', 'pagare il coperto', 'quanto prendete'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'siete aperti', 'siete aperte', 'siete chiusi', 'aperti oggi', 'aperti domani', 'aperti stasera', 'aperti la sera', 'aperti a pranzo', 'aperti a cena', 'aperti domenica', 'aperti il', 'a che ora aprite', 'a che ora chiudete', 'quando chiudete', 'apertura', 'chiusura', 'giorno di chiusura', 'giorno di riposo', 'chiusura settimanale', 'orario continuato', 'orario cucina', 'cucina aperta'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'come arrivare', 'parcheggio', 'parcheggiare', 'posizione', 'ztl', 'numero di telefono', 'a che numero'], intent: 'info_posizione' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'bancomat', 'carta di credito', 'carte di credito', 'satispay', 'ticket restaurant', 'ticket', 'buoni pasto', 'buono pasto', 'contanti', 'fattura', 'conto separato', 'conti separati', 'alla romana', 'dividere il conto', 'pagare con'], intent: 'info_pagamenti' },
    { canonical: 'asporto', synonyms: ['asporto', 'take away', 'takeaway', 'delivery', 'a domicilio', 'domicilio', 'consegna', 'consegne', 'consegnate', 'da portare via', 'portare via', 'glovo', 'deliveroo', 'just eat', 'justeat', 'uber eats'], intent: 'info_asporto_consegna' },
    { canonical: 'evento', synonyms: ['evento', 'eventi', 'catering', 'buffet', 'privatizzare', 'privatizzare il locale', 'affittare la sala', 'chiudere il locale', 'tavolata'], intent: 'richiesta_evento' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima dei costi', 'stima del costo', 'budget', 'offerta per gruppi', 'menu per gruppi', 'menu per il gruppo'], intent: 'richiesta_evento' },
    { canonical: 'caparra', synonyms: ['caparra', 'acconto', 'anticipo', 'garanzia con carta', 'carta a garanzia', 'penale', 'no show'], intent: 'info_prenotazioni' },
    { canonical: 'prenotare', synonyms: ['prenotare', 'prenotazione', 'prenotazioni', 'prenoto', 'prenotiamo', 'prenotarvi', 'prenotarne', 'riservare', 'riserva', 'fare una prenotazione', 'un tavolo', 'tavolo libero', 'posto libero', 'posti liberi', 'posto a sedere', 'avete posto', 'ci sono posti', 'c e posto', 'posticino', 'tavolino', 'tavoli', 'tavoli liberi'], intent: 'prenota_tavolo', errors: ['prenotre', 'pernotare', 'prenotazone'] },
    { canonical: 'disdetta', synonyms: ['disdire', 'disdetta', 'disdico', 'disdiciamo', 'annullare', 'annullo', 'annulliamo', 'annullate', 'cancellare', 'cancello', 'cancellate', 'cancellazione', 'cancelliamo'], intent: 'cancella_prenotazione' },
    { canonical: 'modifica', synonyms: ['spostare', 'spostiamo', 'sposto', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'modificare', 'modifica', 'cambiare giorno', 'cambiare orario', 'cambiare la prenotazione', 'in ritardo', 'ritardo', 'aggiungere', 'aggiungere una persona', 'tardiamo'], intent: 'sposta_prenotazione' },
    { canonical: 'conferma', synonyms: ['confermare', 'conferma', 'confermate', 'confermata', 'confermato', 'confermiamo'], intent: 'conferma_prenotazione' },
  ],

  intents: [
    { id: 'prenota_tavolo', nome: 'Prenotazione tavolo', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole prenotare un tavolo o chiede se c\'è posto.',
      esempi: ['vorrei prenotare', 'vorrei prenotare un tavolo', 'vorremmo prenotare un tavolo', 'prenotare un tavolo', 'vorrei riservare un tavolo', 'avete un tavolo libero', 'avete posto stasera', 'avete posto domani', 'avete posto sabato', 'avete posto per', 'c e posto per', 'c e posto stasera', 'c e un tavolo', 'si puo prenotare', 'posso prenotare', 'prenotazione per', 'fare una prenotazione', 'vorrei fare una prenotazione', 'cerchiamo un tavolo', 'ci serve un tavolo', 'avete un tavolo in terrazza', 'avete un tavolo fuori', 'avete un tavolo all aperto', 'tavolo in terrazza', 'un tavolo fuori', 'vorremmo venire a mangiare da voi', 'vorremmo venire a cena', 'vorremmo venire a pranzo', 'vorrei venire a cena', 'vorrei venire a pranzo', 'volevo prenotare', 'volevamo prenotare', 'posticino per', 'mi tenete un tavolo', 'mi tenete un posto'],
      keywords: ['prenotare', 'prenotazione', 'prenotiamo', 'riservare', 'tavolo libero'],
      combinazioni: [
        { entity: 'numero_persone', con: ['tavolo', 'un tavolo', 'posto', 'posti', 'prenotare', 'prenoto', 'prenotiamo', 'vorrei', 'vorremmo', 'siamo', 'saremo', 'saremmo', 'cerchiamo', 'ci serve', 'ci servirebbe', 'mi serve', 'avete', 'c e', 'ci sono', 'possiamo', 'posso', 'venire', 'mangiare', 'cenare', 'pranzare', 'passare', 'da voi'], con_entities: ['giorno', 'fascia_oraria', 'orario'], non_con_concepts: ['prezzo', 'preventivo', 'disdetta', 'modifica', 'evento', 'asporto', 'orari', 'cena_aziendale', 'cerimonia', 'sala_privata'], score: 0.85 },
        { entity: 'zona_sala', con: ['tavolo', 'un tavolo', 'posto', 'prenotare', 'vorrei', 'vorremmo', 'preferiamo', 'meglio', 'possibilmente'], non_con_concepts: ['prezzo', 'preventivo', 'disdetta', 'modifica', 'evento', 'orari'], score: 0.8 },
        { entity: 'giorno', con: ['tavolo', 'un tavolo', 'il tavolo', 'posto', 'posti', 'prenotare', 'prenotazione', 'prenoto', 'riservare', 'vorremmo mangiare', 'vorrei mangiare'], non_con_concepts: ['prezzo', 'preventivo', 'disdetta', 'modifica', 'evento', 'orari', 'conferma', 'asporto'], score: 0.8 },
      ],
      required_entities: ['numero_persone', 'giorno', 'fascia_oraria', 'nome_cliente'], optional_entities: ['orario', 'zona_sala', 'occasione', 'esigenze_alimentari', 'esigenze_speciali'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_evento', nome: 'Evento, gruppo o preventivo', categoria: 'LEAD', priorita: 18, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di organizzare un evento, una cena di gruppo, una sala privata o un preventivo.',
      esempi: ['vorrei organizzare una cena aziendale', 'organizzare una festa', 'organizzare un evento', 'avete una sala privata', 'avete una saletta privata', 'avete una sala riservata', 'vorrei un preventivo', 'mi fate un preventivo', 'preventivo per una cena', 'cena aziendale', 'pranzo aziendale', 'festa di laurea', 'festa di compleanno', 'organizzate eventi', 'fate eventi', 'fate catering', 'fate buffet', 'menu per gruppi', 'menu per il gruppo', 'menu per una comitiva', 'privatizzare il locale', 'affittare la sala', 'per un gruppo numeroso', 'addio al nubilato', 'addio al celibato', 'battesimo', 'comunione', 'cresima', 'cena di classe', 'cena di gruppo'],
      keywords: ['preventivo', 'evento', 'eventi', 'sala privata', 'saletta privata', 'sala riservata', 'catering', 'buffet', 'comunione', 'cresima', 'battesimo', 'laurea', 'nubilato', 'celibato', 'rinfresco', 'banchetto', 'gruppo numeroso', 'privatizzare'],
      required_entities: ['numero_persone', 'occasione', 'nome_cliente'], optional_entities: ['giorno', 'fascia_oraria', 'orario', 'zona_sala', 'esigenze_alimentari', 'esigenze_speciali'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'ordine_asporto', nome: 'Ordine da asporto', categoria: 'LEAD', priorita: 22, safety_level: 'LOW',
      descrizione: 'Il cliente vuole fare un ordine da asporto o da ritirare. Il bot non prende il contenuto dell\'ordine come confermato: lo passa al personale.',
      esempi: ['vorrei ordinare', 'vorremmo ordinare', 'vorrei fare un ordine', 'vorrei ordinare due pizze', 'vorrei ordinare da asporto', 'vorrei ordinare per asporto', 'vorrei ordinare da portare via', 'ordino per stasera', 'faccio un ordine', 'ordine per asporto', 'ordine da asporto', 'passo a ritirare', 'da ritirare alle', 'ritiro alle', 'mi preparate due pizze da portare via', 'mi preparate da asporto'],
      keywords: ['ordinare', 'ordine', 'ordino', 'ritirare', 'ritiro'],
      required_entities: ['nome_cliente'], optional_entities: ['giorno', 'fascia_oraria', 'orario', 'numero_persone'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'info_menu', nome: 'Menu e piatti', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Domande su menu, piatti, menu degustazione, carta dei vini, opzioni vegetariane/vegane.',
      esempi: ['mi mandate il menu', 'avete il menu online', 'dove vedo il menu', 'posso vedere il menu', 'che piatti avete', 'cosa c e nel menu', 'avete il menu degustazione', 'com e composto il menu degustazione', 'che antipasti avete', 'avete la carta dei vini', 'avete piatti di pesce', 'avete piatti di carne', 'avete la pizza', 'fate la pizza', 'avete il menu vegetariano', 'avete piatti vegetariani', 'avete opzioni vegane', 'avete piatti vegani', 'avete il menu bambini', 'avete il menu per bambini', 'avete piatti tipici', 'cosa consigliate', 'qual e il piatto del giorno', 'avete il menu del giorno', 'avete il menu a prezzo fisso', 'cosa si mangia da voi', 'cosa posso mangiare', 'cosa possiamo mangiare', 'cosa si puo mangiare', 'cosa cucinate', 'che dolci avete', 'avete il tiramisu', 'avete il menu di pesce', 'mi fate vedere la carta'],
      keywords: ['menu', 'carta dei vini', 'piatti', 'antipasti', 'degustazione', 'piatto del giorno', 'specialita'],
      required_entities: [], optional_entities: ['esigenze_alimentari', 'esigenze_speciali'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_allergie', nome: 'Allergie, celiachia e intolleranze', categoria: 'INFORMATION', priorita: 24, safety_level: 'HIGH',
      descrizione: 'Il cliente segnala o chiede di allergie, celiachia, intolleranze. Informazione SENSIBILE: nessuna garanzia dal bot, conferma sempre dal personale.',
      esempi: ['avete piatti senza glutine', 'avete opzioni senza glutine', 'avete la pizza senza glutine', 'avete il menu senza glutine', 'avete opzioni per celiaci', 'avete qualcosa per celiaci', 'avete piatti per celiaci', 'avete piatti senza lattosio', 'ho un allergia alimentare', 'ho delle allergie', 'ho un intolleranza', 'ho delle intolleranze', 'e allergico alle arachidi', 'e allergica alle arachidi', 'sono allergico', 'sono allergica', 'siamo allergici', 'abbiamo delle allergie', 'abbiamo un celiaco', 'abbiamo una celiaca', 'sono celiaco', 'sono celiaca', 'siamo celiaci', 'quali sono gli allergeni', 'avete la lista degli allergeni', 'come gestite le allergie', 'come gestite i celiaci', 'mangiate senza glutine', 'prodotti senza glutine'],
      keywords: ['celiaco', 'celiaca', 'celiaci', 'celiachia', 'senza glutine', 'senza lattosio', 'intolleranza', 'intolleranze', 'allergia', 'allergie', 'allergico', 'allergica', 'allergeni', 'gluten free'],
      required_entities: [], optional_entities: ['esigenze_alimentari', 'numero_persone', 'giorno'], actions: ['search_knowledge', 'answer_information', 'human_handoff'] },
    { id: 'info_asporto_consegna', nome: 'Asporto e consegna', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede se il locale fa asporto, take away, consegna a domicilio.',
      esempi: ['fate asporto', 'fate take away', 'fate takeaway', 'avete il take away', 'fate consegna a domicilio', 'consegnate a casa', 'fate delivery', 'portate a casa', 'consegnate anche a', 'si puo ordinare da portare via', 'si puo ritirare', 'siete su glovo', 'siete su just eat', 'siete su deliveroo', 'siete su uber eats', 'consegna a domicilio', 'fate consegne', 'fate anche asporto'],
      keywords: ['asporto', 'take away', 'takeaway', 'delivery', 'domicilio', 'consegna', 'consegnate', 'da portare via', 'portare via', 'glovo', 'deliveroo', 'just eat'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_prezzi', nome: 'Prezzi', categoria: 'INFORMATION', priorita: 28, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa mangiare, un menu, il coperto.',
      esempi: ['quanto costa', 'quanto costa il menu degustazione', 'quanto costa mangiare da voi', 'quanto si spende', 'quanto si spende a testa', 'quanto viene a persona', 'che prezzi avete', 'quali sono i prezzi', 'prezzo medio', 'quanto viene', 'quanto costa il coperto', 'c e il coperto', 'avete un listino', 'quanto costa una cena', 'quanto costa una pizza', 'mi dite i prezzi', 'prezzo del menu', 'quanto devo spendere', 'siete cari', 'avete un menu a prezzo fisso', 'fate degli sconti', 'ci sono sconti per gruppi', 'avete scontistica', 'avete delle promozioni', 'ci sono offerte'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'a testa', 'prezzo medio', 'quanto si spende', 'listino', 'costo del coperto', 'quanto e il coperto', 'scontistica', 'promozioni', 'offerte'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Orari e giorno di chiusura', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede gli orari di apertura, della cucina o il giorno di chiusura.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti', 'siete aperti stasera', 'siete aperti domani', 'siete aperti domenica', 'siete aperti a pranzo', 'siete aperti a cena', 'quali sono gli orari', 'orari di apertura', 'fino a che ora fate cena', 'fino a che ora siete aperti', 'a che ora apre la cucina', 'la cucina e aperta', 'quando chiudete', 'avete un giorno di chiusura', 'qual e il giorno di chiusura', 'giorno di riposo', 'siete chiusi il lunedi', 'quando siete chiusi', 'chiusura settimanale', 'orario della cucina', 'siete aperti a ferragosto', 'siete aperti a natale', 'fate orario continuato', 'fino a che ora posso ordinare', 'fino a che ora si ordina', 'a che ora chiude la cucina', 'aprite a pranzo', 'siete aperti anche', 'a che ora si puo cenare', 'fino a che ora si puo ordinare'],
      keywords: ['orari', 'orario', 'siete aperti', 'siete chiusi', 'aperti oggi', 'aperti domani', 'aperti stasera', 'aperti a pranzo', 'aperti a cena', 'giorno di chiusura', 'giorno di riposo', 'chiusura settimanale', 'orario continuato'],
      required_entities: [], optional_entities: ['giorno', 'fascia_oraria'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_posizione', nome: 'Posizione e contatti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Dove si trova il locale, come arrivare, parcheggio, telefono.',
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova il ristorante', 'dov e il locale', 'c e parcheggio', 'avete parcheggio', 'dove posso parcheggiare', 'come arrivo', 'siete in centro', 'siete vicino alla stazione', 'si parcheggia facilmente', 'mi mandate la posizione', 'numero di telefono', 'a che numero posso chiamarvi', 'c e un parcheggio vicino', 'siete in ztl', 'indirizzo del locale', 'dov e la trattoria', 'dov e la pizzeria'],
      keywords: ['indirizzo', 'parcheggio', 'dove siete', 'dove parcheggiare', 'ztl', 'posizione', 'come arrivare', 'numero di telefono'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Pagamenti', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento, buoni pasto, conti separati, fattura.',
      esempi: ['accettate carte', 'accettate il bancomat', 'si puo pagare con la carta', 'accettate satispay', 'prendete i ticket restaurant', 'accettate buoni pasto', 'accettate i buoni pasto', 'pagamento in contanti', 'fate conti separati', 'possiamo fare il conto alla romana', 'si puo dividere il conto', 'fate la fattura', 'posso avere la fattura', 'rilasciate fattura', 'accettate pagamenti con carta', 'accettate american express', 'si paga con carta', 'solo contanti'],
      keywords: ['bancomat', 'carte', 'satispay', 'ticket restaurant', 'buoni pasto', 'contanti', 'fattura', 'conto separato', 'conti separati', 'alla romana', 'pagamento', 'pagamenti', 'pagare con'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_locale', nome: 'Servizi del locale', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Seggiolone, animali, accessibilità, terrazza/giardino, wifi, fasciatoio.',
      esempi: ['avete il seggiolone', 'avete i seggioloni', 'c e il seggiolone', 'avete un seggiolone per bambini', 'accettate cani', 'accettate i cani', 'si possono portare i cani', 'ammettete animali', 'ammettete i cani', 'i cani sono ammessi', 'si puo entrare con il cane', 'siete accessibili', 'siete accessibili per sedia a rotelle', 'c e un accesso per sedia a rotelle', 'ci sono gradini', 'c e un bagno per disabili', 'avete il fasciatoio', 'avete la terrazza', 'avete un dehors', 'avete il giardino', 'avete il wifi', 'avete aria condizionata', 'siete pet friendly', 'posso entrare con', 'posso entrare col', 'possiamo entrare con', 'posso portare il mio', 'possiamo portare il nostro', 'si puo entrare con il passeggino', 'avete lo scivolo', 'avete l ascensore'],
      keywords: ['seggiolone', 'seggioloni', 'passeggino', 'cani ammessi', 'animali ammessi', 'sedia a rotelle', 'accessibile', 'accessibilita', 'dehors', 'giardino', 'wifi', 'fasciatoio', 'scivolo', 'gradini', 'ascensore', 'bagno disabili', 'aria condizionata', 'pet friendly'],
      required_entities: [], optional_entities: ['esigenze_speciali', 'zona_sala'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_prenotazioni', nome: 'Regole di prenotazione', categoria: 'INFORMATION', priorita: 29, safety_level: 'LOW',
      descrizione: 'Serve prenotare? Caparra? Per quanto tempo tenete il tavolo? Come funziona la prenotazione.',
      esempi: ['serve prenotare', 'bisogna prenotare', 'devo prenotare', 'si deve prenotare', 'si puo venire senza prenotare', 'posso venire senza prenotazione', 'serve la prenotazione', 'serve la caparra', 'chiedete la caparra', 'serve una caparra', 'quanto tempo tenete il tavolo', 'per quanto tenete il tavolo', 'quanto tenete il tavolo', 'quanto tempo tenete la prenotazione', 'dovete chiedere la carta di credito', 'chiedete la carta a garanzia', 'c e una penale', 'fino a quando posso prenotare', 'con quanto anticipo devo prenotare', 'con quanto anticipo prenotare', 'quanto tempo si puo stare al tavolo', 'fate due turni'],
      keywords: ['caparra', 'acconto', 'penale', 'senza prenotare', 'senza prenotazione', 'tenete il tavolo', 'due turni', 'carta a garanzia'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_personale', nome: 'Personale e gestione', categoria: 'INFORMATION', priorita: 33, safety_level: 'LOW',
      descrizione: 'Chi è lo chef, il titolare, chi lavora nel locale.',
      esempi: ['chi e lo chef', 'come si chiama lo chef', 'chi e il proprietario', 'chi gestisce il locale', 'chi cucina', 'chi e il pizzaiolo', 'chi e il sommelier', 'ci sono camerieri che parlano inglese', 'avete personale che parla inglese', 'chi sono i vostri cuochi'],
      keywords: ['chef', 'pizzaiolo', 'sommelier', 'proprietario', 'cuoco', 'cuochi'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'cancella_prenotazione', nome: 'Disdetta prenotazione', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole disdire una prenotazione esistente.',
      esempi: ['devo disdire', 'vorrei disdire', 'devo disdire la prenotazione', 'devo cancellare la prenotazione', 'vorrei cancellare la prenotazione', 'annullare la prenotazione', 'annullare il tavolo', 'disdire il tavolo', 'non possiamo piu venire', 'non riusciamo a venire', 'non riusciamo piu a venire', 'non veniamo piu', 'purtroppo non riusciamo a venire', 'cancellate la prenotazione', 'cancellare il tavolo', 'annulla la prenotazione', 'disdetta', 'devo annullare', 'non posso piu venire', 'non possiamo venire'],
      keywords: ['disdire', 'disdetta', 'disdico', 'annullare', 'cancellare', 'cancellate', 'annullate', 'cancellazione'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_prenotazione', nome: 'Modifica prenotazione', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Spostare, modificare, aggiungere persone, avvisare di un ritardo su una prenotazione esistente.',
      esempi: ['devo spostare la prenotazione', 'spostare il tavolo', 'posso spostare a domenica', 'posso cambiare giorno', 'cambiare orario', 'cambiare la prenotazione', 'modificare la prenotazione', 'devo modificare la prenotazione', 'spostare l orario', 'cambiare l orario', 'anticipare la prenotazione', 'spostare la prenotazione', 'possiamo anticipare', 'possiamo posticipare', 'possiamo cambiare orario', 'possiamo cambiare giorno', 'anticipare di mezz ora', 'posticipare la prenotazione', 'siamo in piu persone', 'aggiungere una persona', 'aggiungere due persone', 'siamo uno in meno', 'non siamo piu in', 'saremo in piu', 'faremo ritardo', 'arriveremo in ritardo', 'siamo in ritardo', 'arriviamo in ritardo', 'tardiamo', 'possiamo spostare', 'posso anticipare', 'posso posticipare', 'vorrei rimandare', 'vorrei spostare'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'modificare', 'in ritardo', 'ritardo', 'aggiungere'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'conferma_prenotazione', nome: 'Verifica o conferma prenotazione', categoria: 'HUMAN_HANDOFF', priorita: 11, safety_level: 'LOW',
      descrizione: 'Il cliente vuole una conferma o una verifica di una prenotazione già fatta: il bot non può confermare.',
      esempi: ['vorrei confermare la prenotazione', 'mi confermate la prenotazione', 'ho prenotato per sabato e volevo una conferma', 'la mia prenotazione e confermata', 'avete ricevuto la prenotazione', 'ho una prenotazione a nome', 'ho prenotato un tavolo, tutto a posto', 'verificare la prenotazione', 'controllare la prenotazione', 'a che ora era la prenotazione', 'mi ricordate l orario della prenotazione', 'non ho ricevuto la conferma', 'ho prenotato per', 'avevo prenotato'],
      keywords: ['confermare', 'conferma', 'confermate', 'confermata'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per servizio, cibo, conto o accoglienza.',
      esempi: ['vorrei fare un reclamo', 'voglio lamentarmi', 'sono insoddisfatto', 'sono insoddisfatta', 'il servizio e stato pessimo', 'abbiamo aspettato un ora', 'il piatto era freddo', 'il conto era sbagliato', 'mi avete fatto pagare di piu', 'siamo stati trattati male', 'camerieri maleducati', 'non sono contento', 'non siamo rimasti soddisfatti', 'ho trovato un capello nel piatto', 'ho trovato un insetto', 'il cibo era cattivo', 'e stato terribile', 'sono molto deluso', 'siamo molto delusi', 'conto sbagliato', 'mi hanno trattato male'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'trattati male', 'trattato male', 'maleducato', 'maleducati', 'maleducata', 'inaccettabile', 'deluso', 'delusa', 'delusi', 'vergogna', 'pessimo', 'pessima', 'disgustoso', 'cattivo servizio', 'conto sbagliato', 'capello nel piatto'],
      required_entities: [], optional_entities: ['malessere'], actions: ['human_handoff'] },
    { id: 'malessere_post_pasto', nome: 'Malessere dopo il pasto', categoria: 'COMPLAINT', priorita: 3, safety_level: 'HIGH',
      descrizione: 'Il cliente sta male o è stato male dopo aver mangiato (intossicazione, vomito, reazione): avviso immediato al personale.',
      esempi: ['sto male dopo aver mangiato', 'siamo stati male dopo cena', 'siamo stati male dopo aver mangiato da voi', 'ho vomitato dopo aver mangiato', 'dopo aver mangiato da voi sto male', 'credo di avere un intossicazione alimentare', 'ci siamo intossicati', 'mi sono intossicato', 'mi sono intossicata', 'ho mal di pancia dopo la cena', 'mia figlia sta male dopo aver mangiato', 'dopo la cena di ieri sera stiamo male', 'ho avuto una reazione allergica dopo aver mangiato', 'ho avuto una reazione dopo cena'],
      keywords: ['intossicazione', 'intossicato', 'intossicata', 'intossicati', 'avvelenamento', 'dopo aver mangiato', 'dopo che abbiamo mangiato'],
      combinazioni: [
        { entity: 'malessere', con: ['dopo', 'ieri', 'stanotte', 'mangiato', 'cena', 'pranzo', 'da voi', 'ristorante', 'locale', 'piatto', 'ordinato', 'mangiare', 'ha mangiato', 'abbiamo mangiato', 'pizza', 'pesce', 'tavolo'], score: 0.85 },
      ],
      required_entities: [], optional_entities: ['malessere'], actions: ['human_handoff', 'emergency_escalation'] },
    { id: 'emergenza_alimentare', nome: 'Emergenza sanitaria al tavolo', categoria: 'EMERGENCY', priorita: 2, safety_level: 'CRITICAL',
      descrizione: 'Reazione allergica in corso, shock anafilattico, difficoltà respiratoria, soffocamento, svenimento.',
      esempi: ['ha una reazione allergica', 'ho una reazione allergica', 'sta avendo una reazione allergica', 'shock anafilattico', 'non riesce a respirare', 'non riesco a respirare', 'sta soffocando', 'chiamate un ambulanza', 'serve un ambulanza', 'chiamate il 118', 'ha perso i sensi', 'e svenuto', 'e svenuta', 'si sta strozzando', 'mi si chiude la gola', 'ha la lingua gonfia', 'si gonfia la faccia'],
      keywords: ['ambulanza', '118', 'pronto soccorso', 'anafilattico', 'anafilassi', 'soffocando', 'soffoca', 'strozzando'],
      required_entities: [], optional_entities: ['malessere'], actions: ['emergency_escalation', 'notify_owner'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona.',
      esempi: ['voglio parlare con una persona', 'vorrei parlare con qualcuno', 'mi passate qualcuno', 'passatemi il titolare', 'chiamatemi', 'richiamatemi', 'posso parlare con il gestore', 'vorrei parlare con il responsabile', 'mi chiamate', 'vorrei parlare con un operatore', 'preferisco parlare con una persona'],
      keywords: ['operatore', 'persona vera', 'umano'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'hey', 'ei', 'hei', 'ciao ciao', 'salve a tutti', 'buon giorno', 'buona sera', 'buonasera a tutti'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'a presto', 'ci vediamo'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: possibile pericolo per la vita -> escalation immediata, messaggio 118.
    critical: [
      'non riesco a respirare', 'non riesce a respirare', 'non respira', 'fatica a respirare', 'difficolta a respirare', 'difficolta respiratoria', 'difficolta respiratorie',
      'respira male', 'respiro male', 'manca il respiro', 'mi manca il fiato', 'gli manca il fiato', 'le manca il fiato',
      'gola si chiude', 'si chiude la gola', 'mi si chiude la gola', 'gola chiusa', 'gola che si chiude', 'gola che si sta chiudendo', 'si sta chiudendo la gola', 'gli si chiude la gola', 'le si chiude la gola', 'gola che si gonfia', 'si gonfia la gola', 'gola gonfia', 'lingua gonfia', 'labbra gonfie', 'si gonfia la lingua', 'si gonfiano le labbra', 'mi si gonfiano le labbra',
      'sta soffocando', 'si sta soffocando', 'si sta strozzando', 'si e strozzato', 'soffoca',
      'ha una reazione allergica', 'ho una reazione allergica', 'sta avendo una reazione allergica', 'sto avendo una reazione allergica', 'reazione allergica in corso', 'mi sta venendo una reazione allergica', 'sta venendo una reazione allergica', 'reazione allergica grave',
      'sta avendo uno shock anafilattico', 'ha uno shock anafilattico', 'ho uno shock anafilattico', 'e in shock anafilattico', 'sono in shock anafilattico', 'sta andando in shock anafilattico', 'e andato in shock anafilattico', 'e andata in shock anafilattico', 'va in shock anafilattico', 'anafilassi in corso',
      'ha perso i sensi', 'ho perso i sensi', 'perso i sensi', 'e svenuto', 'e svenuta', 'sono svenuto', 'sono svenuta', 'sviene', 'sta svenendo',
      'chiamate il 118', 'chiamate un ambulanza', 'chiamate l ambulanza', 'serve un ambulanza', 'serve il 118', 'chiamate i soccorsi',
    ],
    // HIGH: malessere dopo il pasto, reazioni, corpi estranei -> avviso al personale.
    high: [
      'reazione allergica', 'shock anafilattico', 'anafilassi', 'anafilattico', 'orticaria',
      'intossicazione', 'intossicazione alimentare', 'intossicato', 'intossicata', 'intossicati', 'intossicate', 'avvelenato', 'avvelenata', 'avvelenamento', 'salmonella',
      'ho vomitato', 'abbiamo vomitato', 'ha vomitato', 'vomito', 'vomitato', 'diarrea',
      'sto male', 'stiamo male', 'sta male', 'stanno male', 'siamo stati male', 'sono stato male', 'sono stata male', 'ci siamo sentiti male', 'ci siamo sentite male', 'mi sono sentito male', 'mi sono sentita male', 'mi sento male', 'si e sentita male', 'si e sentito male', 'non mi sento bene', 'e stata male', 'e stato male',
      'mal di pancia', 'mal di stomaco', 'dolori addominali', 'dolore alla pancia', 'dolore allo stomaco', 'crampi',
      'prurito dopo aver mangiato', 'pezzo di vetro', 'pezzetto di vetro', 'scheggia di vetro', 'schegge di vetro', 'vetro nel piatto', 'vetro nel bicchiere', 'pezzo di plastica', 'pezzo di metallo',
      'mi sono rotto un dente', 'mi sono rotta un dente', 'ho ingoiato',
    ],
    // MEDIUM: allergie/intolleranze dichiarate: richiesta sensibile da trattare con cautela.
    medium: [
      'allergia', 'allergie', 'allergico', 'allergica', 'allergici', 'allergiche', 'allergeni', 'allergene', 'intolleranza', 'intolleranze', 'intollerante', 'intolleranti',
      'celiaco', 'celiaca', 'celiaci', 'celiache', 'celiachia', 'senza glutine', 'gluten free', 'glutine', 'lattosio', 'arachidi', 'frutta a guscio', 'crostacei',
      'epipen', 'incinta', 'gravidanza',
      'capello nel piatto', 'insetto', 'conto sbagliato',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con il titolare', 'parlare col titolare', 'parlare con il gestore', 'parlare col gestore', 'parlare con il proprietario', 'parlare con il responsabile', 'parlare con il direttore', 'parlare con lo chef', 'parlare con un umano',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'passatemi il titolare', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'non sei una persona', 'sei un robot', 'sei un bot',
      'operatore', 'persona vera', 'persona reale',
    ],
    max_unknown_turns: 2,
    // Allergeni/celiachia: una sola richiesta di garanzia basta per passare al personale.
    sensitive_insist: 1,
    messaggio_handoff: 'Certo, passo subito la sua richiesta al personale del locale, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a chiedere GARANZIE su allergeni/contaminazione/sicurezza alimentare o consigli sanitari.
    diagnosi_patterns: [
      'senza glutine al 100', 'glutine al 100', '100 senza glutine', 'al 100', 'al cento per cento', 'sicuro al 100', 'sicura al 100',
      'davvero senza glutine', 'veramente senza glutine', 'proprio senza glutine', 'totalmente senza', 'completamente senza', 'assolutamente senza',
      'potete garantire', 'puoi garantire', 'mi garantite', 'mi puoi garantire', 'garantite che', 'garantisce che', 'garantiscono', 'mi assicurate', 'assicuratemi', 'mi assicuri', 'potete assicurare',
      'contaminazione', 'contaminazioni', 'contaminato', 'contaminati', 'cross contaminazione', 'tracce di', 'tracce', 'zero contaminazione', 'nessuna contaminazione',
      'contiene glutine', 'contiene lattosio', 'contiene uova', 'contiene latte', 'contiene arachidi', 'contiene frutta a guscio', 'contiene noci', 'contiene crostacei', 'contiene soia', 'contiene sedano', 'contiene allergeni',
      'ci sono allergeni', 'ci sono tracce', 'c e glutine', 'c e lattosio', 'ci sono arachidi', 'ci sono noci', 'ci sono uova',
      'ingredienti',
      'sicuro per un celiaco', 'sicuro per i celiaci', 'sicuro per celiaci', 'sicuro per un allergico', 'sicuro per gli allergici', 'sicuro per chi e allergico', 'adatto ai celiaci', 'adatto a un celiaco', 'adatto agli allergici',
      'posso mangiare tranquillo', 'posso mangiare tranquilla', 'possiamo mangiare tranquilli', 'posso stare tranquillo', 'posso stare tranquilla', 'mangiare in sicurezza', 'mangiare tranquillo', 'mangiare tranquilla', 'mangiare tranquilli', 'mangiare tranquillamente', 'da voi tranquillo', 'da voi tranquilla', 'da voi in sicurezza', 'che e sicuro', 'non dirlo in cucina', 'non dirlo al personale', 'non dirlo in sala',
      'senza rischi', 'nessun rischio', 'nessun pericolo', 'senza pericolo', 'rischio per un celiaco', 'rischio di contaminazione', 'e pericoloso', 'e rischioso', 'rischioso', 'pericoloso per',
      'forno dedicato', 'friggitrice dedicata', 'friggitrice separata', 'stessa friggitrice', 'stesso forno', 'stesse pentole', 'pentole separate', 'cucina separata', 'superfici separate', 'stessa acqua della pasta',
      'incinta posso', 'incinta e posso', 'gravidanza posso', 'in gravidanza si puo', 'posso mangiare il crudo', 'e adatto in gravidanza', 'va bene in gravidanza', 'e sicuro in gravidanza',
      'diagnosi', 'cosa devo prendere', 'devo prendere un antistaminico', 'antistaminico', 'cortisone',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'senza glutine al 100', 'e al 100 senza glutine', 'senza glutine garantito', 'garantito senza glutine', 'e sicuramente senza glutine', 'e certamente senza glutine', 'zero glutine', 'nessuna traccia di glutine', 'nessuna traccia di allergeni',
      'nessuna contaminazione', 'zero contaminazione', 'non c e contaminazione', 'non ci sono contaminazioni', 'senza alcuna contaminazione',
      'non contiene glutine', 'non contiene lattosio', 'non contiene arachidi', 'non contiene frutta a guscio', 'non contiene uova', 'non contiene allergeni', 'privo di allergeni', 'non ci sono allergeni', 'senza allergeni',
      'e sicuro per i celiaci', 'e sicuro per un celiaco', 'e sicuro per celiaci', 'sicuro per gli allergici', 'e sicuro per un allergico', 'e adatto ai celiaci', 'e adatto a un celiaco', 'adatto agli allergici',
      'puo mangiare tranquillamente', 'puo mangiare tranquillo', 'puo mangiare tranquilla', 'puo stare tranquillo', 'puo stare tranquilla', 'puo mangiare senza problemi', 'senza rischi', 'nessun rischio', 'nessun pericolo', 'non c e nessun rischio',
      'tavolo confermato', 'prenotazione confermata', 'e tutto confermato', 'siete confermati', 'vi abbiamo prenotato', 'ho prenotato per voi', 'abbiamo prenotato per voi', 'tavolo riservato', 'abbiamo riservato il tavolo', 'vi abbiamo riservato', 'ho riservato per voi', 'abbiamo riservato per voi', 'vi teniamo il tavolo', 'vi tengo il tavolo', 'siete prenotati', 'vi abbiamo segnato', 'ho riservato il tavolo', 'abbiamo riservato un tavolo', 'tavolo garantito', 'posto garantito', 'sicuramente c e posto', 'c e sicuramente posto', 'nessun problema per il tavolo',
      'prenda un antistaminico', 'prendi un antistaminico', 'assuma', 'assumere', 'le consiglio di prendere', 'ti consiglio di prendere', 'non e grave', 'non e niente', 'non si preoccupi', 'puo aspettare', 'mg',
    ],
    messaggio_sicurezza: 'Su allergeni, celiachia e intolleranze non posso dare garanzie né escludere contaminazioni: la conferma spetta al personale di sala e cucina. Passo la sua richiesta al personale del locale.',
    messaggio_emergenza: 'Capisco, la situazione è seria. Se c\'è difficoltà a respirare, gonfiore a labbra, lingua o gola, soffocamento o perdita di sensi, chiami subito il 118. Avviso immediatamente il personale del locale.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    numero_persone: ['Per quante persone?', 'In quanti siete?', 'Quanti coperti devo segnare?'],
    giorno: ['Per quale giorno?', 'Che giorno preferite?', 'Mi dice per che giorno?'],
    fascia_oraria: ['Preferite pranzo o cena?', 'A pranzo o a cena?', 'Per pranzo o per cena?'],
    nome_cliente: ['A che nome segno la richiesta?', 'Mi dice il suo nome?', 'Come si chiama?'],
    occasione: ['Per quale occasione?', 'Di che evento si tratta?', 'È per un\'occasione particolare?'],
  },

  common_scenarios: [
    'Prenotazione tavolo (persone, giorno, pranzo/cena, nome) anche in più messaggi',
    'Evento, cena aziendale, sala privata: raccolta dati e lead al titolare',
    'Allergie, celiachia, intolleranze: nessuna garanzia, conferma del personale',
    'Reazione allergica o difficoltà respiratoria: messaggio 118 e avviso immediato',
    'Malessere dopo il pasto o reclamo: passaggio a una persona',
    'Menu, prezzi, orari, giorno di chiusura, pagamenti: solo da dati del tenant',
    'Disdette, spostamenti, ritardi e conferme di prenotazioni: passaggio a una persona',
    'Asporto e consegna: informazioni o ordine passato al personale',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque locale. Nessun
// prezzo, menu, orario, giorno di chiusura, politica o indirizzo: quelli
// stanno solo nei dati del tenant.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_prenotazioni', 'Cosa serve per prenotare un tavolo?', ['cosa serve per prenotare', 'che dati servono per prenotare', 'cosa devo dire per prenotare', 'come si prenota un tavolo'],
    'Per prenotare servono in genere il numero di persone, il giorno, pranzo o cena (o l\'orario) e un nome. È utile indicare subito anche eventuali allergie, seggioloni o altre esigenze particolari.'),
  f('info_prenotazioni', 'Conviene prenotare nel weekend?', ['serve prenotare nel weekend', 'bisogna prenotare il sabato sera', 'conviene prenotare', 'meglio prenotare'],
    'In genere nei fine settimana, nei giorni festivi e per gruppi è consigliabile prenotare con anticipo; le regole di questo locale vanno però verificate con il locale stesso.'),
  f('info_prenotazioni', 'Cosa sono i coperti?', ['cosa significa coperti', 'cosa sono i coperti', 'che vuol dire coperti', 'cosa vuol dire coperto'],
    'I "coperti" sono i posti a sedere, cioè il numero di persone sedute al tavolo; il "coperto" è invece la voce che alcuni locali applicano per ciascun commensale. Se previsto, deve essere indicato nel menu.'),
  f('info_prenotazioni', 'Cosa succede se sono in ritardo?', ['faccio ritardo cosa succede', 'se arrivo in ritardo il tavolo resta', 'quanto ritardo posso fare', 'se facciamo tardi'],
    'In caso di ritardo è importante avvisare il locale il prima possibile: il tempo per cui il tavolo viene tenuto è stabilito dal locale.'),
  f('info_prenotazioni', 'Cos\'è una caparra?', ['cosa e la caparra', 'a cosa serve la caparra', 'perche chiedono la caparra', 'cos e la caparra'],
    'Alcuni locali chiedono una caparra o una garanzia (per esempio per gruppi o in date molto richieste). Se prevista, importo e condizioni sono stabiliti dal locale.'),
  f('info_prenotazioni', 'Si prenota con i bambini piccoli?', ['prenotare con bambini', 'devo contare i bambini nella prenotazione', 'i bambini si contano nei coperti', 'bambini piccoli prenotazione'],
    'Conviene indicare anche i bambini nel numero di persone e dire se serve un seggiolone, così il locale può organizzare il tavolo.'),
  f('info_locale', 'Come richiedo un seggiolone?', ['serve il seggiolone', 'come chiedo il seggiolone', 'si puo avere un seggiolone', 'seggiolone per bambini prenotazione'],
    'Se serve un seggiolone conviene segnalarlo già in fase di prenotazione, così il locale può prepararsi. La disponibilità dipende dal locale.'),
  f('info_locale', 'Posso portare il cane al ristorante?', ['si possono portare i cani al ristorante', 'i cani sono ammessi nei ristoranti', 'posso entrare con il cane', 'animali ammessi'],
    'L\'ammissione degli animali dipende dalle scelte di ogni locale: alcuni li accolgono, altri no, o solo in alcune aree. Conviene segnalarlo in fase di prenotazione.'),
  f('info_locale', 'Come segnalo un\'esigenza di accessibilità?', ['sedia a rotelle al ristorante', 'devo segnalare la sedia a rotelle', 'accessibilita ristorante disabili', 'come prenotare con la sedia a rotelle'],
    'Se qualcuno si muove in sedia a rotelle o con difficoltà motorie conviene segnalarlo in prenotazione: il locale potrà indicare l\'accesso e il tavolo più adatti.'),
  f('info_locale', 'Meglio un tavolo all\'aperto o dentro?', ['tavolo fuori o dentro', 'posso scegliere il tavolo', 'si puo scegliere dove sedersi', 'posso chiedere un tavolo in terrazza'],
    'Si può esprimere una preferenza (interno, esterno, terrazza) in fase di prenotazione, ma l\'assegnazione dipende dalla disponibilità e dal meteo, quindi non è garantita.'),
  f('info_allergie', 'Come comunico allergie o intolleranze?', ['devo dire le allergie', 'come segnalo un allergia', 'ho un allergia cosa devo fare', 'segnalare intolleranze al ristorante'],
    'Allergie e intolleranze vanno comunicate in anticipo e, soprattutto, confermate direttamente con il personale di sala o cucina, che conosce ingredienti e preparazioni. In chat non si può dare conferma dell\'assenza di allergeni.'),
  f('info_allergie', 'Per i celiaci cosa conviene fare?', ['sono celiaco cosa devo fare', 'ristorante per celiaci', 'come mangiare senza glutine al ristorante', 'cosa devo dire se sono celiaco'],
    'Chi è celiaco dovrebbe segnalarlo al momento della prenotazione e chiedere conferma al personale su opzioni e modalità di preparazione. L\'assistente non può assicurare l\'assenza di glutine o di contaminazioni.'),
  f('info_allergie', 'Il locale deve dichiarare gli allergeni?', ['obbligo allergeni ristorante', 'i ristoranti devono indicare gli allergeni', 'lista allergeni obbligatoria', 'devono dirmi gli allergeni'],
    'In Italia e nell\'Unione Europea i locali sono tenuti a poter fornire ai clienti l\'informazione sugli allergeni presenti nei piatti. Per un piatto specifico conviene chiedere al personale.'),
  f('info_menu', 'Cos\'è un menu degustazione?', ['cosa e il menu degustazione', 'come funziona il menu degustazione', 'menu degustazione cosa include', 'cos e un menu degustazione'],
    'Il menu degustazione è un percorso di più portate scelte dalla cucina, spesso in porzioni ridotte. Composizione e condizioni (anche l\'eventuale prenotazione anticipata) le stabilisce il locale.'),
  f('info_menu', 'Che differenza c\'è tra vegetariano e vegano?', ['differenza vegetariano vegano', 'vegetariano o vegano cosa cambia', 'cosa significa vegano', 'cosa vuol dire vegetariano'],
    'In genere vegetariano significa senza carne e pesce, mentre vegano esclude anche tutti i prodotti di origine animale, come uova, latte e formaggi. Per i dettagli sui piatti del locale conviene verificare con il personale.'),
  f('info_menu', 'Il menu cambia?', ['il menu cambia con le stagioni', 'il menu e sempre uguale', 'piatto del giorno cambia', 'i piatti cambiano'],
    'In molti locali menu e piatti del giorno cambiano con le stagioni e la disponibilità degli ingredienti: per quelli attuali fa fede il menu del locale.'),
  f('richiesta_evento', 'Come si organizza una cena di gruppo o un evento?', ['organizzare una cena di gruppo', 'come organizzo una festa al ristorante', 'cosa serve per un evento', 'cena aziendale cosa serve'],
    'Per eventi e gruppi il locale di solito valuta disponibilità, sala e menu dedicato. Servono data, numero di persone, occasione e se possibile un\'idea di budget; poi il locale prepara una proposta.'),
  f('richiesta_evento', 'Posso portare una torta?', ['posso portare la torta', 'si puo portare la torta di compleanno', 'torta da fuori', 'portare dolci da casa'],
    'Alcuni locali accettano torte o dolci portati dai clienti, altri no o con condizioni. Conviene chiederlo al locale quando si organizza la festa.'),
  f('info_asporto_consegna', 'Che differenza c\'è tra asporto e consegna a domicilio?', ['asporto cosa significa', 'differenza asporto consegna', 'take away cosa vuol dire', 'cos e l asporto'],
    'L\'asporto (take away) significa ritirare il cibo di persona al locale; la consegna a domicilio è invece portata a casa dal locale o da una piattaforma. Il servizio disponibile e le condizioni dipendono dal locale.'),
  f('info_pagamenti', 'Si può dividere il conto?', ['conto alla romana', 'si puo fare il conto separato', 'dividere il conto al ristorante', 'conti separati'],
    'La possibilità di dividere il conto o fare conti separati dipende dal locale, conviene segnalarlo in anticipo.'),
  f('info_pagamenti', 'Si accettano i buoni pasto?', ['ticket restaurant accettati', 'buoni pasto ristorante', 'accettano i buoni pasto', 'si possono usare i ticket'],
    'L\'accettazione dei buoni pasto e dei diversi metodi di pagamento varia da locale a locale: va verificata con il locale.'),
  f('info_prezzi', 'Perché c\'è il coperto?', ['cos e il coperto', 'a cosa serve il coperto', 'il coperto e obbligatorio', 'coperto cosa comprende'],
    'Il coperto è una voce che alcuni locali applicano per ogni commensale (servizio di tavola, pane e simili). Se previsto, deve essere indicato nel menu; importo e cosa comprende li stabilisce il locale.'),
  f('info_posizione', 'Come arrivo se non conosco la zona?', ['come trovo il ristorante', 'come si raggiunge il locale', 'come arrivare al ristorante', 'posso farmi mandare la posizione'],
    'Posizione, indicazioni e parcheggio sono quelli indicati dal locale: se non li trovi ti conviene chiederli al locale o guardare la sua scheda online.'),
  f('info_orari', 'Cosa vuol dire orario della cucina?', ['orario della cucina cosa significa', 'a che ora chiude la cucina', 'orario cucina e orario locale', 'la cucina chiude prima del locale'],
    'In molti locali l\'orario in cui la cucina accetta le ordinazioni è diverso dall\'orario di apertura. Gli orari esatti sono quelli indicati dal locale.'),
];
