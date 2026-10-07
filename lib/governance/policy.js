// lib/governance/policy.js
//
// Livelli di autonomia per (tenant, agente, azione):
//   0 osserva · 1 raccomanda · 2 prepara bozza · 3 esegue (basso rischio)
//   4 esegue SOLO con approvazione · 5 autonomo entro policy
// DENY-BY-DEFAULT: azione sconosciuta e senza riga => livello 1 (propone, non esegue).
// I default riproducono il comportamento storico del sistema, quindi in assenza
// di righe nel database nulla cambia. Il vincolo di sicurezza del pack
// (CRITICAL, richieste sensibili, frasi vietate) NON è un livello: nessuna
// policy lo può disattivare.
// Funzioni pure + un loader con cache; mai eccezioni verso il chiamante.

export const POLICY_VERSION = 'policy-1';

export const DEFAULT = {
  'whatsapp:reply': 5,
  'whatsapp:handoff': 5,
  'whatsapp:emergency_escalation': 5,
  'whatsapp:create_calendar_event': 3,
  'whatsapp:notify_staff': 3,
  'followup:send_followup': 3,
  'dashboard:edit_price': 4,
  'dashboard:delete_data': 4,
};

export function valutaAzione({ righe = [], agent, action, contesto = {} }) {
  const riga = righe.find((r) => r.agent_id === agent && r.action === action);
  let livello = riga ? Number(riga.autonomy_level) : (DEFAULT[`${agent}:${action}`] ?? 1);
  if (!Number.isInteger(livello) || livello < 0 || livello > 5) livello = 1;
  let motivo = riga ? 'policy_tenant' : (DEFAULT[`${agent}:${action}`] !== undefined ? 'default' : 'deny_by_default');
  // Condizione: l'azione vale al livello dichiarato solo se il contesto la soddisfa.
  const richiede = riga?.condizioni?.richiede;
  if (richiede && contesto[richiede] !== true && livello > 4) { livello = 4; motivo = `condizione_non_soddisfatta:${richiede}`; }
  return {
    livello,
    esegue: livello >= 3 && livello !== 4,
    richiedeApprovazione: livello === 4,
    soloProposta: livello <= 2,
    motivo,
    policy_version: POLICY_VERSION,
  };
}

const TTL_MS = 60_000;
const cache = new Map();
export function svuotaCachePolicy() { cache.clear(); }

// Se la tabella non esiste (migrazione non applicata) o c'è un errore: [] => default.
export async function caricaPolicy({ SUPABASE_URL, headers, fetchImpl = fetch, now = Date.now }, clienteId) {
  const hit = cache.get(clienteId);
  if (hit && now() - hit.t < TTL_MS) return hit.righe;
  let righe = [];
  try {
    const r = await fetchImpl(`${SUPABASE_URL}/rest/v1/tenant_action_policy?cliente_id=eq.${encodeURIComponent(clienteId)}&select=agent_id,action,autonomy_level,condizioni`, { headers });
    const j = await r.json();
    if (Array.isArray(j)) righe = j;
  } catch (e) {
    console.error('Errore lettura policy (si usano i default):', e);
  }
  cache.set(clienteId, { t: now(), righe });
  return righe;
}
