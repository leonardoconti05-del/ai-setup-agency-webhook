// lib/admin/pack-pipeline.js
//
// Pipeline amministrativa dei Sector Pack: GitHub (codice) → import → validazione → TEST →
// valutazione → ACTIVE → runtime. Riusa le tabelle del motore verticale (migrations/010):
//   sector_profiles (pack + stato), sector_faq, sector_test_scenarios, sector_eval_runs
// e aggiunge SOLO l'audit (migrations/016: sector_pack_audit, append-only).
//
// Mappa degli stati richiesti sugli stati già esistenti nel database (nessuna colonna nuova):
//   DRAFT = 'draft'   TEST = 'test'   ACTIVE = 'production'   SUSPENDED = 'archived'
// Il runtime (lib/engine/pack.js › caricaPackProduzione) legge SOLO status='production'.
//
// Garanzie:
//  - l'import crea/aggiorna SOLO profili in draft/test: mai direttamente ACTIVE;
//  - un profilo già ACTIVE/SUSPENDED/approved non viene mai toccato dall'import (esito "saltato");
//  - la promozione ricontrolla TUTTO sul pack che sta nel database (non su quello del codice):
//    stessa versione/contenuto del codice, validazione, gate di valutazione, metadata dell'holdout,
//    compatibilità col caricamento runtime; il trigger del database rifiuta comunque senza gate superato;
//  - il dato di generalizzazione ufficiale è il PRIMO giro dell'holdout (primo-giro-holdout.js);
//    il risultato dopo le correzioni non viene mai usato come prova;
//  - fail-closed: senza la tabella di audit nessuna scrittura parte;
//  - nessun segreto, nessun testo di clienti in questi dati.

import { createHash } from 'node:crypto';
import { validaPack, costruisciIndice } from '../engine/pack.js';
import { valutaPack } from '../engine/evaluate.js';
import { analisiDeterministica } from '../engine/run.js';
import { SETTORI_DISPONIBILI, caricaDefinizionePack } from '../engine/packs/registro.js';
import { PRIMO_GIRO_HOLDOUT } from '../engine/packs/primo-giro-holdout.js';
import { eseguiHarness } from '../engine/harness.js';

export const STATI = { DRAFT: 'draft', TEST: 'test', ACTIVE: 'production', SUSPENDED: 'archived' };
const SCRIVIBILI = [STATI.DRAFT, STATI.TEST];

// ===== utilità pure =====
export function stringaStabile(valore) {
  const normalizza = (v) => {
    if (Array.isArray(v)) return v.map(normalizza);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, normalizza(v[k])]));
    return v;
  };
  return JSON.stringify(normalizza(JSON.parse(JSON.stringify(valore ?? null))));
}
export const hashContenuto = (valore) => createHash('sha256').update(stringaStabile(valore)).digest('hex');

const faqDaRiga = (r) => ({ intent: r.intent || null, domanda_canonica: r.domanda_canonica, varianti: r.varianti || [], risposta_base: r.risposta_base, condizioni: r.condizioni || {} });

// ===== validazione e valutazione di una definizione (solo codice, nessun database) =====
export function analizza(settore, def) {
  const errori = [];
  if (!SETTORI_DISPONIBILI.includes(settore)) errori.push('settore non valido');
  if (!def) { errori.push('definizione del pack non trovata'); return { ok: false, errori }; }
  if (def.SETTORE !== settore) errori.push(`identificatore settore incoerente (${def.SETTORE})`);
  if (!Number.isInteger(def.VERSIONE) || def.VERSIONE < 1) errori.push('versione del pack non valida');
  const v = validaPack(def.pack);
  if (!v.ok) errori.push(...v.errori.map((e) => `pack: ${e}`));
  const nIntent = def.pack?.intents?.length || 0;
  const nFaq = def.faq?.length || 0;
  const nScenari = def.scenari?.length || 0;
  const nHoldout = def.scenariHoldout?.length || 0;
  if (nIntent < 1) errori.push('intent assenti');
  if (nFaq < 1) errori.push('FAQ assenti');
  if (nScenari < 1) errori.push('scenari assenti');
  if (nHoldout < 1) errori.push('holdout assente');
  const codici = [...(def.scenari || []), ...(def.scenariHoldout || [])].map((s) => s.codice);
  if (new Set(codici).size !== codici.length) errori.push('codici scenario duplicati (set principale + holdout)');
  const pg = PRIMO_GIRO_HOLDOUT[settore];
  if (!pg) errori.push('primo giro dell\'holdout non registrato');
  else if (pg.totale !== nHoldout || pg.passati > pg.totale) errori.push('primo giro dell\'holdout incoerente con gli scenari');

  let gate = null;
  if (errori.length === 0) {
    const ev = valutaPack({ pack: def.pack, indice: costruisciIndice(def.pack, def.faq), scenari: def.scenari });
    gate = { passed: ev.gate_passed, passati: ev.passati, totale: ev.totale, metriche: ev.metriche };
  }
  return {
    ok: errori.length === 0, errori, version: def.VERSIONE, changelog: def.CHANGELOG || '',
    conteggi: { intent: nIntent, faq: nFaq, scenari: nScenari, holdout: nHoldout },
    gate, primoGiro: pg || null, hash: hashContenuto({ pack: def.pack, faq: def.faq }),
  };
}

// ===== accesso REST =====
async function rest(ctx, path, opzioni = {}) {
  const r = await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/${path}`, { ...opzioni, headers: { ...ctx.headers, ...(opzioni.headers || {}) } });
  const testo = await r.text();
  let json = null;
  try { json = testo ? JSON.parse(testo) : null; } catch { /* non JSON */ }
  if (!r.ok) throw new Error(`${opzioni.method || 'GET'} ${path.split('?')[0]} → HTTP ${r.status}`);
  return json;
}
async function leggiTutto(ctx, path) {
  const tutte = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const pagina = await rest(ctx, `${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${offset}`);
    if (!Array.isArray(pagina)) break;
    tutte.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return tutte;
}
const enc = encodeURIComponent;
const minimale = { Prefer: 'return=minimal' };

export async function auditDisponibile(ctx) {
  try { await rest(ctx, 'sector_pack_audit?select=id&limit=1'); return true; } catch { return false; }
}
async function audit(ctx, riga) {
  await rest(ctx, 'sector_pack_audit', { method: 'POST', headers: minimale, body: JSON.stringify(riga) });
}
const rigaAudit = (evento, settore, a, extra = {}) => ({
  evento, settore, pack_version: a?.version ?? null,
  n_intent: a?.conteggi?.intent ?? null, n_faq: a?.conteggi?.faq ?? null, n_scenari: a?.conteggi?.scenari ?? null, n_holdout: a?.conteggi?.holdout ?? null,
  gate_passed: a?.gate?.passed ?? null, holdout_primo_giro: a?.primoGiro || null, pack_hash: a?.hash || null, ...extra,
});
const NO_AUDIT = { ok: false, esito: 'rifiutato', errore: 'tabella di audit non disponibile: applicare migrations/016_sector_pack_audit.sql' };

// ===== IMPORT (→ TEST) =====
export async function importaPack(ctx, settore, { sha = null, caricaDef = caricaDefinizionePack } = {}) {
  if (!(await auditDisponibile(ctx))) return { settore, ...NO_AUDIT };
  const def = SETTORI_DISPONIBILI.includes(settore) ? await caricaDef(settore) : null;
  const a = analizza(settore, def);
  const base = { commit_sha: sha };
  if (!a.ok) {
    await audit(ctx, rigaAudit('import', SETTORI_DISPONIBILI.includes(settore) ? settore : null, a, { ...base, esito: 'rifiutato', errore: a.errori.join('; ').slice(0, 500) }));
    return { settore, ok: false, esito: 'rifiutato', errori: a.errori };
  }
  try {
    const sid = enc(settore);
    const [esistente] = (await rest(ctx, `sector_profiles?settore=eq.${sid}&version=eq.${a.version}&select=id,status`)) || [];
    if (esistente && !SCRIVIBILI.includes(esistente.status)) {
      await audit(ctx, rigaAudit('import', settore, a, { ...base, esito: 'saltato', stato_prima: esistente.status, stato_dopo: esistente.status }));
      return { settore, ok: true, esito: 'saltato', stato: esistente.status, motivo: `profilo già ${esistente.status}: non viene modificato dall'import` };
    }
    if (esistente) {
      const [ultimo] = (await rest(ctx, `sector_pack_audit?settore=eq.${sid}&evento=eq.import&esito=eq.ok&order=id.desc&limit=1&select=pack_hash,n_scenari,n_holdout,n_faq`)) || [];
      if (ultimo && ultimo.pack_hash === a.hash) {
        const nScen = (await leggiTutto(ctx, `sector_test_scenarios?settore=eq.${sid}&select=codice`)).length;
        const nFaq = (await leggiTutto(ctx, `sector_faq?settore=eq.${sid}&version=eq.${a.version}&select=id`)).length;
        if (nScen === a.conteggi.scenari + a.conteggi.holdout && nFaq === a.conteggi.faq) {
          await audit(ctx, rigaAudit('import', settore, a, { ...base, esito: 'invariato', stato_prima: esistente.status, stato_dopo: esistente.status }));
          return { settore, ok: true, esito: 'invariato', stato: esistente.status };
        }
      }
    }
    // Scrittura (idempotente: profilo aggiornato, FAQ e scenari sostituiti).
    let profileId;
    if (esistente) {
      await rest(ctx, `sector_profiles?id=eq.${esistente.id}&status=in.(draft,test)`, { method: 'PATCH', headers: minimale, body: JSON.stringify({ pack: def.pack, changelog: a.changelog, status: STATI.TEST }) });
      profileId = esistente.id;
    } else {
      const nuovo = await rest(ctx, 'sector_profiles', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ settore, version: a.version, status: STATI.TEST, pack: def.pack, changelog: a.changelog }) });
      profileId = nuovo?.[0]?.id;
      if (!profileId) throw new Error('profilo non creato');
    }
    await rest(ctx, `sector_faq?settore=eq.${sid}&version=eq.${a.version}`, { method: 'DELETE', headers: minimale });
    await rest(ctx, 'sector_faq', { method: 'POST', headers: minimale, body: JSON.stringify(def.faq.map((f) => ({ settore, version: a.version, status: STATI.TEST, intent: f.intent || null, domanda_canonica: f.domanda_canonica, varianti: f.varianti || [], risposta_base: f.risposta_base, condizioni: f.condizioni || {} }))) });
    await rest(ctx, `sector_test_scenarios?settore=eq.${sid}`, { method: 'DELETE', headers: minimale });
    const righeScenari = [
      ...def.scenari.map((s) => { const { codice, categoria, ...resto } = s; return { settore, codice, categoria, scenario: resto }; }),
      ...def.scenariHoldout.map((s) => { const { codice, categoria, ...resto } = s; return { settore, codice, categoria, scenario: { ...resto, holdout: true } }; }),
    ];
    for (let i = 0; i < righeScenari.length; i += 100) {
      await rest(ctx, 'sector_test_scenarios', { method: 'POST', headers: minimale, body: JSON.stringify(righeScenari.slice(i, i + 100)) });
    }
    await rest(ctx, 'sector_eval_runs', {
      method: 'POST', headers: minimale,
      body: JSON.stringify({
        profile_id: profileId, settore, version: a.version, scenari_totali: a.gate.totale, scenari_passati: a.gate.passati,
        metriche: { ...a.gate.metriche, holdout_primo_giro: a.primoGiro, holdout_scenari: a.conteggi.holdout, pack_hash: a.hash, commit_sha: sha },
        gate_passed: a.gate.passed, note: 'Valutazione deterministica (lib/engine/evaluate.js) sul set principale. Il dato di generalizzazione è il primo giro dell\'holdout in metriche.holdout_primo_giro. Non misura la qualità del testo LLM.',
      }),
    });
    await audit(ctx, rigaAudit('import', settore, a, { ...base, esito: 'ok', stato_prima: esistente?.status || null, stato_dopo: STATI.TEST }));
    return { settore, ok: true, esito: 'ok', stato: STATI.TEST, gate: a.gate.passed, conteggi: a.conteggi, primo_giro_holdout: a.primoGiro };
  } catch (e) {
    try { await audit(ctx, rigaAudit('import', settore, a, { ...base, esito: 'errore', errore: String(e.message || e).slice(0, 300) })); } catch { /* best-effort */ }
    return { settore, ok: false, esito: 'errore', errore: String(e.message || e).slice(0, 300) };
  }
}

// ===== COMPATIBILITÀ RUNTIME (stessa lettura/validazione di caricaPackProduzione, senza promuovere) =====
export async function verificaCompatibilita(ctx, settore, { registra = true } = {}) {
  if (!SETTORI_DISPONIBILI.includes(settore)) return { settore, ok: false, errori: ['settore non valido'] };
  const sid = enc(settore);
  const errori = [];
  try {
    const [riga] = (await rest(ctx, `sector_profiles?settore=eq.${sid}&status=in.(test,production)&select=id,version,status,pack&order=version.desc&limit=1`)) || [];
    if (!riga) return { settore, ok: false, errori: ['nessun profilo in TEST o ACTIVE'] };
    const v = validaPack(riga.pack);
    if (!v.ok) errori.push(...v.errori.map((e) => `pack: ${e}`));
    const faqRighe = await leggiTutto(ctx, `sector_faq?settore=eq.${sid}&version=eq.${riga.version}&select=intent,domanda_canonica,varianti,risposta_base,condizioni`);
    if (faqRighe.length < 1) errori.push('nessuna FAQ nel database');
    if (v.ok) {
      const indice = costruisciIndice(riga.pack, faqRighe.map(faqDaRiga));
      for (const m of ['ciao', 'vorrei prenotare per domani mattina, mi chiamo Sara']) {
        const det = analisiDeterministica({ messaggio: m, pack: riga.pack, indice });
        if (!det || typeof det !== 'object') errori.push('analisi deterministica non utilizzabile');
      }
    }
    const esito = { settore, ok: errori.length === 0, stato: riga.status, version: riga.version, errori, faq_nel_db: faqRighe.length };
    if (registra) await audit(ctx, { evento: 'verifica', settore, pack_version: riga.version, stato_prima: riga.status, stato_dopo: riga.status, esito: esito.ok ? 'ok' : 'rifiutato', n_faq: faqRighe.length, errore: errori.join('; ').slice(0, 300) || null });
    return esito;
  } catch (e) {
    return { settore, ok: false, errori: [String(e.message || e).slice(0, 200)] };
  }
}

// ===== PROMOZIONE TEST → ACTIVE =====
export async function promuoviPack(ctx, settore, { sha = null, caricaDef = caricaDefinizionePack } = {}) {
  if (!(await auditDisponibile(ctx))) return { settore, ...NO_AUDIT };
  const def = SETTORI_DISPONIBILI.includes(settore) ? await caricaDef(settore) : null;
  const a = analizza(settore, def);
  const rifiuta = async (motivo, statoPrima = null) => {
    try { await audit(ctx, rigaAudit('promozione', SETTORI_DISPONIBILI.includes(settore) ? settore : null, a, { commit_sha: sha, esito: 'rifiutato', stato_prima: statoPrima, stato_dopo: statoPrima, errore: String(motivo).slice(0, 500) })); } catch { /* best-effort */ }
    return { settore, ok: false, esito: 'rifiutato', stato: statoPrima, motivo };
  };
  if (!a.ok) return rifiuta(a.errori.join('; '));
  try {
    const sid = enc(settore);
    const [riga] = (await rest(ctx, `sector_profiles?settore=eq.${sid}&version=eq.${a.version}&select=id,status,pack`)) || [];
    if (!riga) return rifiuta('profilo non importato');
    if (riga.status !== STATI.TEST) return rifiuta(`la promozione parte solo da TEST (stato attuale: ${riga.status})`, riga.status);
    if (hashContenuto(riga.pack) !== hashContenuto(def.pack)) return rifiuta('il pack nel database non coincide con quello nel codice: rieseguire l\'import', riga.status);
    const compat = await verificaCompatibilita(ctx, settore, { registra: false });
    if (!compat.ok) return rifiuta(`compatibilità runtime non verificata: ${compat.errori.join('; ')}`, riga.status);
    const faqRighe = await leggiTutto(ctx, `sector_faq?settore=eq.${sid}&version=eq.${a.version}&select=intent,domanda_canonica,varianti,risposta_base,condizioni`);
    const ev = valutaPack({ pack: riga.pack, indice: costruisciIndice(riga.pack, faqRighe.map(faqDaRiga)), scenari: def.scenari });
    if (!ev.gate_passed) return rifiuta(`quality gate non superato (${ev.passati}/${ev.totale}): resta in TEST`, riga.status);
    const [ultimaEval] = (await rest(ctx, `sector_eval_runs?profile_id=eq.${riga.id}&order=created_at.desc&limit=1&select=gate_passed`)) || [];
    if (!ultimaEval?.gate_passed) return rifiuta('nessuna valutazione registrata con gate superato per questo profilo', riga.status);

    await rest(ctx, `sector_profiles?id=eq.${riga.id}&status=eq.test`, { method: 'PATCH', headers: minimale, body: JSON.stringify({ status: STATI.ACTIVE }) });
    await rest(ctx, `sector_faq?settore=eq.${sid}&version=eq.${a.version}`, { method: 'PATCH', headers: minimale, body: JSON.stringify({ status: STATI.ACTIVE }) });
    await audit(ctx, rigaAudit('promozione', settore, a, { commit_sha: sha, esito: 'ok', stato_prima: STATI.TEST, stato_dopo: STATI.ACTIVE }));
    return { settore, ok: true, esito: 'ok', stato: STATI.ACTIVE, primo_giro_holdout: a.primoGiro };
  } catch (e) {
    return rifiuta(String(e.message || e).slice(0, 300));
  }
}

// ===== PROMOZIONE VERIFICATA (un settore: harness runtime + tutti i controlli della promozione) =====
// Settori che richiedono una revisione professionale dei contenuti prima dell'uso reale: la promozione
// "verificata" (usata anche in serie dalla pagina admin) li rifiuta, salvo conferma esplicita del titolare
// (parola CONFERMO digitata a mano, registrata nell'audit). Restano promuovibili anche con il pulsante
// manuale "Promuovi ad ACTIVE", cioè con una decisione esplicita del titolare.
export const SETTORI_REGOLAMENTATI = ['medico', 'veterinario', 'fisioterapista', 'avvocato', 'commercialista', 'amministratore_condominio', 'scuola_guida', 'fabbro', 'carrozzeria'];

export async function promuoviVerificato(ctx, settore, { sha = null, harness = eseguiHarness, promuovi = promuoviPack, confermaRegolamentati = false } = {}) {
  if (!SETTORI_DISPONIBILI.includes(settore)) return { settore, ok: false, esito: 'rifiutato', fase: 'validazione', motivo: 'settore non valido' };
  if (!(await auditDisponibile(ctx))) return { settore, ...NO_AUDIT, fase: 'audit' };
  const rifiuta = async (fase, motivo, extra = {}) => {
    try { await audit(ctx, { evento: 'promozione', settore, stato_prima: STATI.TEST, stato_dopo: STATI.TEST, esito: 'rifiutato', commit_sha: sha, errore: String(motivo).slice(0, 500), dettaglio: { fase, verificata: true } }); } catch { /* best-effort */ }
    return { settore, ok: false, esito: 'rifiutato', fase, motivo, ...extra };
  };
  // Già attivo: niente da fare. Non è un errore e non deve fermare una serie (esito "saltato", registrato).
  try {
    const [attuale] = (await rest(ctx, `sector_profiles?settore=eq.${enc(settore)}&select=status,version&order=version.desc&limit=1`)) || [];
    if (attuale?.status === STATI.ACTIVE) {
      try { await audit(ctx, { evento: 'promozione', settore, pack_version: attuale.version, stato_prima: STATI.ACTIVE, stato_dopo: STATI.ACTIVE, esito: 'saltato', commit_sha: sha, errore: 'già in produzione: nessuna modifica', dettaglio: { fase: 'gia_attivo', verificata: true } }); } catch { /* best-effort */ }
      return { settore, ok: true, esito: 'saltato', fase: 'gia_attivo', stato: STATI.ACTIVE, motivo: 'già in produzione: nessuna modifica' };
    }
  } catch { /* se la lettura fallisce si prosegue: i controlli successivi rifiutano comunque */ }
  if (SETTORI_REGOLAMENTATI.includes(settore)) {
    if (confermaRegolamentati !== true) return rifiuta('regolamentato', 'settore regolamentato: serve una revisione professionale; la promozione verificata non lo promuove senza la conferma esplicita');
    // Il titolare ha confermato di persona (parola CONFERMO): resta scritto nell'audit, prima di ogni altro controllo.
    await audit(ctx, { evento: 'verifica', settore, stato_prima: STATI.TEST, stato_dopo: STATI.TEST, esito: 'ok', commit_sha: sha, dettaglio: { regolamentato_confermato: true, nota: 'promozione di un settore regolamentato con conferma esplicita del titolare' } });
  }
  let h;
  try {
    h = await harness({ SUPABASE_URL: ctx.SUPABASE_URL, headers: ctx.headers, fetchImpl: ctx.fetchImpl || fetch }, settore, { stato: STATI.TEST });
  } catch (e) { return rifiuta('harness', `harness non eseguibile: ${String(e.message || e).slice(0, 150)}`); }
  const sintesi = { sonde: h.sonde, sonde_passate: h.sonde_passate, governance: h.governance, scritture_db: h.scritture_db };
  if (!h.ok) return rifiuta('harness', `harness non superato: ${(h.errori || []).join('; ')}`, { harness: { ...sintesi, fallite: (h.fallite || []).slice(0, 5) } });
  const r = await promuovi(ctx, settore, { sha });
  return { ...r, fase: r.ok ? 'promosso' : 'promozione', harness: sintesi };
}

// ===== SOSPENSIONE (ACTIVE → SUSPENDED) =====
export async function sospendiPack(ctx, settore, { sha = null } = {}) {
  if (!(await auditDisponibile(ctx))) return { settore, ...NO_AUDIT };
  if (!SETTORI_DISPONIBILI.includes(settore)) return { settore, ok: false, esito: 'rifiutato', motivo: 'settore non valido' };
  try {
    const sid = enc(settore);
    const [riga] = (await rest(ctx, `sector_profiles?settore=eq.${sid}&status=eq.production&select=id,version&limit=1`)) || [];
    if (!riga) return { settore, ok: false, esito: 'rifiutato', motivo: 'nessun profilo ACTIVE da sospendere' };
    await rest(ctx, `sector_profiles?id=eq.${riga.id}&status=eq.production`, { method: 'PATCH', headers: minimale, body: JSON.stringify({ status: STATI.SUSPENDED }) });
    await rest(ctx, `sector_faq?settore=eq.${sid}&version=eq.${riga.version}&status=eq.production`, { method: 'PATCH', headers: minimale, body: JSON.stringify({ status: STATI.SUSPENDED }) });
    await audit(ctx, { evento: 'sospensione', settore, pack_version: riga.version, stato_prima: STATI.ACTIVE, stato_dopo: STATI.SUSPENDED, esito: 'ok', commit_sha: sha });
    return { settore, ok: true, esito: 'ok', stato: STATI.SUSPENDED };
  } catch (e) {
    return { settore, ok: false, esito: 'errore', errore: String(e.message || e).slice(0, 300) };
  }
}

// ===== VERIFICA GLOBALE dopo l'import =====
export async function verificaImport(ctx, { caricaDef = caricaDefinizionePack, attesi = SETTORI_DISPONIBILI } = {}) {
  const profili = await leggiTutto(ctx, 'sector_profiles?select=id,settore,version,status');
  const faq = await leggiTutto(ctx, 'sector_faq?select=settore,version,domanda_canonica');
  const scenari = await leggiTutto(ctx, 'sector_test_scenarios?select=settore,codice');
  const auditImport = await leggiTutto(ctx, 'sector_pack_audit?evento=eq.import&esito=in.(ok,invariato,saltato)&select=id,settore,pack_version,pack_hash,n_faq,n_scenari,n_holdout,esito&order=id.desc');

  const dettagli = [];
  let trovati = 0; let validati = 0; let inTest = 0; let attivi = 0; let sospesi = 0; let coerenti = 0;
  for (const s of attesi) {
    const p = profili.filter((x) => x.settore === s).sort((x, y) => y.version - x.version)[0];
    const d = { settore: s, trovato: !!p, stato: p?.status || null, validato: false, coerente: false, note: [] };
    if (p) {
      trovati++;
      const def = await caricaDef(s);
      const a = analizza(s, def);
      d.validato = a.ok; if (a.ok) validati++; else d.note.push(...a.errori);
      if (p.status === STATI.TEST) inTest++;
      if (p.status === STATI.ACTIVE) attivi++;
      if (p.status === STATI.SUSPENDED) sospesi++;
      const faqN = faq.filter((x) => x.settore === s && x.version === p.version).length;
      const scenN = scenari.filter((x) => x.settore === s).length;
      const ultimo = auditImport.find((x) => x.settore === s);
      if (!ultimo) d.note.push('nessuna riga di audit di import');
      if (a.ok && ultimo) {
        const okFaq = faqN === a.conteggi.faq;
        const okScen = p.status === STATI.TEST ? scenN === a.conteggi.scenari + a.conteggi.holdout : true;
        const okHash = p.status === STATI.TEST ? ultimo.pack_hash === a.hash : true;
        if (!okFaq) d.note.push(`FAQ nel db ${faqN} ≠ ${a.conteggi.faq}`);
        if (!okScen) d.note.push(`scenari nel db ${scenN} ≠ ${a.conteggi.scenari + a.conteggi.holdout}`);
        if (!okHash) d.note.push('hash dell\'ultimo import ≠ pack nel codice');
        if (p.status === STATI.ACTIVE && ultimo.pack_hash !== a.hash) d.note.push('ACTIVE: il pack nel codice è diverso da quello importato (verificare prima di aggiornarlo)');
        d.coerente = okFaq && okScen && okHash;
        if (d.coerente) coerenti++;
      }
    }
    dettagli.push(d);
  }
  const chiaviFaq = faq.map((x) => `${x.settore}|${x.version}|${x.domanda_canonica}`);
  const chiaviScen = scenari.map((x) => `${x.settore}|${x.codice}`);
  const duplicati = (chiaviFaq.length - new Set(chiaviFaq).size) + (chiaviScen.length - new Set(chiaviScen).size)
    + (profili.length - new Set(profili.map((x) => `${x.settore}|${x.version}`)).size);
  const n = attesi.length;
  const riepilogo = { attesi: n, trovati, validati, in_test: inTest, attivi, sospesi, coerenti, duplicati };
  const righe = [
    `${n} settori attesi`, `${trovati} settori trovati`, `${validati} pack validati`,
    `${inTest} pack in TEST` + (attivi || sospesi ? ` (+ ${attivi} ACTIVE, ${sospesi} SUSPENDED)` : ''),
    `${coerenti} pack con metadata coerenti`, `${duplicati} duplicati`,
  ];
  return { ok: trovati === n && validati === n && coerenti === n && duplicati === 0, righe, riepilogo, dettagli };
}
