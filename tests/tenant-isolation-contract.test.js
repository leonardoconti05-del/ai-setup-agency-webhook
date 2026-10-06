import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantScope, resolveTenantContext, DATA_CLASSIFICATIONS } from '../lib/core/tenant-scope.js';

function scope(overrides = {}) {
  return createTenantScope({
    actor: 'agency-admin',
    agent: 'jarvis',
    authorizedTenantIds: ['tenant-a'],
    requestId: 'req-tenant-test',
    authorizationSource: 'server-session',
    allowedActions: ['read_core'],
    maxAutonomy: 0,
    ...overrides,
  });
}

test('single-tenant scope resolves without model-supplied tenant', () => {
  const ctx = resolveTenantContext({ scope: scope() });
  assert.equal(ctx.cliente_id, 'tenant-a');
  assert.equal(ctx.server_derived, true);
});

test('requested tenant is accepted only when inside authorized scope', () => {
  const ctx = resolveTenantContext({ scope: scope({ authorizedTenantIds: ['tenant-a', 'tenant-b'] }), requestedClienteId: 'tenant-b' });
  assert.equal(ctx.cliente_id, 'tenant-b');
});

test('requested tenant outside scope is denied', () => {
  assert.throws(() => resolveTenantContext({ scope: scope(), requestedClienteId: 'tenant-b' }), /Tenant non autorizzato/);
});

test('missing scope fails closed', () => {
  assert.throws(() => resolveTenantContext({ scope: null }), /fail closed/);
});

test('empty authorized scope fails closed', () => {
  assert.throws(() => createTenantScope({ actor: 'a', agent: 'jarvis', authorizedTenantIds: [], requestId: 'r', authorizationSource: 'server' }), /scope tenant vuoto/);
});

test('multi-tenant scope requires explicit resource selection', () => {
  assert.throws(() => resolveTenantContext({ scope: scope({ authorizedTenantIds: ['tenant-a', 'tenant-b'] }) }), /Tenant ambiguo/);
});

test('duplicate tenant ids are normalized', () => {
  const s = scope({ authorizedTenantIds: ['tenant-a', 'tenant-a'] });
  assert.deepEqual(s.authorized_tenant_ids, ['tenant-a']);
});

test('autonomy is bounded by the shared 0-5 contract', () => {
  assert.throws(() => scope({ maxAutonomy: 6 }), /maxAutonomy non valido/);
  assert.equal(scope({ maxAutonomy: 0 }).max_autonomy, 0);
  assert.equal(scope({ maxAutonomy: 5 }).max_autonomy, 5);
});

test('data classifications are explicit', () => {
  const s = scope({ dataClassification: DATA_CLASSIFICATIONS.AUDIT });
  assert.equal(s.data_classification, 'immutable_audit');
});

test('LLM cannot expand authority by choosing an arbitrary tenant id', () => {
  const s = scope({ authorizedTenantIds: ['tenant-a'] });
  assert.throws(() => resolveTenantContext({ scope: s, requestedClienteId: 'tenant-secret' }), /Tenant non autorizzato/);
  assert.deepEqual(s.authorized_tenant_ids, ['tenant-a']);
});
