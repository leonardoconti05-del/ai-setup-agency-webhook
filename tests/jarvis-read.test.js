import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JARVIS_CORE_TOKEN = 'test-token';

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
