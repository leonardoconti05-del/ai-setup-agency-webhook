// lib/engine/packs/estetista.js
//
// Sector Pack "estetista" v1 — conoscenza di SETTORE (centro estetico in
// Italia), non di un singolo centro. Prezzi, orari, trattamenti realmente
// offerti, promozioni, personale e indirizzo non stanno qui: arrivano solo
// dai dati del tenant. Il motore non cambia: un nuovo settore è solo dati.
//
// Nota di dominio: l'estetista NON è un medico. Filler, botox, iniezioni e
// simili sono atti medici; controindicazioni (gravidanza, allergie,
// patologie della pelle, farmaci fotosensibilizzanti) si valutano con la
// professionista del centro o con il medico. Il pack non consiglia, non
// diagnostica e non promette risultati.

export const SETTORE = 'estetista';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack per centri estetici — lessico trattamenti (viso, depilazione, laser, unghie, ciglia/sopracciglia, corpo), 20 intent, 10 entità, regole di urgenza LOW-CRITICAL per reazioni cutanee/ustioni/shock allergico, sicurezza su controindicazioni, farmaci, patologie della pelle e trattamenti medici, FAQ generali di settore.';

export const pack = {
  identity: {
    nome_ruolo: 'centro estetico',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un centro estetico. Accogli le clienti con tono cordiale, curato e discreto; gestisci richieste di appuntamento, informazioni sui trattamenti e piccoli problemi dopo un trattamento. Non sei un\'estetista né un medico: non fai diagnosi, non valuti controindicazioni, non consigli farmaci o creme e non prometti risultati.',
  },
  mission: 'Capire quale trattamento interessa alla cliente, raccogliere solo le informazioni necessarie, organizzare l\'appuntamento e far arrivare subito al centro le reazioni o i problemi dopo un trattamento.',
  tone_default: 'cordiale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), tono caldo e semplice, niente tecnicismi inutili.',
    'Per un disagio dopo un trattamento: prima una frase di vicinanza, poi la domanda.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Ogni domanda su gravidanza, allattamento, allergie, patologie della pelle, farmaci o "posso farlo se ho..." si rimanda alla professionista del centro o al medico.',
    'Mai diagnosi di nei, macchie o lesioni; mai indicazioni su farmaci, creme o rimedi; mai promesse sul risultato di un trattamento.',
    'Filler, botox e altri trattamenti con iniezioni sono atti medici: non si consigliano né si confrontano.',
  ],
  prohibited_claims: [
    'dare consigli medici, indicare farmaci, creme, pomate o rimedi per una reazione o un disturbo della pelle',
    'fare diagnosi o dire cosa sia un neo, una macchia, un arrossamento o una lesione',
    'dire che un trattamento non ha controindicazioni o che si può fare in tranquillità in gravidanza, con allergie o con patologie',
    'consigliare o confrontare filler, botox e altri trattamenti medici',
    'garantire risultati, la scomparsa definitiva dei peli o l\'assenza di dolore o di rischi',
    'indicare prezzi, sconti, promozioni, orari, disponibilità o trattamenti non presenti nelle fonti',
  ],
  business_rules: [
    'Annullamenti, spostamenti e ritardi su appuntamenti esistenti vanno passati al centro.',
    'Le reazioni cutanee, ustioni e i sintomi dopo un trattamento hanno priorità sulla raccolta dati normale.',
    'Le domande su controindicazioni e condizioni di salute non ricevono risposta: si rimanda alla professionista del centro o al medico.',
  ],

  entities: [
    { id: 'servizio', descrizione: 'Il trattamento richiesto.', tipo: 'enum', priorita: 10,
      valori: ['pulizia_viso', 'trattamento_viso', 'peeling', 'ceretta', 'epilazione_laser', 'manicure', 'pedicure', 'semipermanente', 'ricostruzione_unghie', 'massaggio', 'trattamento_corpo', 'pressoterapia', 'extension_ciglia', 'laminazione_ciglia', 'sopracciglia', 'microblading', 'abbronzatura', 'altro'],
      domanda_varianti: ['Che trattamento le interessa?', 'Per cosa vorrebbe venire da noi?', 'Mi dica pure quale trattamento desidera.'] },
    { id: 'nome_cliente', descrizione: 'Nome della cliente.', tipo: 'string', priorita: 20,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'] },
    { id: 'sintomo', descrizione: 'Il disturbo o problema che la cliente descrive dopo un trattamento.', tipo: 'string', priorita: 15,
      domanda_varianti: ['Mi racconta che cosa è successo?', 'Che cosa nota esattamente?', 'Può descrivermi brevemente il problema?'] },
    { id: 'zona', descrizione: 'Zona del corpo interessata.', tipo: 'string', priorita: 40 },
    { id: 'condizione', descrizione: 'Condizione di salute menzionata dalla cliente (gravidanza, allergia, patologia della pelle, farmaci): serve solo a passarla alla professionista.', tipo: 'string', priorita: 45 },
    { id: 'occasione', descrizione: 'Occasione speciale (matrimonio, cerimonia, vacanza).', tipo: 'string', priorita: 65 },
    { id: 'giorno', descrizione: 'Giorno preferito.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'prima_volta', descrizione: 'Se è la prima volta della cliente nel centro.', tipo: 'enum', priorita: 50, valori: ['si', 'no'] },
    { id: 'telefono', descrizione: 'Numero di telefono se la cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Servizi (ordine = precedenza: il primo che combacia vince) ----
    { canonical: 'epilazione_laser', entity: 'servizio', value: 'epilazione_laser', synonyms: ['epilazione laser', 'epilazione definitiva', 'laser', 'laser a diodo', 'luce pulsata', 'ipl', 'depilazione laser', 'depilazione definitiva', 'epilazione progressiva', 'peli per sempre', 'laser per i peli', 'laser epilazione'], slang: ['laserino'], errors: ['lazer', 'epilazone laser', 'epilazione lazer'] },
    { canonical: 'ceretta', entity: 'servizio', value: 'ceretta', synonyms: ['ceretta', 'cerette', 'ceretta a caldo', 'ceretta a freddo', 'ceretta orientale', 'depilazione', 'depilarmi', 'depilare', 'depilarsi', 'epilazione', 'epilarmi', 'strappare i peli', 'togliere i peli', 'togliere i peli dalle gambe', 'cera', 'cera depilatoria', 'ceretta brasiliana', 'ceretta inguine', 'ceretta ascelle', 'ceretta gambe', 'waxing'], slang: ['cerettina'], errors: ['ceretta', 'ceretha', 'cerretta', 'cerrata', 'ceretaa'] },
    { canonical: 'pressoterapia', entity: 'servizio', value: 'pressoterapia', synonyms: ['pressoterapia', 'presso terapia', 'linfodrenaggio meccanico', 'stivali drenanti', 'trattamento drenante gambe'], errors: ['pressoterapya', 'pressoterapea', 'pressoterpia'] },
    { canonical: 'peeling', entity: 'servizio', value: 'peeling', synonyms: ['peeling', 'peeling viso', 'peeling chimico', 'peel', 'esfoliazione viso', 'microdermoabrasione', 'dermoabrasione'], errors: ['pilling', 'piling', 'pelling', 'peelin'] },
    { canonical: 'pulizia_viso', entity: 'servizio', value: 'pulizia_viso', synonyms: ['pulizia viso', 'pulizia del viso', 'pulizia al viso', 'pulizia della faccia', 'pulizia faccia', 'pulizia profonda', 'pulizia pelle', 'pulizia della pelle', 'pulizia', 'detersione viso', 'detersione', 'pulire il viso', 'punti neri', 'pulizia purificante', 'pulizia viso profonda'], slang: ['pulitina al viso', 'pulitina'], errors: ['pulizzia', 'pulizzia viso', 'pulisia'] },
    { canonical: 'trattamento_viso', entity: 'servizio', value: 'trattamento_viso', synonyms: ['trattamento viso', 'trattamenti viso', 'trattamento al viso', 'trattamento per il viso', 'trattamento anti age', 'anti age', 'antiage', 'antirughe', 'trattamento idratante', 'idratazione viso', 'viso luminoso', 'trattamento illuminante', 'hydrafacial', 'facial', 'trattamento purificante', 'ossigenante', 'radiofrequenza viso', 'maschera viso', 'trattamento per la pelle del viso'], slang: ['visino'] },
    { canonical: 'semipermanente', entity: 'servizio', value: 'semipermanente', synonyms: ['semipermanente', 'semi permanente', 'smalto semipermanente', 'smalto semi permanente', 'smalto gel', 'gel polish', 'rifacimento semipermanente', 'rimozione semipermanente', 'togliere il semipermanente', 'rifare il semipermanente', 'rifare il semi'], slang: ['semi', 'il semi'], errors: ['semipermanete', 'semipermamente', 'semipermante', 'semi permanete', 'semipermaneente'] },
    { canonical: 'ricostruzione_unghie', entity: 'servizio', value: 'ricostruzione_unghie', synonyms: ['ricostruzione unghie', 'ricostruzione delle unghie', 'ricostruzione', 'ricostruire le unghie', 'unghie in gel', 'unghie gel', 'unghie acriliche', 'unghie acrilico', 'acrilico', 'unghie finte', 'unghie con le tips', 'tips', 'nail art', 'nails', 'refill unghie', 'refill gel', 'copertura gel', 'allungamento unghie', 'unghie allungate', 'rimozione gel', 'rimozione ricostruzione'], slang: ['gel', 'unghie lunghe'], errors: ['ricostruzzione', 'ricostruzone', 'ricostruzion', 'riscostruzione'] },
    { canonical: 'manicure', entity: 'servizio', value: 'manicure', synonyms: ['manicure', 'manicure semplice', 'manicure completa', 'manicure classica', 'manicure russa', 'unghie delle mani', 'cura delle mani', 'cura delle unghie', 'smalto', 'smalto normale', 'smalto classico', 'sistemare le unghie', 'sistemare le mani', 'fare le unghie', 'farmi le unghie', 'rifarmi le unghie', 'rifare le unghie', 'unghie', 'manicura', 'manicur', 'manicure spa'], slang: ['manino', 'smaltino', 'unghiette'], errors: ['manicura', 'manichure', 'manikure', 'maniqure', 'manicure'] },
    { canonical: 'pedicure', entity: 'servizio', value: 'pedicure', synonyms: ['pedicure', 'pedicure estetico', 'pedicure completo', 'pedicure curativo', 'pedicura', 'pedi', 'cura dei piedi', 'unghie dei piedi', 'smalto piedi', 'smalto ai piedi', 'smalto semipermanente piedi', 'trattamento piedi', 'pedicure spa'], slang: ['pedicurino'], errors: ['pedicur', 'pedichure', 'pedicurre', 'pediqure'] },
    { canonical: 'laminazione_ciglia', entity: 'servizio', value: 'laminazione_ciglia', synonyms: ['laminazione ciglia', 'laminazione delle ciglia', 'laminazione ciglia e sopracciglia', 'lash lift', 'lash lifting', 'lifting ciglia', 'ciglia laminate', 'permanente ciglia', 'rialzo ciglia', 'curvatura ciglia', 'tinta ciglia'], errors: ['laminazone ciglia', 'laminazzione ciglia', 'laminazione cilia'] },
    { canonical: 'extension_ciglia', entity: 'servizio', value: 'extension_ciglia', synonyms: ['extension ciglia', 'extension delle ciglia', 'extension', 'extention', 'ciglia finte', 'ciglia volume', 'volume russo', 'pelo a pelo', 'infoltimento ciglia', 'allungamento ciglia', 'ciglia lunghe', 'refill ciglia', 'refill delle ciglia', 'ritocco ciglia', 'rimozione extension', 'lash', 'lash extension', 'applicazione ciglia', 'mettere le ciglia'], slang: ['ciglione', 'ciglia 3d'], errors: ['extesion', 'extenzion', 'extension', 'estension', 'extention ciglia', 'refil ciglia', 'refil'] },
    { canonical: 'microblading', entity: 'servizio', value: 'microblading', synonyms: ['microblading', 'micro blading', 'microshading', 'dermopigmentazione', 'trucco permanente', 'trucco semipermanente', 'tatuaggio sopracciglia', 'sopracciglia pelo a pelo', 'pmu'], errors: ['microbleading', 'microblanding', 'microblading', 'micro bleading'] },
    { canonical: 'sopracciglia', entity: 'servizio', value: 'sopracciglia', synonyms: ['sopracciglia', 'sopracciglio', 'laminazione sopracciglia', 'laminazione delle sopracciglia', 'brow lamination', 'brow lift', 'design sopracciglia', 'forma sopracciglia', 'forma alle sopracciglia', 'sistemare le sopracciglia', 'sistemazione sopracciglia', 'ritocco sopracciglia', 'tinta sopracciglia', 'henne sopracciglia', 'henna sopracciglia', 'epilazione col filo', 'epilazione con il filo', 'filo sopracciglia', 'threading', 'sopraciglia', 'soprracciglia'], errors: ['sopraciglia', 'sopracilia', 'soprancigla', 'sopracciglie', 'soppracciglia'] },
    { canonical: 'massaggio', entity: 'servizio', value: 'massaggio', synonyms: ['massaggio', 'massaggi', 'massaggio rilassante', 'massaggio decontratturante', 'massaggio schiena', 'massaggio alla schiena', 'massaggio con oli', 'massaggio hot stone', 'massaggio ayurvedico', 'massaggio di coppia', 'massaggio drenante', 'massaggio linfodrenante', 'massaggio cervicale', 'massaggio ai piedi', 'riflessologia', 'riflessologia plantare', 'rilassarmi', 'una coccola'], slang: ['massaggetto', 'massaggino'], errors: ['masaggio', 'massagio', 'massagggio', 'massagio rilassante', 'masagio'] },
    { canonical: 'trattamento_corpo', entity: 'servizio', value: 'trattamento_corpo', synonyms: ['trattamento corpo', 'trattamenti corpo', 'trattamento al corpo', 'trattamento per il corpo', 'trattamento anticellulite', 'anticellulite', 'cellulite', 'trattamento snellente', 'snellente', 'rassodante', 'trattamento rassodante', 'linfodrenaggio', 'drenaggio', 'cavitazione', 'radiofrequenza corpo', 'radiofrequenza', 'fanghi', 'bendaggi', 'scrub corpo', 'body wrap', 'bagno turco', 'sauna', 'scrub'], errors: ['cavitazzione', 'celulite', 'anticelulite', 'linfodrenagio'] },
    { canonical: 'abbronzatura', entity: 'servizio', value: 'abbronzatura', synonyms: ['abbronzatura', 'abbronzarmi', 'abbronzatura spray', 'spray tan', 'lampada', 'lampade', 'lampada abbronzante', 'solarium', 'lettino solare', 'doccia solare', 'abbronzatura istantanea', 'autoabbronzante', 'abbronzare'], slang: ['lampadina'], errors: ['abronzatura', 'abbronzatora', 'abronzarmi', 'solario'] },

    // ---- Zone del corpo ----
    { canonical: 'zona_viso', entity: 'zona', value: 'viso', synonyms: ['viso', 'faccia', 'volto'] },
    { canonical: 'zona_gambe', entity: 'zona', value: 'gambe', synonyms: ['gambe', 'gamba', 'gambe intere', 'mezza gamba', 'mezze gambe', 'cosce', 'polpacci'] },
    { canonical: 'zona_inguine', entity: 'zona', value: 'inguine', synonyms: ['inguine', 'inguinale', 'brasiliana', 'bikini', 'zona bikini', 'zona intima', 'slip'] },
    { canonical: 'zona_ascelle', entity: 'zona', value: 'ascelle', synonyms: ['ascelle', 'ascella'] },
    { canonical: 'zona_braccia', entity: 'zona', value: 'braccia', synonyms: ['braccia', 'avambracci', 'avambraccio'] },
    { canonical: 'zona_baffetti', entity: 'zona', value: 'baffetti', synonyms: ['baffetti', 'baffo', 'labbro superiore', 'sopra le labbra'] },
    { canonical: 'zona_schiena', entity: 'zona', value: 'schiena', synonyms: ['schiena', 'dorso', 'cervicale', 'lombare'] },
    { canonical: 'zona_petto', entity: 'zona', value: 'petto', synonyms: ['petto', 'torace'] },
    { canonical: 'zona_addome', entity: 'zona', value: 'addome', synonyms: ['pancia', 'addome', 'ventre'] },
    { canonical: 'zona_glutei', entity: 'zona', value: 'glutei', synonyms: ['glutei', 'sedere'] },
    { canonical: 'zona_mani', entity: 'zona', value: 'mani', synonyms: ['mani', 'mano'] },
    { canonical: 'zona_piedi', entity: 'zona', value: 'piedi', synonyms: ['piedi', 'piede'] },
    { canonical: 'zona_corpo_intero', entity: 'zona', value: 'corpo_intero', synonyms: ['corpo intero', 'tutto il corpo', 'full body', 'total body'] },

    // ---- Prima volta ----
    { canonical: 'cliente_nuova', entity: 'prima_volta', value: 'si', synonyms: ['sono nuova', 'sono nuovo', 'prima volta che vengo', 'prima volta da voi', 'non sono mai venuta', 'non sono mai venuto', 'non sono mai stata da voi', 'non vi conosco', 'e la prima volta', 'e la mia prima volta', 'prima volta in un centro estetico', 'non l ho mai fatto', 'non l ho mai fatta', 'non ho mai fatto', 'non ho mai provato', 'sono una nuova cliente'] },
    { canonical: 'cliente_abituale', entity: 'prima_volta', value: 'no', synonyms: ['sono gia cliente', 'sono gia venuta', 'sono gia venuto', 'sono gia stata da voi', 'sono una vostra cliente', 'sono vostra cliente', 'sono cliente da anni', 'vengo da voi da', 'ci conosciamo gia', 'sono gia stata'] },

    // ---- Occasioni ----
    { canonical: 'occasione_sposa', entity: 'occasione', value: 'matrimonio', synonyms: ['matrimonio', 'nozze', 'sposa', 'sposarmi', 'mi sposo', 'damigella', 'testimone di nozze'] },
    { canonical: 'occasione_cerimonia', entity: 'occasione', value: 'cerimonia', synonyms: ['cerimonia', 'comunione', 'cresima', 'battesimo', 'laurea', 'diciottesimo', 'festa'] },
    { canonical: 'occasione_vacanza', entity: 'occasione', value: 'vacanza', synonyms: ['vacanza', 'vacanze', 'ferie', 'viaggio', 'mare', 'luna di miele', 'partenza'] },

    // ---- Sintomi dopo un trattamento ----
    { canonical: 'reazione_allergica', entity: 'sintomo', value: 'reazione_allergica', negabile: true, synonyms: ['reazione allergica', 'reazione cutanea', 'reazione alla pelle', 'sono allergica a', 'orticaria', 'allergia dopo', 'mi sono venuti i pomfi', 'pomfi'], intent: 'reazione_urgente' },
    { canonical: 'ustione', entity: 'sintomo', value: 'ustione', negabile: true, synonyms: ['ustione', 'ustioni', 'ustionata', 'ustionato', 'mi sono ustionata', 'mi hanno ustionata', 'scottata', 'mi sono scottata', 'scottatura', 'mi ha scottata', 'pelle bruciata', 'mi sono bruciata', 'mi ha bruciata', 'bruciatura', 'bruciature', 'cera troppo calda', 'cera bollente'], intent: 'reazione_urgente' },
    { canonical: 'bolle', entity: 'sintomo', value: 'bolle', negabile: true, synonyms: ['bolle', 'bolla', 'vesciche', 'vescica', 'pelle che si spella', 'pelle che si scrosta', 'croste', 'crosticine', 'pelle che si sfalda'], intent: 'reazione_urgente' },
    { canonical: 'infezione', entity: 'sintomo', value: 'infezione', negabile: true, synonyms: ['infezione', 'infetta', 'infetto', 'infiammata', 'infiammato', 'infiammazione', 'pus', 'pustole', 'follicolite', 'ascesso'], intent: 'reazione_urgente' },
    { canonical: 'occhi_irritati', entity: 'sintomo', value: 'occhi_irritati', negabile: true, synonyms: ['occhio gonfio', 'occhi gonfi', 'palpebra gonfia', 'palpebre gonfie', 'occhio rosso', 'occhi rossi', 'bruciore agli occhi', 'mi brucia l occhio', 'mi bruciano gli occhi', 'mi lacrimano gli occhi', 'colla negli occhi', 'palpebre rosse', 'occhi che bruciano', 'occhi che lacrimano'], intent: 'reazione_urgente' },
    { canonical: 'arrossamento', entity: 'sintomo', value: 'arrossamento', negabile: true, synonyms: ['arrossamento', 'arrossata', 'arrossato', 'arrossamenti', 'rossore', 'pelle rossa', 'rossa', 'rosso', 'macchie rosse', 'chiazze rosse', 'puntini rossi', 'brufoletti', 'brufoli'], intent: 'problema_post_trattamento' },
    { canonical: 'irritazione', entity: 'sintomo', value: 'irritazione', negabile: true, synonyms: ['irritazione', 'irritata', 'irritato', 'pelle irritata', 'sensibile', 'pelle sensibile', 'pelle che tira', 'pelle secca'], intent: 'problema_post_trattamento' },
    { canonical: 'prurito', entity: 'sintomo', value: 'prurito', negabile: true, synonyms: ['prurito', 'pruriginosa', 'pruriginoso', 'mi prude', 'mi pizzica', 'pizzicore', 'mi prudono'], intent: 'problema_post_trattamento' },
    { canonical: 'bruciore', entity: 'sintomo', value: 'bruciore', negabile: true, synonyms: ['bruciore', 'brucia', 'mi brucia', 'bruciano', 'mi bruciano', 'pelle che brucia', 'pelle in fiamme'], intent: 'problema_post_trattamento' },
    { canonical: 'dolore', entity: 'sintomo', value: 'dolore', negabile: true, synonyms: ['mi fa male', 'mi fanno male', 'dolorante', 'dolore', 'dolori', 'mi duole', 'fastidio forte'], intent: 'problema_post_trattamento' },
    { canonical: 'gonfiore', entity: 'sintomo', value: 'gonfiore', negabile: true, synonyms: ['gonfiore', 'gonfia', 'gonfio', 'gonfie', 'mi si e gonfiata', 'mi si e gonfiato', 'mi si sono gonfiate'], intent: 'problema_post_trattamento' },
    { canonical: 'peli_incarniti', entity: 'sintomo', value: 'peli_incarniti', negabile: true, synonyms: ['peli incarniti', 'pelo incarnito', 'incarniti', 'incarnito', 'peli che rientrano', 'peli sottopelle'], intent: 'problema_post_trattamento' },
    { canonical: 'livido', entity: 'sintomo', value: 'livido', negabile: true, synonyms: ['livido', 'lividi', 'ematoma', 'macchie viola', 'macchia viola'], intent: 'problema_post_trattamento' },
    { canonical: 'sanguinamento', entity: 'sintomo', value: 'sanguinamento', negabile: true, synonyms: ['sanguina', 'sanguinamento', 'sanguinano', 'perde sangue', 'esce sangue', 'goccioline di sangue', 'puntini di sangue'], intent: 'problema_post_trattamento' },
    { canonical: 'unghia_sollevata', entity: 'sintomo', value: 'unghia_sollevata', synonyms: ['smalto sollevato', 'semipermanente sollevato', 'semipermanente staccato', 'si e sollevato lo smalto', 'si e sollevata l unghia', 'mi si e staccato il semipermanente', 'mi si e staccata la ricostruzione', 'mi si e staccata l unghia', 'unghia rotta', 'unghia staccata', 'unghia spezzata', 'si e rotta un unghia', 'mi si e rotta un unghia', 'si e scheggiato lo smalto', 'smalto scheggiato', 'mi e saltato il semipermanente', 'mi e saltata la ricostruzione', 'mi e saltata un unghia', 'ricostruzione saltata', 'unghia saltata', 'gel sollevato', 'ricostruzione sollevata', 'ricostruzione rotta', 'si e staccata un unghia', 'staccata una unghia', 'staccata un unghia', 'rotta una unghia', 'rotta un unghia', 'unghia sollevata', 'si sta staccando', 'si sta sollevando', 'si sta scheggiando', 'si sta rovinando lo smalto', 'si stacca', 'si staccano', 'sta venendo via', 'si e sollevato il gel', 'si e rotto il gel'], intent: 'problema_post_trattamento' },
    { canonical: 'ciglia_cadute', entity: 'sintomo', value: 'ciglia_cadute', synonyms: ['ciglia cadute', 'mi sono cadute le ciglia', 'mi stanno cadendo le ciglia', 'cadono le ciglia', 'ciglia che cadono', 'extension cadute', 'extension che cadono', 'mi sono cadute le extension', 'ciglia staccate', 'ciglia sparpagliate', 'ciglia storte', 'ciglia attaccate', 'ciglia incollate'], intent: 'problema_post_trattamento' },

    // ---- Condizioni di salute menzionate (solo per passarle alla professionista) ----
    { canonical: 'gravidanza', entity: 'condizione', value: 'gravidanza', synonyms: ['incinta', 'gravidanza', 'in gravidanza', 'in dolce attesa', 'aspetto un bambino', 'aspetto un bimbo', 'mesi di gravidanza', 'sono gravida'] },
    { canonical: 'allattamento', entity: 'condizione', value: 'allattamento', synonyms: ['allatto', 'allattamento', 'sto allattando', 'allatto mio figlio', 'allatto la bimba'] },
    { canonical: 'allergia', entity: 'condizione', value: 'allergia', synonyms: ['sono allergica', 'sono allergico', 'ho un allergia', 'ho allergie', 'soffro di allergie', 'allergia al', 'allergia alla', 'allergia ai', 'allergica al', 'allergica alla', 'allergica ai', 'allergico al', 'allergia al nichel', 'allergie'] },
    { canonical: 'patologia_pelle', entity: 'condizione', value: 'patologia_pelle', synonyms: ['dermatite', 'psoriasi', 'eczema', 'acne', 'acne attiva', 'rosacea', 'couperose', 'herpes', 'vitiligine', 'cheloidi', 'cheloide', 'micosi', 'verruca', 'verruche', 'fungo', 'fungo alle unghie', 'pelle atopica', 'dermatologo', 'capillari rotti'] },
    { canonical: 'farmaci', entity: 'condizione', value: 'farmaci', synonyms: ['isotretinoina', 'roaccutan', 'roaccutane', 'antibiotico', 'antibiotici', 'cortisone', 'cortisonici', 'anticoagulanti', 'fotosensibilizzante', 'fotosensibilizzanti', 'prendo farmaci', 'prendo dei farmaci', 'prendo medicine', 'assumo farmaci', 'sono in cura', 'sono in terapia', 'faccio una terapia', 'terapia ormonale', 'chemioterapia', 'chemio', 'radioterapia', 'creme con retinolo', 'retinolo', 'acido retinoico'] },
    { canonical: 'altra_patologia', entity: 'condizione', value: 'altra_patologia', synonyms: ['diabete', 'diabetica', 'varici', 'vene varicose', 'flebite', 'trombosi', 'pacemaker', 'epilessia', 'pressione alta', 'ipertensione', 'tumore', 'melanoma', 'cancro', 'sono stata operata', 'sono stato operato', 'intervento recente', 'operazione recente', 'ho un neo', 'un neo', 'dei nei', 'macchia scura', 'macchie scure', 'macchia sospetta', 'neo sospetto'] },

    // ---- Concetti di conversazione (collegano all'intent, nessuna entità) ----
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto vengono', 'quanto devo pagare', 'tariffa', 'tariffe', 'listino', 'quanto si paga', 'quanto prendete', 'quanto chiedete', 'a quanto'], intent: 'info_prezzi' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'fino a che ora', 'a che ora aprite', 'a che ora chiudete', 'pausa pranzo', 'orario continuato'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'parcheggio', 'parcheggiare', 'posizione', 'in che zona siete'], intent: 'info_posizione' },
    { canonical: 'pagamento', synonyms: ['pagamento', 'pagamenti', 'rate', 'rateale', 'rateizzazione', 'finanziamento', 'bancomat', 'carta di credito', 'carte', 'contanti', 'fattura', 'satispay', 'paypal', 'pos', 'caparra', 'acconto', 'pagare', 'scontrino'], intent: 'info_pagamenti' },
    { canonical: 'buono_regalo', synonyms: ['buono regalo', 'buoni regalo', 'gift card', 'giftcard', 'carta regalo', 'voucher', 'cofanetto', 'cofanetti', 'regalare un trattamento', 'idea regalo', 'regalo per', 'da regalare', 'in regalo'], intent: 'info_buoni_regalo' },
    { canonical: 'promozione', synonyms: ['promozione', 'promozioni', 'promo', 'sconto', 'sconti', 'offerta', 'offerte', 'saldi', 'carta fedelta', 'tessera fedelta', 'punti fedelta', 'scontistica', 'sconto studenti', 'prezzo scontato'], intent: 'info_promozioni' },
    { canonical: 'preventivo', synonyms: ['preventivo', 'preventivi', 'stima dei costi', 'stima del costo', 'stima di spesa', 'quanto verrebbe in tutto', 'quanto mi costerebbe in tutto'], intent: 'richiesta_preventivo' },
    { canonical: 'pacchetto', synonyms: ['pacchetto', 'pacchetti', 'abbonamento', 'abbonamenti', 'ciclo di sedute', 'ciclo', 'percorso', 'percorso completo', 'tessera', 'carnet', 'pacchetto di sedute', 'pacchetto sedute', 'combo', 'sedute a pacchetto'], intent: 'richiesta_preventivo' },
    { canonical: 'appuntamento', synonyms: ['appuntamento', 'prenotare', 'prenotazione', 'prenotarmi', 'fissare', 'disponibilita', 'posto libero', 'slot', 'buco'], intent: 'prenota_trattamento' },
  ],

  intents: [
    { id: 'prenota_trattamento', nome: 'Prenotazione trattamento', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'La cliente vuole fissare un appuntamento per un trattamento o chiede disponibilità.',
      esempi: ['vorrei prenotare', 'vorrei un appuntamento', 'vorrei prendere un appuntamento', 'vorrei fissare un appuntamento', 'vorrei fissare', 'avete posto domani', 'avete un posto oggi', 'avete posto', 'avete disponibilita', 'avete disponibilita questa settimana', 'posso venire venerdi', 'posso prenotare', 'posso prenotarmi', 'mi prenotate', 'mi potete prenotare', 'prenotazione', 'cerco un appuntamento', 'avete un buco', 'posso passare domani', 'vorrei venire da voi', 'quando siete libere', 'quando siete libere per', 'quando avete posto', 'quando potete', 'ho bisogno di un appuntamento', 'mi serve un appuntamento', 'mi fissate un appuntamento', 'prenota', 'prenotarmi', 'segnatemi', 'mi segnate', 'mi mettete in agenda', 'riuscite a farmi'],
      keywords: ['prenotare', 'prenotazione', 'prenotarmi', 'appuntamento', 'disponibilita', 'fissare', 'agenda'],
      combinazioni: [
        { entity: 'servizio', con: ['vorrei', 'mi serve', 'mi servirebbe', 'avrei bisogno', 'ho bisogno', 'devo fare', 'devo rifare', 'devo fissare', 'vorrei fare', 'vorrei rifare', 'voglio fare', 'voglio rifare', 'mi occorre', 'cerco', 'posso venire', 'posso passare', 'vorrei venire', 'volevo fare', 'volevo rifare', 'volevo', 'mi piacerebbe', 'mi piacerebbe fare', 'dovrei fare', 'dovrei rifare', 'mi fate', 'mi fai', 'mi farebbe', 'quando potete', 'quando riuscite', 'vorrei provare', 'voglio provare', 'vorrei un', 'vorrei una', 'mi farei', 'farei', 'dovrei', 'rifare', 'devo fare il', 'devo fare la', 'mi servirebbe un', 'mi servirebbe una', 'mi serve un', 'mi serve una', 'avrei bisogno di un', 'avrei bisogno di una', 'mi sono decisa', 'ho deciso di fare', 'prima del matrimonio', 'prima della vacanza'], con_entities: ['giorno', 'fascia_oraria'], non_con_concepts: ['preventivo', 'prezzo', 'pacchetto'], score: 0.8 },
        { entity: 'prima_volta', con: ['vorrei un trattamento', 'vorrei venire', 'mi serve un trattamento', 'vorrei provare', 'vorrei un appuntamento'], score: 0.8 },
        { entity: 'zona', con: ['devo fare', 'vorrei fare', 'vorrei fare le', 'vorrei fare il', 'devo fare le', 'devo fare il', 'devo rifare', 'volevo fare', 'vorrei sistemare', 'devo sistemare', 'mi serve', 'mi servirebbe'], non_con_concepts: ['preventivo', 'prezzo', 'pacchetto'], score: 0.75 },
      ],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['zona', 'giorno', 'fascia_oraria', 'prima_volta', 'occasione', 'condizione'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'richiesta_preventivo', nome: 'Preventivo o pacchetto di sedute', categoria: 'LEAD', priorita: 25, safety_level: 'LOW',
      descrizione: 'La cliente chiede un preventivo, un pacchetto o un percorso di più sedute.',
      esempi: ['vorrei un preventivo', 'mi fate un preventivo', 'mi serve un preventivo', 'preventivo per', 'vorrei sapere il costo di tutto il percorso', 'vorrei un pacchetto', 'avete dei pacchetti', 'fate pacchetti', 'fate dei pacchetti', 'pacchetto di sedute', 'pacchetto sedute', 'ciclo di sedute', 'avete abbonamenti', 'fate abbonamenti', 'fate un abbonamento', 'vorrei un abbonamento', 'quanto mi costerebbe in tutto', 'una stima dei costi', 'quanto verrebbe il percorso completo', 'quante sedute e quanto costa in tutto', 'pacchetti per', 'pacchetto per', 'percorso completo', 'pacchetto completo'],
      keywords: ['preventivo', 'preventivi', 'pacchetto', 'pacchetti', 'abbonamento', 'abbonamenti', 'ciclo di sedute', 'percorso completo', 'carnet'],
      required_entities: ['servizio', 'nome_cliente'], optional_entities: ['zona', 'occasione', 'condizione'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'problema_post_trattamento', nome: 'Disturbo dopo un trattamento', categoria: 'SUPPORT', priorita: 15, safety_level: 'MEDIUM', campi_tenant: true,
      descrizione: 'La cliente segnala un fastidio o un problema dopo un trattamento (pelle arrossata, prurito, unghia sollevata, ciglia cadute...). Non è necessariamente urgente.',
      esempi: ['dopo la ceretta ho la pelle rossa', 'mi si e sollevato lo smalto', 'mi si e staccato il semipermanente', 'mi sono cadute le ciglia', 'ho la pelle irritata', 'ho dei peli incarniti', 'mi brucia la pelle', 'ho un arrossamento', 'ho dei puntini rossi', 'mi si e staccata la ricostruzione', 'ho un problema dopo il trattamento', 'dopo il trattamento ho un problema', 'dopo l ultima seduta', 'dopo il trattamento mi', 'ho un problema con le extension', 'ho un problema con l unghia', 'e rimasto un segno', 'mi e rimasto un segno', 'ho dei lividi dopo', 'mi prude dopo', 'prurito dopo'],
      keywords: ['dopo il trattamento', 'dopo la seduta', 'dopo il massaggio', 'dopo la pulizia'],
      combinazioni: [
        { entity: 'sintomo', con: ['dopo il', 'dopo la', 'dopo lo', 'dopo l', 'dopo le', 'dopo i', 'dopo un', 'dopo una', 'dopo che', 'da quando ho fatto', 'da quando ho fatto la'], score: 0.75 },
      ],
      required_entities: ['sintomo', 'nome_cliente'], optional_entities: ['servizio', 'zona', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'notify_owner', 'create_lead'] },
    { id: 'reazione_urgente', nome: 'Reazione o urgenza dopo un trattamento', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Reazione cutanea importante, ustione, bolle, gonfiore, difficoltà respiratorie: serve contatto rapido con il centro (e, se grave, il 118).',
      esempi: ['ho una reazione allergica', 'mi sono ustionata', 'mi sono venute le bolle', 'ho la faccia gonfia', 'mi si e gonfiato il viso', 'non riesco a respirare', 'ho un ustione', 'e urgente', 'ho un emergenza', 'devo essere vista subito', 'ho una reazione dopo il trattamento', 'ho una reazione al trattamento', 'mi bruciano gli occhi dopo le extension', 'mi sono scottata con la cera', 'ho le vesciche'],
      keywords: ['urgente', 'urgenza', 'emergenza', 'subito'],
      required_entities: ['nome_cliente'], optional_entities: ['sintomo', 'servizio', 'zona'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'info_prezzi', nome: 'Informazioni prezzi', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La cliente chiede quanto costa un trattamento.',
      esempi: ['quanto costa', 'quanto costano', 'che prezzo avete', 'quanto viene', 'quanto vengono', 'quanto devo pagare', 'mi dici il costo', 'avete un listino', 'quali sono i prezzi', 'quali sono le tariffe', 'prezzi', 'prezzo', 'costo', 'quanto prendete', 'quanto si paga', 'a quanto'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'tariffe', 'listino', 'quanto costa', 'quanto costano'],
      required_entities: [], optional_entities: ['servizio', 'zona'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_promozioni', nome: 'Promozioni e sconti', categoria: 'INFORMATION', priorita: 29, safety_level: 'LOW',
      descrizione: 'La cliente chiede di promozioni, sconti, carte fedeltà.',
      esempi: ['avete promozioni', 'avete delle promozioni', 'fate sconti', 'fate degli sconti', 'ci sono offerte', 'avete offerte', 'c e qualche offerta', 'avete la carta fedelta', 'c e uno sconto', 'sconto per', 'ci sono saldi', 'avete promo', 'fate promo', 'sconti per studenti', 'sconto studenti'],
      keywords: ['promozione', 'promozioni', 'sconto', 'sconti', 'offerta', 'offerte', 'promo', 'saldi', 'carta fedelta', 'tessera fedelta'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Informazioni orari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La cliente chiede gli orari di apertura del centro.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperte il sabato', 'siete aperti oggi', 'siete aperte oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'fino a che ora siete aperte', 'orari di apertura', 'siete aperti a pranzo', 'siete aperte a pranzo', 'siete aperti domenica', 'siete aperte domenica', 'siete aperti la sera', 'siete aperte la sera', 'fate orario continuato', 'siete aperti ad agosto', 'siete aperte ad agosto', 'avete la pausa pranzo', 'siete aperti', 'siete aperte'],
      keywords: ['orari', 'orario', 'aperti', 'aperte', 'chiusi', 'chiuse', 'apertura', 'chiusura'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_posizione', nome: 'Informazioni posizione', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'La cliente chiede dove si trova il centro o come raggiungerlo.',
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova il centro', 'c e parcheggio', 'come arrivo da voi', 'indirizzo del centro', 'dov e il centro', 'dove posso parcheggiare', 'c e un posto dove parcheggiare', 'in che zona siete', 'mi mandate la posizione', 'mi mandi la posizione', 'mi date l indirizzo', 'mi dai l indirizzo', 'dove vi trovate', 'in che via siete'],
      keywords: ['indirizzo', 'parcheggio', 'dove siete', 'dove parcheggiare', 'dov e il centro', 'posizione', 'dove vi trovate'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Informazioni servizi', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'La cliente chiede quali trattamenti vengono offerti o se si fa un certo trattamento.',
      esempi: ['che trattamenti fate', 'di cosa vi occupate', 'quali trattamenti avete', 'quali servizi offrite', 'fate la ceretta', 'fate il laser', 'fate le extension', 'fate la laminazione', 'fate il semipermanente', 'fate la ricostruzione', 'fate la ricostruzione unghie', 'fate massaggi', 'fate la pressoterapia', 'fate il microblading', 'fate anche', 'fate pure', 'fate la pedicure', 'fate la manicure', 'fate la pulizia viso', 'fate i trattamenti viso', 'fate trattamenti', 'fate trattamenti per', 'fate la lampada', 'fate il peeling', 'trattate anche gli uomini', 'fate anche per uomo', 'avete la lampada', 'avete la pressoterapia', 'avete il laser', 'avete la cavitazione', 'fate il trattamento'],
      keywords: ['trattamenti', 'servizi', 'vi occupate', 'fate anche'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_pagamenti', nome: 'Modalità di pagamento', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Modalità di pagamento, acconti, rate.',
      esempi: ['accettate carte', 'accettate la carta', 'si puo pagare a rate', 'fate rateizzazione', 'accettate il bancomat', 'avete il pos', 'accettate satispay', 'accettate paypal', 'fate fattura', 'si paga con la carta', 'si puo pagare con satispay', 'solo contanti', 'bancomat o contanti', 'serve una caparra', 'serve un acconto', 'devo lasciare una caparra', 'devo pagare in anticipo', 'come si paga', 'come posso pagare', 'si paga subito'],
      keywords: ['rate', 'rateale', 'finanziamento', 'bancomat', 'satispay', 'paypal', 'contanti', 'caparra', 'acconto', 'pagamento', 'pagamenti', 'pos'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_buoni_regalo', nome: 'Buoni regalo', categoria: 'INFORMATION', priorita: 28, safety_level: 'LOW',
      descrizione: 'La cliente chiede di buoni regalo, gift card o cofanetti.',
      esempi: ['avete i buoni regalo', 'fate buoni regalo', 'fate le gift card', 'avete le gift card', 'vorrei fare un regalo', 'vorrei regalare un trattamento', 'idea regalo', 'avete un buono regalo', 'come funziona il buono regalo', 'voglio regalare', 'avete dei cofanetti', 'vorrei un buono regalo', 'un buono per', 'vorrei regalare un buono', 'regalo per mia madre', 'regalo per la mia amica', 'regalo di compleanno', 'regalo di natale'],
      keywords: ['buono regalo', 'buoni regalo', 'gift card', 'giftcard', 'cofanetto', 'cofanetti', 'voucher', 'regalare', 'idea regalo'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_preparazione', nome: 'Come prepararsi al trattamento', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Cosa fare o portare prima del trattamento, e indicazioni generali per dopo.',
      esempi: ['come mi devo preparare', 'come mi preparo', 'cosa devo fare prima', 'cosa devo portare', 'devo portare qualcosa', 'devo depilarmi prima', 'devo radermi prima', 'devo radermi', 'posso radermi prima', 'quanto devono essere lunghi i peli', 'quanto lunghi i peli', 'devo venire struccata', 'posso venire truccata', 'devo togliere lo smalto', 'devo togliere il semipermanente prima', 'posso venire con la pelle abbronzata', 'cosa devo evitare prima', 'cosa evitare prima', 'cosa devo evitare dopo', 'cosa non devo fare dopo', 'cosa devo fare dopo il trattamento', 'dopo la ceretta posso', 'dopo il laser posso', 'dopo il massaggio posso', 'dopo la pulizia viso posso', 'dopo quanto posso', 'dopo quanto tempo posso', 'dopo il trattamento posso', 'posso fare la doccia dopo', 'posso truccarmi dopo', 'posso andare al mare dopo', 'posso prendere il sole dopo', 'cosa serve per il trattamento', 'serve qualcosa', 'devo venire a stomaco vuoto', 'posso mangiare prima'],
      keywords: ['come mi preparo', 'come mi devo preparare', 'cosa devo portare', 'devo radermi', 'devo depilarmi', 'devo venire struccata', 'lunghezza dei peli', 'quanto devono essere lunghi'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_trattamenti', nome: 'Come funziona un trattamento', categoria: 'INFORMATION', priorita: 32, safety_level: 'MEDIUM',
      descrizione: 'Domande generali su come funziona un trattamento, durata, fastidio, numero di sedute.',
      esempi: ['come funziona', 'come funziona la ceretta', 'come funziona il laser', 'come funziona la pressoterapia', 'come funziona il trattamento', 'quanto dura la seduta', 'quanto dura il trattamento', 'quanto dura la ceretta', 'quanto dura il laser', 'quanto dura la ricostruzione', 'quanto dura il semipermanente', 'quanto dura l effetto', 'quanto dura un massaggio', 'quanto tempo ci vuole', 'quanto tempo ci vuole per', 'quante sedute servono', 'quante sedute ci vogliono', 'quante sedute servono per', 'ogni quanto si fa', 'ogni quanto va fatto', 'ogni quanto va fatta', 'ogni quanto bisogna fare', 'ogni quanto devo fare', 'ogni quanto si rifa', 'ogni quanto va rifatto', 'fa male', 'fa male la ceretta', 'fa male il laser', 'e dolorosa', 'e doloroso', 'si sente dolore', 'fa tanto male', 'in cosa consiste', 'cos e la', 'cos e il', 'cos e l', 'cosa e la', 'che differenza c e', 'qual e la differenza', 'differenza tra', 'meglio la ceretta o il laser', 'meglio il laser o la ceretta', 'ci sono controindicazioni', 'ci sono effetti collaterali', 'i peli ricrescono', 'i peli ricrescono dopo', 'i peli tornano', 'si puo fare in estate', 'si puo fare d estate', 'i risultati sono definitivi', 'il risultato e definitivo', 'danneggia le unghie', 'rovina le unghie', 'rovina le ciglia', 'danneggia le ciglia', 'e sicuro'],
      keywords: ['come funziona', 'quanto dura', 'consiste', 'quante sedute', 'ogni quanto', 'controindicazioni', 'effetti collaterali', 'cos e', 'differenza tra', 'quanto tempo ci vuole', 'ricrescono', 'rovina le unghie', 'rovina le ciglia'],
      required_entities: [], optional_entities: ['servizio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_personale', nome: 'Informazioni sul personale', categoria: 'INFORMATION', priorita: 33, safety_level: 'LOW',
      descrizione: 'Chi sono le estetiste del centro, se si può scegliere la professionista, se ci sono operatrici donne/uomini.',
      esempi: ['chi sono le estetiste', 'chi mi fa il trattamento', 'chi fa i trattamenti', 'ci sono estetiste donne', 'c e un estetista uomo', 'posso scegliere l estetista', 'posso chiedere di una persona precisa', 'quante estetiste siete', 'siete solo donne', 'chi e la titolare', 'avete un estetista', 'avete un estetista uomo', 'posso scegliere chi mi fa il trattamento', 'c e un operatore uomo', 'c e un operatrice donna'],
      keywords: ['estetiste', 'estetista', 'operatrici'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'cancella_appuntamento', nome: 'Annullamento appuntamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'La cliente vuole disdire un appuntamento.',
      esempi: ['devo disdire', 'vorrei disdire', 'vorrei cancellare l appuntamento', 'non posso venire', 'non posso piu venire', 'annullare l appuntamento', 'devo annullare', 'disdire l appuntamento', 'non riesco a venire', 'cancella il mio appuntamento', 'cancellate il mio appuntamento', 'disdite l appuntamento', 'annullate l appuntamento', 'non riesco piu a venire', 'devo disdire il trattamento', 'cancellare la prenotazione', 'annullare la prenotazione', 'disdico'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'disdico', 'annullate', 'cancellate', 'disdite'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_appuntamento', nome: 'Spostamento appuntamento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'La cliente vuole spostare un appuntamento già preso o avvisa di un ritardo.',
      esempi: ['devo spostare l appuntamento', 'posso cambiare giorno', 'vorrei rimandare', 'posso anticipare l appuntamento', 'posso spostare a un altro giorno', 'devo cambiare orario', 'posticipare l appuntamento', 'posso spostare', 'posso spostarlo', 'posso spostarla', 'possiamo spostare', 'spostare a lunedi', 'spostare a domani', 'sposto l appuntamento', 'cambiare l appuntamento', 'cambiare data', 'cambiare l orario', 'sono in ritardo', 'faccio tardi', 'arrivo in ritardo', 'faccio un po di ritardo', 'ritardo di qualche minuto', 'arrivo con qualche minuto di ritardo', 'tardo di qualche minuto', 'ritardo'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'ritardo', 'in ritardo', 'faccio tardi'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per il servizio o un trattamento ricevuto.',
      esempi: ['sono insoddisfatta', 'sono insoddisfatto', 'vorrei fare un reclamo', 'voglio lamentarmi', 'il trattamento non e andato bene', 'sono molto arrabbiata', 'ho avuto un brutto servizio', 'non sono contenta del risultato', 'non sono contenta del lavoro', 'sono stata trattata male', 'sono deluso dal servizio', 'sono delusa dal servizio', 'ho speso soldi per niente', 'voglio un rimborso', 'vorrei un rimborso', 'pretendo un rimborso', 'e venuto male', 'e venuta male', 'il risultato non e quello che volevo', 'non e come me l aspettavo', 'non e quello che mi aspettavo'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'rimborso', 'schifo'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'La cliente chiede di parlare con una persona del centro.',
      esempi: ['voglio parlare con una persona', 'mi passate qualcuno', 'vorrei parlare con l estetista', 'chiamatemi', 'richiamatemi', 'posso parlare con la titolare', 'posso parlare con una di voi', 'preferisco parlare con qualcuno', 'mi richiamate'],
      keywords: ['operatore', 'operatrice'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'ciao ciao', 'hey', 'buondi', 'buona sera', 'buon giorno'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'La cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'ok a presto', 'a presto', 'grazie a presto', 'grazie ancora', 'ti ringrazio', 'vi ringrazio', 'ok perfetto', 'perfetto', 'ok ci sentiamo', 'ok tutto chiaro'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: possibile pericolo per la vita (shock allergico, angioedema,
    // difficoltà respiratoria) -> escalation immediata, risposta predefinita.
    critical: [
      'non riesco a respirare', 'non respiro', 'non respiro bene', 'difficolta a respirare', 'difficolta respiratorie', 'fatica a respirare', 'respiro male', 'respiro con difficolta', 'mi manca il respiro', 'mi manca il fiato', 'senza fiato', 'affanno',
      'gola gonfia', 'gola chiusa', 'gola che si chiude', 'gonfiore alla gola', 'non riesco a deglutire', 'non riesco a inghiottire', 'difficolta a deglutire', 'lingua gonfia', 'gonfiore alla lingua',
      'viso gonfio', 'faccia gonfia', 'volto gonfio', 'faccia tutta gonfia', 'viso tutto gonfio', 'faccia molto gonfia', 'viso molto gonfio', 'gonfiata la faccia', 'gonfiato il viso', 'gonfiato il volto', 'gonfiata molto la faccia', 'gonfiata tanto la faccia', 'gonfiata tantissimo la faccia', 'gonfiato molto il viso', 'gonfiato tanto il viso', 'gonfiato tantissimo il viso', 'gonfiore al viso', 'gonfiore alla faccia', 'gonfiore al volto', 'mi si e gonfiato il viso', 'mi si e gonfiata la faccia', 'mi si sta gonfiando il viso', 'mi si sta gonfiando la faccia', 'il viso si sta gonfiando', 'la faccia si sta gonfiando',
      'labbra gonfie', 'labbra tutte gonfie', 'gonfiate le labbra', 'gonfiato il labbro', 'labbro gonfio', 'gonfiore alle labbra', 'mi si sono gonfiate le labbra', 'mi si e gonfiato il labbro',
      'shock anafilattico', 'anafilassi', 'shock allergico', 'ho perso i sensi', 'sono svenuta', 'sono svenuto', 'svenimento', 'sto per svenire', 'sto svenendo', 'oppressione al petto', 'dolore al petto', 'convulsioni',
    ],
    // HIGH: reazione cutanea importante, ustione, infezione, occhi irritati dopo extension/colla.
    high: [
      'reazione allergica', 'reazione cutanea', 'reazione alla pelle', 'ho una reazione', 'orticaria', 'pomfi',
      'ustione', 'ustioni', 'ustionata', 'ustionato', 'mi sono ustionata', 'mi hanno ustionata', 'scottata', 'mi sono scottata', 'scottatura', 'mi ha scottata', 'pelle bruciata', 'mi sono bruciata', 'mi ha bruciata', 'bruciatura', 'bruciature', 'cera troppo calda', 'cera bollente',
      'bolle', 'vesciche', 'vescica', 'pelle che si scrosta', 'pelle che si sfalda', 'ferita aperta', 'sanguina molto', 'sanguinamento abbondante', 'non smette di sanguinare',
      'infezione', 'infetta', 'infetto', 'pus', 'pustole', 'febbre',
      'occhio gonfio', 'occhi gonfi', 'palpebra gonfia', 'palpebre gonfie', 'occhio rosso', 'occhi rossi', 'bruciore agli occhi', 'mi brucia l occhio', 'mi bruciano gli occhi', 'mi lacrimano gli occhi', 'colla negli occhi', 'non riesco ad aprire gli occhi',
      'prurito fortissimo', 'prurito forte', 'prurito insopportabile', 'brucia tantissimo', 'bruciore forte', 'bruciore insopportabile', 'pelle in fiamme', 'dolore forte', 'dolore fortissimo', 'dolore insopportabile', 'non resisto al dolore', 'non ce la faccio piu',
      'e urgente', 'urgentissimo', 'emergenza', 'devo essere vista subito', 'devo essere visto subito',
    ],
    // MEDIUM: disturbo che merita priorità ma non urgenza clinica.
    medium: [
      'arrossamento', 'arrossata', 'arrossato', 'rossore', 'pelle rossa', 'macchie rosse', 'chiazze rosse', 'puntini rossi', 'irritazione', 'irritata', 'irritato', 'pelle irritata',
      'prurito', 'mi prude', 'mi pizzica', 'bruciore', 'brucia', 'mi brucia', 'bruciano', 'mi bruciano', 'mi fa male', 'mi fanno male', 'dolorante',
      'gonfiore', 'gonfia', 'gonfio', 'gonfie', 'sanguina', 'sanguinano', 'sanguinamento', 'livido', 'lividi', 'peli incarniti', 'incarniti', 'incarnito', 'brufoletti', 'follicolite',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con un operatrice', 'parlare con qualcuno', 'parlare con l estetista', 'parlare con la titolare', 'parlare con la responsabile', 'parlare con una di voi', 'parlare con un umano', 'parlare con la direttrice',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'non sei una persona', 'sei un robot', 'sei un bot', 'sei una macchina',
      'operatore', 'operatrice', 'persona vera', 'persona reale', 'persona in carne e ossa',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona del centro, che la ricontatterà il prima possibile.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste della cliente che equivalgono a chiedere controindicazioni,
    // diagnosi, farmaci/creme o trattamenti medici. Anche la semplice
    // menzione di gravidanza, allergie, patologie della pelle o farmaci è
    // trattata come richiesta di valutazione: la risposta è sempre "lo valuta
    // la professionista del centro o il medico".
    diagnosi_patterns: [
      // "posso fare X se ho Y" e controindicazioni personali
      'posso fare la ceretta se', 'posso fare il laser se', 'posso fare il trattamento se', 'posso farlo se', 'posso farla se', 'posso farlo anche se', 'posso farla anche se', 'posso farlo con', 'posso farla con', 'si puo fare in gravidanza', 'si puo fare con', 'si puo fare anche se', 'e sconsigliato', 'e sconsigliata', 'sconsigliato in', 'controindicato', 'controindicata', 'controindicazioni per me', 'ho controindicazioni', 'e sicuro per me', 'e sicura per me', 'sono a rischio', 'ci sono rischi per me',
      // gravidanza / allattamento
      'sono incinta', 'incinta', 'gravidanza', 'in dolce attesa', 'mese di gravidanza', 'mesi di gravidanza', 'sono gravida', 'sto allattando', 'allatto', 'allattamento',
      // allergie
      'sono allergica', 'sono allergico', 'ho un allergia', 'ho allergie', 'soffro di allergie', 'allergia al', 'allergia alla', 'allergia ai', 'allergica al', 'allergica alla', 'allergica ai', 'allergico al', 'allergia', 'allergie',
      // patologie della pelle e condizioni di salute
      'dermatite', 'psoriasi', 'eczema', 'acne', 'rosacea', 'couperose', 'herpes', 'vitiligine', 'cheloide', 'cheloidi', 'micosi', 'verruca', 'verruche', 'fungo', 'pelle atopica', 'capillari rotti', 'follicolite', 'dermatologo',
      'diabete', 'diabetica', 'varici', 'vene varicose', 'flebite', 'trombosi', 'pacemaker', 'epilessia', 'pressione alta', 'ipertensione', 'tumore', 'melanoma', 'cancro', 'chemioterapia', 'chemio', 'radioterapia', 'sono stata operata', 'sono stato operato', 'intervento recente', 'operazione recente',
      // farmaci e fotosensibilizzanti
      'isotretinoina', 'roaccutan', 'roaccutane', 'fotosensibilizzante', 'fotosensibilizzanti', 'prendo farmaci', 'prendo dei farmaci', 'prendo medicine', 'assumo farmaci', 'sono in cura', 'sono in terapia', 'faccio una terapia', 'terapia ormonale', 'anticoagulanti', 'cortisone', 'cortisonici', 'retinolo', 'acido retinoico', 'antibiotico', 'antibiotici', 'antistaminico', 'antistaminici', 'antidolorifico', 'ibuprofene', 'paracetamolo', 'tachipirina', 'aspirina',
      // nei, macchie, lesioni: nessuna diagnosi
      'ho un neo', 'un neo', 'dei nei', 'macchia scura', 'macchie scure', 'macchia sospetta', 'neo sospetto', 'e un neo', 'e un herpes', 'e un infezione', 'e un allergia', 'e un fungo', 'e una micosi', 'e una dermatite', 'cos e questa macchia', 'che cos e questa macchia', 'che cos e questo', 'cosa potrebbe essere', 'cosa puo essere', 'che cosa ho', 'che cos ho', 'cosa ho', 'dimmi cosa ho', 'dimmi almeno cosa ho', 'diagnosi',
      // creme, rimedi, consigli medici
      'che crema', 'quale crema', 'che pomata', 'quale pomata', 'cosa posso metterci', 'cosa ci metto', 'cosa posso mettere', 'cosa posso applicare', 'cosa applico', 'cosa posso usare', 'cosa posso prendere', 'cosa devo prendere', 'che farmaco', 'che medicina', 'quale medicina', 'devo andare dal medico', 'devo andare al pronto soccorso', 'devo preoccuparmi', 'mi devo preoccupare', 'mi preoccupo', 'e grave', 'e pericoloso', 'e pericolosa', 'e normale che', 'e normale se', 'passa da sola', 'passera da sola', 'e preoccupante', 'cosa mi consigli di fare', 'cosa mi consiglia', 'cosa mi consigliate', 'cosa grave', 'cosa seria', 'e serio',
      // trattamenti medici: non si consigliano
      'filler', 'botox', 'botulino', 'acido ialuronico', 'punturine', 'iniezioni', 'mesoterapia', 'biorivitalizzazione', 'prp', 'fili tensori', 'lipolisi', 'chirurgia estetica', 'ritocchino alle labbra', 'riempire le labbra', 'labbra piu grandi',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    vietato: [
      'e sicuramente un allergia', 'si tratta di un allergia', 'e sicuramente una dermatite', 'si tratta di una dermatite', 'e sicuramente un infezione', 'e sicuramente un herpes', 'e una reazione allergica', 'ha una reazione allergica', 'hai una reazione allergica',
      'non ci sono controindicazioni', 'non ha controindicazioni', 'nessuna controindicazione', 'puo farlo tranquillamente', 'puoi farlo tranquillamente', 'puo farla tranquillamente', 'puoi farla tranquillamente', 'si puo fare tranquillamente', 'si puo fare in gravidanza', 'in gravidanza si puo', 'e sicuro in gravidanza', 'e sicura in gravidanza',
      'e solo un neo', 'e un neo', 'non e un neo', 'non e pericoloso', 'non e pericolosa', 'non e grave', 'non e nulla', 'non e niente', 'non si preoccupi', 'non ti preoccupare', 'non preoccuparti', 'puo aspettare', 'puoi aspettare', 'passa da sola', 'passera da sola', 'passera da se',
      'metta una crema', 'metti una crema', 'applichi una crema', 'applica una crema', 'metta della pomata', 'applichi una pomata', 'prenda un antistaminico', 'prendi un antistaminico', 'crema al cortisone', 'prenda un antibiotico', 'prendi un antibiotico', 'prenda ibuprofene', 'prenda un antidolorifico', 'le consiglio di prendere', 'ti consiglio di prendere', 'assuma', 'assumere', 'mg', 'milligrammi',
      'filler e', 'botox e', 'le consiglio il filler', 'le consiglio il botox', 'ti consiglio il botox', 'ti consiglio il filler',
      'peli non ricrescono', 'non ricrescono piu', 'non ricrescera piu', 'scompaiono per sempre', 'sparisce per sempre', 'spariranno per sempre', 'definitivo al cento per cento', 'risultato certo', 'risultato sicuro', 'risultato garantito', 'senza dolore', 'non fa male', 'non senti niente', 'non sentirai niente', 'non c e nessun rischio', 'nessun rischio',
    ],
    messaggio_sicurezza: 'Non posso dare valutazioni su controindicazioni, condizioni della pelle, farmaci o trattamenti medici: per questo serve il parere della professionista del centro o del suo medico. Se vuole, la aiuto a fissare un appuntamento o a farla richiamare.',
    messaggio_emergenza: 'Capisco, la situazione sembra seria. Se ha difficoltà a respirare, il viso o la gola gonfi, o si sente svenire, chiami subito il 118 o si rechi al pronto soccorso. Avviso immediatamente il centro.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    servizio: ['Che trattamento le interessa?', 'Per cosa vorrebbe venire da noi?', 'Mi dica pure quale trattamento desidera.'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta?', 'A che nome registro la richiesta?'],
    sintomo: ['Mi racconta che cosa è successo?', 'Che cosa nota esattamente?', 'Può descrivermi brevemente il problema?'],
  },

  common_scenarios: [
    'Prenotazione di un trattamento con servizio noto (ceretta, pulizia viso, semipermanente, ciglia)',
    'Preventivo o pacchetto di sedute (laser, pressoterapia, ceretta)',
    'Disturbo dopo un trattamento con raccolta dati e priorità',
    'Reazione cutanea, ustione o gonfiore: passaggio rapido al centro, 118 se grave',
    'Domande su prezzi, orari, buoni regalo, pagamenti: solo da dati del tenant',
    'Gravidanza, allergie, farmaci, patologie della pelle, "posso farlo se ho...": risposta di sicurezza e rimando alla professionista',
    'Disdette, spostamenti, ritardi, reclami: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque centro estetico.
// Nessun prezzo, orario, nome, indirizzo, promozione o servizio specifico di un
// centro: quelli stanno solo nei dati del tenant. Nessun consiglio medico e
// nessuna promessa di risultato.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_preparazione', 'Come mi preparo alla ceretta?', ['come mi devo preparare per la ceretta', 'cosa devo fare prima della ceretta', 'devo depilarmi prima della ceretta', 'quanto devono essere lunghi i peli per la ceretta', 'i peli devono essere lunghi per la ceretta'],
    'Per la ceretta i peli devono avere una certa lunghezza per essere rimossi bene: l\'estetista le indica quella giusta. Di solito si evita di radersi nel periodo prima; per qualunque dubbio chieda al centro.'),
  f('info_trattamenti', 'La ceretta fa male?', ['fa male la ceretta', 'la ceretta e dolorosa', 'si sente dolore con la ceretta', 'la ceretta da fastidio'],
    'La ceretta può dare un po\' di fastidio, che cambia molto da persona a persona e dalla zona trattata. L\'estetista procede con calma e può darle indicazioni per renderla più sopportabile.'),
  f('info_trattamenti', 'Ogni quanto si fa la ceretta?', ['ogni quanto va fatta la ceretta', 'ogni quanto devo fare la ceretta', 'ogni quanto si rifa la ceretta', 'ogni quanto tempo si fa la ceretta'],
    'La ricrescita è diversa da persona a persona e da zona a zona: l\'estetista può indicarle il ritmo più adatto a lei.'),
  f('info_trattamenti', 'Come funziona l\'epilazione laser?', ['come funziona il laser', 'come funziona il laser per i peli', 'in cosa consiste l epilazione laser', 'come funziona la luce pulsata', 'cos e l epilazione laser'],
    'L\'epilazione laser, o a luce pulsata, utilizza un\'energia luminosa che agisce sul pelo per ridurne la ricrescita. Servono più sedute e una valutazione iniziale, e i risultati variano da persona a persona: non si possono garantire.'),
  f('info_trattamenti', 'Quante sedute servono per il laser?', ['quante sedute di laser servono', 'quante sedute servono per l epilazione laser', 'quante sedute ci vogliono per il laser', 'quante sedute servono per eliminare i peli'],
    'Il numero di sedute dipende dalla zona, dal tipo di pelo e dalla pelle di ciascuna persona. Dopo la valutazione iniziale la professionista del centro può darle un\'indicazione per il suo caso.'),
  f('info_trattamenti', 'Il laser toglie i peli per sempre?', ['i peli ricrescono dopo il laser', 'il laser e definitivo', 'l epilazione laser e definitiva', 'dopo il laser i peli non tornano piu', 'i risultati del laser sono definitivi'],
    'Il laser riduce progressivamente la ricrescita, ma i risultati cambiano da persona a persona e nessun centro può garantire l\'eliminazione totale. Per il suo caso è meglio parlarne con la professionista in fase di valutazione.'),
  f('info_trattamenti', 'Meglio ceretta o laser?', ['meglio la ceretta o il laser', 'meglio il laser o la ceretta', 'differenza tra ceretta e laser', 'che differenza c e tra ceretta e laser', 'ceretta o laser quale scegliere'],
    'Sono due metodi diversi: la ceretta rimuove il pelo temporaneamente, il laser punta a ridurne la ricrescita nel tempo con più sedute. La scelta dipende dalle sue esigenze e dalla sua pelle: l\'estetista può orientarla in una consulenza.'),
  f('info_trattamenti', 'Cos\'è la pressoterapia?', ['cosa e la pressoterapia', 'come funziona la pressoterapia', 'in cosa consiste la pressoterapia', 'a cosa serve la pressoterapia', 'che cos e la pressoterapia'],
    'La pressoterapia è un trattamento di benessere che con apparecchiature a compressione sulle gambe o altre zone dà una sensazione di leggerezza e di drenaggio. È un trattamento estetico: non sostituisce visite o terapie mediche.'),
  f('info_trattamenti', 'Come funziona la pulizia del viso?', ['in cosa consiste la pulizia viso', 'cosa si fa nella pulizia del viso', 'come funziona la pulizia viso', 'cos e la pulizia del viso', 'come si svolge la pulizia del viso'],
    'La pulizia del viso comprende in genere detersione, vapore o preparazione della pelle, rimozione delle impurità e una maschera o crema finale. Le fasi esatte dipendono dal centro e dal tipo di pelle.'),
  f('info_trattamenti', 'Ogni quanto si fa la pulizia del viso?', ['ogni quanto va fatta la pulizia viso', 'ogni quanto devo fare la pulizia del viso', 'ogni quanto tempo si fa la pulizia del viso', 'ogni quanto si fa la pulizia viso'],
    'Dipende dal tipo di pelle e dalle abitudini: l\'estetista può consigliarle una frequenza adatta dopo averla vista in cabina.'),
  f('info_trattamenti', 'Cos\'è il semipermanente?', ['cosa e il semipermanente', 'come funziona il semipermanente', 'in cosa consiste il semipermanente', 'cos e lo smalto semipermanente', 'che differenza c e tra smalto e semipermanente'],
    'Il semipermanente è uno smalto che si asciuga con una lampada e tiene più a lungo di uno smalto normale; si rimuove poi con un procedimento specifico in centro. La durata varia da persona a persona.'),
  f('info_trattamenti', 'Il semipermanente rovina le unghie?', ['il semipermanente danneggia le unghie', 'il semipermanente fa male alle unghie', 'rovina le unghie il semipermanente', 'il semipermanente e dannoso', 'il gel rovina le unghie'],
    'Se applicato e rimosso correttamente da una professionista, il semipermanente è in genere ben tollerato; è importante non strappare lo smalto da soli. Per unghie fragili o problemi particolari è meglio chiedere all\'estetista.'),
  f('info_trattamenti', 'Differenza tra ricostruzione unghie e semipermanente', ['che differenza c e tra ricostruzione e semipermanente', 'differenza tra gel e semipermanente', 'ricostruzione o semipermanente', 'cos e la ricostruzione unghie', 'come funziona la ricostruzione unghie'],
    'Il semipermanente è uno smalto resistente; la ricostruzione, in gel o acrilico, aggiunge o rinforza la struttura dell\'unghia. L\'estetista può indicarle quale soluzione è più adatta alle sue unghie.'),
  f('info_trattamenti', 'Ogni quanto si fa il refill delle ciglia?', ['ogni quanto va fatto il refill delle ciglia', 'ogni quanto si ritoccano le extension', 'ogni quanto si rifanno le extension ciglia', 'ogni quanto bisogna fare il refill', 'ogni quanto tempo il ritocco delle extension'],
    'Le extension seguono il ciclo naturale delle ciglia, quindi servono ritocchi periodici: la frequenza dipende da ciascuna persona e la indica l\'estetista.'),
  f('info_trattamenti', 'Come funzionano le extension ciglia?', ['cosa sono le extension ciglia', 'in cosa consistono le extension ciglia', 'come si applicano le extension', 'come funziona l applicazione delle ciglia', 'extension ciglia cosa sono'],
    'Le extension ciglia sono ciglia sintetiche applicate una per una su quelle naturali, con tecniche diverse (per esempio pelo a pelo o volume). L\'applicazione richiede tempo e occhi chiusi per tutta la seduta; ne parli con l\'estetista per scegliere effetto e stile.'),
  f('info_trattamenti', 'Cos\'è la laminazione delle ciglia?', ['cosa e la laminazione ciglia', 'come funziona la laminazione ciglia', 'in cosa consiste la laminazione delle ciglia', 'cos e il lash lift', 'laminazione ciglia cosa e'],
    'La laminazione è un trattamento che dà alle ciglia naturali una curvatura e un aspetto più definito, senza aggiungere ciglia finte. Effetto e durata variano da persona a persona.'),
  f('info_trattamenti', 'Cos\'è il microblading?', ['cosa e il microblading', 'come funziona il microblading', 'in cosa consiste il microblading', 'cos e la dermopigmentazione', 'cos e il trucco semipermanente'],
    'Il microblading è un trattamento di dermopigmentazione che disegna le sopracciglia depositando pigmento nella pelle, con una tecnica manuale. È un trattamento che richiede una valutazione preliminare con la professionista; durata e risultato variano da persona a persona.'),
  f('info_trattamenti', 'Quanto dura un massaggio?', ['quanto dura il massaggio', 'quanto dura un massaggio rilassante', 'quanto tempo dura un massaggio', 'quanto tempo ci vuole per un massaggio'],
    'La durata dipende dal tipo di massaggio e dalla zona trattata: i dettagli esatti li trova nel listino del centro o può chiederli al team.'),
  f('info_trattamenti', 'Il massaggio estetico è un trattamento medico?', ['il massaggio e terapeutico', 'il massaggio cura i dolori', 'il massaggio decontratturante cura', 'il massaggio estetico e terapeutico', 'il massaggio fa passare il mal di schiena'],
    'I massaggi proposti da un centro estetico sono trattamenti di benessere e non hanno finalità terapeutiche: per dolori o problemi di salute è meglio rivolgersi al medico o a un fisioterapista.'),
  f('info_trattamenti', 'Cos\'è il peeling viso?', ['cosa e il peeling', 'come funziona il peeling', 'in cosa consiste il peeling viso', 'che cos e il peeling', 'cos e il peeling chimico'],
    'Il peeling è un trattamento che favorisce l\'esfoliazione dello strato superficiale della pelle del viso. In un centro estetico si usano prodotti adatti all\'uso estetico: la professionista valuta la pelle prima di procedere.'),
  f('info_trattamenti', 'Cos\'è un trattamento anticellulite?', ['come funziona il trattamento anticellulite', 'cosa e il trattamento anticellulite', 'il trattamento anticellulite funziona', 'come funziona la cavitazione', 'cos e la cavitazione'],
    'I trattamenti anticellulite o per il corpo sono pensati per il benessere e l\'aspetto della pelle, spesso combinando apparecchiature e massaggi. I risultati variano da persona a persona e non si possono garantire.'),
  f('info_trattamenti', 'Come funziona l\'abbronzatura spray?', ['cos e l abbronzatura spray', 'come funziona lo spray tan', 'abbronzatura spray come funziona', 'come funziona l abbronzatura istantanea'],
    'L\'abbronzatura spray colora temporaneamente la pelle senza esporla ai raggi UV. Il centro le dà le indicazioni su come prepararsi e come mantenere il colore.'),
  f('info_trattamenti', 'Quanto dura il semipermanente?', ['quanto dura lo smalto semipermanente', 'quanto tiene il semipermanente', 'quanto resiste il semipermanente', 'quanto dura il gel sulle unghie'],
    'La tenuta dipende dalle unghie e dall\'uso quotidiano delle mani: varia da persona a persona e l\'estetista può darle un\'indicazione.'),
  f('info_trattamenti', 'Posso fare un trattamento estetico se ho una condizione di salute?', ['ci sono controindicazioni ai trattamenti estetici', 'ci sono controindicazioni', 'chi non puo fare i trattamenti', 'quali sono le controindicazioni', 'ci sono effetti collaterali'],
    'Alcuni trattamenti possono non essere adatti in presenza di particolari condizioni, e questo lo valuta caso per caso la professionista del centro, con l\'eventuale parere del medico. Prima del trattamento le verrà chiesto di segnalare eventuali condizioni o farmaci.'),
  f('info_preparazione', 'Cosa devo fare prima del laser?', ['come mi preparo al laser', 'come mi devo preparare per il laser', 'devo radermi prima del laser', 'devo depilarmi prima del laser', 'cosa devo fare prima dell epilazione laser'],
    'Il centro le darà indicazioni precise prima della prima seduta, per esempio sulla preparazione della zona e sull\'esposizione al sole. Segua quelle del centro e, in caso di dubbi, chieda alla professionista.'),
  f('info_preparazione', 'Cosa devo portare per un trattamento?', ['cosa devo portare al trattamento', 'devo portare qualcosa', 'cosa serve portare in centro', 'devo portare l asciugamano', 'cosa devo portare per il massaggio'],
    'Di solito non serve portare nulla di particolare; se il trattamento richiede qualcosa, il centro glielo comunica in fase di prenotazione.'),
  f('info_preparazione', 'Cosa devo fare dopo un trattamento?', ['cosa devo fare dopo il trattamento', 'cosa non devo fare dopo il trattamento', 'indicazioni dopo il trattamento', 'cosa evitare dopo il trattamento', 'consigli dopo il trattamento'],
    'Dopo ogni trattamento il centro dà indicazioni specifiche per il suo caso: le segua con attenzione. Per qualunque disturbo nei giorni successivi contatti direttamente il centro.'),
  f('info_buoni_regalo', 'Come funziona un buono regalo?', ['come funziona la gift card', 'come si usa un buono regalo', 'un buono regalo ha una scadenza', 'come regalare un trattamento', 'come si regala un trattamento'],
    'I buoni regalo, dove disponibili, permettono di regalare un trattamento o un importo da usare in centro. Importi, validità e modalità dipendono dal singolo centro: le conferma il team.'),
  f('info_trattamenti', 'Gli uomini possono fare i trattamenti estetici?', ['trattate anche gli uomini', 'i trattamenti sono anche per uomo', 'un uomo puo fare la ceretta', 'ci sono trattamenti per uomo', 'anche gli uomini vengono in un centro estetico'],
    'I trattamenti estetici sono pensati sia per donne sia per uomini; quali trattamenti siano disponibili dipende dal centro, che le conferma il team.'),
  f('info_trattamenti', 'Posso fare i trattamenti estetici a una ragazza minorenne?', ['mia figlia puo fare la ceretta', 'ragazza minorenne trattamenti estetici', 'mia figlia minorenne puo fare il semipermanente', 'a che eta si puo fare la ceretta'],
    'Per le minorenni le regole dipendono dal trattamento e dal centro, e di solito serve l\'accompagnamento o il consenso di un genitore: lo verifichi direttamente con il team.'),
];
