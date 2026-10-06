// lib/engine/costi.js
//
// Stima del costo per chiamata LLM, per il tracking per tenant/conversazione
// (event_log.dettaglio). Prezzi in USD per milione di token: valori di
// listino di claude-haiku-4-5 al momento della scrittura — è una STIMA da
// aggiornare se il listino cambia, non un dato di fatturazione.
const PREZZI = { 'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 } };

export function stimaCosto(model, usage) {
  const p = PREZZI[model];
  if (!p || !usage) return null;
  const costo = ((usage.input_tokens || 0) * p.in + (usage.output_tokens || 0) * p.out) / 1_000_000;
  return Math.round(costo * 1e6) / 1e6;
}

export function sommaUso(...usi) {
  return usi.filter(Boolean).reduce((a, u) => ({ input_tokens: a.input_tokens + (u.input_tokens || 0), output_tokens: a.output_tokens + (u.output_tokens || 0) }), { input_tokens: 0, output_tokens: 0 });
}
