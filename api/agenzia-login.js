// api/agenzia-login.js
//
// Login per la dashboard master dell'agenzia (api/agenzia.js), riservata al
// titolare — NON è lo stesso sistema del login per-cliente
// (api/dashboard-login.js, un dashboard_token univoco per cliente). Qui è
// una singola password condivisa (AGENCY_ADMIN_PASSWORD), perché esiste un
// solo "titolare agenzia" — non ha senso un token per-riga come per i
// clienti. La sessione risultante usa un cookie SEPARATO
// ('agency_admin_session', vedi lib/session.js) da quello dei clienti, così
// le due identità non si mescolano mai.
//
// Fail-closed come tutto il resto del progetto: senza AGENCY_ADMIN_PASSWORD
// configurata, l'accesso admin è semplicemente impossibile, non aperto.

import { firmaSessione, impostaCookieSessione } from '../lib/session.js';

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paginaLogin({ errore } = {}) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Setup Agency — Accesso agenzia</title></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(circle at top, #1e293b, #0f172a);margin:0;-webkit-font-smoothing:antialiased;">
    <div style="background:white;padding:36px 32px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);max-width:340px;width:100%;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4f46e5;margin-bottom:6px;">AI Setup Agency</div>
      <h2 style="margin:0 0 4px;color:#0f172a;">🏢 Area amministrativa</h2>
      <p style="color:#6b7280;font-size:0.9rem;margin-bottom:18px;">Accesso riservato al titolare.</p>
      ${errore ? `<div style="background:#fef2f2;color:#dc2626;padding:10px 14px;border-radius:9px;margin-bottom:14px;font-size:0.85rem;">${escapeHtml(errore)}</div>` : ''}
      <form method="POST" action="/api/agenzia-login">
        <input type="password" name="password" placeholder="Password" required autofocus
          style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #d5d8dc;border-radius:9px;font-size:0.95rem;margin-bottom:14px;font-family:inherit;" />
        <button type="submit" style="width:100%;background:#4f46e5;color:white;border:none;padding:12px;border-radius:9px;font-size:0.95rem;font-weight:600;cursor:pointer;transition:background .15s ease;">Accedi</button>
      </form>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const AGENCY_ADMIN_PASSWORD = process.env.AGENCY_ADMIN_PASSWORD;

  res.setHeader('Content-Type', 'text/html');

  if (!SESSION_SECRET || !AGENCY_ADMIN_PASSWORD) {
    console.error('SESSION_SECRET o AGENCY_ADMIN_PASSWORD non configurate: accesso admin disabilitato (fail-closed).');
    return res.status(500).send('<h2>Accesso amministrativo non configurato.</h2>');
  }

  if (req.method === 'GET') {
    return res.status(200).send(paginaLogin());
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Metodo non permesso');
  }

  const password = (req.body && req.body.password) || '';
  // Confronto a tempo costante per evitare timing attack sulla password,
  // stesso principio già usato per la firma delle sessioni (crypto.timingSafeEqual).
  const crypto = await import('crypto');
  const a = Buffer.from(password);
  const b = Buffer.from(AGENCY_ADMIN_PASSWORD);
  const valida = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valida) {
    return res.status(401).send(paginaLogin({ errore: 'Password non corretta.' }));
  }

  const sessionToken = firmaSessione({ admin: true }, SESSION_SECRET, 60 * 60 * 12); // 12 ore, non 30 giorni: è un accesso privilegiato
  impostaCookieSessione(res, sessionToken, { nomeCookie: 'agency_admin_session', maxAgeSecondi: 60 * 60 * 12 });
  res.writeHead(302, { Location: '/api/agenzia' });
  return res.end();
}
