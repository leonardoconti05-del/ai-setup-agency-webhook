// lib/engine/state.js
//
// Stato strutturato della conversazione, salvato in
// richieste_clienti.dati_raccolti._stato (le chiavi con "_" sono già ignorate
// da dashboard/notifiche/estrazione: nessuna regressione sui consumatori
// esistenti). Si aggiorna a ogni turno e NON viene mai azzerato dal cliente
// che si corregge: un valore nuovo sostituisce il vecchio ("no, intendevo
// giovedì"), il resto resta.

export function statoIniziale() {
  return {
    intent: 'unknown', sub_intent: null, entities: {}, missing_entities: [], urgency: 'LOW',
    confidence: 0, conversation_stage: 'greeting', next_best_question: null,
    turns: 0, unknown_turns: 0, sensitive_turns: 0, ultima_azione: null,
  };
}

const vuoto = (v) => v === null || v === undefined || v === '';

// Il motore riparte dai dati già raccolti del cliente (es. nome già noto, salvato dal
// flusso precedente o da un turno in cui il motore non lo aveva ancora): senza questo
// richiederebbe di nuovo ciò che già sappiamo. Si usano solo le chiavi note al pack/tenant
// (idAmmessi). Lo stato del motore, se esiste, PREVALE sui dati salvati (una correzione
// del cliente non viene annullata). Ritorna undefined se non c'è né stato né dati noti.
export function statoConDatiNoti(statoPrecedente, dati, idAmmessi = []) {
  const ammessi = new Set(idAmmessi);
  const noti = {};
  for (const [k, v] of Object.entries(dati || {})) {
    if (k.startsWith('_') || k === 'urgente' || !ammessi.has(k) || vuoto(v) || typeof v === 'object') continue;
    noti[k] = v;
  }
  if (!statoPrecedente) return Object.keys(noti).length ? { ...statoIniziale(), entities: noti } : undefined;
  return Object.keys(noti).length ? { ...statoPrecedente, entities: { ...noti, ...(statoPrecedente.entities || {}) } } : statoPrecedente;
}

export function unisciEntita(precedenti = {}, nuove = {}) {
  const out = { ...precedenti };
  for (const [k, v] of Object.entries(nuove)) if (!vuoto(v)) out[k] = v;
  return out;
}

// Entità richieste dall'intent: le `required_entities` definite dal pack.
// I campi_da_raccogliere del tenant si aggiungono SOLO se l'intent lo
// dichiara (`campi_tenant: true`): così un campo generico del tenant (es.
// "livello di dolore") non viene preteso per una prenotazione di igiene.
// Ordine = priorità dell'entità nel pack, poi ordine dei campi tenant: la
// domanda successiva è la prima della lista.
export function entitaRichieste(intent, pack, campiTenant = []) {
  const def = (pack.intents || []).find((i) => i.id === intent);
  if (!def) return [];
  const richieste = [...(def.required_entities || [])];
  if (def.campi_tenant === true) for (const c of campiTenant) if (!richieste.includes(c)) richieste.push(c);
  const prio = (id) => (pack.entities || []).find((e) => e.id === id)?.priorita ?? 50;
  const ordineTenant = (id) => campiTenant.indexOf(id);
  return richieste.sort((a, b) => prio(a) - prio(b) || ordineTenant(a) - ordineTenant(b));
}

export function aggiornaStato(precedente, { intent, confidence, entities, urgency, concepts }, pack, campiTenant) {
  const s = { ...statoIniziale(), ...(precedente || {}) };
  s.turns += 1;
  s.entities = unisciEntita(s.entities, entities);
  const intentPrec = s.intent;
  // Un intent "operativo" già in corso non viene sostituito da un messaggio
  // generico/sconosciuto ("sabato mattina"): il turno continua il precedente.
  if (intent === 'unknown' && intentPrec !== 'unknown') {
    // Continuazione: il messaggio ("Mi chiamo Sara", "giovedì mattina") non ha
    // un intent proprio ma completa quello già in corso. La confidenza resta
    // quella con cui l'intent era stato stabilito (se lo stato non la riporta,
    // un intent già impostato vale come stabilito).
    s.confidence = s.confidence > 0 ? s.confidence : (pack.confidence_thresholds?.intent_ok ?? 0.8);
  } else {
    s.intent = intent;
    s.confidence = confidence;
  }
  s.urgency = urgency;
  s.unknown_turns = intent === 'unknown' && intentPrec === 'unknown' ? s.unknown_turns + 1 : (intent === 'unknown' ? s.unknown_turns : 0);
  s.concepts = [...new Set([...(s.concepts || []), ...(concepts || [])])];
  const richieste = entitaRichieste(s.intent, pack, campiTenant);
  s.missing_entities = richieste.filter((e) => vuoto(s.entities[e]));
  s.next_best_question = s.missing_entities[0] || null;
  s.conversation_stage = s.urgency === 'CRITICAL' ? 'escalation'
    : s.missing_entities.length > 0 && richieste.length > 0 ? 'qualification'
    : richieste.length > 0 ? 'ready' : 'information';
  return s;
}
