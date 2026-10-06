import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pianoConservazione, eseguiConservazione } from '../lib/retention.js';

const adesso = Date.parse('2026-10-06T12:00:00Z');

test('default: solo dati tecnici, richieste dei clienti NON toccate', () => {
  const nomi = pianoConservazione({}, adesso).map((p) => p.nome);
  assert.deepEqual(nomi, ['event_log', 'approval_requests', 'lacune_conoscenza']);
});
test('richieste_clienti solo se configurato, minimo 30 giorni', () => {
  assert.equal(pianoConservazione({ RETENTION_RICHIESTE_GIORNI: '10' }, adesso).some((p) => p.nome === 'richieste_clienti'), false);
  const p = pianoConservazione({ RETENTION_RICHIESTE_GIORNI: '365' }, adesso).find((x) => x.nome === 'richieste_clienti');
  assert.match(p.path, /updated_at=lt\.2025-10-06/);
});
test('valori non validi → default; le approvazioni in attesa non si cancellano mai', () => {
  const piano = pianoConservazione({ RETENTION_LOG_GIORNI: 'abc', RETENTION_APPROVAZIONI_GIORNI: '1' }, adesso);
  assert.equal(piano[0].giorni, 90);
  assert.equal(piano[1].giorni, 180);
  assert.match(piano[1].path, /stato=neq\.pending/);
});
test('esegue DELETE per tabella, conta le righe, un errore non ferma le altre', async () => {
  let n = 0;
  const fetchImpl = async (url, o) => {
    assert.equal(o.method, 'DELETE');
    n++;
    if (n === 2) throw new Error('rete');
    return { ok: true, json: async () => [{ id: 1 }, { id: 2 }] };
  };
  const e = await eseguiConservazione({ SUPABASE_URL: 'https://x', headers: {}, fetchImpl }, {}, adesso);
  assert.equal(e.length, 3);
  assert.equal(e[0].eliminate, 2);
  assert.equal(e[1].errore, 'rete');
  assert.equal(e[2].eliminate, 2);
});
