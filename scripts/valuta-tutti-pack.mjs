// scripts/valuta-tutti-pack.mjs
// Valuta automaticamente tutti i Sector Pack che hanno sia pack sia scenari.
// Exit code != 0 se almeno un pack non supera il gate.

import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { costruisciIndice } from '../lib/engine/pack.js';
import { valutaPack } from '../lib/engine/evaluate.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '../lib/engine/packs');
const files = await readdir(root);
const sectors = files
  .filter((name) => name.endsWith('.js') && !name.endsWith('.scenari.js'))
  .map((name) => basename(name, '.js'))
  .sort();

const requested = process.argv[2] ? [process.argv[2]] : sectors;
const results = [];
for (const settore of requested) {
  try {
    const { pack, faq } = await import('../lib/engine/packs/' + settore + '.js');
    const { scenari } = await import('../lib/engine/packs/' + settore + '.scenari.js');
    const r = valutaPack({ pack, indice: costruisciIndice(pack, faq), scenari });
    results.push({ settore, passati: r.passati, totale: r.totale, score: r.score, gate_passed: r.gate_passed });
  } catch (error) {
    results.push({ settore, passati: 0, totale: 0, score: 0, gate_passed: false, error: String(error?.message || error) });
  }
}

for (const r of results) {
  const status = r.gate_passed ? 'PASS' : 'FAIL';
  console.log(status + ' ' + r.settore + ' ' + r.passati + '/' + r.totale + ' score=' + r.score + (r.error ? ' error=' + r.error : ''));
}

const failures = results.filter((r) => !r.gate_passed);
console.log('Sector Pack gate: ' + (failures.length === 0 ? 'SUPERATO' : 'NON SUPERATO') + ' — ' + results.length + ' pack rilevati.');

if (failures.length > 0) process.exitCode = 1;
