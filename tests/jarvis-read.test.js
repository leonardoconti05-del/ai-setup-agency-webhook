import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JARVIS_CORE_TOKEN = 'test-token';
process.env.JARVIS_CORE_AUTHORIZED_TENANTS = 'tenant-1';

const { default: handler } = await import('../api/internal/jarvis-read.js');

test('Jarvis Core read endpoint rejects missing token', async () => {
  const req = new Request('https://example.test/api/internal/jarvis-read?cliente_id=tenant-1', { method: 'GET' });
  req.query = { cliente_id: 'tenant-1' };
  const res = await handler(req);
  assert.equal(res.status, 401);
});

test('Jarvis Core read endpoint rejects missing tenant', async () => {
  const req = new Request('https://example.test/api/internal/jarvis-read', {
    method: 'GET', headers: { authorization: 'Bearer test-token' },
  });
  req.query = {};
  const res = await handler(req);
  assert.equal(res.status, 400);
});

test('Jarvis Core read endpoint denies a tenant outside the server-derived allowlist', async () => {
  const req = new Request('https://example.test/api/internal/jarvis-read?cliente_id=tenant-2', {
    method: 'GET', headers: { authorization: 'Bearer test-token' },
  });
  req.query = { cliente_id: 'tenant-2' };
  const res = await handler(req);
  assert.equal(res.status, 403);
});

test('Jarvis Core read endpoint fails closed when tenant scope is not configured', async () => {
  const previous = process.env.JARVIS_CORE_AUTHORIZED_TENANTS;
  delete process.env.JARVIS_CORE_AUTHORIZED_TENANTS;
  const req = new Request('https://example.test/api/internal/jarvis-read?cliente_id=tenant-1', {
    method: 'GET', headers: { authorization: 'Bearer test-token' },
  });
  req.query = { cliente_id: 'tenant-1' };
  const res = await handler(req);
  assert.equal(res.status, 500);
  process.env.JARVIS_CORE_AUTHORIZED_TENANTS = previous;
});
