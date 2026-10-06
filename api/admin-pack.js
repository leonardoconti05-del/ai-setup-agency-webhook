// api/admin-pack.js — carica (e opzionalmente promuove) i Sector Pack senza incollare SQL.
//
//   /api/admin-pack?token=<PACK_ADMIN_TOKEN>&settore=ristorante            -> carica in stato 'test'
//   /api/admin-pack?token=...&settore=ristorante&promuovi=1                -> carica e porta in produzione
//   /api/admin-pack?token=...&settore=tutti                                -> tutti i settori (solo carica)
//
// Sicurezza: fail-closed (senza PACK_ADMIN_TOKEN su Vercel risponde 500), confronto a tempo costante,
// nessun dato arriva dal client oltre al nome del settore (lista chiusa). Il token compare nell'URL e
// quindi nei log: dopo l'uso rimuovere la variabile PACK_ADMIN_TOKEN da Vercel.
import { timingSafeEqual } from 'node:crypto';
import { pubblicaPack } from '../lib/engine/pubblica.js';
import { SETTORI_DISPONIBILI } from '../lib/engine/packs/registro.js';

const uguali = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

export default async function handler(req, res) {
  const TOKEN = process.env.PACK_ADMIN_TOKEN;
  if (!TOKEN || TOKEN.length < 16) return res.status(500).json({ error: 'PACK_ADMIN_TOKEN mancante o troppo corto (min. 16 caratteri)' });
  if (!uguali(req.query?.token || '', TOKEN)) return res.status(401).json({ error: 'Non autorizzato' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
  const richiesto = String(req.query?.settore || '');
  const promuovi = req.query?.promuovi === '1';
  const lista = richiesto === 'tutti' ? SETTORI_DISPONIBILI : SETTORI_DISPONIBILI.filter((s) => s === richiesto);
  if (lista.length === 0) return res.status(400).json({ error: 'settore non valido', disponibili: SETTORI_DISPONIBILI });

  const esiti = [];
  for (const s of lista) {
    try { esiti.push(await pubblicaPack({ SUPABASE_URL, headers }, s, { promuovi })); }
    catch (e) { esiti.push({ ok: false, settore: s, errore: String(e.message || e) }); }
  }
  return res.status(200).json({ ok: esiti.every((e) => e.ok), esiti });
}
