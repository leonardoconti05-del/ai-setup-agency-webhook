// Server-derived tenant authorization boundary for Core, Jarvis and future Action Gateway.
// requestedClienteId is a resource selector only. It never grants authorization.

export const DATA_CLASSIFICATIONS = Object.freeze({
  GLOBAL: 'global',
  TENANT: 'tenant',
  AGGREGATE: 'aggregate',
  AUDIT: 'immutable_audit',
});

function normalizeTenantIds(ids) {
  if (!Array.isArray(ids)) throw new Error('authorizedTenantIds deve essere un array');
  const normalized = [...new Set(ids.filter(Boolean).map(String))];
  if (normalized.length === 0) throw new Error('scope tenant vuoto');
  return Object.freeze(normalized);
}

export function createTenantScope({
  actor,
  agent,
  authorizedTenantIds,
  requestId,
  authorizationSource,
  allowedActions = [],
  maxAutonomy = 0,
  dataClassification = DATA_CLASSIFICATIONS.TENANT,
}) {
  if (!actor || !agent || !requestId || !authorizationSource) throw new Error('TenantScope incompleto');
  const level = Number(maxAutonomy);
  if (!Number.isInteger(level) || level < 0 || level > 5) throw new Error('maxAutonomy non valido');
  if (!Object.values(DATA_CLASSIFICATIONS).includes(dataClassification)) throw new Error('dataClassification non valida');
  return Object.freeze({
    actor: String(actor),
    agent: String(agent),
    authorized_tenant_ids: normalizeTenantIds(authorizedTenantIds),
    request_id: String(requestId),
    authorization_source: String(authorizationSource),
    allowed_actions: Object.freeze(Array.isArray(allowedActions) ? [...new Set(allowedActions.map(String))] : []),
    max_autonomy: level,
    data_classification: dataClassification,
  });
}

export function resolveTenantContext({ scope, requestedClienteId = null }) {
  if (!scope?.authorized_tenant_ids?.length) throw new Error('Tenant scope assente: fail closed');
  const requested = requestedClienteId == null ? null : String(requestedClienteId);
  let clienteId;
  if (requested) {
    if (!scope.authorized_tenant_ids.includes(requested)) throw new Error('Tenant non autorizzato');
    clienteId = requested;
  } else if (scope.authorized_tenant_ids.length === 1) {
    clienteId = scope.authorized_tenant_ids[0];
  } else {
    throw new Error('Tenant ambiguo: selezione esplicita richiesta');
  }
  return Object.freeze({
    cliente_id: clienteId,
    actor: scope.actor,
    agent: scope.agent,
    request_id: scope.request_id,
    authorization_source: scope.authorization_source,
    allowed_actions: scope.allowed_actions,
    max_autonomy: scope.max_autonomy,
    data_classification: scope.data_classification,
    authorized_tenant_ids: scope.authorized_tenant_ids,
    server_derived: true,
  });
}
