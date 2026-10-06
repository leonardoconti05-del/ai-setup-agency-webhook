// lib/engine/run.js
//
// Cuore PURO del motore (nessuna rete, nessun LLM qui dentro): dato un
// messaggio, il pack di settore e lo stato precedente produce analisi,
// nuovo stato e azione decisa. L'LLM entra solo come input opzionale
// (`llm`) già ottenuto da chi chiama. Essendo puro, è lo stesso codice usato
// sia in produzione (api/whatsapp.js) sia dalla valutazione offline
// (lib/engine/evaluate.js): quello che si testa è quello che gira.

import { normalizza } from './text.js';
import { estraiEntitaDeterministiche } from './entities.js';
import { rilevaIntento, trovaFaq } from './intent.js';
import { classificaMessaggio, maxLivello } from './safety.js';
import { aggiornaStato } from './state.js';
import { decidiProssimaAzione, sceltaDomanda } from './actions.js';

export function analisiDeterministica({ messaggio, pack, indice }) {
  const norm = normalizza(messaggio);
  const { entities, concepts } = estraiEntitaDeterministiche(messaggio, indice, { nomeEntita: pack.identity.entita_nome });
  const intent = rilevaIntento(norm, indice, concepts, entities);
  const sicurezza = classificaMessaggio(norm, indice);
  const faq = trovaFaq(norm, indice);
  return { norm, entities, concepts, intent, sicurezza, faq };
}

// Combina analisi deterministica e (se presente) analisi LLM.
export function pianifica({ det, llm = null, statoPrecedente, pack, campiTenant = [], tenant = {} }) {
  const t = pack.confidence_thresholds;
  const entitaAmmesse = new Set([...(pack.entities || []).map((e) => e.id), ...campiTenant]);

  // Entità: prima LLM (solo chiavi ammesse), poi deterministiche sopra
  // (valori canonici dal lessico: fonte di verità del settore).
  const entities = {};
  if (llm?.entities && typeof llm.entities === 'object') {
    for (const [k, v] of Object.entries(llm.entities)) {
      if (entitaAmmesse.has(k) && v !== null && v !== undefined && v !== '') entities[k] = v;
    }
  }
  Object.assign(entities, det.entities);

  // Intent
  let intent = det.intent.intent;
  let confidence = det.intent.confidence;
  const llmIntentValido = llm && pack.intents.some((i) => i.id === llm.intent);
  if (confidence < t.intent_ok && llmIntentValido) {
    const c = Math.min(0.95, Number(llm.confidence) || 0);
    if (llm.intent === intent) confidence = Math.max(confidence, c);
    else if (c >= t.intent_min && c > confidence) { intent = llm.intent; confidence = c; }
  }
  if (confidence < t.intent_min) { intent = 'unknown'; }

  // Sicurezza: la più severa tra regole del pack e valutazione LLM.
  let urgenza = det.sicurezza.level;
  if (llm?.urgency) urgenza = maxLivello(urgenza, llm.urgency);
  // Un'urgenza clinica rilevata dalle regole (HIGH) prevale su un intent
  // debole o generico: "ho un dolore insopportabile" è un'urgenza anche se
  // nessuna frase d'esempio coincide.
  const intentEmergenza = pack.intents.find((i) => i.categoria === 'EMERGENCY');
  if (intentEmergenza && ['HIGH', 'CRITICAL'].includes(det.sicurezza.level)) {
    const catAttuale = pack.intents.find((i) => i.id === intent)?.categoria;
    if (intent === 'unknown' || (catAttuale !== 'EMERGENCY' && confidence < t.intent_ok)) {
      intent = intentEmergenza.id;
      confidence = Math.max(confidence, t.intent_ok);
    }
  }
  const def = pack.intents.find((i) => i.id === intent);
  if (def?.categoria === 'EMERGENCY') urgenza = maxLivello(urgenza, 'HIGH');
  const sicurezza = {
    ...det.sicurezza,
    level: urgenza,
    richiestaUmano: det.sicurezza.richiestaUmano || llm?.richiede_persona === true,
    richiestaSensibile: det.sicurezza.richiestaSensibile || llm?.richiesta_sensibile === true,
  };

  const secondari = det.intent.secondari || [];
  const stato = aggiornaStato(statoPrecedente, { intent, confidence, entities, urgency: urgenza, concepts: det.concepts }, pack, campiTenant);
  stato.intent_secondari = secondari.filter((i) => i !== intent);
  // Intent di QUESTO messaggio (prima della continuazione dell'intent precedente): serve a distinguere
  // "vorrei un altro appuntamento" da "grazie, a presto" quando lo stato porta ancora l'intent di prenotazione.
  stato.intent_turno = intent;
  if (sicurezza.richiestaSensibile) stato.sensitive_turns = (stato.sensitive_turns || 0) + 1;

  const azione = decidiProssimaAzione({ stato, sicurezza, faqTrovata: det.faq?.faq || null, pack, tenant });
  stato.ultima_azione = azione.action;
  return { stato, azione, sicurezza, faq: det.faq?.faq || null, riassunto: llm?.riassunto || null };
}

// ===== Risposte senza LLM (sicure, a costo zero) =====
export function rispostaTemplate({ azione, stato, pack, config }) {
  const tel = config?.info_generali?.telefono_alternativo || config?.contatto_escalation;
  if (azione.action === 'emergency_escalation') {
    const base = pack.safety_rules?.messaggio_emergenza || 'Capisco, sembra urgente. Metto subito la sua richiesta in priorità allo staff.';
    return tel && !base.includes(String(tel)) ? `${base} Se non riesce ad attendere, può chiamare direttamente il ${tel}.` : base;
  }
  if (azione.action === 'human_handoff') {
    return pack.escalation_rules?.messaggio_handoff || 'Va bene, passo la sua richiesta a una persona del team che la ricontatterà il prima possibile.';
  }
  return null;
}

// Fallback deterministico quando l'LLM fallisce o la risposta viola le regole.
export function rispostaFallback({ azione, stato, pack, campiTenant = [] }) {
  if (azione.action === 'ask_missing_information') {
    if (azione.clarify) return 'Non sono sicuro di aver capito: può spiegarmi meglio cosa le serve?';
    const q = sceltaDomanda(azione.next_question_entity, pack, campiTenant, stato.turns);
    return q ? `Certo. ${q}` : 'Certo. Può darmi qualche dettaglio in più?';
  }
  if (azione.strategy === 'safety') {
    return pack.safety_rules?.messaggio_sicurezza || 'Per una valutazione serve il professionista: posso aiutarla a fissare un appuntamento.';
  }
  if (azione.action === 'answer_information') {
    return 'Per questa informazione preferisco verificare con il team, così le do una risposta sicura. Intanto posso aiutarla con altro?';
  }
  if (['propose_slot', 'create_lead', 'save_request', 'notify_owner', 'search_calendar'].includes(azione.action)) {
    return 'Perfetto, ho tutte le informazioni.';
  }
  return 'Mi scusi, può ripetere?';
}

// Pratica di handoff: tutto ciò che serve al titolare per riprendere la
// conversazione (cliente, motivo, riassunto, dati raccolti, mancanti, urgenza,
// azione suggerita). Salvata in dati_raccolti._handoff e inviata via Telegram.
export function costruisciHandoff({ azione, stato, riassunto, ultimoMessaggio }) {
  return {
    motivo: azione.reason,
    tipo: azione.escalation || 'handoff',
    riassunto: riassunto || `Ultimo messaggio del cliente: "${String(ultimoMessaggio || '').slice(0, 200)}"`,
    intent: stato.intent,
    urgenza: stato.urgency,
    dati_raccolti: stato.entities,
    dati_mancanti: stato.missing_entities,
    azione_suggerita: azione.escalation === 'emergency' ? 'Richiamare subito il cliente' : 'Contattare il cliente e proseguire la richiesta',
    creato_il: new Date().toISOString(),
  };
}
