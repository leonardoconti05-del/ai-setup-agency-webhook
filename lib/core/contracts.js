// Shared contracts for Core and its AI engines.
// Dependency-free boundary objects; no network or authorization side effects.

export const CORE_CONTRACT_VERSION = 'core-contract-1';

export function createTenantContext({ clienteId, actor, agent, requestId, authorizationSource }) {
  if (!clienteId || !actor || !agent || !requestId || !authorizationSource) {
    throw new Error('TenantContext incompleto');
  }
  return Object.freeze({
    cliente_id: String(clienteId),
    actor: String(actor),
    agent: String(agent),
    request_id: String(requestId),
    authorization_source: String(authorizationSource),
    contract_version: CORE_CONTRACT_VERSION,
  });
}

export function createEngineResult({ tenantContext, ok = true, result = null, telemetry = {}, sources = [], version = CORE_CONTRACT_VERSION, errors = [] }) {
  if (!tenantContext?.cliente_id || !tenantContext?.request_id) {
    throw new Error('TenantContext non valido');
  }
  return Object.freeze({
    ok: Boolean(ok),
    tenant_id: tenantContext.cliente_id,
    request_id: tenantContext.request_id,
    result,
    telemetry,
    sources: Array.isArray(sources) ? sources : [],
    version,
    errors: Array.isArray(errors) ? errors : [String(errors)],
  });
}

export function createGovernedAction({ tenantContext, action, autonomyLevel, approval = 'not_required', payload = {}, reason = '' }) {
  if (!tenantContext?.cliente_id || !tenantContext?.request_id) throw new Error('TenantContext non valido');
  if (!action) throw new Error('action obbligatoria');
  const level = Number(autonomyLevel);
  if (!Number.isInteger(level) || level < 0 || level > 5) throw new Error('autonomyLevel non valido');
  if (!['not_required', 'pending', 'approved', 'rejected'].includes(approval)) throw new Error('approval non valido');
  return Object.freeze({
    tenant_id: tenantContext.cliente_id,
    request_id: tenantContext.request_id,
    agent: tenantContext.agent,
    actor: tenantContext.actor,
    action: String(action),
    autonomy_level: level,
    approval,
    payload,
    reason: String(reason),
    contract_version: CORE_CONTRACT_VERSION,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Contratto di salute (sola lettura) — usato da Jarvis per osservare Core. Vedi docs/JARVIS_CONTRACT.md.
// Additivo: non cambia nessuna funzione esistente.

// Contesto di PIATTAFORMA: osservazione aggregata di tutta l'agenzia, senza dati di singoli clienti.
export function createPlatformContext({ actor, agent, requestId, authorizationSource }) {
  if (!actor || !agent || !requestId || !authorizationSource) throw new Error('PlatformContext incompleto');
  return Object.freeze({
    scope: 'platform',
    cliente_id: null,
    actor: String(actor),
    agent: String(agent),
    request_id: String(requestId),
    authorization_source: String(authorizationSource),
    contract_version: CORE_CONTRACT_VERSION,
  });
}

export const STATI_CONTROLLO = Object.freeze(['ok', 'warn', 'fail', 'unknown']);

// Rapporto di salute: solo conteggi, stati e identificatori tecnici. Mai testo libero dei clienti.
export function createHealthReport({ context, checks, data = {}, generatedAt }) {
  if (!context?.request_id || !context?.contract_version) throw new Error('contesto non valido');
  if (!Array.isArray(checks)) throw new Error('checks obbligatori');
  for (const c of checks) {
    if (!c?.id || !STATI_CONTROLLO.includes(c.status)) throw new Error(`controllo non valido: ${c?.id}`);
  }
  const ordine = { fail: 3, unknown: 2, warn: 1, ok: 0 };
  const stato = checks.reduce((peggiore, c) => (ordine[c.status] > ordine[peggiore] ? c.status : peggiore), 'ok');
  return Object.freeze({
    contract_version: CORE_CONTRACT_VERSION,
    kind: 'core_health',
    scope: context.scope === 'platform' ? 'platform' : 'tenant',
    tenant_id: context.scope === 'platform' ? null : context.cliente_id,
    request_id: context.request_id,
    generated_at: generatedAt || new Date().toISOString(),
    status: stato,
    checks: checks.map((c) => Object.freeze({ id: String(c.id), status: c.status, detail: String(c.detail ?? '') })),
    data,
    read_only: true,
  });
}
