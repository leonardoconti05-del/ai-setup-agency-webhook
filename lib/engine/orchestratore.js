// lib/engine/orchestratore.js
//
// Percorso "motore" del webhook, isolato in un modulo con dipendenze
// iniettabili (fetchImpl) così si può testare senza rete. Flusso:
//   analisi deterministica -> (analisi LLM, saltata se l'esito è già certo)
//   -> pianifica (stato + azione) -> risposta TEMPLATE (zero LLM) oppure
//   risposta LLM guidata dal piano -> verificaRisposta -> fallback sicuro.
// Qualunque eccezione viene gestita da chi chiama (api/whatsapp.js) tornando
// al percorso legacy: il cliente non vede mai un errore tecnico.

import { analisiDeterministica, pianifica, rispostaTemplate, rispostaFallback, costruisciHandoff } from './run.js';
import { analizzaConLLM, MODELLO } from './analisi-llm.js';
import { costruisciPianoRisposta, costruisciSystemPromptMotore, testoConsentito } from './prompt.js';
import { verificaRisposta } from './safety.js';
import { statoIniziale } from './state.js';
import { stimaCosto, sommaUso } from './costi.js';
import { chiamaModello } from '../governance/modello.js';
import { costruisciContesto } from '../governance/contesto.js';
import { fontiUsate } from '../governance/lineage.js';

export const PROMPT_VERSION = 'motore-2';

const AZIONI_COMPLETAMENTO = ['propose_slot', 'create_lead', 'save_request', 'notify_owner'];

export async function eseguiMotore({
  caricato, config, nomeAttivita, history, messaggio, statoPrecedente, contestoKB = '',
  servizi = [], personale = [], campiTenant = [], apiKey, fetchImpl = fetch,
}) {
  const t0 = Date.now();
  const { pack, indice, faq } = caricato;
  void faq;
  const tenant = { haCalendario: !!config.google_calendar_id };
  const det = analisiDeterministica({ messaggio, pack, indice });

  // L'analisi LLM serve a capire messaggi ambigui o a estrarre entità libere.
  // Se il risultato è già certo (urgenza critica, richiesta di una persona) la
  // saltiamo: risposta predefinita, zero chiamate, zero costo.
  const certo = det.sicurezza.level === 'CRITICAL' || det.sicurezza.richiestaUmano;
  let llm = null;
  const usi = [];
  let erroreLLM = null;
  if (!certo && apiKey) {
    try {
      const r = await analizzaConLLM({ history, pack, campiTenant, apiKey, fetchImpl });
      llm = r.analisi; usi.push(r.usage);
    } catch (e) {
      erroreLLM = String(e.message || e);
    }
  }

  const { stato, azione, sicurezza, faq: faqTrovata, riassunto } = pianifica({ det, llm, statoPrecedente: statoPrecedente || statoIniziale(), pack, campiTenant, tenant });

  let reply = rispostaTemplate({ azione, stato, pack, config });
  let origine = reply ? 'template' : 'llm';
  let violazioni = [];

  // Minimizzazione: al modello arrivano solo le sezioni di dati utili a questo intento.
  const ctx = costruisciContesto({ intentId: stato.intent, secondari: stato.intent_secondari, pack, config, servizi, personale, contestoKB });
  let fonti = [];

  if (!reply) {
    const piano = costruisciPianoRisposta({ azione, stato, pack, campiTenant, faqTrovata, turno: stato.turns });
    const system = costruisciSystemPromptMotore({ pack, config: ctx.config, nomeAttivita, contestoKB: ctx.contestoKB, servizi: ctx.servizi, personale: ctx.personale, piano });
    try {
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY mancante');
      const r = await chiamaModello({ task: 'risposta', apiKey, fetchImpl, model: MODELLO, max_tokens: 300, system, messages: history });
      const testo = r.data.content?.find((b) => b.type === 'text')?.text?.trim();
      if (!testo) throw new Error('risposta LLM vuota');
      usi.push(r.usage);
      const ammesso = testoConsentito({
        config: ctx.config, servizi: ctx.servizi, personale: ctx.personale, contestoKB: ctx.contestoKB, faqTrovata,
        messaggio: history.filter((m) => m.role === 'user').slice(-6).map((m) => m.content).join(' '),
      });
      const v = verificaRisposta(testo, { pack, testoConsentito: ammesso });
      if (v.ok) { reply = testo; fonti = fontiUsate({ sezioni: ctx.sezioni, config, servizi: ctx.servizi, personale: ctx.personale, faqTrovata, contestoKB: ctx.contestoKB, caricato }); }
      else { violazioni = v.violazioni; reply = null; origine = 'fallback_verifica'; }
    } catch (e) {
      erroreLLM = erroreLLM || String(e.message || e);
      origine = 'fallback_errore';
    }
    if (!reply) reply = rispostaFallback({ azione, stato, pack, campiTenant });
  }

  const urgente = ['HIGH', 'CRITICAL'].includes(stato.urgency);
  const handoff = ['human_handoff', 'emergency_escalation'].includes(azione.action)
    ? costruisciHandoff({ azione, stato, riassunto, ultimoMessaggio: messaggio })
    : null;
  const completo = AZIONI_COMPLETAMENTO.includes(azione.action);

  const uso = sommaUso(...usi);
  const telemetria = {
    settore: pack.identity?.settore || caricato.settore, pack_version: caricato.version,
    intent: stato.intent, confidence: stato.confidence, urgency: stato.urgency,
    action: azione.action, strategy: azione.strategy, reason: azione.reason,
    origine_risposta: origine, sezioni_contesto: ctx.sezioni, prompt_version: PROMPT_VERSION, chiamate_llm: usi.length, latency_ms: Date.now() - t0,
    tokens_in: uso.input_tokens, tokens_out: uso.output_tokens, model: MODELLO, costo_usd: stimaCosto(MODELLO, uso),
    ...(violazioni.length ? { violazioni: violazioni.map((v) => v.tipo) } : {}),
    ...(erroreLLM ? { errore_llm: erroreLLM.slice(0, 200) } : {}),
  };

  return { reply, stato, azione, urgente, handoff, completo, entities: stato.entities, telemetria, fonti: fonti.length ? fonti : fontiUsate({ sezioni: [], caricato }), sezioni_contesto: ctx.sezioni, prompt_version: PROMPT_VERSION };
}
