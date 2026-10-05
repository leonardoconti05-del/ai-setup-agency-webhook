// Genera lo SQL per caricare un Sector Pack (profilo, FAQ, scenari) e la sua
// valutazione offline in Supabase. Non si collega al database: produce file
// SQL da incollare nell'SQL Editor (o applicare con la CLI), così ogni
// pubblicazione è ispezionabile prima di essere eseguita.
//
//   node scripts/pubblica-pack.mjs dentista            -> migrations/seed/<settore>_v<N>.sql
//   node scripts/pubblica-pack.mjs dentista --promuovi -> stampa anche lo SQL di promozione
//
// Il seed inserisce il profilo in stato 'test' e registra l'esito della
// valutazione (sector_eval_runs). La PROMOZIONE a 'production' è un file
// separato, da eseguire consapevolmente: il trigger del database la rifiuta
// se la valutazione non ha superato il gate.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { validaPack, costruisciIndice } from '../lib/engine/pack.js';
import { valutaPack } from '../lib/engine/evaluate.js';

const settore = process.argv[2];
if (!settore) { console.error('Uso: node scripts/pubblica-pack.mjs <settore>'); process.exit(1); }
const radice = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(path.join(radice, `../lib/engine/packs/${settore}.js`)).href);
const { scenari } = await import(pathToFileURL(path.join(radice, `../lib/engine/packs/${settore}.scenari.js`)).href);
const { pack, faq, VERSIONE, CHANGELOG } = mod;

const v = validaPack(pack);
if (!v.ok) { console.error('Pack non valido:', v.errori); process.exit(1); }
const indice = costruisciIndice(pack, faq);
const ev = valutaPack({ pack, indice, scenari });

// Dollar-quoting con tag che non compare nel contenuto.
const dq = (valore) => { const t = 'q' + Math.random().toString(36).slice(2, 8); return `$${t}$${typeof valore === 'string' ? valore : JSON.stringify(valore)}$${t}$`; };
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

const righe = [];
righe.push(`-- Seed Sector Pack "${settore}" v${VERSIONE} — generato da scripts/pubblica-pack.mjs`);
righe.push(`-- Richiede migrations/010_sector_engine.sql. Idempotente. Stato iniziale: 'test'.`);
righe.push(`-- Valutazione offline: ${ev.passati}/${ev.totale} scenari, gate ${ev.gate_passed ? 'SUPERATO' : 'NON superato'} (solo livello deterministico, vedi docs/SECTOR_ENGINE.md).`);
righe.push('begin;');
righe.push(`insert into sector_profiles (settore, version, status, pack, changelog)
values (${lit(settore)}, ${VERSIONE}, 'test', ${dq(pack)}::jsonb, ${lit(CHANGELOG || '')})
on conflict (settore, version) do update set pack = excluded.pack, changelog = excluded.changelog
where sector_profiles.status in ('draft', 'test');`);
righe.push(`delete from sector_faq where settore = ${lit(settore)} and version = ${VERSIONE};`);
for (const f of faq) {
  righe.push(`insert into sector_faq (settore, version, status, intent, domanda_canonica, varianti, risposta_base, condizioni) values (${lit(settore)}, ${VERSIONE}, 'production', ${f.intent ? lit(f.intent) : 'null'}, ${lit(f.domanda_canonica)}, ${dq(f.varianti || [])}::jsonb, ${lit(f.risposta_base)}, ${dq(f.condizioni || {})}::jsonb);`);
}
for (const s of scenari) {
  const { codice, categoria, ...resto } = s;
  righe.push(`insert into sector_test_scenarios (settore, codice, categoria, scenario) values (${lit(settore)}, ${lit(codice)}, ${lit(categoria)}, ${dq(resto)}::jsonb) on conflict (settore, codice) do update set categoria = excluded.categoria, scenario = excluded.scenario;`);
}
righe.push(`insert into sector_eval_runs (profile_id, settore, version, scenari_totali, scenari_passati, metriche, gate_passed, note)
select id, settore, version, ${ev.totale}, ${ev.passati}, ${dq(ev.metriche)}::jsonb, ${ev.gate_passed}, ${lit('Valutazione offline deterministica (lib/engine/evaluate.js). Non misura la qualità del testo LLM.')}
from sector_profiles where settore = ${lit(settore)} and version = ${VERSIONE};`);
righe.push('commit;');

const out = path.join(radice, '../migrations/seed');
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, `${settore}_v${VERSIONE}.sql`);
fs.writeFileSync(file, righe.join('\n') + '\n');

const promo = `-- Promozione a PRODUZIONE: attiva il motore per i clienti del settore "${settore}".
-- Il database la rifiuta se non esiste una valutazione con gate superato.
-- ROLLBACK immediato: update sector_profiles set status = 'archived' where settore = ${lit(settore)} and version = ${VERSIONE};
-- (senza pack in produzione il webhook torna da solo al percorso precedente entro 60 secondi)
update sector_profiles set status = 'production' where settore = ${lit(settore)} and version = ${VERSIONE};
update sector_faq set status = 'production' where settore = ${lit(settore)} and version = ${VERSIONE};
`;
fs.writeFileSync(path.join(out, `${settore}_v${VERSIONE}_PROMUOVI.sql`), promo);
console.log(`${file}\n  scenari ${ev.passati}/${ev.totale}, gate ${ev.gate_passed ? 'superato' : 'NON superato'}, ${faq.length} FAQ`);
