// lib/engine/actions.js
//
// Next Best Action / Next Best Question: DECIDE cosa fare, separatamente da
// cosa dire. Funzione pura (stato + pack + contesto tenant -> azione):
// testabile senza LLM e senza rete.
//
// Ordine delle regole (la prima che scatta vince):
//  1. urgenza CRITICAL                       -> emergency_escalation
//  2. il cliente chiede una persona          -> human_handoff
//  3. reclamo / annullamento / spostamento   -> human_handoff (il sistema non
//     modifica prenotazioni esistenti: non fingiamo di poterlo fare)
//  4. richiesta sensibile (diagnosi...)      -> risposta di sicurezza; se
//     insiste oltre soglia                   -> human_handoff
//  5. confidenza troppo bassa                -> chiarimento; ripetuta -> handoff
//  6. intent informativo                     -> answer_information
//  7. intent di raccolta (booking/lead)      -> prossima informazione mancante,
//     poi calendario (se collegato e non urgente) oppure create_lead/notify_owner

export function sceltaDomanda(entityId, pack, campiTenant, turno = 0) {
  const def = (pack.entities || []).find((e) => e.id === entityId);
  const varianti = pack.default_questions?.[entityId] || def?.domanda_varianti || [];
  if (varianti.length > 0) return varianti[turno % varianti.length];
  const dalTenant = campiTenant.find((c) => (typeof c === 'string' ? c === entityId : c.campo === entityId));
  if (dalTenant && typeof dalTenant === 'object' && dalTenant.domanda) return dalTenant.domanda;
  return null;
}

export function decidiProssimaAzione({ stato, sicurezza, faqTrovata, pack, tenant = {} }) {
  const t = pack.confidence_thresholds;
  const intentDef = (pack.intents || []).find((i) => i.id === stato.intent);
  const esc = pack.escalation_rules || {};
  const out = (action, strategy, extra = {}) => ({ action, strategy, reason: extra.reason || null, ...extra });

  if (stato.urgency === 'CRITICAL' || sicurezza?.level === 'CRITICAL') {
    return out('emergency_escalation', 'escalation', { reason: 'urgenza_critica', escalation: 'emergency' });
  }
  if (sicurezza?.richiestaUmano) {
    return out('human_handoff', 'human_handoff', { reason: 'richiesta_persona', escalation: 'handoff' });
  }
  if (intentDef && ['COMPLAINT', 'CANCELLATION', 'RESCHEDULE', 'HUMAN_HANDOFF'].includes(intentDef.categoria)) {
    return out('human_handoff', 'human_handoff', { reason: `intent_${intentDef.categoria.toLowerCase()}`, escalation: 'handoff' });
  }
  if (sicurezza?.richiestaSensibile) {
    if ((stato.sensitive_turns || 0) >= (esc.sensitive_insist ?? 2)) {
      return out('human_handoff', 'human_handoff', { reason: 'richiesta_sensibile_insistente', escalation: 'handoff' });
    }
    return out('answer_information', 'safety', { reason: 'richiesta_sensibile' });
  }
  if (stato.intent === 'unknown' || stato.confidence < t.intent_min) {
    if ((stato.unknown_turns || 0) >= (esc.max_unknown_turns ?? 2)) {
      return out('human_handoff', 'human_handoff', { reason: 'non_compreso', escalation: 'handoff' });
    }
    return out('ask_missing_information', 'conversational', { reason: 'chiarimento', clarify: true });
  }

  const categoria = intentDef?.categoria;
  const informativo = ['INFORMATION', 'DISCOVERY', 'FOLLOW_UP', 'ADMIN'].includes(categoria);
  if (informativo) {
    return out('answer_information', 'informative', { reason: faqTrovata ? 'faq' : 'informazione', faq: !!faqTrovata });
  }

  if (stato.missing_entities.length > 0) {
    return out('ask_missing_information', categoria === 'BOOKING' ? 'booking' : 'qualification', {
      reason: 'dati_mancanti', next_question_entity: stato.missing_entities[0],
    });
  }

  // Dati completi: l'azione di chiusura è la prima disponibile tra quelle che
  // il pack dichiara per l'intent (priorità: urgenza -> calendario -> lead).
  const azioni = intentDef?.actions || [];
  if (stato.urgency === 'HIGH' && azioni.includes('notify_owner')) return out('notify_owner', 'reassurance', { reason: 'urgenza_alta', escalation: 'notify' });
  if (azioni.includes('propose_slot') && tenant.haCalendario) return out('propose_slot', categoria === 'BOOKING' ? 'booking' : 'qualification', { reason: 'dati_completi' });
  if (azioni.includes('create_lead')) return out('create_lead', categoria === 'BOOKING' ? 'booking' : 'qualification', { reason: tenant.haCalendario ? 'dati_completi' : 'calendario_non_collegato' });
  if (azioni.includes('notify_owner')) return out('notify_owner', 'reassurance', { reason: 'dati_completi', escalation: 'notify' });
  return out('save_request', 'concise', { reason: 'dati_completi' });
}
