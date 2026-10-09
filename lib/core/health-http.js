// lib/core/health-http.js — endpoint /api/core-health (rewrite verso una funzione esistente: vedi vercel.json, limite di 12 funzioni).
//  GET  Authorization: Bearer <CORE_HEALTH_TOKEN>   [&cliente_id=<uuid>]
//  - sola lettura: qualunque metodo diverso da GET → 405;
//  - il token si legge SOLO dall'ambiente (minimo 32 caratteri, altrimenti 503: endpoint chiuso), viaggia nell'intestazione, si confronta in tempo costante;
//  - deny-by-default: senza token valido → 401; cliente_id non UUID → 400;
//  - nessuna scrittura sul database, nessun segreto nelle risposte.
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { createPlatformContext, createTenantContext } from './contracts.js';
import { creaLettore, getCoreHealth } from './health.js';

const TOKEN_MIN = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha = (s) => createHash('sha256').update(String(s)).digest();
const uguali = (a, b) => typeof a === 'string' && !!b && timingSafeEqual(sha(a), sha(b));
const rispondi = (res, codice, corpo) => { res.setHeader?.('Cache-Control', 'no-store'); return res.status(codice).json(corpo); };

export async function gestisciCoreHealth(req, res, { env = process.env, fetchImpl, adesso } = {}) {
  if (req.method !== 'GET') return rispondi(res, 405, { error: 'metodo non consentito (sola lettura)' });
  const TOKEN = env.CORE_HEALTH_TOKEN;
  if (!TOKEN || TOKEN.length < TOKEN_MIN) return rispondi(res, 503, { error: 'endpoint non attivo (CORE_HEALTH_TOKEN mancante o troppo corto)' });
  const h = String(req.headers?.authorization || '');
  const fornito = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!uguali(fornito, TOKEN)) return rispondi(res, 401, { error: 'non autorizzato' });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return rispondi(res, 500, { error: 'configurazione database mancante' });

  const clienteId = req.query?.cliente_id;
  if (clienteId !== undefined && !UUID.test(String(clienteId))) return rispondi(res, 400, { error: 'cliente_id non valido' });

  const requestId = randomUUID();
  const dati = { actor: 'jarvis', agent: 'jarvis', requestId, authorizationSource: 'core-health-token' };
  const context = clienteId ? createTenantContext({ clienteId: String(clienteId).toLowerCase(), ...dati }) : createPlatformContext(dati);
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const leggi = creaLettore({ SUPABASE_URL: env.SUPABASE_URL, headers: { apikey: key, Authorization: `Bearer ${key}` }, fetchImpl });
  try {
    const rapporto = await getCoreHealth(context, leggi, { adesso: adesso || new Date() });
    return rispondi(res, 200, rapporto);
  } catch (e) {
    return rispondi(res, 500, { error: 'rapporto non disponibile' });
  }
}
