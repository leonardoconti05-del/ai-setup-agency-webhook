import { createClient } from '@supabase/supabase-js';

const CONTRACT_VERSION = 'core-read-1';

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function authorized(req) {
  const expected = process.env.JARVIS_CORE_TOKEN;
  if (!expected) return false;
  const supplied = req.headers.get('authorization') || '';
  return supplied === `Bearer ${expected}`;
}

function getClient() {
  const url = process.env.SUPABASE_URL_AI_SETUP || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY_AI_SETUP || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase Core non configurato.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchOverview(client, clienteId) {
  const [clientRes, configRes, requestsRes, gapsRes, usageRes, eventsRes] = await Promise.all([
    client.from('clienti').select('id,nome_attivita,email_contatto,created_at').eq('id', clienteId).maybeSingle(),
    client.from('configurazioni_cliente').select('settore,tono,attivo,limite_messaggi_mese,follow_up_attivo,follow_up_dopo_ore,follow_up_max_messaggi').eq('cliente_id', clienteId).maybeSingle(),
    client.from('richieste_clienti').select('stato,created_at,updated_at').eq('cliente_id', clienteId).order('updated_at', { ascending: false }).limit(50),
    client.from('lacune_conoscenza').select('id,chiave,tipo,intent,volte,stato,primo_il,ultimo_il').eq('cliente_id', clienteId).order('ultimo_il', { ascending: false }).limit(50),
    client.from('utilizzo_mensile').select('mese,conteggio').eq('cliente_id', clienteId).order('mese', { ascending: false }).limit(6),
    client.from('event_log').select('fase,stato,created_at').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(100),
  ]);

  for (const r of [clientRes, configRes, requestsRes, gapsRes, usageRes, eventsRes]) {
    if (r.error) throw new Error(r.error.message);
  }
  if (!clientRes.data) return null;

  const requests = requestsRes.data || [];
  const events = eventsRes.data || [];
  const errorsByPhase = {};
  for (const event of events) if (event.stato === 'errore') errorsByPhase[event.fase] = (errorsByPhase[event.fase] || 0) + 1;

  return {
    contract_version: CONTRACT_VERSION,
    tenant_id: clienteId,
    business: clientRes.data,
    configuration: configRes.data,
    request_metrics: {
      total_sampled: requests.length,
      open: requests.filter((r) => r.stato === 'in_corso').length,
      completed: requests.filter((r) => r.stato === 'completata').length,
      urgent: requests.filter((r) => r.stato === 'urgente').length,
    },
    knowledge_gaps: gapsRes.data || [],
    monthly_usage: usageRes.data || [],
    error_metrics: { sampled_events: events.length, by_phase: errorsByPhase },
    read_only: true,
  };
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Metodo non consentito.' }, 405);
  if (!authorized(req)) return json({ error: 'Non autorizzato.' }, 401);

  const clienteId = typeof req.query?.cliente_id === 'string' ? req.query.cliente_id : '';
  if (!clienteId) return json({ error: 'cliente_id obbligatorio.' }, 400);

  try {
    const client = getClient();
    const data = await fetchOverview(client, clienteId);
    if (!data) return json({ error: 'Tenant non trovato.' }, 404);
    return json(data);
  } catch (error) {
    return json({ error: error.message || 'Errore interno.' }, 500);
  }
}

export { CONTRACT_VERSION, fetchOverview };
