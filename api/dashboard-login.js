// api/dashboard-login.js
//
// Punto di ingresso del login per-cliente. Il link inviato allo staff è
// nella forma:
//
//   https://<progetto>.vercel.app/api/dashboard-login?token=<dashboard_token del cliente>
//
// Il token viene verificato contro clienti.dashboard_token su Supabase
// (colonna introdotta in migrations/001_dashboard_auth.sql). Se valido,
// viene impostato il cookie di sessione firmato (agency_session, vedi
// lib/session.js) e l'utente viene reindirizzato alla dashboard
// (api/dashboard.js). Da quel momento in poi, TUTTE le route protette
// leggono il cliente_id esclusivamente dal cookie — questo file è l'unico
// punto in cui un dashboard_token "diventa" una sessione.
//
// FIX P0-1 (21/9/2026): sostituisce il vecchio schema
// ?cliente_id=X&password=Y (password condivisa fra tutti i clienti) con
// un token opaco, univoco per cliente, che non identifica direttamente
// alcuna riga se non tramite lookup lato server.

import { firmaSessione, impostaCookieSessione } from '../lib/session.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paginaErrore(messaggio) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6;margin:0;">
    <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;max-width:420px;">
      <h2 style="margin-top:0;">Accesso non valido</h2>
      <p style="color:#6b7280;">${escapeHtml(messaggio)}</p>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SESSION_SECRET = process.env.SESSION_SECRET;

  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET non configurato.');
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send('<h2>Configurazione mancante</h2>');
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Metodo non permesso');
  }

  const token = req.query?.token;
  if (!token || typeof token !== 'string') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(paginaErrore('Link di accesso mancante o incompleto. Richiedi un nuovo link.'));
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // Lookup del cliente tramite dashboard_token. Il token è univoco
    // (indice UNIQUE, vedi migrations/001_dashboard_auth.sql), quindi al
    // più una riga corrisponde.
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?dashboard_token=eq.${encodeURIComponent(token)}&select=id,nome_attivita`,
      { headers }
    );
    const clienteData = await clienteRes.json();
    const cliente = Array.isArray(clienteData) ? clienteData[0] : null;

    if (!cliente) {
      console.error('Tentativo di login con dashboard_token non valido.');
      res.setHeader('Content-Type', 'text/html');
      return res.status(401).send(paginaErrore('Link di accesso non valido o scaduto. Contatta chi ti ha fornito il link.'));
    }

    // Token verificato: crea la sessione per QUESTO cliente_id e basta.
    // Da qui in avanti, dashboard.js e info-cliente.js non guarderanno mai
    // più altro che questo cookie per determinare l'identità del cliente.
    const sessionToken = firmaSessione({ cliente_id: cliente.id }, SESSION_SECRET);
    impostaCookieSessione(res, sessionToken);

    res.writeHead(302, { Location: '/api/dashboard' });
    return res.end();
  } catch (e) {
    console.error('Errore durante il login dashboard:', e);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(paginaErrore('Errore tecnico durante l\'accesso. Riprova tra poco.'));
  }
}
