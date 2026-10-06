import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantContext, createEngineResult, createGovernedAction } from '../lib/core/contracts.js';

test('shared contracts preserve tenant and request scope', () => {
  const ctx = createTenantContext({
    clienteId: 'tenant-1',
    actor: 'system',
    agent: 'jarvis',
    requestId: 'req-1',
    authorizationSource: 'server-session',
  });
  const result = createEngineResult({ tenantContext: ctx, result: { status: 'ok' } });
  const action = createGovernedAction({
    tenantContext: ctx,
    action: 'reply',
    autonomyLevel: 4,
    approval: 'pending',
  });

  assert.equal(result.tenant_id, 'tenant-1');
  assert.equal(result.request_id, 'req-1');
  assert.equal(action.tenant_id, 'tenant-1');
  assert.equal(action.approval, 'pending');
  assert.throws(() => createGovernedAction({ tenantContext: ctx, action: 'x', autonomyLevel: 9 }));
});
