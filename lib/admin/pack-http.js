// lib/admin/pack-http.js
//
// Endpoint amministrativo dei Sector Pack: /api/admin-pack (vedi vercel.json: è un rewrite verso una
// funzione già esistente, perché il piano Vercel gratuito ammette al massimo 12 funzioni).
//
//  GET  → pagina con un modulo (nessun segreto, nessun dato);
//  POST → JSON { token, azione, settore? } con azione ∈ importa | verifica | compatibilita | harness | promuovi | promuovi_verificato | sospendi
//         (harness = prova end-to-end del pack con motore e governance reali, in sola lettura: vedi lib/engine/harness.js).
//
// Il token (PACK_ADMIN_TOKEN):
//  - si legge SOLO dalle variabili d'ambiente (minimo 32 caratteri, altrimenti l'endpoint è chiuso: 503);
//  - viaggia solo nel corpo del POST (mai nell'URL, quindi mai nei log di accesso); non viene mai scritto
//    nel database, né registrato nei log, né restituito nelle risposte;
//  - si confronta in tempo costante (sha256 + timingSafeEqual);
//  - è protetto da rate limiting: per IP in memoria + un blocco globale persistente (tentativi falliti
//    contati nella tabella di audit, che non contiene il token) + un ritardo fisso su ogni errore;
//  - è pensato per essere revocato subito dopo l'import: basta rimuovere la variabile da Vercel.
// Deny-by-default: token mancante/errato → 401; payload non valido o settore sconosciuto → 400.

import { createHash, timingSafeEqual } from 'node:crypto';
import { SETTORI_DISPONIBILI } from '../engine/packs/registro.js';
import { eseguiHarness } from '../engine/harness.js';
import { importaPack, verificaImport, verificaCompatibilita, promuoviPack, promuoviVerificato, SETTORI_REGOLAMENTATI, sospendiPack, auditDisponibile } from './pack-pipeline.js';

const AZIONI = ['importa', 'verifica', 'compatibilita', 'harness', 'promuovi', 'promuovi_verificato', 'sospendi'];
const TOKEN_MIN = 32;
const FINESTRA_MS = 15 * 60 * 1000;
const MAX_FALLITI_GLOBALI = 20;
const MAX_FALLITI_IP = 8;
const tentativiIp = new Map();

const sha = (s) => createHash('sha256').update(String(s)).digest();
export function tokenValido(fornito, atteso) {
  if (typeof fornito !== 'string' || !atteso) return false;
  return timingSafeEqual(sha(fornito), sha(atteso));
}

function ipHash(req, env) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  return createHash('sha256').update(ip + '|' + (env.LEDGER_SALT || '')).digest('hex').slice(0, 16);
}

function limiteIp(chiave, adesso) {
  const r = tentativiIp.get(chiave);
  if (!r || adesso - r.t > FINESTRA_MS) return false;
  return r.n >= MAX_FALLITI_IP;
}
function registraFalloIp(chiave, adesso) {
  const r = tentativiIp.get(chiave);
  if (!r || adesso - r.t > FINESTRA_MS) tentativiIp.set(chiave, { n: 1, t: adesso });
  else r.n += 1;
}

export const PAGINA = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sector Pack — amministrazione</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#111}input,select,button{font:inherit;padding:8px 10px;margin:4px 4px 4px 0}button{cursor:pointer}pre{background:#f4f4f5;padding:12px;overflow:auto;white-space:pre-wrap;border-radius:8px}.w{background:#fef3c7;padding:10px 12px;border-radius:8px}</style></head><body>
<h1>Sector Pack — amministrazione</h1>
<p class="w">Il token resta in questa pagina e viaggia solo nel corpo della richiesta. Dopo l'import <strong>rimuovi PACK_ADMIN_TOKEN da Vercel</strong>.</p>
<p><input id="t" type="password" autocomplete="off" placeholder="PACK_ADMIN_TOKEN" size="40"></p>
<p><button id="b-verifica">Verifica stato (29 settori)</button> <button id="b-importa-tutti">Importa tutti in TEST</button></p>
<p><select id="s"></select> <button id="b-importa">Importa questo</button> <button id="b-compat">Compatibilità runtime</button> <button id="b-harness">Harness runtime</button> <button id="b-promuovi">Promuovi ad ACTIVE</button> <button id="b-sospendi">Sospendi</button></p>
<p><strong>Promozione in serie</strong> (solo settori non regolamentati; per ciascuno: harness + controlli + promozione; si ferma al primo problema)<br>
<input id="serie" size="60" placeholder="es. immobiliare, ristorante, bar_caffetteria"> <button id="b-serie">Promuovi in serie</button></p>
<p><strong>Serie regolamentati</strong> (medico, avvocato, ecc.: stessi controlli, ma serve scrivere CONFERMO; l'audit registra la tua conferma)<br>
<input id="serie-reg" size="60" placeholder="es. veterinario, fisioterapista"> <button id="b-serie-reg">Promuovi regolamentati</button></p>
<pre id="o">Pronto.</pre>
<script>
var SETTORI=__SETTORI__;var REGOLAMENTATI=__REGOLAMENTATI__;var s=document.getElementById('s');SETTORI.forEach(function(x){var o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)});
var out=document.getElementById('o');
function call(azione,settore,extra){var tok=document.getElementById('t').value;var body={token:tok,azione:azione};if(settore)body.settore=settore;if(extra)for(var k in extra)body[k]=extra[k];
return fetch('/api/admin-pack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){j._http=r.status;return j})}).catch(function(e){return{errore:String(e)}})}
function show(j){out.textContent=JSON.stringify(j,null,2)}
document.getElementById('b-verifica').onclick=function(){call('verifica').then(show)};
document.getElementById('b-importa').onclick=function(){call('importa',s.value).then(show)};
document.getElementById('b-compat').onclick=function(){call('compatibilita',s.value).then(show)};
document.getElementById('b-harness').onclick=function(){call('harness',s.value).then(show)};
document.getElementById('b-promuovi').onclick=function(){if(confirm('Promuovere '+s.value+' ad ACTIVE? Entra subito in produzione per i clienti di questo settore.'))call('promuovi',s.value).then(show)};
document.getElementById('b-sospendi').onclick=function(){if(confirm('Sospendere '+s.value+'?'))call('sospendi',s.value).then(show)};
document.getElementById('b-serie').onclick=function(){
var lista=document.getElementById('serie').value.split(/[,\\s]+/).filter(Boolean);
var sconosciuti=lista.filter(function(x){return SETTORI.indexOf(x)<0});
if(!lista.length){out.textContent='Scrivi almeno un settore.';return}
if(sconosciuti.length){out.textContent='Settori sconosciuti: '+sconosciuti.join(', ');return}
if(lista.length>8){out.textContent='Massimo 8 settori per volta.';return}
if(!confirm('Promuovere in produzione, uno alla volta: '+lista.join(', ')+'? Ogni settore entra subito in produzione per i suoi clienti. Si ferma al primo problema.'))return;
var i=0,r=[];(function next(){if(i>=lista.length){show(r);return}var x=lista[i++];out.textContent='Promozione '+i+'/'+lista.length+': '+x;
call('promuovi_verificato',x).then(function(j){r.push({settore:x,esito:j.esito||j.errore||j.error,stato:j.stato,fase:j.fase,motivo:j.motivo,harness:j.harness&&(j.harness.sonde_passate+'/'+j.harness.sonde)});
if(!j.ok){r.push({fermato_a:x,motivo:'primo problema: le promozioni successive non sono state eseguite'});show(r);return}next()})})()};
document.getElementById('b-serie-reg').onclick=function(){
var lista=document.getElementById('serie-reg').value.split(/[,\\s]+/).filter(Boolean);
var nonReg=lista.filter(function(x){return REGOLAMENTATI.indexOf(x)<0});
if(!lista.length){out.textContent='Scrivi almeno un settore regolamentato.';return}
if(nonReg.length){out.textContent='Non sono settori regolamentati (usa la serie normale): '+nonReg.join(', ');return}
if(lista.length>8){out.textContent='Massimo 8 settori per volta.';return}
var c=prompt('ATTENZIONE: '+lista.join(', ')+' entreranno in produzione per i clienti reali. I contenuti di questi settori richiedono una revisione professionale. Scrivi CONFERMO per procedere.');
if(c!=='CONFERMO'){out.textContent='Annullato: la conferma non è stata scritta.';return}
var i=0,r=[];(function next(){if(i>=lista.length){show(r);return}var x=lista[i++];out.textContent='Promozione '+i+'/'+lista.length+': '+x;
call('promuovi_verificato',x,{conferma_regolamentati:c}).then(function(j){r.push({settore:x,esito:j.esito||j.errore||j.error,stato:j.stato,fase:j.fase,motivo:j.motivo,harness:j.harness&&(j.harness.sonde_passate+'/'+j.harness.sonde)});
if(!j.ok){r.push({fermato_a:x,motivo:'primo problema: le promozioni successive non sono state eseguite'});show(r);return}next()})})()};
document.getElementById('b-importa-tutti').onclick=function(){var i=0,r=[];out.textContent='Import in corso…';(function next(){if(i>=SETTORI.length){show(r);return}var x=SETTORI[i++];out.textContent='Import '+i+'/'+SETTORI.length+': '+x;call('importa',x).then(function(j){r.push({settore:x,esito:j.esito||j.errore||j.error,stato:j.stato,gate:j.gate});if(j._http===401||j._http===429||j._http===503){show(j);return}next()})})()};
</script></body></html>`;

function risposta(res, codice, corpo) {
  res.setHeader?.('Cache-Control', 'no-store');
  res.setHeader?.('X-Content-Type-Options', 'nosniff');
  return res.status(codice).json(corpo);
}

export async function gestisciAdminPack(req, res, deps = {}) {
  const env = deps.env || process.env;
  const adesso = (deps.adesso || Date.now)();
  const ritardoMs = deps.ritardoMs ?? 700;

  if (req.method === 'GET') {
    res.setHeader?.('Content-Type', 'text/html; charset=utf-8');
    res.setHeader?.('Cache-Control', 'no-store');
    res.setHeader?.('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'");
    return res.status(200).send(PAGINA.replace('__SETTORI__', JSON.stringify(SETTORI_DISPONIBILI)).replace('__REGOLAMENTATI__', JSON.stringify(SETTORI_REGOLAMENTATI)));
  }
  if (req.method !== 'POST') return risposta(res, 405, { error: 'metodo non consentito' });

  const TOKEN = env.PACK_ADMIN_TOKEN;
  if (!TOKEN || TOKEN.length < TOKEN_MIN) return risposta(res, 503, { error: 'endpoint non attivo (PACK_ADMIN_TOKEN mancante o troppo corto)' });

  const SUPABASE_URL = env.SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  const ctx = deps.ctx || { SUPABASE_URL, headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` }, fetchImpl: deps.fetchImpl };
  const chiaveIp = ipHash(req, env);

  // Rate limiting (prima di guardare il token).
  if (limiteIp(chiaveIp, adesso)) return risposta(res, 429, { error: 'troppi tentativi, riprova più tardi' });
  try {
    const da = new Date(adesso - FINESTRA_MS).toISOString();
    const falliti = await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/sector_pack_audit?evento=eq.auth_failed&created_at=gte.${encodeURIComponent(da)}&select=id&limit=${MAX_FALLITI_GLOBALI + 1}`, { headers: ctx.headers });
    if (falliti.ok) {
      const j = await falliti.json();
      if (Array.isArray(j) && j.length >= MAX_FALLITI_GLOBALI) return risposta(res, 429, { error: 'troppi tentativi falliti, blocco temporaneo' });
    }
  } catch { /* se il controllo persistente non risponde, resta il limite per IP */ }

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch { corpo = null; } }
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return risposta(res, 400, { error: 'payload non valido' });

  if (!tokenValido(corpo.token, TOKEN)) {
    registraFalloIp(chiaveIp, adesso);
    try { await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/sector_pack_audit`, { method: 'POST', headers: { ...ctx.headers, Prefer: 'return=minimal' }, body: JSON.stringify({ evento: 'auth_failed', esito: 'rifiutato', ip_hash: chiaveIp }) }); } catch { /* best-effort */ }
    if (ritardoMs) await new Promise((r) => setTimeout(r, ritardoMs));
    return risposta(res, 401, { error: 'non autorizzato' });
  }

  const { azione, settore } = corpo;
  if (!AZIONI.includes(azione)) return risposta(res, 400, { error: 'azione non valida', consentite: AZIONI });
  if (azione !== 'verifica' && !SETTORI_DISPONIBILI.includes(settore)) return risposta(res, 400, { error: 'settore sconosciuto' });
  if (!(await auditDisponibile(ctx))) return risposta(res, 503, { error: 'tabella di audit non disponibile: applicare migrations/016_sector_pack_audit.sql' });

  const commit = env.VERCEL_GIT_COMMIT_SHA || null;
  try {
    let esito;
    if (azione === 'verifica') esito = await verificaImport(ctx);
    else if (azione === 'importa') esito = await importaPack(ctx, settore, { sha: commit });
    else if (azione === 'compatibilita') esito = await verificaCompatibilita(ctx, settore);
    else if (azione === 'harness') {
      esito = await eseguiHarness({ SUPABASE_URL: ctx.SUPABASE_URL, headers: ctx.headers, fetchImpl: ctx.fetchImpl || fetch }, settore, { stato: 'test' });
      // Auditabile come ogni operazione; solo conteggi, nessun testo di prova.
      try {
        await (ctx.fetchImpl || fetch)(`${ctx.SUPABASE_URL}/rest/v1/sector_pack_audit`, { method: 'POST', headers: { ...ctx.headers, Prefer: 'return=minimal' }, body: JSON.stringify({ evento: 'verifica', settore, pack_version: esito.pack_version ?? null, esito: esito.ok ? 'ok' : 'rifiutato', commit_sha: commit, errore: (esito.errori || []).join('; ').slice(0, 300) || null, dettaglio: { harness: esito.harness_version, sonde: esito.sonde, sonde_passate: esito.sonde_passate, governance: esito.governance, scritture_db: esito.scritture_db } }) });
      } catch { /* best-effort */ }
    }
    else if (azione === 'promuovi_verificato') esito = await promuoviVerificato(ctx, settore, { sha: commit, confermaRegolamentati: corpo.conferma_regolamentati === 'CONFERMO' });
    else if (azione === 'promuovi') esito = await promuoviPack(ctx, settore, { sha: commit });
    else esito = await sospendiPack(ctx, settore, { sha: commit });
    const rifiutato = esito.esito === 'rifiutato' || esito.ok === false;
    return risposta(res, rifiutato && azione !== 'verifica' ? 422 : 200, esito);
  } catch (e) {
    console.error('admin-pack errore:', String(e.message || e).slice(0, 200));
    return risposta(res, 500, { error: 'errore interno' });
  }
}
