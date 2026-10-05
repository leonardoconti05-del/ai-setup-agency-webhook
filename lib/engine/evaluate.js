// lib/engine/evaluate.js
//
// Evaluation Engine. Esegue gli scenari di un settore sul motore REALE
// (analisiDeterministica + pianifica + verificaRisposta: lo stesso codice di
// produzione) e calcola le metriche. Non usa LLM: è veloce, gratuita e
// deterministica, quindi può girare a ogni modifica (regressione) e
// bloccare la promozione di un pack che peggiora il comportamento.
//
// COSA MISURA: il livello deterministico (lessico, regole, intent, stato,
// azione, sicurezza, anti-allucinazione, isolamento). COSA NON MISURA: la
// qualità del testo generato dal modello né l'accuratezza dell'analisi LLM
// sui messaggi reali — richiedono una valutazione "live" con chiamate API
// (vedi docs/SECTOR_ENGINE.md, sezione limiti).
//
// Formato scenario (sector_test_scenarios.scenario):
// {
//   input: "testo del cliente",
//   stato_prima?: { entities, intent, turns, unknown_turns, sensitive_turns },
//   tenant?: { campi: [...], haCalendario: bool, testo_consentito: "..." },
//   candidate_reply?: "risposta del modello da verificare (anti-allucinazione)",
//   expected: { intent?, entities?: {k: v}, action?, safety?: 'LOW'..,
//               escalation?: bool, next_question?: id, reply_blocked?: bool,
//               isolation_no_leak?: [stringhe che NON devono comparire] }
// }

import { analisiDeterministica, pianifica } from './run.js';
import { verificaRisposta } from './safety.js';
import { statoIniziale } from './state.js';
import { testoConsentito } from './prompt.js';

export const SOGLIE_GATE = {
  intent_accuracy: 90, entity_accuracy: 90, action_accuracy: 90, safety_compliance: 100,
  escalation_accuracy: 95, hallucination_rate_max: 0, tenant_isolation: 100, booking_accuracy: 90,
};

export function eseguiScenario(sc, { pack, indice }) {
  const tenant = sc.tenant || {};
  const campi = tenant.campi || [];
  const stato0 = { ...statoIniziale(), ...(sc.stato_prima || {}) };
  const det = analisiDeterministica({ messaggio: sc.input, pack, indice });
  const { stato, azione, sicurezza } = pianifica({ det, statoPrecedente: stato0, pack, campiTenant: campi, tenant: { haCalendario: tenant.haCalendario !== false } });
  const exp = sc.expected || {};
  const esiti = {};

  if (exp.intent !== undefined) esiti.intent = stato.intent === exp.intent;
  if (exp.entities) {
    esiti.entities = Object.entries(exp.entities).every(([k, v]) => String(stato.entities[k]).toLowerCase() === String(v).toLowerCase());
  }
  if (exp.action !== undefined) esiti.action = azione.action === exp.action;
  if (exp.safety !== undefined) esiti.safety = stato.urgency === exp.safety;
  if (exp.escalation !== undefined) {
    esiti.escalation = (['emergency_escalation', 'human_handoff'].includes(azione.action)) === exp.escalation;
  }
  if (exp.next_question !== undefined) esiti.next_question = (stato.next_best_question === exp.next_question) && azione.action === 'ask_missing_information';

  if (sc.candidate_reply !== undefined) {
    const consentito = testoConsentito({ config: { info_generali: tenant.info_generali || {} }, servizi: tenant.servizi || [], messaggio: sc.input, extra: tenant.testo_consentito || '' });
    const v = verificaRisposta(sc.candidate_reply, { pack, testoConsentito: consentito });
    esiti.reply_blocked = exp.reply_blocked === undefined ? undefined : (!v.ok) === exp.reply_blocked;
    if (esiti.reply_blocked === undefined) delete esiti.reply_blocked;
  }
  if (exp.isolation_no_leak) {
    // Il contesto che il motore costruisce per questo tenant non deve mai
    // contenere testo di altri tenant: si verifica sul testo consentito.
    const consentito = testoConsentito({ config: { info_generali: tenant.info_generali || {} }, servizi: tenant.servizi || [], messaggio: sc.input, extra: tenant.testo_consentito || '' });
    esiti.isolation = exp.isolation_no_leak.every((x) => !consentito.includes(x));
  }
  const passato = Object.values(esiti).every(Boolean);
  return { passato, esiti, osservato: { intent: stato.intent, confidence: stato.confidence, entities: stato.entities, urgency: stato.urgency, action: azione.action, next_question: stato.next_best_question, strategy: azione.strategy, sicurezza: sicurezza.level } };
}

const pct = (ok, tot) => (tot === 0 ? null : Math.round((ok / tot) * 1000) / 10);

export function valutaPack({ pack, indice, scenari }) {
  const dettagli = [];
  const c = { intent: [0, 0], entities: [0, 0], action: [0, 0], safety: [0, 0], escalation: [0, 0], isolation: [0, 0], booking: [0, 0], halluc: [0, 0], nextq: [0, 0] };
  for (const s of scenari) {
    const r = eseguiScenario(s.scenario ?? s, { pack, indice });
    const sc = s.scenario ?? s;
    const cat = s.categoria || sc.categoria;
    dettagli.push({ codice: s.codice || sc.codice, categoria: cat, passato: r.passato, esiti: r.esiti, osservato: r.osservato, input: sc.input });
    for (const [k, mapKey] of [['intent', 'intent'], ['entities', 'entities'], ['action', 'action'], ['safety', 'safety'], ['escalation', 'escalation'], ['isolation', 'isolation'], ['next_question', 'nextq'], ['reply_blocked', 'halluc']]) {
      if (r.esiti[k] !== undefined) { c[mapKey][1]++; if (r.esiti[k]) c[mapKey][0]++; }
    }
    if (cat === 'BOOKING') {
      for (const v of Object.values(r.esiti)) { c.booking[1]++; if (v) c.booking[0]++; }
    }
  }
  const metriche = {
    intent_accuracy: pct(...c.intent),
    entity_accuracy: pct(...c.entities),
    action_accuracy: pct(...c.action),
    safety_compliance: pct(...c.safety),
    escalation_accuracy: pct(...c.escalation),
    tenant_isolation: pct(...c.isolation),
    booking_accuracy: pct(...c.booking),
    next_question_accuracy: pct(...c.nextq),
    // tasso di allucinazioni NON bloccate: quante risposte inventate sono passate
    hallucination_rate: c.halluc[1] === 0 ? null : pct(c.halluc[1] - c.halluc[0], c.halluc[1]),
    scenari_applicabili: { ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v[1]])) },
  };
  const passati = dettagli.filter((d) => d.passato).length;
  const g = SOGLIE_GATE;
  const ok = (v, min) => v === null || v >= min;
  const gate_passed =
    ok(metriche.intent_accuracy, g.intent_accuracy) && ok(metriche.entity_accuracy, g.entity_accuracy) &&
    ok(metriche.action_accuracy, g.action_accuracy) && ok(metriche.safety_compliance, g.safety_compliance) &&
    ok(metriche.escalation_accuracy, g.escalation_accuracy) && ok(metriche.tenant_isolation, g.tenant_isolation) &&
    ok(metriche.booking_accuracy, g.booking_accuracy) && (metriche.hallucination_rate === null || metriche.hallucination_rate <= g.hallucination_rate_max);
  const score = Math.round([metriche.intent_accuracy, metriche.entity_accuracy, metriche.action_accuracy, metriche.safety_compliance, metriche.escalation_accuracy].filter((x) => x !== null).reduce((a, b, _, arr) => a + b / arr.length, 0) * 10) / 10;
  return { totale: scenari.length, passati, metriche, score, gate_passed, falliti: dettagli.filter((d) => !d.passato), dettagli };
}

// Confronto tra due valutazioni (es. Sector v1 vs v2): una regressione è
// qualunque metrica che peggiora. La promozione va bloccata se ce n'è una.
export function confrontaValutazioni(prima, dopo) {
  const regressioni = [];
  const miglioramenti = [];
  for (const k of Object.keys(SOGLIE_GATE).map((x) => x.replace('_max', ''))) {
    const a = prima.metriche[k]; const b = dopo.metriche[k];
    if (a === null || a === undefined || b === null || b === undefined) continue;
    const peggiora = k === 'hallucination_rate' ? b > a : b < a;
    const migliora = k === 'hallucination_rate' ? b < a : b > a;
    if (peggiora) regressioni.push({ metrica: k, prima: a, dopo: b });
    if (migliora) miglioramenti.push({ metrica: k, prima: a, dopo: b });
  }
  const codiciPrima = new Set(prima.dettagli.filter((d) => d.passato).map((d) => d.codice));
  const scenariRotti = dopo.dettagli.filter((d) => !d.passato && codiciPrima.has(d.codice)).map((d) => d.codice);
  return { regressioni, miglioramenti, scenariRotti, promuovibile: regressioni.length === 0 && scenariRotti.length === 0 };
}
