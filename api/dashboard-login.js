// api/dashboard-login.js
//
// Punto di ingresso del login per-cliente. Supporta DUE metodi, perché
// esistono due tipi di cliente:
//
// 1. Link con token — per i client storici provisionati a mano
//    dall'agenzia su Supabase, nella forma:
//      https://<progetto>.vercel.app/api/dashboard-login?token=<dashboard_token>
//    Il token viene verificato contro clienti.dashboard_token (colonna
//    introdotta in migrations/001_dashboard_auth.sql).
//
// 2. Email + password — per i client che si sono registrati da soli
//    tramite api/registrati.js (migrations/009_registrazione_pubblica.sql).
//    Password verificata con hash scrypt (lib/password.js), mai in chiaro.
//
// In entrambi i casi, una volta verificata l'identità, viene impostato lo
// STESSO cookie di sessione firmato (agency_session, vedi lib/session.js)
// e l'utente viene reindirizzato alla dashboard (api/dashboard.js). Da
// quel momento in poi, TUTTE le route protette leggono il cliente_id
// esclusivamente dal cookie — questo file è l'unico punto in cui un
// dashboard_token o una coppia email+password "diventano" una sessione.
//
// FIX P0-1 (21/9/2026): sostituisce il vecchio schema
// ?cliente_id=X&password=Y (password condivisa fra tutti i clienti) con
// un token opaco, univoco per cliente, che non identifica direttamente
// alcuna riga se non tramite lookup lato server.

import { firmaSessione, impostaCookieSessione } from '../lib/session.js';
import { verificaPassword } from '../lib/password.js';
import { icon } from '../lib/icons.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TESTA_PAGINA = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

function paginaErrore(messaggio) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI Setup Agency — Accesso</title>${TESTA_PAGINA}</head>
  <body style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f5f9;margin:0;-webkit-font-smoothing:antialiased;">
    <div style="background:white;padding:36px 32px;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 28px rgba(15,23,42,.08);text-align:center;max-width:420px;">
      <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;margin:0 auto 12px;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:white;box-shadow:0 2px 8px rgba(79,70,229,.4);">${icon('sparkle', { size: 19 })}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4f46e5;margin-bottom:10px;">AI Setup Agency</div>
      <h2 style="margin:0 0 8px;color:#0f172a;">Accesso non valido</h2>
      <p style="color:#6b7280;margin-bottom:0;">${escapeHtml(messaggio)}</p>
      <p style="margin:18px 0 0;"><a href="/api/dashboard-login" style="color:#4f46e5;text-decoration:none;font-size:13px;font-weight:600;">&larr; Torna al login</a></p>
    </div>
  </body></html>`;
}

function paginaLoginForm({ errore, email = '' } = {}) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI Setup Agency — Accesso</title>${TESTA_PAGINA}
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 32px 16px; background: radial-gradient(1100px 500px at 15% -10%, #eef0fb 0%, #f4f5f9 45%, #f4f5f9 100%); color: #0f172a; -webkit-font-smoothing: antialiased; }
    .card { background: white; padding: 36px 32px; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 28px rgba(15,23,42,.08); max-width: 380px; width: 100%; }
    .marchio { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin-bottom: 14px; border-radius: 11px; background: linear-gradient(135deg,#4f46e5,#6366f1); color: white; box-shadow: 0 2px 8px rgba(79,70,229,.4); }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #4f46e5; margin-bottom: 6px; }
    h2 { margin: 0 0 4px; color: #0f172a; letter-spacing: -.01em; }
    p.sub { color: #6b7280; font-size: 0.9rem; margin: 0 0 22px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
    .campo { margin-bottom: 16px; }
    input[type="email"], input[type="password"] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d8dc; border-radius: 9px; font-size: 0.95rem; font-family: inherit; }
    button { width: 100%; background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 9px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background .15s ease; margin-top: 4px; }
    button:hover { background: #4338ca; }
    .errore { background: #fef2f2; color: #dc2626; padding: 10px 14px; border-radius: 9px; margin-bottom: 16px; font-size: 0.85rem; }
    .registrati { text-align: center; margin-top: 18px; font-size: 13px; color: #6b7280; }
    .registrati a { color: #4f46e5; text-decoration: none; font-weight: 600; }
  </style>
  </head>
  <body>
    <div class="card">
      <div class="marchio">${icon('sparkle', { size: 19 })}</div>
      <div class="eyebrow">AI Setup Agency</div>
      <h2>Accedi alla tua dashboard</h2>
      <p class="sub">Entra con l'email e la password del tuo account.</p>
      ${errore ? `<div class="errore">${escapeHtml(errore)}</div>` : ''}
      <form method="POST" action="/api/dashboard-login">
        <div class="campo">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" placeholder="tu@attivita.it" required value="${escapeHtml(email)}" />
        </div>
        <div class="campo">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="La tua password" required />
        </div>
        <button type="submit">Accedi</button>
      </form>
      <div class="registrati">Non hai ancora un account? <a href="/api/registrati">Registrati</a></div>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SESSION_SECRET = process.env.SESSION_SECRET;

  res.setHeader('Content-Type', 'text/html');

  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET non configurato.');
    return res.status(500).send('<h2>Configurazione mancante</h2>');
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  // ===== GET: con ?token= esegue il login da link (client storici);
  // senza, mostra il form email+password. =====
  if (req.method === 'GET') {
    const token = req.query?.token;
    if (!token) {
      return res.status(200).send(paginaLoginForm());
    }
    if (typeof token !== 'string') {
      return res.status(400).send(paginaErrore('Link di accesso non valido.'));
    }

    try {
      const clienteRes = await fetch(
        `${SUPABASE_URL}/rest/v1/clienti?dashboard_token=eq.${encodeURIComponent(token)}&select=id,nome_attivita`,
        { headers }
      );
      const clienteData = await clienteRes.json();
      const cliente = Array.isArray(clienteData) ? clienteData[0] : null;

      if (!cliente) {
        console.error('Tentativo di login con dashboard_token non valido.');
        return res.status(401).send(paginaErrore('Link di accesso non valido o scaduto. Contatta chi ti ha fornito il link.'));
      }

      const sessionToken = firmaSessione({ cliente_id: cliente.id }, SESSION_SECRET);
      impostaCookieSessione(res, sessionToken);

      res.writeHead(302, { Location: '/api/dashboard' });
      return res.end();
    } catch (e) {
      console.error('Errore durante il login dashboard (token):', e);
      return res.status(500).send(paginaErrore('Errore tecnico durante l\'accesso. Riprova tra poco.'));
    }
  }

  // ===== POST: login con email + password (client registrati da soli) =====
  if (req.method === 'POST') {
    const { email, password } = req.body || {};
    const emailPulita = String(email || '').trim().toLowerCase();

    if (!emailPulita || !password) {
      return res.status(400).send(paginaLoginForm({ errore: 'Inserisci email e password.', email: emailPulita }));
    }

    try {
      const clienteRes = await fetch(
        `${SUPABASE_URL}/rest/v1/clienti?email_contatto=eq.${encodeURIComponent(emailPulita)}&select=id,password_hash`,
        { headers }
      );
      const clienteData = await clienteRes.json();
      const cliente = Array.isArray(clienteData) ? clienteData[0] : null;

      // Stesso messaggio generico sia per email inesistente sia per
      // password errata: non si deve poter dedurre se un'email è
      // registrata o meno provando a fare login.
      if (!cliente || !cliente.password_hash || !verificaPassword(password, cliente.password_hash)) {
        return res.status(401).send(paginaLoginForm({ errore: 'Email o password non corrette.', email: emailPulita }));
      }

      const sessionToken = firmaSessione({ cliente_id: cliente.id }, SESSION_SECRET);
      impostaCookieSessione(res, sessionToken);

      res.writeHead(302, { Location: '/api/dashboard' });
      return res.end();
    } catch (e) {
      console.error('Errore durante il login dashboard (password):', e);
      return res.status(500).send(paginaLoginForm({ errore: 'Errore tecnico durante l\'accesso. Riprova tra poco.', email: emailPulita }));
    }
  }

  return res.status(405).send('Metodo non permesso');
}
