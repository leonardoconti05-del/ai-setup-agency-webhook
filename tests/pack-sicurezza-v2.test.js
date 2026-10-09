// Pack noleggio e giardiniere v2: le falle di sicurezza emerse dal secondo holdout sono chiuse
// e le nuove frasi non fanno scattare allarmi su frasi innocue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costruisciIndice } from '../lib/engine/pack.js';
import { classificaMessaggio } from '../lib/engine/safety.js';
import { normalizza } from '../lib/engine/text.js';

async function indice(settore) {
  const m = await import(`../lib/engine/packs/${settore}.js`);
  return costruisciIndice(m.pack, m.faq);
}
const livello = (idx, frase) => classificaMessaggio(normalizza(frase), idx);

const idxN = await indice('noleggio');
const idxG = await indice('giardiniere');

test('noleggio v2: emergenze mai viste prima sono CRITICAL', () => {
  for (const f of ['sono finito fuori strada con il furgone e non riesco a muovere la gamba', 'dal cofano sale una nuvola di fumo bianco', 'mi sono ribaltato con lo scooter', 'non sento le gambe dopo la caduta']) {
    assert.equal(livello(idxN, f).level, 'CRITICAL', f);
  }
});
test('noleggio v2: frasi innocue non diventano CRITICAL', () => {
  for (const f of ['quanto costa il furgone al giorno?', 'posso avere un casco per la bici?', 'che differenza c\'è tra cauzione e franchigia?']) {
    assert.notEqual(livello(idxN, f).level, 'CRITICAL', f);
  }
});
test('giardiniere v2: emergenze mai viste prima sono CRITICAL', () => {
  for (const f of ['la motosega ha colpito la gamba di un operaio, perde molto sangue', 'mio figlio ha ingerito del diserbante che era nel capanno', 'il decespugliatore ha tagliato la mano a mio padre']) {
    assert.equal(livello(idxG, f).level, 'CRITICAL', f);
  }
});
test('giardiniere v2: ramo che sfonda una struttura è almeno HIGH', () => {
  const l = livello(idxG, 'un grosso ramo ha sfondato il tetto della veranda').level;
  assert.ok(['HIGH', 'CRITICAL'].includes(l), l);
});
test('giardiniere v2: lavori normali con gli attrezzi non fanno allarme', () => {
  for (const f of ['la motosega ha tagliato bene il ramo, grazie', 'il tagliaerba ha preso il tubo dell\'irrigazione', 'vorrei far potare la siepe lunedì']) {
    const l = livello(idxG, f);
    assert.ok(!['CRITICAL', 'HIGH'].includes(l.level), `${f} -> ${l.level} ${l.motivi.join('|')}`);
  }
});
test('giardiniere v2: richiesta del responsabile è passaggio a una persona', () => {
  assert.equal(livello(idxG, 'mi passate il responsabile?').richiestaUmano, true);
});
