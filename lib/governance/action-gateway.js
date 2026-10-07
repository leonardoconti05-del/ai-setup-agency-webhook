// Central governance choke point for AI actions.
// No executor should run before this gateway returns ALLOW.
//
// Security invariants:
// 1. tenant context must be server-derived;
// 2. agent and action must exist and be active;
// 3. tenant policy may restrict autonomy but cannot bypass the registry;
// 4. approval is created before execution;
// 5. execution happens only through a registered executor callback;
// 6. consequential decisions are written to the existing action ledger.

import { valutaAzione, POLICY_VERSION } from './policy.js';
import { richiediApprovazione } from './approvazioni.js';
import { registra as registraLedger } from './ledger.js';

export const ACTION_GATEWAY_VERSION = 'action-gateway-1';

const VALID_VERDICTS = new Set(['ALLOW', 'DENY', 'REQUIRE_APPROVAL']);

function requireServerDerivedTenantContext(tenantContext) {
  if (!tenantContext?.cliente_id || !tenantContext?.agent || !tenantContext?.actor || !tenantContext?.request_id || !tenantContext?.authorization_source) {
    return { ok: false, reason: 'tenant_context_incomplete' };
  }
  if (tenantContext.server_derived !== true) {
    return { ok: false, reason: 'tenant_context_not_server_derived' };
  }
  return { ok: true };
}

async function getJson({ SUPABASE_URL, headers, fetchImpl, path }) {
  const res = await fetchImpl(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  const data = await res.json();
  return { ok: true, status: res.status, data };
}

async function findAgent({ SUPABASE_URL, headers, fetchImpl, agent }) {
  const r = await getJson({
    SUPABASE_URL, headers, fetchImpl,
    path: `agent_registry?agent_id=eq.${encodeURIComponent(agent)}&select=agent_id,attivo&limit=1`,
  });
  if (!r.ok || !Array.isArray(r.data) || !r.data[0]) return { ok: false, reason: 'unknown_agent' };
  if (r.data[0].attivo !== true) return { ok: false, reason: 'inactive_agent' };
  return { ok: true, record: r.data[0] };
}

async function findAction({ SUPABASE_URL, headers, fetchImpl, action, agent }) {
  const r = await getJson({
    SUPABASE_URL, headers, fetchImpl,
    path: `action_registry?action_id=eq.${encodeURIComponent(action)}&select=action_id,name,risk_level,required_autonomy,approval_required,executor,executor_version,active,metadata&limit=1`,
  });
  if (!r.ok || !Array.isArray(r.data) || !r.data[0]) return { ok: false, reason: 'unknown_action' };
  if (r.data[0].active !== true) return { ok: false, reason: 'inactive_action' };
  const declaredAgent = r.data[0].metadata?.agent;
  if (declaredAgent && declaredAgent !== agent) return { ok: false, reason: 'action_agent_mismatch' };
  return { ok: true, record: r.data[0] };
}

async function findPolicy({ SUPABASE_URL, headers, fetchImpl, tenantContext, action }) {
  const r = await getJson({
    SUPABASE_URL, headers, fetchImpl,
    path: `tenant_action_policy?cliente_id=eq.${encodeURIComponent(tenantContext.cliente_id)}&agent_id=eq.${encodeURIComponent(tenantContext.agent)}&action=eq.${encodeURIComponent(action)}&select=agent_id,action,autonomy_level,condizioni&limit=1`,
  });
  if (!r.ok) return { ok: false, reason: 'policy_unavailable' };
  return { ok: true, record: Array.isArray(r.data) ? r.data[0] || null : null };
}

function effectivePolicy({ registryAction, tenantPolicy, contesto }) {
  if (tenantPolicy) {
    const decision = valutaAzione({ righe: [tenantPolicy], agent: tenantPolicy.agent_id, action: tenantPolicy.action, contesto });
    const registryApproval = registryAction.approval_required === true;
    const requiresApproval = registryApproval || decision.richiedeApprovazione;
    return {
      ...decision,
      esegue: decision.esegue && !requiresApproval && decision.livello >= Number(registryAction.required_autonomy),
      richiedeApprovazione: requiresApproval,
      configured: true,
      required_autonomy: Number(registryAction.required_autonomy),
    };
  }

  const decision = valutaAzione({ righe: [], agent: registryAction.metadata?.agent || 'unknown', action: registryAction.action_id, contesto });
  const required = Number(registryAction.required_autonomy);
  const approval = registryAction.approval_required === true || decision.richiedeApprovazione;
  return {
    ...decision,
    esegue: decision.esegue && !approval && decision.livello >= required,
    richiedeApprovazione: approval,
    motivo: decision.motivo === 'deny_by_default' ? 'registry_default_denied' : decision.motivo,
    configured: false,
    required_autonomy: required,
  };
}

async function recordDecision({ ctx, action, autonomyLevel, approval, reason, result, ledger, sources }) {
  if (!ledger) return;
  await ledger({
    cliente_id: ctx.cliente_id,
    request_id: ctx.request_id,
    actor: ctx.actor,
    action,
    autonomy_level: autonomyLevel,
    approval,
    reason,
    sources,
    policy_version: POLICY_VERSION,
    result,
  });
}

export async function authorizeAction({
  tenantContext,
  action,
  payload = {},
  reason = '',
  contesto = {},
  sources = [],
  SUPABASE_URL,
  headers,
  fetchImpl = fetch,
}) {
  const ctxCheck = requireServerDerivedTenantContext(tenantContext);
  if (!ctxCheck.ok) return { verdict: 'DENY', reason: ctxCheck.reason };

  if (!SUPABASE_URL || !headers?.Authorization) {
    return { verdict: 'DENY', reason: 'governance_backend_unavailable' };
  }

  const [agent, registryAction, tenantPolicy] = await Promise.all([
    findAgent({ SUPABASE_URL, headers, fetchImpl, agent: tenantContext.agent }),
    findAction({ SUPABASE_URL, headers, fetchImpl, action, agent: tenantContext.agent }),
    findPolicy({ SUPABASE_URL, headers, fetchImpl, tenantContext, action }),
  ]);

  if (!agent.ok) return { verdict: 'DENY', reason: agent.reason };
  if (!registryAction.ok) return { verdict: 'DENY', reason: registryAction.reason };
  if (!tenantPolicy.ok) return { verdict: 'DENY', reason: tenantPolicy.reason };

  if (payload && typeof payload === 'object' && payload.cliente_id != null && String(payload.cliente_id) !== String(tenantContext.cliente_id)) {
    return { verdict: 'DENY', reason: 'payload_tenant_mismatch' };
  }

  // Governance contract: every executable action requires an explicit
  // tenant policy row. Registry defaults are descriptive, not authorization.
  if (!tenantPolicy.record) {
    return {
      verdict: 'DENY',
      reason: 'tenant_policy_missing',
      action: registryAction.record.action_id,
      required_autonomy: Number(registryAction.record.required_autonomy),
    };
  }

  const decision = effectivePolicy({
    registryAction: registryAction.record,
    tenantPolicy: tenantPolicy.record,
    contesto,
  });

  if (decision.configured && decision.livello < decision.required_autonomy) {
    const result = {
      verdict: 'DENY',
      reason: 'insufficient_autonomy',
      required_autonomy: decision.required_autonomy,
      autonomy_level: decision.livello,
      action: registryAction.record.action_id,
    };
    return result;
  }

  if (decision.richiedeApprovazione) {
    return {
      verdict: 'REQUIRE_APPROVAL',
      reason: decision.motivo,
      action: registryAction.record.action_id,
      autonomy_level: decision.livello,
      executor: registryAction.record.executor,
      approval: 'pending',
    };
  }

  if (!decision.esegue) {
    return {
      verdict: 'DENY',
      reason: decision.soloProposta ? 'proposal_only' : 'policy_denied',
      action: registryAction.record.action_id,
      autonomy_level: decision.livello,
    };
  }

  return {
    verdict: 'ALLOW',
    reason: decision.motivo,
    action: registryAction.record.action_id,
    autonomy_level: decision.livello,
    executor: registryAction.record.executor,
    executor_version: registryAction.record.executor_version,
    risk_level: registryAction.record.risk_level,
    approval: 'not_required',
    payload,
  };
}

export async function executeGovernedAction({
  tenantContext,
  action,
  payload = {},
  reason = '',
  contesto = {},
  sources = [],
  SUPABASE_URL,
  headers,
  fetchImpl = fetch,
  execute,
  executorId,
  ledger = (entry) => registraLedger({ SUPABASE_URL, headers, fetchImpl }, entry),
  requestApproval = (entry) => richiediApprovazione({ SUPABASE_URL, headers, fetchImpl }, entry),
}) {
  const decision = await authorizeAction({
    tenantContext, action, payload, reason, contesto, sources,
    SUPABASE_URL, headers, fetchImpl,
  });

  if (decision.verdict === 'DENY') {
    if (tenantContext?.cliente_id) {
      await recordDecision({
        ctx: tenantContext,
        action,
        autonomyLevel: Number(decision.autonomy_level || 0),
        approval: 'rejected',
        reason: decision.reason,
        result: `denied:${decision.reason}`,
        ledger,
        sources,
      });
    }
    return { ...decision, executed: false };
  }

  if (decision.verdict === 'REQUIRE_APPROVAL') {
    const approvalId = await requestApproval({
      cliente_id: tenantContext.cliente_id,
      agent: tenantContext.agent,
      action,
      payload,
    });
    if (!approvalId) {
      await recordDecision({
        ctx: tenantContext,
        action,
        autonomyLevel: Number(decision.autonomy_level || 0),
        approval: 'rejected',
        reason: 'approval_creation_failed',
        result: 'denied:approval_creation_failed',
        ledger,
        sources,
      });
      return { verdict: 'DENY', reason: 'approval_creation_failed', executed: false };
    }
    await recordDecision({
      ctx: tenantContext,
      action,
      autonomyLevel: Number(decision.autonomy_level || 0),
      approval: 'pending',
      reason: decision.reason,
      result: 'pending_approval',
      ledger,
      sources,
    });
    return { ...decision, approval_id: approvalId, executed: false };
  }

  if (typeof execute !== 'function') {
    await recordDecision({
      ctx: tenantContext,
      action,
      autonomyLevel: Number(decision.autonomy_level || 0),
      approval: 'not_required',
      reason: 'executor_missing',
      result: 'denied:executor_missing',
      ledger,
      sources,
    });
    return { verdict: 'DENY', reason: 'executor_missing', executed: false };
  }

  if (!executorId || executorId !== decision.executor) {
    await recordDecision({
      ctx: tenantContext,
      action,
      autonomyLevel: Number(decision.autonomy_level || 0),
      approval: 'not_required',
      reason: 'executor_not_authorized',
      result: 'denied:executor_not_authorized',
      ledger,
      sources,
    });
    return { verdict: 'DENY', reason: 'executor_not_authorized', executed: false };
  }

  try {
    const result = await execute({
      tenantContext,
      action,
      executor: decision.executor,
      executorVersion: decision.executor_version,
      payload,
    });
    await recordDecision({
      ctx: tenantContext,
      action,
      autonomyLevel: Number(decision.autonomy_level || 0),
      approval: 'not_required',
      reason,
      result: 'ok',
      ledger,
      sources,
    });
    return { ...decision, executed: true, result };
  } catch (error) {
    await recordDecision({
      ctx: tenantContext,
      action,
      autonomyLevel: Number(decision.autonomy_level || 0),
      approval: 'not_required',
      reason,
      result: 'error',
      ledger,
      sources,
    });
    return { ...decision, executed: false, result: null, error: String(error?.message || error) };
  }
}

export function isGatewayVerdict(value) {
  return VALID_VERDICTS.has(value);
}
