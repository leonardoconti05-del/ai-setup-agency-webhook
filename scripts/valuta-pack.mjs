// Uso: node scripts/valuta-pack.mjs <settore> [--dettagli]
// Esegue la valutazione offline del Sector Pack e stampa metriche e fallimenti.
import { costruisciIndice } from '../lib/engine/pack.js';
import { valutaPack } from '../lib/engine/evaluate.js';

const settore = process.argv[2] || 'dentista';
const { pack, faq } = await import(`../lib/engine/packs/${settore}.js`);
const { scenari } = await import(`../lib/engine/packs/${settore}.scenari.js`);
const r = valutaPack({ pack, indice: costruisciIndice(pack, faq), scenari });
console.log(`${settore}: ${r.passati}/${r.totale} scenari — score ${r.score} — gate ${r.gate_passed ? 'SUPERATO' : 'NON superato'}`);
console.log(JSON.stringify(r.metriche));
for (const f of r.falliti) {
  const ko = Object.entries(f.esiti).filter(([, v]) => !v).map(([k]) => k).join(',');
  console.log(`  [${f.codice}] ${JSON.stringify(f.input)} -> KO(${ko}) oss=${f.osservato.intent}/${f.osservato.confidence} act=${f.osservato.action} urg=${f.osservato.urgency} nq=${f.osservato.next_question} ent=${JSON.stringify(f.osservato.entities)}`);
}
