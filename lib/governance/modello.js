// lib/governance/modello.js
//
// Unico punto di uscita verso l'API del modello (percorso motore): modello,
// timeout, un solo retry su errori transitori, token e latenza. Il routing tra
// modelli (task semplice -> economico, dati sensibili -> approvato) si
// aggiunge qui senza toccare i chiamanti. Il percorso legacy di api/whatsapp.js
// NON passa da qui (invariato di proposito).

export const MODELLO_DEFAULT = 'claude-haiku-4-5-20251001';
export const TIMEOUT_MS = { analisi: 5000, risposta: 7000 };

async function unaChiamata(fetchImpl, apiKey, body, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json();
    return { status: res.status, data };
  } finally { clearTimeout(t); }
}

// task: 'analisi' | 'risposta'. Lancia in caso di fallimento definitivo.
export async function chiamaModello({ task = 'risposta', apiKey, model = MODELLO_DEFAULT, system, messages, tools, tool_choice, max_tokens = 300, fetchImpl = fetch }) {
  const body = { model, max_tokens, system, messages, ...(tools ? { tools } : {}), ...(tool_choice ? { tool_choice } : {}) };
  const timeout = TIMEOUT_MS[task] || TIMEOUT_MS.risposta;
  const t0 = Date.now();
  let ultimoErrore;
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      const { status, data } = await unaChiamata(fetchImpl, apiKey, body, timeout);
      if (status >= 500 || status === 429) { ultimoErrore = new Error(`modello status ${status}`); continue; }
      if (!data?.content) throw new Error(`risposta modello senza contenuto${data?.error ? `: ${data.error.type || data.error}` : ''}`);
      return { data, usage: data.usage || null, model, latency_ms: Date.now() - t0 };
    } catch (e) {
      ultimoErrore = e;
      if (e?.name === 'AbortError') break; // timeout: niente retry, il tempo è già finito
    }
  }
  throw ultimoErrore || new Error('chiamata modello fallita');
}
