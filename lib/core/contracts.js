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
