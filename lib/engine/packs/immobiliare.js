// lib/engine/packs/immobiliare.js
//
// Sector Pack "immobiliare" v1 — conoscenza di SETTORE (agenzia immobiliare,
// Italia), non di una singola agenzia. Prezzi, canoni, valori di mercato,
// commissioni, immobili, zone servite, orari, agenti e indirizzi NON stanno
// qui: arrivano solo dai dati del tenant. Questo è un settore di LEAD
// QUALIFICATI più che di appuntamenti: il bot raccoglie cosa cerca/offre il
// cliente (operazione, tipologia, zona, budget, contatti) e passa la pratica
// all'agente; non dà consulenza legale/fiscale/finanziaria, non stima valori,
// non garantisce disponibilità né caratteristiche non presenti in fonte.

export const SETTORE = 'immobiliare';
export const VERSIONE = 1;
export const CHANGELOG = 'v1: primo Sector Pack immobiliare — lessico acquisto/affitto/vendita/tipologie, 22 intent (lead acquisto, affitto, valutazione vendita, proprietario che affitta, visite), 18 entità, urgenze minime (gas/incendio/crollo, allagamento, sfratto esecutivo), sicurezza anti-consulenza legale/fiscale/finanziaria e anti-stima di valore, anti-truffa (caparra/IBAN), 19 FAQ di settore solo conoscenza generale.';

export const pack = {
  identity: {
    nome_ruolo: 'agenzia immobiliare',
    entita_nome: 'nome_cliente',
    descrizione: 'Sei l\'assistente digitale di un\'agenzia immobiliare. Accogli chi cerca casa, chi vuole vendere o affittare un immobile e chi chiede informazioni su un annuncio, con tono cordiale, professionale e concreto. Raccogli le informazioni utili per far lavorare l\'agente e organizzare le visite. Non sei un agente né un professionista: non dai consulenza legale, fiscale o finanziaria, non stimi il valore degli immobili, non inventi prezzi o caratteristiche.',
  },
  mission: 'Capire cosa cerca o cosa offre il cliente, raccogliere i dati essenziali per qualificare la richiesta (operazione, tipologia, zona, budget, contatto), organizzare le visite e passare all\'agente tutto ciò che richiede una persona.',
  tone_default: 'professionale',
  conversation_rules: [
    'Messaggi brevi (2-3 frasi), linguaggio semplice, niente gergo tecnico non necessario.',
    'Una sola domanda per messaggio e mai su un\'informazione già data.',
    'Per prezzi, canoni, caratteristiche e disponibilità di un immobile usa solo i dati dell\'agenzia; se non ci sono, dì che verifichi con l\'agente.',
    'Mai stime di valore, mai commenti sulla convenienza di un prezzo, di un acquisto o di un mutuo.',
    'Per aspetti legali, fiscali o finanziari indica che servono l\'agente o il professionista competente (notaio, commercialista, consulente).',
    'Mai accettare o chiedere pagamenti, caparre o dati bancari in chat: passa a una persona.',
  ],
  prohibited_claims: [
    'indicare prezzi, canoni, sconti, commissioni, spese o orari non presenti nelle fonti',
    'stimare o suggerire il valore di mercato di un immobile',
    'dire se un prezzo è giusto, un affare o un buon investimento',
    'dare consulenza legale, fiscale o finanziaria (sfratti, tasse, mutui, contratti)',
    'garantire che un immobile sia ancora disponibile, libero o non venduto',
    'dichiarare caratteristiche, stato o regolarità di un immobile non presenti nelle fonti',
    'garantire l\'esito di una vendita, di un affitto, di un mutuo o i tempi',
    'fornire contatti del proprietario o aggirare l\'agenzia',
  ],
  business_rules: [
    'Annullamenti e spostamenti di visite già fissate vanno passati a una persona dell\'agenzia.',
    'Prezzi, canoni, commissioni, orari, zone servite e disponibilità degli immobili sono dati dell\'agenzia: mai inventarli.',
    'Le richieste di valutazione di un immobile si raccolgono come lead per l\'agente: nessuna cifra in chat.',
    'Pagamenti, caparre e IBAN non si gestiscono in chat.',
  ],

  entities: [
    { id: 'operazione', descrizione: 'Che operazione vuole fare il cliente: acquisto, affitto o vendita.', tipo: 'enum', priorita: 5, valori: ['acquisto', 'affitto', 'vendita'],
      domanda_varianti: ['Cerca un immobile da comprare o da prendere in affitto?', 'Mi dice se le interessa l\'acquisto o l\'affitto?'] },
    { id: 'tipologia', descrizione: 'Tipo di immobile cercato od offerto.', tipo: 'enum', priorita: 10,
      valori: ['monolocale', 'bilocale', 'trilocale', 'quadrilocale', 'appartamento', 'attico', 'villa', 'villetta_schiera', 'casa_indipendente', 'box_garage', 'posto_auto', 'terreno', 'locale_commerciale', 'ufficio', 'capannone', 'stanza', 'altro'],
      domanda_varianti: ['Di che tipo di immobile si tratta (per esempio bilocale, trilocale, villa, locale commerciale)?'] },
    { id: 'codice_annuncio', descrizione: 'Codice/riferimento dell\'annuncio, oppure indirizzo o descrizione dell\'immobile di interesse.', tipo: 'string', priorita: 12,
      domanda_varianti: ['Mi indica il codice dell\'annuncio (o l\'indirizzo dell\'immobile)?'] },
    { id: 'zona', descrizione: 'Zona, quartiere o città di interesse (o dove si trova l\'immobile da vendere/affittare).', tipo: 'string', priorita: 15,
      domanda_varianti: ['In che zona o quartiere?'] },
    { id: 'budget', descrizione: 'Budget massimo indicato dal cliente: prezzo di acquisto oppure canone mensile per l\'affitto (è un dato dichiarato dal cliente, non un valore dell\'agenzia).', tipo: 'string', priorita: 20,
      domanda_varianti: ['Che budget ha in mente, indicativamente?'] },
    { id: 'camere', descrizione: 'Numero di camere da letto desiderato.', tipo: 'enum', priorita: 30, valori: ['1', '2', '3', '4'] },
    { id: 'bagni', descrizione: 'Numero di bagni desiderato.', tipo: 'enum', priorita: 31, valori: ['1', '2', '3'] },
    { id: 'metratura', descrizione: 'Metri quadri desiderati o dell\'immobile da vendere/affittare.', tipo: 'string', priorita: 32 },
    { id: 'esterno', descrizione: 'Spazio esterno desiderato: balcone, terrazzo o giardino.', tipo: 'enum', priorita: 35, valori: ['balcone', 'terrazzo', 'giardino'] },
    { id: 'ascensore', descrizione: 'Se il cliente chiede l\'ascensore.', tipo: 'enum', priorita: 36, valori: ['si'] },
    { id: 'tempistiche', descrizione: 'Urgenza/tempistiche del cliente.', tipo: 'enum', priorita: 40, valori: ['subito', 'a_breve', 'nessuna_fretta'] },
    { id: 'finanziamento', descrizione: 'Se il cliente indica di procedere con mutuo o in contanti (dato dichiarato, non consulenza).', tipo: 'enum', priorita: 41, valori: ['mutuo', 'contanti'] },
    { id: 'immobile_citato', descrizione: 'Il cliente nomina un immobile in modo generico (casa, immobile): serve solo a collegare verbi come cercare/vendere.', tipo: 'enum', priorita: 98, valori: ['si'] },
    { id: 'ruolo_cliente', descrizione: 'Se il cliente parla di un immobile proprio (proprietario).', tipo: 'enum', priorita: 45, valori: ['proprietario'] },
    { id: 'nome_cliente', descrizione: 'Nome del cliente.', tipo: 'string', priorita: 50,
      domanda_varianti: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta per l\'agente?', 'A che nome registro la richiesta?'] },
    { id: 'giorno', descrizione: 'Giorno preferito per la visita o il contatto.', tipo: 'string', priorita: 60 },
    { id: 'fascia_oraria', descrizione: 'Mattina, pomeriggio o sera.', tipo: 'enum', priorita: 61, valori: ['mattina', 'pomeriggio', 'sera'] },
    { id: 'telefono', descrizione: 'Numero di telefono se il cliente lo fornisce (di norma già noto da WhatsApp).', tipo: 'string', priorita: 99 },
  ],

  lexicon: [
    // ---- Operazione (l'ordine conta: la prima voce trovata vince per entità) ----
    { canonical: 'vendere_immobile', entity: 'operazione', value: 'vendita', synonyms: ['vendo', 'mettere in vendita', 'metto in vendita', 'mettiamo in vendita'] },
    { canonical: 'acquistare_immobile', entity: 'operazione', value: 'acquisto', synonyms: ['comprare', 'acquistare', 'acquisto', 'compro', 'comprarlo', 'comprarla', 'comprarne', 'in acquisto', 'da comprare', 'da acquistare', 'acquistarlo', 'acquistarla', 'rilevare'], slang: ['comprarmi'], errors: ['comprre', 'acquistre', 'aquistare', 'acqistare'] },
    { canonical: 'affittare_immobile', entity: 'operazione', value: 'affitto', synonyms: ['in affitto', 'affitto', 'affitti', 'affittare', 'locazione', 'da affittare', 'canone', 'canone concordato', 'affittarlo', 'affittarla', 'a canone', 'contratto di locazione'], errors: ['afitto', 'affito', 'affiitto', 'affitare', 'locazzione'] },
    { canonical: 'danno_immobile', synonyms: ['allagamento', 'allagato', 'allagata', 'perdita d acqua', 'perdita di acqua', 'fuga d acqua', 'fuga di acqua', 'tubo rotto', 'infiltrazioni'] },
    { canonical: 'in_vendita', synonyms: ['in vendita', 'a vendita'] },

    // ---- Ruolo: immobile proprio ----
    { canonical: 'proprieta_cliente', entity: 'ruolo_cliente', value: 'proprietario', synonyms: ['il mio appartamento', 'la mia casa', 'il mio immobile', 'il mio bilocale', 'il mio trilocale', 'il mio monolocale', 'il mio quadrilocale', 'la mia villa', 'il mio box', 'il mio garage', 'il mio terreno', 'il mio negozio', 'il mio locale', 'il mio ufficio', 'casa mia', 'mia casa', 'di mia proprieta', 'sono proprietario', 'sono proprietaria', 'sono il proprietario', 'sono la proprietaria', 'ho un appartamento', 'ho una casa', 'ho un immobile', 'ho un bilocale', 'ho un trilocale', 'ho un monolocale', 'ho una villa', 'ho un negozio', 'ho un locale', 'ho un box', 'ho un garage', 'ho un terreno', 'ho un ufficio', 'ho ereditato', 'abbiamo ereditato', 'casa ereditata', 'il nostro appartamento', 'la nostra casa', 'il nostro immobile', 'la casa dei miei genitori', 'la casa di mia madre', 'la casa di mio padre', 'appartamento di mia proprieta', 'ho una casa da', 'ho un appartamento da'] },

    { canonical: 'casa_generica', entity: 'immobile_citato', value: 'si', synonyms: ['casa', 'case', 'immobile', 'immobili'] },

    // ---- Tipologia (dal più specifico al più generico) ----
    { canonical: 'monolocale', entity: 'tipologia', value: 'monolocale', synonyms: ['monolocale', 'monolocali', 'mono locale', '1 locale', 'un locale solo'], slang: ['mono'], errors: ['monolocae', 'monolocalle'] },
    { canonical: 'bilocale', entity: 'tipologia', value: 'bilocale', synonyms: ['bilocale', 'bilocali', 'bi locale', '2 locali', 'due locali'], slang: ['bilo'], errors: ['bilocae', 'bilocalle', 'bilocal', 'bylocale'] },
    { canonical: 'trilocale', entity: 'tipologia', value: 'trilocale', synonyms: ['trilocale', 'trilocali', 'tri locale', '3 locali', 'tre locali'], slang: ['trilo'], errors: ['trilocae', 'trilocalle', 'trilocal'] },
    { canonical: 'quadrilocale', entity: 'tipologia', value: 'quadrilocale', synonyms: ['quadrilocale', 'quadrilocali', 'quadri locale', '4 locali', 'quattro locali'], slang: ['quadri'], errors: ['quadrilocae', 'quadrilocalle'] },
    { canonical: 'attico', entity: 'tipologia', value: 'attico', synonyms: ['attico', 'superattico', 'mansarda', 'sottotetto'], errors: ['atico'] },
    { canonical: 'villetta_schiera', entity: 'tipologia', value: 'villetta_schiera', synonyms: ['villetta a schiera', 'villa a schiera', 'casa a schiera', 'bifamiliare', 'villetta', 'villette', 'trifamiliare'], errors: ['viletta'] },
    { canonical: 'villa', entity: 'tipologia', value: 'villa', synonyms: ['villa', 'ville', 'villino', 'villone'], errors: ['vila'] },
    { canonical: 'casa_indipendente', entity: 'tipologia', value: 'casa_indipendente', synonyms: ['casa indipendente', 'casa singola', 'indipendente', 'casale', 'rustico', 'casolare', 'casa colonica', 'casa semindipendente', 'semindipendente'], slang: ['casetta'], errors: ['indipendnte', 'indipendete'] },
    { canonical: 'box_garage', entity: 'tipologia', value: 'box_garage', synonyms: ['box', 'box auto', 'garage', 'box garage', 'autorimessa', 'box singolo', 'box doppio'], errors: ['garaje', 'garrage', 'garge'] },
    { canonical: 'posto_auto', entity: 'tipologia', value: 'posto_auto', synonyms: ['posto auto', 'posto macchina', 'posto auto coperto', 'posto auto scoperto', 'posti auto'] },
    { canonical: 'terreno', entity: 'tipologia', value: 'terreno', synonyms: ['terreno', 'terreni', 'lotto', 'lotto di terreno', 'terreno edificabile', 'terreno agricolo', 'appezzamento'], errors: ['terrno', 'tereno'] },
    { canonical: 'locale_commerciale', entity: 'tipologia', value: 'locale_commerciale', synonyms: ['locale commerciale', 'locali commerciali', 'negozio', 'negozi', 'fondo commerciale', 'fondo', 'bottega', 'un locale', 'locale per negozio', 'vetrina'], errors: ['negozzio', 'negoziio'] },
    { canonical: 'ufficio', entity: 'tipologia', value: 'ufficio', synonyms: ['ufficio', 'uffici', 'open space', 'studio professionale'], errors: ['uficio', 'ufficcio'] },
    { canonical: 'capannone', entity: 'tipologia', value: 'capannone', synonyms: ['capannone', 'capannoni', 'magazzino', 'deposito', 'laboratorio', 'area industriale'], errors: ['capanone'] },
    { canonical: 'stanza', entity: 'tipologia', value: 'stanza', synonyms: ['una stanza', 'stanza singola', 'stanza doppia', 'posto letto'] },
    { canonical: 'appartamento', entity: 'tipologia', value: 'appartamento', synonyms: ['appartamento', 'appartamenti', 'appartamentino', 'abitazione', 'alloggio', 'app to', 'appart', 'appto'], errors: ['apartamento', 'appartameto', 'appartamnto', 'apparamento', 'appartmento', 'appartamneto'] },

    // ---- Caratteristiche ----
    { canonical: 'camere_1', entity: 'camere', value: '1', synonyms: ['una camera', '1 camera', 'una camera da letto', '1 camera da letto', 'una cameretta'] },
    { canonical: 'camere_2', entity: 'camere', value: '2', synonyms: ['due camere', '2 camere', 'due camere da letto', '2 camere da letto', '2 camere da letto'], slang: ['2 camerette'] },
    { canonical: 'camere_3', entity: 'camere', value: '3', synonyms: ['tre camere', '3 camere', 'tre camere da letto', '3 camere da letto'] },
    { canonical: 'camere_4', entity: 'camere', value: '4', synonyms: ['quattro camere', '4 camere', 'quattro camere da letto', '4 camere da letto'] },
    { canonical: 'bagni_1', entity: 'bagni', value: '1', synonyms: ['un bagno', '1 bagno', 'un solo bagno'] },
    { canonical: 'bagni_2', entity: 'bagni', value: '2', synonyms: ['due bagni', '2 bagni', 'doppi servizi'] },
    { canonical: 'bagni_3', entity: 'bagni', value: '3', synonyms: ['tre bagni', '3 bagni'] },
    { canonical: 'balcone', entity: 'esterno', value: 'balcone', negabile: true, synonyms: ['balcone', 'balconi', 'balconcino'], errors: ['balccone'] },
    { canonical: 'terrazzo', entity: 'esterno', value: 'terrazzo', negabile: true, synonyms: ['terrazzo', 'terrazza', 'terrazzino', 'terazzo'] },
    { canonical: 'giardino', entity: 'esterno', value: 'giardino', negabile: true, synonyms: ['giardino', 'giardinetto', 'giardino privato', 'spazio verde'], errors: ['giardno', 'giardio'] },
    { canonical: 'ascensore', entity: 'ascensore', value: 'si', negabile: true, synonyms: ['ascensore', 'con ascensore'], errors: ['ascensor', 'ascenssore'] },

    // ---- Tempistiche e finanziamento dichiarati dal cliente ----
    { canonical: 'tempo_subito', entity: 'tempistiche', value: 'subito', synonyms: ['subito', 'appena possibile', 'il prima possibile', 'prima possibile', 'al piu presto', 'da subito', 'immediatamente', 'asap'] },
    { canonical: 'tempo_breve', entity: 'tempistiche', value: 'a_breve', synonyms: ['entro un mese', 'entro due mesi', 'entro tre mesi', 'entro fine mese', 'nei prossimi mesi', 'entro l estate', 'entro fine anno', 'tra un mese', 'tra due mesi', 'tra qualche mese', 'a breve'] },
    { canonical: 'tempo_nessuna_fretta', entity: 'tempistiche', value: 'nessuna_fretta', synonyms: ['senza fretta', 'non ho fretta', 'con calma', 'non ho urgenza', 'non c e fretta', 'tra un anno', 'mi sto guardando intorno', 'sto solo guardando', 'sto solo valutando', 'per ora mi guardo in giro'] },
    { canonical: 'fin_mutuo', entity: 'finanziamento', value: 'mutuo', synonyms: ['con mutuo', 'con il mutuo', 'mi serve un mutuo', 'mi serve il mutuo', 'avrei bisogno di un mutuo', 'ho bisogno di un mutuo', 'con finanziamento', 'tramite mutuo', 'col mutuo'] },
    { canonical: 'fin_contanti', entity: 'finanziamento', value: 'contanti', synonyms: ['in contanti', 'pago cash', 'cash', 'senza mutuo', 'senza finanziamento', 'pagamento immediato'], slang: ['liquidita'] },

    // ---- Concetti di conversazione (collegano all'intent, nessuna entità) ----
    { canonical: 'visita_immobile', synonyms: ['fare una visita', 'una visita', 'visitare', 'visitarlo', 'visitarla', 'vedere l immobile', 'vedere l appartamento', 'vedere la casa', 'vederlo', 'vederla', 'sopralluogo', 'andare a vedere'], intent: 'prenota_visita' },
    { canonical: 'annuncio', synonyms: ['annuncio', 'annunci', 'inserzione', 'codice annuncio', 'rif', 'riferimento', 'codice immobile', 'ancora disponibile', 'ancora libero', 'ancora libera', 'ancora in vendita', 'ancora in affitto'], intent: 'info_annuncio' },
    { canonical: 'prezzo', synonyms: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano', 'quanto viene', 'quanto chiedono', 'quanto chiede', 'a quanto'], intent: 'info_prezzi' },
    { canonical: 'commissioni', synonyms: ['commissioni', 'commissione', 'provvigione', 'provvigioni', 'parcella', 'compenso dell agenzia', 'spese di agenzia', 'costi di agenzia', 'quanto prendete', 'quanto vi spetta', 'spetta all agenzia', 'quanto guadagnate', 'compenso', 'percentuale dell agenzia', 'mediazione', 'spese di mediazione'], intent: 'info_commissioni' },
    { canonical: 'orari', synonyms: ['orari', 'orario', 'aperti', 'aperto', 'chiusi', 'apertura', 'chiusura', 'fino a che ora', 'a che ora aprite', 'a che ora chiudete'], intent: 'info_orari' },
    { canonical: 'indirizzo', synonyms: ['indirizzo', 'dove siete', 'dove si trova', 'come vi raggiungo', 'come arrivo', 'sede', 'parcheggio'], intent: 'info_posizione' },
    { canonical: 'mutuo', synonyms: ['mutuo', 'mutui', 'finanziamenti', 'mediatore creditizio', 'mediazione creditizia', 'banca', 'con le banche', 'prestito'], intent: 'info_mutuo' },
    { canonical: 'valutazione', synonyms: ['valutazione', 'valutare', 'stima', 'stimare', 'quanto vale', 'quanto posso chiedere', 'a quanto posso vendere', 'perizia'], intent: 'valuta_vendita' },
    { canonical: 'documenti', synonyms: ['documenti', 'documentazione', 'cosa devo portare', 'cosa serve portare'], intent: 'info_documenti' },
    { canonical: 'ape', synonyms: ['ape', 'attestato di prestazione energetica', 'certificato energetico', 'attestato energetico', 'classe energetica'], intent: 'info_processo' },
    { canonical: 'compromesso', synonyms: ['compromesso', 'preliminare', 'contratto preliminare', 'rogito', 'atto notarile'], intent: 'info_processo' },
    { canonical: 'proposta_acquisto', synonyms: ['proposta d acquisto', 'proposta di acquisto', 'proposta acquisto', 'proposta irrevocabile'], intent: 'info_processo' },
    { canonical: 'caparra', synonyms: ['caparra', 'caparra confirmatoria'], intent: 'info_processo' },
    { canonical: 'spese_condominiali', synonyms: ['spese condominiali', 'spese di condominio', 'spese condominio', 'condominio'], intent: 'info_processo' },
    { canonical: 'catasto', synonyms: ['planimetria', 'visura catastale', 'planimetria catastale', 'catasto', 'nuda proprieta', 'usufrutto'], intent: 'info_processo' },
  ],

  intents: [
    { id: 'cerca_acquisto', nome: 'Cerca un immobile da comprare', categoria: 'LEAD', priorita: 22, safety_level: 'LOW',
      descrizione: 'Il cliente vuole comprare un immobile: lead di acquisto da qualificare (tipologia, zona, budget, contatto).',
      esempi: ['vorrei comprare', 'voglio comprare', 'vorrei comprare casa', 'voglio comprare casa', 'vorrei acquistare', 'voglio acquistare', 'cerco casa da comprare', 'cerco casa da acquistare', 'cerco un appartamento in vendita', 'cerco in vendita', 'cerco da comprare', 'sto cercando di comprare', 'sto cercando casa da comprare', 'intendo acquistare', 'ho intenzione di comprare', 'vorrei comprarmi una casa', 'cerco la mia prima casa', 'mi interessa acquistare', 'sono interessato ad acquistare', 'sono interessata ad acquistare', 'vorrei acquistare un immobile'],
      keywords: ['comprare', 'acquistare', 'compro', 'comprarmi'],
      combinazioni: [
        { entity: 'tipologia', con: ['comprare', 'comprre', 'aquistare', 'acquistare', 'compro', 'acquisto', 'in vendita', 'da comprare', 'comprarlo', 'comprarla', 'acquistarlo', 'acquistarla'], non_con_concepts: ['proprieta_cliente', 'vendere_immobile', 'affittare_immobile', 'prezzo', 'visita_immobile', 'danno_immobile', 'annuncio'], score: 0.9 },
      ],
      required_entities: ['tipologia', 'zona', 'budget', 'nome_cliente'],
      optional_entities: ['metratura', 'camere', 'bagni', 'esterno', 'ascensore', 'tempistiche', 'finanziamento', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'cerca_affitto', nome: 'Cerca un immobile in affitto', categoria: 'LEAD', priorita: 22, safety_level: 'LOW',
      descrizione: 'Il cliente cerca un immobile da prendere in affitto: lead di locazione da qualificare (tipologia, zona, budget/canone, contatto).',
      esempi: ['cerco in affitto', 'cerco casa in affitto', 'cerco un appartamento in affitto', 'sto cercando casa in affitto', 'vorrei affittare', 'vorrei prendere in affitto', 'voglio prendere in affitto', 'cerco da affittare', 'cerco qualcosa in affitto', 'mi serve una casa in affitto', 'mi serve un appartamento in affitto', 'avete appartamenti in affitto', 'avete qualcosa in affitto', 'avete case in affitto', 'cerco una stanza in affitto', 'cerco un locale in affitto', 'cerco un negozio in affitto', 'sto cercando in affitto', 'vorrei un appartamento in affitto', 'cerco una casa da affittare', 'cerco una casa in affitto', 'cerco un immobile in affitto', 'cerco un bilocale in affitto', 'cerco un trilocale in affitto'],
      keywords: ['in affitto', 'prendere in affitto', 'locazione'],
      combinazioni: [
        { entity: 'tipologia', con: ['in affitto', 'affitto', 'affito', 'afitto', 'affiitto', 'affittare', 'da affittare', 'locazione', 'canone'], non_con_concepts: ['proprieta_cliente', 'vendere_immobile', 'prezzo', 'visita_immobile', 'danno_immobile', 'annuncio'], score: 0.9 },
      ],
      required_entities: ['tipologia', 'zona', 'budget', 'nome_cliente'],
      optional_entities: ['camere', 'bagni', 'metratura', 'esterno', 'ascensore', 'tempistiche', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'cerca_casa', nome: 'Cerca un immobile (operazione da chiarire)', categoria: 'LEAD', priorita: 24, safety_level: 'LOW',
      descrizione: 'Il cliente cerca un immobile ma non ha detto se vuole comprare o affittare: prima si chiarisce l\'operazione.',
      esempi: ['cerco casa', 'sto cercando casa', 'cerco un immobile', 'sto cercando un immobile', 'cerchiamo casa', 'stiamo cercando casa', 'cerco una casa', 'vorrei una casa', 'mi serve una casa', 'cerco un appartamento'],
      keywords: ['cerco casa', 'cerchiamo casa', 'cerco un immobile'],
      combinazioni: [
        { entity: 'tipologia', con: ['cerco', 'sto cercando', 'cercavo', 'cerchiamo', 'stiamo cercando', 'cercherei', 'mi serve', 'mi servirebbe', 'ho bisogno di', 'avrei bisogno di', 'vorrei', 'cercasi'], non_con_concepts: ['acquistare_immobile', 'affittare_immobile', 'vendere_immobile', 'proprieta_cliente', 'in_vendita', 'prezzo', 'visita_immobile', 'annuncio'], score: 0.8 },
        { entity: 'immobile_citato', con: ['cerco', 'sto cercando', 'cerchiamo', 'stiamo cercando', 'cercherei', 'cercasi'], non_con_concepts: ['acquistare_immobile', 'affittare_immobile', 'vendere_immobile', 'proprieta_cliente', 'in_vendita', 'prezzo', 'visita_immobile', 'annuncio'], score: 0.8 },
      ],
      required_entities: ['operazione', 'tipologia', 'zona', 'budget', 'nome_cliente'],
      optional_entities: ['metratura', 'camere', 'bagni', 'esterno', 'ascensore', 'tempistiche', 'finanziamento', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'valuta_vendita', nome: 'Vendere il proprio immobile / valutazione', categoria: 'LEAD', priorita: 18, safety_level: 'LOW',
      descrizione: 'Il proprietario vuole vendere o far valutare il proprio immobile: lead di vendita per l\'agente. Nessuna cifra in chat.',
      esempi: ['vendo casa', 'vendo un appartamento', 'vorrei mettere in vendita', 'vorrei mettere in vendita casa', 'vorrei una valutazione', 'vorrei una valutazione del mio immobile', 'vorrei far valutare casa', 'vorrei far valutare il mio appartamento', 'vorrei sapere quanto vale la mia casa', 'quanto vale il mio appartamento', 'quanto vale la mia casa', 'valutazione gratuita', 'fate valutazioni', 'fate stime', 'mi fate una stima', 'vorrei una stima', 'posso far stimare casa', 'sto pensando di mettere in vendita'],
      keywords: ['valutazione', 'valutare', 'stimare', 'mettere in vendita'],
      combinazioni: [
        // 'vendere' compare solo qui (confronto esatto): nei campi fuzzy verrebbe confuso con 'vedere'.
        { entity: 'ruolo_cliente', con: ['vendere', 'vendo', 'vendita', 'valutare', 'valutazione', 'stima', 'stimare', 'quanto vale', 'venderla', 'venderlo'], score: 0.9 },
        { entity: 'immobile_citato', con: ['vendere', 'vendo', 'venderla', 'venderlo', 'valutare', 'valutazione', 'stimare'], non_con_concepts: ['affittare_immobile', 'acquistare_immobile', 'prezzo', 'documenti', 'commissioni'], score: 0.9 },
        { entity: 'tipologia', con: ['vendere', 'vendo', 'venderla', 'venderlo', 'mettere in vendita', 'metto in vendita', 'valutazione', 'valutare', 'stimare'], non_con_concepts: ['affittare_immobile', 'acquistare_immobile', 'documenti', 'commissioni'], score: 0.9 },
      ],
      required_entities: ['tipologia', 'zona', 'nome_cliente'],
      optional_entities: ['metratura', 'camere', 'bagni', 'esterno', 'ascensore', 'tempistiche', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'proprietario_affitto', nome: 'Mettere in affitto il proprio immobile', categoria: 'LEAD', priorita: 18, safety_level: 'LOW',
      descrizione: 'Il proprietario vuole affittare il proprio immobile: lead di gestione/locazione per l\'agente. Nessun canone in chat.',
      esempi: ['voglio affittare il mio appartamento', 'vorrei affittare il mio appartamento', 'vorrei affittare casa mia', 'ho un appartamento da affittare', 'ho una casa da affittare', 'ho un immobile da affittare', 'vorrei mettere in affitto casa', 'vorrei mettere in affitto il mio immobile', 'devo affittare un immobile', 'cerco un inquilino', 'cerco inquilini', 'vorrei mettere a reddito', 'vorrei mettere a reddito il mio immobile', 'gestite affitti per i proprietari', 'vi occupate della locazione del mio immobile', 'mi occupate dell affitto del mio appartamento', 'devo affittare casa', 'voglio mettere in affitto', 'vorrei trovare un inquilino', 'mi serve un inquilino'],
      keywords: ['mettere in affitto', 'mettere a reddito', 'inquilino', 'inquilini'],
      combinazioni: [
        { entity: 'ruolo_cliente', con: ['affittare', 'affitto', 'locazione', 'inquilino', 'mettere a reddito', 'affittarlo', 'affittarla', 'in affitto'], non_con_concepts: ['vendere_immobile'], score: 0.9 },
        { entity: 'tipologia', con: ['mettere in affitto', 'metto in affitto', 'inquilino', 'mettere a reddito', 'da mettere in affitto'], score: 0.88 },
      ],
      required_entities: ['tipologia', 'zona', 'nome_cliente'],
      optional_entities: ['metratura', 'camere', 'bagni', 'esterno', 'ascensore', 'tempistiche', 'giorno', 'fascia_oraria'],
      actions: ['ask_missing_information', 'create_lead', 'notify_owner'] },
    { id: 'prenota_visita', nome: 'Prenotazione visita a un immobile', categoria: 'BOOKING', priorita: 20, safety_level: 'LOW',
      descrizione: 'Il cliente vuole visitare un immobile (di solito da un annuncio) o chiede quando può vederlo.',
      esempi: ['vorrei visitare', 'vorrei visitarlo', 'vorrei visitarla', 'vorrei vedere l appartamento', 'vorrei vedere l immobile', 'vorrei vedere la casa', 'vorrei vedere l immobile dal vivo', 'posso vedere l immobile', 'posso vedere l appartamento', 'posso visitarlo', 'posso visitarla', 'possiamo vederlo', 'possiamo visitarlo', 'posso andare a vederlo', 'vorrei andare a vederlo', 'vorrei fare una visita', 'vorrei prenotare una visita', 'vorrei fissare una visita', 'prenotare una visita', 'fissare una visita', 'organizzare una visita', 'quando posso vedere', 'quando posso visitare', 'quando si puo visitare', 'si puo visitare', 'si puo vedere', 'avete disponibilita per una visita', 'vorrei vederlo', 'vorrei vederla', 'mi piacerebbe visitare', 'mi piacerebbe vedere', 'sono interessato a vederlo', 'sono interessata a vederlo', 'vorrei un appuntamento per vedere', 'c e modo di visitare', 'c e la possibilita di visitare', 'si potrebbe visitare', 'vorrei fissare un appuntamento per vedere', 'vorrei fare un sopralluogo', 'visita per'],
      keywords: ['visitare', 'visitarlo', 'visitarla', 'sopralluogo', 'prenotare una visita', 'fissare una visita', 'organizzare una visita'],
      combinazioni: [
        { entity: 'codice_annuncio', con: ['visita', 'vedere', 'vederlo', 'visitare', 'visitarlo'], score: 0.85 },
        { entity: 'immobile_citato', con: ['visitare', 'visitarlo', 'visitarla', 'vedere', 'vederlo', 'vederla', 'fare una visita', 'una visita'], non_con_concepts: ['vendere_immobile', 'proprieta_cliente', 'prezzo'], score: 0.85 },
        // 'vedere' esatto (nei campi fuzzy sarebbe confuso con 'vendere')
        { entity: 'tipologia', con: ['vedere', 'vederlo', 'vederla', 'visitare', 'visitarlo', 'visitarla', 'fare una visita', 'una visita'], non_con_concepts: ['vendere_immobile', 'proprieta_cliente', 'prezzo'], score: 0.85 },
      ],
      required_entities: ['codice_annuncio', 'nome_cliente'], optional_entities: ['giorno', 'fascia_oraria', 'tipologia', 'tempistiche'],
      actions: ['ask_missing_information', 'propose_slot', 'create_booking', 'create_lead'] },
    { id: 'info_annuncio', nome: 'Informazioni su un annuncio', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede informazioni su un annuncio o su un immobile (caratteristiche, prezzo, disponibilità): si risponde solo con i dati dell\'agenzia, senza garantire disponibilità.',
      esempi: ['info sull annuncio', 'informazioni sull annuncio', 'ho visto l annuncio', 'ho visto un annuncio', 'ho visto il vostro annuncio', 'ho visto un vostro annuncio', 'e ancora disponibile', 'e ancora libero', 'e ancora libera', 'e ancora in vendita', 'e ancora in affitto', 'vorrei informazioni su questo immobile', 'vorrei info su questo immobile', 'vorrei informazioni su questo appartamento', 'vorrei info su questo appartamento', 'informazioni sull immobile', 'informazioni sull appartamento', 'info sull immobile', 'info sull appartamento', 'codice annuncio', 'rif annuncio', 'riguardo all annuncio', 'in merito all annuncio', 'quanti metri quadri ha', 'ha il balcone', 'ha l ascensore', 'ha il giardino', 'e arredato', 'a che piano e', 'in che piano e', 'com e messo', 'in che condizioni e', 'quante camere ha', 'quanti bagni ha', 'ci sono spese condominiali', 'si puo trattare sul prezzo', 'il prezzo e trattabile', 'prezzo trattabile', 'ci sono altre foto', 'avete altre foto', 'potete mandare delle foto', 'mi mandate le foto'],
      keywords: ['annuncio', 'annunci', 'ancora disponibile', 'ancora libero', 'ancora libera', 'ancora in vendita', 'ancora in affitto', 'trattabile', 'foto'],
      required_entities: [], optional_entities: ['codice_annuncio', 'tipologia'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_prezzi', nome: 'Domande su prezzi', categoria: 'INFORMATION', priorita: 31, safety_level: 'LOW',
      descrizione: 'Il cliente chiede quanto costa un immobile o che prezzi ci sono: solo dati dell\'agenzia, mai valori di mercato.',
      esempi: ['quanto costa', 'quanto costano', 'che prezzi avete', 'che prezzi hanno gli appartamenti', 'quanto costa un appartamento', 'quanto costa un bilocale', 'quanto costa un trilocale', 'quanto costa una villa', 'quanto costa casa', 'quanto costano le case', 'quanto costano gli appartamenti', 'quanto viene un bilocale', 'quanto viene al mese', 'quanto costa al mese', 'quanto costa l affitto', 'quanto e l affitto', 'quanto chiedono', 'quanto chiede', 'quanto chiedete', 'prezzi', 'a quanto', 'quanto e il prezzo', 'qual e il prezzo', 'qual e il canone', 'quanto e il canone'],
      keywords: ['prezzo', 'prezzi', 'costo', 'costi', 'quanto costa', 'quanto costano'],
      required_entities: [], optional_entities: ['tipologia', 'zona', 'codice_annuncio'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_commissioni', nome: 'Commissioni e costi dell\'agenzia', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede commissioni, provvigioni o costi dell\'agenzia: solo dati del tenant, mai inventati.',
      esempi: ['quali sono le commissioni', 'quanto prendete di commissione', 'quanto prendete', 'quanto costa l agenzia', 'quanta commissione', 'quanto vi devo pagare', 'avete una provvigione', 'quanto e la provvigione', 'quanto e la vostra provvigione', 'costi dell agenzia', 'spese di agenzia', 'quanto vi pago', 'le commissioni sono a carico mio', 'chi paga la provvigione', 'quanto chiede l agenzia', 'quanto vi spetta', 'quanto vi spetta come agenzia', 'mediazione quanto costa', 'spese di mediazione'],
      keywords: ['commissioni', 'commissione', 'provvigione', 'provvigioni', 'spese di agenzia', 'costi di agenzia', 'spese di mediazione'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_orari', nome: 'Orari dell\'agenzia', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede gli orari di apertura dell\'agenzia.',
      esempi: ['a che ora aprite', 'a che ora chiudete', 'siete aperti il sabato', 'siete aperti oggi', 'quali sono gli orari', 'fino a che ora siete aperti', 'orari di apertura', 'siete aperti a pranzo', 'siete aperti domenica', 'siete aperti', 'orari dell agenzia', 'orario di apertura'],
      keywords: ['orari', 'orario', 'aperti', 'chiusi'],
      required_entities: [], optional_entities: ['giorno'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_posizione', nome: 'Posizione dell\'agenzia', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede dove si trova l\'agenzia o come raggiungerla.',
      esempi: ['dove siete', 'qual e l indirizzo', 'come vi raggiungo', 'dove si trova l agenzia', 'c e parcheggio', 'come arrivo da voi', 'indirizzo dell agenzia', 'dov e l agenzia', 'dove posso parcheggiare', 'dove e la vostra sede', 'dov e la vostra sede', 'dove si trova la sede', 'dove e l agenzia'],
      keywords: ['indirizzo', 'parcheggio', 'dove siete', 'dov e l agenzia', 'la vostra sede'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_servizi', nome: 'Servizi e zone dell\'agenzia', categoria: 'DISCOVERY', priorita: 30, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di cosa si occupa l\'agenzia, che servizi offre, in che zone lavora o che tipi di immobili tratta.',
      esempi: ['di cosa vi occupate', 'che servizi offrite', 'quali servizi offrite', 'che servizi fate', 'in che zone lavorate', 'quali zone coprite', 'che zone coprite', 'in che zone operate', 'trattate immobili commerciali', 'trattate anche affitti', 'vi occupate anche di affitti', 'trattate anche locali commerciali', 'gestite anche affitti', 'fate anche valutazioni', 'trattate terreni', 'vi occupate di immobili commerciali', 'trattate anche ville', 'lavorate anche con i privati', 'che tipi di immobili trattate', 'quali immobili trattate', 'cosa trattate'],
      keywords: ['vi occupate', 'servizi', 'zone coprite', 'in che zone', 'trattate'],
      required_entities: [], optional_entities: ['tipologia', 'operazione'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_mutuo', nome: 'Mutuo (informazioni generali)', categoria: 'INFORMATION', priorita: 32, safety_level: 'MEDIUM',
      descrizione: 'Il cliente chiede se l\'agenzia offre supporto sul mutuo o cos\'è un mutuo: solo informazione generale e dati del tenant; nessuna consulenza finanziaria.',
      esempi: ['fate mutui', 'vi occupate di mutui', 'avete un mediatore creditizio', 'collaborate con delle banche', 'collaborate con banche', 'mi aiutate con il mutuo', 'potete aiutarmi con il mutuo', 'come funziona il mutuo', 'cos e un mutuo', 'avete convenzioni con le banche', 'avete un servizio mutui', 'fate anche mutui', 'info sui mutui', 'informazioni sul mutuo'],
      keywords: ['mutuo', 'mutui', 'mediatore creditizio', 'banche'],
      required_entities: [], optional_entities: ['finanziamento'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_documenti', nome: 'Documenti necessari', categoria: 'INFORMATION', priorita: 30, safety_level: 'LOW',
      descrizione: 'Quali documenti servono per visitare, comprare, vendere o affittare.',
      esempi: ['che documenti servono', 'quali documenti servono', 'cosa devo portare', 'che documenti servono per vendere', 'che documenti servono per affittare', 'che documenti servono per comprare', 'documenti per vendere casa', 'documenti per affittare', 'cosa serve per affittare', 'cosa serve per vendere', 'cosa serve per vendere casa', 'cosa mi serve per affittare', 'che documentazione serve', 'quali documenti devo portare'],
      keywords: ['documenti', 'documentazione'],
      required_entities: [], optional_entities: ['operazione'], actions: ['search_knowledge', 'answer_information'] },
    { id: 'info_processo', nome: 'Come funziona (conoscenza generale)', categoria: 'INFORMATION', priorita: 33, safety_level: 'MEDIUM',
      descrizione: 'Domande generali di settore: APE, compromesso, rogito, proposta d\'acquisto, valutazione, spese condominiali, catasto. Solo conoscenza generale.',
      esempi: ['cos e l ape', 'cosa e l ape', 'a cosa serve l ape', 'cos e il compromesso', 'cos e il rogito', 'differenza tra compromesso e rogito', 'che differenza c e tra compromesso e rogito', 'cos e una proposta d acquisto', 'come funziona la proposta d acquisto', 'come funziona una valutazione', 'come funziona la valutazione', 'come funziona la compravendita', 'come funziona l acquisto', 'cosa sono le spese condominiali', 'cos e la classe energetica', 'cos e la caparra', 'cos e la planimetria', 'cos e la visura catastale', 'cos e la nuda proprieta', 'come funziona l affitto', 'cosa significa rogito', 'cosa significa compromesso', 'cos e un contratto preliminare', 'cosa significa classe energetica', 'cosa significa bilocale', 'differenza tra bilocale e trilocale', 'cos e un trilocale', 'cos e un bilocale', 'che tipi di contratto di affitto esistono', 'cosa significa nuda proprieta'],
      keywords: ['compromesso', 'rogito', 'preliminare', 'classe energetica', 'proposta d acquisto', 'nuda proprieta', 'visura catastale', 'planimetria'],
      required_entities: [], optional_entities: [], actions: ['search_knowledge', 'answer_information'] },
    { id: 'emergenza_immobile', nome: 'Emergenza legata a un immobile', categoria: 'EMERGENCY', priorita: 5, safety_level: 'HIGH',
      descrizione: 'Situazione urgente reale (allagamento, perdita grave, effrazione, persona bloccata, pericolo): serve contatto rapido con l\'agenzia. Non è consulenza legale o tecnica.',
      esempi: ['e un emergenza', 'ho un emergenza in casa', 'emergenza in casa', 'e urgentissimo'],
      keywords: ['emergenza', 'urgentissimo'],
      required_entities: ['nome_cliente'], optional_entities: ['codice_annuncio', 'zona'],
      actions: ['ask_missing_information', 'notify_owner', 'emergency_escalation'] },
    { id: 'cancella_visita', nome: 'Disdetta visita o appuntamento', categoria: 'CANCELLATION', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole annullare una visita o un appuntamento già fissato.',
      esempi: ['devo disdire la visita', 'devo annullare la visita', 'devo disdire', 'devo annullare', 'non posso venire alla visita', 'non riesco a venire alla visita', 'vorrei cancellare l appuntamento', 'annullare l appuntamento', 'disdire l appuntamento', 'disdire la visita', 'non posso piu venire', 'non riesco a venire', 'non ci sono alla visita', 'annullate la visita', 'cancellate la visita'],
      keywords: ['disdire', 'disdetta', 'annullare', 'cancellare', 'annullate', 'cancellate'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'sposta_visita', nome: 'Spostamento visita o appuntamento', categoria: 'RESCHEDULE', priorita: 10, safety_level: 'LOW',
      descrizione: 'Il cliente vuole spostare una visita o un appuntamento già preso.',
      esempi: ['devo spostare la visita', 'posso spostare la visita', 'posso cambiare giorno', 'vorrei rimandare la visita', 'possiamo spostare l appuntamento', 'posso anticipare la visita', 'devo cambiare orario', 'posticipare la visita', 'posso spostare l appuntamento', 'devo spostare l appuntamento', 'possiamo vederci un altro giorno', 'possiamo cambiare orario'],
      keywords: ['spostare', 'rimandare', 'anticipare', 'posticipare', 'rinviare', 'riprogrammare'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'reclamo', nome: 'Reclamo', categoria: 'COMPLAINT', priorita: 8, safety_level: 'MEDIUM',
      descrizione: 'Insoddisfazione per il servizio, un agente o una mancata risposta.',
      esempi: ['sono insoddisfatto', 'sono insoddisfatta', 'vorrei fare un reclamo', 'voglio lamentarmi', 'sono molto arrabbiato', 'sono molto arrabbiata', 'non sono contento del servizio', 'sono stato trattato male', 'sono stata trattata male', 'sono deluso dal servizio', 'nessuno mi ha richiamato', 'nessuno mi risponde', 'non mi avete mai richiamato', 'vi ho scritto e nessuno risponde', 'l agente e stato scortese', 'l agente non mi ha richiamato', 'e una vergogna'],
      keywords: ['reclamo', 'lamentarmi', 'lamentela', 'insoddisfatto', 'insoddisfatta', 'arrabbiato', 'arrabbiata', 'trattato male', 'trattata male', 'inaccettabile', 'deluso', 'delusa', 'vergogna', 'scortese', 'maleducato'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'parla_con_persona', nome: 'Richiesta di una persona', categoria: 'HUMAN_HANDOFF', priorita: 1, safety_level: 'LOW',
      descrizione: 'Il cliente chiede di parlare con una persona o con un agente.',
      esempi: ['voglio parlare con una persona', 'vorrei parlare con un agente', 'mi passate un agente', 'posso parlare con un consulente', 'chiamatemi', 'richiamatemi', 'posso parlare con qualcuno', 'vorrei parlare con il titolare', 'potete richiamarmi', 'mi richiamate', 'posso parlare con la segretaria', 'vorrei parlare con l agente'],
      keywords: ['operatore', 'segretaria'],
      required_entities: [], optional_entities: [], actions: ['human_handoff'] },
    { id: 'saluto', nome: 'Saluto', categoria: 'DISCOVERY', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Solo un saluto, senza richiesta.',
      esempi: ['ciao', 'buongiorno', 'buonasera', 'salve', 'buon pomeriggio', 'ehi', 'ciao a tutti', 'buondi'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
    { id: 'chiusura', nome: 'Ringraziamento o chiusura', categoria: 'FOLLOW_UP', priorita: 40, safety_level: 'LOW', solo_isolato: true,
      descrizione: 'Il cliente ringrazia o chiude la conversazione.',
      esempi: ['grazie', 'grazie mille', 'ok grazie', 'perfetto grazie', 'va bene', 'ok', 'a posto', 'ricevuto', 'ci sentiamo', 'grazie a presto', 'ottimo grazie'],
      keywords: [], required_entities: [], optional_entities: [], actions: ['answer_information'] },
  ],

  urgency_rules: {
    // CRITICAL: pericolo immediato per le persone -> escalation, risposta predefinita.
    critical: [
      'odore di gas', 'puzza di gas', 'fuga di gas', 'perdita di gas', 'c e un incendio', 'ce un incendio', 'e scoppiato un incendio', 'principio di incendio',
      'sta prendendo fuoco', 'ha preso fuoco', 'fiamme', 'sta crollando', 'soffitto crollato', 'e crollato il soffitto', 'crollato il soffitto', 'balcone crollato', 'e crollato il balcone',
      'ambulanza', 'si e fatto male', 'si e fatta male', 'mi sono fatto male', 'mi sono fatta male', 'scossa elettrica',
    ],
    // HIGH: urgenza reale ma non pericolo di vita -> priorità all'agenzia.
    high: [
      'allagamento', 'allagato', 'allagata', 'perdita d acqua', 'perdita di acqua', 'fuga d acqua', 'fuga di acqua', 'tubo rotto',
      'sfratto esecutivo', 'ufficiale giudiziario', 'ufficiali giudiziari', 'esecuzione dello sfratto', 'sfratto imminente',
      'sono entrati i ladri', 'sono entrati dei ladri', 'hanno forzato', 'porta forzata', 'bloccato in ascensore', 'bloccata in ascensore', 'bloccati in ascensore',
      'e urgentissimo', 'urgentissimo',
    ],
    // MEDIUM: situazione delicata ma non urgente.
    medium: [
      'sfratto', 'sfrattato', 'sfrattata', 'inquilino moroso', 'morosita', 'non paga l affitto', 'infiltrazioni',
    ],
  },

  escalation_rules: {
    handoff_triggers: [
      'parlare con una persona', 'parlare con un operatore', 'parlare con qualcuno', 'parlare con un agente', 'parlare con l agente', 'parlare con un consulente', 'parlare con il consulente',
      'parlare con il titolare', 'parlare con la segretaria', 'parlare con un umano', 'sentire una persona', 'sentire un agente', 'sentire qualcuno', 'in carne e ossa', 'parlare con un responsabile', 'parlare con il responsabile',
      'voglio una persona', 'passatemi qualcuno', 'mi passate qualcuno', 'mi passi qualcuno', 'mi passate un agente', 'chiamatemi', 'richiamatemi', 'mi richiamate', 'mi chiamate', 'potete richiamarmi', 'potete chiamarmi',
      'non sei una persona', 'sei un robot', 'sei un bot', 'sei umano', 'operatore', 'persona vera', 'persona reale',
      // pagamenti e caparre: mai in chat
      'mandami la caparra', 'mandami subito la caparra', 'mandatemi la caparra', 'inviami la caparra', 'inviatemi la caparra', 'versami la caparra', 'vi mando la caparra', 'ti mando la caparra', 'mando la caparra', 'invio la caparra', 'versare la caparra', 'caparra subito',
      'mandami i soldi', 'mandatemi i soldi', 'mandami un bonifico', 'iban', 'bonifico', 'postepay', 'western union', 'bloccare l appartamento', 'blocco l appartamento', 'bloccare l immobile',
      // aggiramento dell'agenzia / contatti del proprietario
      'numero del proprietario', 'nome del proprietario', 'cognome del proprietario', 'dati del proprietario', 'chi e il proprietario', 'recapito del proprietario', 'email del proprietario', 'indirizzo del proprietario', 'telefono del proprietario', 'contatto del proprietario', 'contattare direttamente il proprietario', 'parlare con il proprietario', 'parlare direttamente con il proprietario',
      'senza passare dall agenzia', 'evitare l agenzia', 'saltare l agenzia', 'senza pagare l agenzia',
      // sfratto esecutivo: priorità a una persona, nessuna consulenza legale
      'sfratto esecutivo', 'sfratto imminente', 'ufficiale giudiziario', 'ufficiali giudiziari', 'esecuzione dello sfratto',
    ],
    max_unknown_turns: 2,
    sensitive_insist: 2,
    messaggio_handoff: 'Certo, passo subito la sua richiesta a una persona dell\'agenzia, che la ricontatterà il prima possibile. Per pagamenti, caparre e dati bancari si procede solo con l\'agente.',
  },

  safety_rules: {
    sensibile: true,
    // Richieste che equivalgono a chiedere consulenza legale, fiscale,
    // finanziaria o una stima/giudizio sul valore di un immobile.
    diagnosi_patterns: [
      // legale
      'posso sfrattare', 'sfrattare l inquilino', 'sfrattare il mio inquilino', 'come sfrattare', 'posso mandare via l inquilino', 'mandare via l inquilino',
      'e legale', 'e lecito', 'il contratto e valido', 'e valido il contratto', 'e a norma di legge', 'ho diritto', 'posso recedere', 'recesso',
      'abuso edilizio', 'abusi edilizi', 'condono', 'diritto di prelazione', 'prelazione', 'avvocato', 'fare causa', 'denunciare', 'cosa rischio',
      'perdo la caparra', 'perdere la caparra', 'restituire la caparra', 'recuperare la caparra', 'riavere la caparra', 'posso tenere la caparra', 'e vincolante', 'sono vincolato', 'mi vincola',
      // fiscale
      'tasse', 'imu', 'plusvalenza', 'cedolare secca', 'imposta di registro', 'imposte', 'regime fiscale', 'detrarre', 'detrazione', 'detrazioni',
      'agevolazioni fiscali', 'agevolazioni prima casa', 'bonus prima casa', 'dichiarazione dei redditi', 'quanto pago di tasse',
      // finanziario
      'conviene il mutuo', 'conviene fare il mutuo', 'conviene accendere un mutuo', 'mi conviene', 'ti conviene', 'le conviene', 'conviene comprare', 'conviene affittare', 'conviene vendere', 'conviene investire',
      'quale mutuo', 'che mutuo', 'tasso fisso', 'tasso variabile', 'quanto mutuo', 'mi danno il mutuo', 'mi concedono il mutuo', 'mi daranno il mutuo', 'posso ottenere il mutuo', 'riesco ad avere il mutuo', 'riesco a ottenere il mutuo',
      'posso permettermi', 'e un buon investimento', 'e un investimento', 'rendimento', 'quanto rende', 'ci guadagno',
      // valore, stima e giudizio sul prezzo
      'e un buon prezzo', 'e un buon affare', 'e un affare', 'e un prezzo giusto', 'prezzo giusto', 'e giusto il prezzo', 'il prezzo e giusto', 'e troppo caro', 'e sopra il mercato', 'e sotto il mercato',
      'valore di mercato', 'prezzo di mercato', 'prezzi di mercato', 'quotazione', 'quotazioni', 'prezzo al metro quadro', 'prezzo al mq', 'prezzo al metro quadrato',
      'dimmi una cifra', 'una cifra indicativa', 'almeno una cifra', 'a spanne', 'piu o meno quanto vale', 'quanto vale piu o meno', 'quanto la vendo', 'a quanto la vendo',
    ],
    // Frasi che la RISPOSTA del modello non deve mai contenere (verificaRisposta).
    // Frasi AFFERMATIVE specifiche: una risposta che dica "non posso dirle se è
    // ancora disponibile" non deve essere bloccata.
    vietato: [
      // disponibilità garantita
      'si e ancora disponibile', 'si e ancora libero', 'si e ancora libera', 'e sicuramente disponibile', 'e sicuramente ancora disponibile', 'e ancora disponibile da subito', 'confermo che e disponibile', 'confermo la disponibilita', 'e libero da subito', 'non e stato venduto', 'non e ancora stato venduto', 'nessuno lo ha ancora preso',
      // stime e valore
      'il valore di mercato e', 'vale circa', 'vale sicuramente', 'vale oltre', 'la sua casa vale', 'il suo immobile vale', 'puo venderla a', 'puo chiedere circa', 'prezzo di mercato e', 'e in linea con il mercato', 'e sotto mercato', 'e sopra mercato', 'e un ottimo affare', 'e un buon affare', 'e un affare', 'e un ottimo prezzo', 'e un buon prezzo', 'e un buon investimento',
      // importi scritti a parole (la verifica numerica non li vede)
      'mila euro', 'milioni di euro', 'k euro',
      // consulenza legale/fiscale/finanziaria
      'le conviene', 'ti conviene', 'conviene sicuramente', 'puo sfrattare', 'puo sfrattarlo', 'non deve pagare tasse', 'non paga tasse', 'deve pagare l imu', 'otterra il mutuo', 'ottiene il mutuo', 'le daranno il mutuo', 'le concederanno il mutuo', 'puo recedere', 'ha diritto a',
      // caratteristiche/regolarità non in fonte
      'e in ottime condizioni', 'e in perfette condizioni', 'e in ottimo stato', 'e appena ristrutturato', 'non ha problemi di umidita', 'e libero da ipoteche', 'privo di abusi', 'nessun abuso edilizio', 'e in regola urbanisticamente', 'conforme urbanisticamente',
      // pagamenti e contatti
      'ecco l iban', 'ecco il numero del proprietario', 'mi mandi la caparra', 'versi la caparra', 'faccia un bonifico', 'ci mandi la caparra',
    ],
    messaggio_sicurezza: 'Su aspetti legali, fiscali o finanziari, sul valore di un immobile e su pagamenti o caparre non posso darle indicazioni: servono l\'agente o il professionista competente (notaio, commercialista, consulente). Se vuole, passo la sua richiesta a un agente dell\'agenzia.',
    messaggio_emergenza: 'Capisco, la situazione sembra seria. Se c\'è un pericolo immediato per le persone (gas, incendio, crolli, malore) chiami subito il 112 oppure i Vigili del Fuoco al 115. Avviso subito l\'agenzia.',
  },

  response_rules: { max_frasi: 3, una_domanda_per_messaggio: true, emoji: 'mai' },

  default_questions: {
    operazione: ['Cerca un immobile da comprare o da prendere in affitto?', 'Mi dice se le interessa l\'acquisto o l\'affitto?'],
    tipologia: ['Di che tipo di immobile si tratta (per esempio bilocale, trilocale, villa, locale commerciale)?', 'Che tipologia di immobile le interessa?', 'Mi dice che tipo di immobile è?'],
    codice_annuncio: ['Mi indica il codice dell\'annuncio (o l\'indirizzo dell\'immobile)?', 'Di quale immobile si tratta? Mi basta il codice annuncio o l\'indirizzo.', 'Quale annuncio le interessa?'],
    zona: ['In che zona o quartiere?', 'In quale zona le interesserebbe, o dove si trova l\'immobile?', 'Mi dice la zona o il quartiere?'],
    budget: ['Che budget ha in mente, indicativamente?', 'Su che cifra massima vorrebbe orientarsi (prezzo o canone mensile)?', 'Quanto vorrebbe spendere al massimo, più o meno?'],
    nome_cliente: ['Come si chiama?', 'Mi dice il suo nome, così preparo la richiesta per l\'agente?', 'A che nome registro la richiesta?'],
  },

  common_scenarios: [
    'Lead di acquisto: tipologia, zona, budget, contatto',
    'Lead di affitto: tipologia, zona, canone massimo, contatto',
    'Proprietario che vuole vendere o affittare: raccolta dati per la valutazione dell\'agente',
    'Visita a un immobile da annuncio: codice annuncio, nome, preferenze di giorno',
    'Domande su prezzi, commissioni, orari, disponibilità: solo da dati del tenant',
    'Richieste legali, fiscali, finanziarie o di stima del valore: risposta di sicurezza e passaggio all\'agente',
    'Caparre, IBAN, contatti del proprietario: passaggio a una persona',
    'Spostamenti, annullamenti, reclami, sfratto esecutivo: passaggio a una persona',
  ],

  confidence_thresholds: { intent_min: 0.55, intent_ok: 0.8 },
};

// FAQ di SETTORE: conoscenza generale, valida per qualunque agenzia. Nessun
// prezzo, canone, valore di mercato, commissione, nome, orario o indirizzo:
// quelli stanno solo nei dati del tenant.
const f = (intent, domanda_canonica, varianti, risposta_base) => ({ intent, domanda_canonica, varianti, risposta_base, condizioni: {} });

export const faq = [
  f('info_processo', 'Cos\'è l\'APE?', ['cosa e l ape', 'cos e l ape', 'a cosa serve l ape', 'cos e l attestato di prestazione energetica', 'cosa significa ape', 'serve l ape'],
    'L\'APE (Attestato di Prestazione Energetica) è il documento che indica la classe energetica di un immobile, cioè quanto consuma in modo convenzionale per riscaldamento, raffrescamento e acqua calda. In genere va indicata negli annunci di vendita e affitto. Per i dati di un immobile specifico faccia riferimento all\'agente.'),
  f('info_processo', 'Cos\'è la classe energetica?', ['cosa e la classe energetica', 'cos e la classe energetica', 'cosa significa classe energetica', 'che cosa indica la classe energetica', 'cosa indica la classe energetica'],
    'La classe energetica è una sigla che indica l\'efficienza energetica dell\'immobile ed è riportata nell\'APE. Più la classe è efficiente, minori sono in genere i consumi previsti. La classe di un immobile specifico va verificata sull\'APE o con l\'agente.'),
  f('info_processo', 'Qual è la differenza tra compromesso e rogito?', ['differenza tra compromesso e rogito', 'che differenza c e tra compromesso e rogito', 'cos e il compromesso', 'cos e il rogito', 'cosa e il rogito', 'cosa e il compromesso', 'cosa significa rogito', 'cosa significa compromesso', 'differenza tra preliminare e rogito'],
    'Il compromesso (contratto preliminare) è l\'accordo con cui venditore e acquirente si impegnano a concludere la compravendita a certe condizioni. Il rogito è l\'atto notarile definitivo con cui la proprietà passa all\'acquirente. Per gli aspetti legali del suo caso è necessario il notaio.'),
  f('info_processo', 'Cos\'è una proposta d\'acquisto?', ['cos e una proposta d acquisto', 'cosa e una proposta d acquisto', 'come funziona la proposta d acquisto', 'cos e la proposta di acquisto', 'cosa significa proposta d acquisto', 'come funziona la proposta di acquisto'],
    'La proposta d\'acquisto è la dichiarazione scritta con cui chi vuole comprare indica l\'offerta e le condizioni. Se il venditore la accetta si prosegue con i passaggi successivi, di solito il preliminare. Condizioni e tutele vanno chiarite con l\'agente e, per gli aspetti legali, con il notaio.'),
  f('info_processo', 'Cos\'è la caparra?', ['cos e la caparra', 'cosa e la caparra', 'cosa significa caparra', 'a cosa serve la caparra', 'cos e la caparra confirmatoria', 'cosa e la caparra confirmatoria'],
    'La caparra è una somma che chi compra o affitta versa a garanzia dell\'accordo; le conseguenze dipendono dal tipo di caparra e da quanto previsto dal contratto. Importi e condizioni vanno chiariti con l\'agente e con un professionista prima di qualsiasi pagamento: in chat non si gestiscono pagamenti.'),
  f('info_processo', 'Come funziona una valutazione immobiliare?', ['come funziona una valutazione', 'come funziona la valutazione', 'come si valuta un immobile', 'come funziona la stima della casa', 'come viene valutata la casa', 'come si fa la valutazione dell immobile', 'cos e una valutazione immobiliare', 'come funziona la valutazione dell immobile'],
    'Una valutazione serve a stimare il valore di un immobile: l\'agente raccoglie i dati (zona, metratura, stato, caratteristiche), in genere fa un sopralluogo e confronta l\'immobile con il mercato della zona. Senza questi passaggi non si può indicare una cifra, per questo in chat non posso darle stime.'),
  f('info_processo', 'Cosa sono le spese condominiali?', ['cosa sono le spese condominiali', 'cosa sono le spese di condominio', 'cosa comprendono le spese condominiali', 'cosa sono le spese condominio', 'cosa vuol dire spese condominiali'],
    'Le spese condominiali sono i costi di gestione delle parti comuni dell\'edificio (per esempio pulizia, ascensore, illuminazione, amministratore) e si ripartiscono tra i condomini. L\'importo cambia da edificio a edificio: per un immobile specifico lo comunica l\'agente sulla base dei dati disponibili.'),
  f('info_processo', 'Cosa significano monolocale, bilocale e trilocale?', ['differenza tra bilocale e trilocale', 'cos e un bilocale', 'cos e un trilocale', 'cosa significa bilocale', 'cosa significa trilocale', 'cos e un monolocale', 'differenza tra monolocale e bilocale'],
    'Il nome indica il numero di ambienti principali: il monolocale ha un unico ambiente, il bilocale due (di solito zona giorno e camera), il trilocale tre, il quadrilocale quattro. La disposizione degli spazi cambia da immobile a immobile.'),
  f('info_processo', 'Che differenza c\'è tra superficie calpestabile e commerciale?', ['differenza tra superficie calpestabile e commerciale', 'cos e la superficie commerciale', 'cos e la superficie calpestabile', 'cosa significa superficie commerciale', 'perche i metri quadri cambiano'],
    'La superficie calpestabile è quella effettivamente utilizzabile all\'interno dell\'immobile; la superficie commerciale comprende anche i muri e una quota di pertinenze (come balconi o cantine) con appositi coefficienti. Per questo i metri quadri indicati possono differire a seconda del criterio.'),
  f('info_processo', 'Cos\'è la planimetria catastale e la visura?', ['cos e la planimetria', 'cos e la visura catastale', 'cosa e la planimetria catastale', 'cosa significa visura', 'cos e la visura', 'a cosa serve la visura catastale'],
    'La planimetria catastale è il disegno dell\'immobile depositato al catasto; la visura catastale riporta i dati catastali (identificativi, rendita, intestatari). Sono documenti usuali nelle compravendite, e l\'agente indica quali servono nel suo caso.'),
  f('info_processo', 'Cos\'è la nuda proprietà?', ['cosa e la nuda proprieta', 'cos e la nuda proprieta', 'cosa significa nuda proprieta', 'cos e l usufrutto', 'cosa significa usufrutto'],
    'Nella nuda proprietà si diventa proprietari ma non si può usare l\'immobile finché dura il diritto di usufrutto di un\'altra persona (di solito il venditore). Condizioni e valutazioni vanno esaminate caso per caso con l\'agente e con il notaio.'),
  f('info_processo', 'Cosa significa immobile libero o locato?', ['cosa significa libero', 'cosa vuol dire immobile locato', 'cosa significa locato', 'cosa significa immobile libero', 'cosa vuol dire libero subito', 'cosa significa libero subito'],
    'Un immobile "libero" non è occupato; "locato" significa che c\'è già un contratto di affitto in corso con un inquilino. Se un immobile specifico sia libero o locato, e da quando, lo conferma solo l\'agente.'),
  f('info_processo', 'Che tipi di contratto di affitto esistono?', ['che tipi di contratto di affitto esistono', 'quali contratti di affitto esistono', 'tipi di contratto di locazione', 'differenza tra canone libero e concordato', 'cos e il canone concordato', 'cos e un contratto transitorio', 'cos e il contratto per studenti'],
    'Per le abitazioni esistono diverse tipologie di contratto di locazione (per esempio a canone libero, a canone concordato, transitorio, per studenti), con durata e condizioni diverse. L\'agente può spiegarle quali sono adatte alla situazione; per gli aspetti legali e fiscali serve un professionista.'),
  f('info_documenti', 'Che documenti servono per vendere casa?', ['che documenti servono per vendere casa', 'documenti per vendere casa', 'documenti per vendere un immobile', 'cosa serve per vendere casa', 'cosa serve per mettere in vendita', 'che documenti servono per vendere', 'quali documenti per vendere l appartamento'],
    'In genere servono i documenti di proprietà (titolo di provenienza), planimetria e visura catastale, l\'APE e la documentazione sulla conformità urbanistica e catastale. L\'agente le indica l\'elenco preciso per il suo immobile.'),
  f('info_documenti', 'Che documenti servono per prendere in affitto?', ['che documenti servono per affittare', 'cosa serve per prendere in affitto', 'documenti per un affitto', 'cosa mi serve per affittare casa', 'documenti per affittare', 'cosa serve per affittare'],
    'In genere chi cerca in affitto presenta un documento d\'identità, il codice fiscale e documenti che mostrino la capacità di sostenere il canone (per esempio contratto di lavoro o buste paga). I requisiti precisi li stabilisce il proprietario: li verifichi con l\'agente.'),
  f('info_documenti', 'Che documenti servono per comprare casa?', ['che documenti servono per comprare', 'documenti per comprare casa', 'cosa serve per comprare casa', 'cosa serve per acquistare un immobile', 'documenti per acquistare'],
    'Per fare una proposta d\'acquisto di solito bastano documento d\'identità e codice fiscale. Per le fasi successive, l\'agente e il notaio indicano la documentazione necessaria.'),
  f('info_mutuo', 'Cos\'è un mutuo?', ['cos e un mutuo', 'cosa e un mutuo', 'come funziona il mutuo', 'come funziona un mutuo', 'cosa significa mutuo', 'cos e il mutuo'],
    'Il mutuo è un finanziamento a medio-lungo termine, di solito erogato da una banca, per acquistare un immobile e restituito a rate. Condizioni e requisiti sono stabiliti dalla banca: per capire cosa è adatto al suo caso serve un consulente o la banca stessa, io non posso fare valutazioni finanziarie.'),
  f('info_processo', 'Come funziona la visita a un immobile?', ['come funziona la visita', 'come funziona la visita di un immobile', 'cosa succede durante la visita', 'come si svolge la visita', 'come si svolge una visita'],
    'La visita è l\'occasione per vedere l\'immobile con un agente e fare domande su caratteristiche, spese e documenti. Conviene preparare in anticipo le domande più importanti. Date e disponibilità si concordano con l\'agenzia.'),
  f('info_processo', 'Cosa vuol dire trattativa riservata o a trattativa?', ['cosa significa trattativa riservata', 'cosa vuol dire trattativa riservata', 'cos e la trattativa riservata', 'cosa significa prezzo a trattativa'],
    '"Trattativa riservata" indica in genere che il prezzo non è pubblicato nell\'annuncio e viene comunicato su richiesta. Per un immobile specifico, prezzo e condizioni li fornisce l\'agente.'),
];
