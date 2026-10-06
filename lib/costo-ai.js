// lib/costo-ai.js
//
// Costo REALE (stima dai token effettivamente usati) dell'assistente per un tenant,
// letto dai log del motore (event_log, fase 'motore': dettaglio.costo_usd).
// Serve a mettere accanto "quanto costa" e "quanto ha portato" nella dashboard.
// Se i log mancano o la lettura fallisce restituisce null: non si inventa nulla.

export function sommaCostoAI(righe) {
  if (!Array.isArray(righe)) return null;
  let costo = 0; let risposte = 0; let senzaLLM = 0;
  for (const r of righe) {
    const d = r?.dettaglio;
    if (!d || typeof d !== 'object') continue;
    risposte++;
    const c = Number(d.costo_usd);
    if (Number.isFinite(c) && c > 0) costo += c; else senzaLLM++;
  }
  return { costo_usd: Math.round(costo * 10000) / 10000, risposte, senza_llm: senzaLLM };
}

export async function costoAI(ctx, cliente_id, { giorni = 30, adesso = Date.now() } = {}) {
  try {
    const dal = new Date(adesso - giorni * 24 * 3600 * 1000).toISOString();
    const r = await (ctx.fetchImpl || fetch)(
      `${ctx.SUPABASE_URL}/rest/v1/event_log?cliente_id=eq.${encodeURIComponent(cliente_id)}&fase=eq.motore&stato=eq.ok&created_at=gte.${dal}&select=dettaglio&limit=5000`,
      { headers: ctx.headers }
    );
    if (!r.ok) return null;
    return sommaCostoAI(await r.json());
  } catch { return null; }
}
