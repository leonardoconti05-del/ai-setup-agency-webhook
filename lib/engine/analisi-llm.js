// lib/engine/analisi-llm.js
//
// UNA sola chiamata LLM strutturata per messaggio produce intent, entità,
// urgenza, confidenza e flag di rischio (tool-use forzato: l'API garantisce
// lo schema). Sostituisce la vecchia "estrazione dati" del percorso legacy,
// quindi il motore NON aumenta il numero di chiamate (resta analisi +
// risposta = 2, come prima).

import { chiamaModello } from '../governance/modello.js';

export const MODELLO = 'claude-haiku-4-5-20251001';

export function costruisciToolAnalisi(pack, campiTenant) {
  const entitaIds = [...new Set([...(pack.entities || []).map((e) => e.id), ...campiTenant])];
  const entita = {};
  for (const id of entitaIds) {
    const def = (pack.entities || []).find((e) => e.id === id);
    const desc = def ? `${def.descrizione}${def.valori ? ` Valori ammessi: ${def.valori.join(', ')}.` : ''}` : `Valore per ${id}.`;
    entita[id] = { type: ['string', 'null'], description: `${desc} null se il cliente non l'ha detto esplicitamente.` };
  }
  return {
    name: 'analizza_messaggio',
    description: 'Analizza l\'ultimo messaggio del cliente nel contesto della conversazione.',
    input_schema: {
      type: 'object',
      properties: {
        intent: { type: 'string', enum: [...pack.intents.map((i) => i.id), 'unknown'], description: pack.intents.map((i) => `${i.id}: ${i.descrizione || i.nome || ''}`).join(' | ') },
        confidence: { type: 'number', description: 'Confidenza 0-1 sull\'intent.' },
        entities: { type: 'object', properties: entita, description: 'Solo ciò che il cliente ha detto esplicitamente in tutta la conversazione.' },
        urgency: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Urgenza reale secondo il contesto del settore.' },
        richiede_persona: { type: 'boolean', description: 'true se il cliente chiede di parlare con una persona.' },
        richiesta_sensibile: { type: 'boolean', description: 'true se il cliente chiede una diagnosi, terapia, consulenza legale/fiscale o una valutazione professionale.' },
        riassunto: { type: 'string', description: 'Riassunto in una frase della richiesta del cliente.' },
      },
      required: ['intent', 'confidence', 'entities', 'urgency'],
    },
  };
}

export async function analizzaConLLM({ history, pack, campiTenant, apiKey, fetchImpl = fetch }) {
  const tool = costruisciToolAnalisi(pack, campiTenant);
  const { data, usage } = await chiamaModello({
    task: 'analisi', apiKey, fetchImpl, model: MODELLO, max_tokens: 400,
    system: `Analizza l'ultimo messaggio del cliente di un'attività del settore "${pack.identity?.nome_ruolo || 'locale'}". Estrai SOLO ciò che il cliente ha detto esplicitamente. Non inventare. Chiama lo strumento analizza_messaggio.`,
    tools: [tool], tool_choice: { type: 'tool', name: 'analizza_messaggio' },
    messages: [{ role: 'user', content: JSON.stringify(history.slice(-12)) }],
  });
  const blocco = data.content?.find((b) => b.type === 'tool_use');
  const input = blocco?.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('analisi LLM: nessun tool_use valido');
  return { analisi: input, usage: usage || null, model: MODELLO };
}
