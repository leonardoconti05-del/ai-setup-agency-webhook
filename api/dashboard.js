// api/dashboard.js
//
// FIX P0-1 (21/9/2026): il cliente_id NON viene più letto dalla query string
// (era: ?cliente_id=X&password=Y, con Y identica per tutti i clienti — un
// cliente poteva vedere i dati di un altro semplicemente cambiando X).
// Ora il cliente_id è determinato ESCLUSIVAMENTE dalla sessione firmata
// (cookie HttpOnly), impostata da api/dashboard-login.js dopo aver
// verificato un codice di accesso univoco per cliente. Qualsiasi valore
// arrivi da query string o body viene ignorato ai fini dell'identità.
//
// FIX P1-7: il cambio di stato (prima ?action=set_stato via link GET, quindi
// vulnerabile a prefetching/CSRF-like) ora richiede una richiesta POST con
// un piccolo <form>, non più un semplice link cliccabile.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6;">
    <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;">
      <h2 style="margin-top:0;">Sessione scaduta o non autenticata</h2>
      <p style="color:#6b7280;">Accedi di nuovo con il tuo codice.</p>
      <a href="/api/dashboard-login" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Vai al login</a>
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

  // ===== Autenticazione: SOLO dalla sessione, mai da input del client =====
  const cookieToken = leggiCookieSessione(req);
  const sessione = verificaSessione(cookieToken, SESSION_SECRET);
  if (!sessione || !sessione.cliente_id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(401).send(paginaNonAutenticato());
  }
  const cliente_id = sessione.cliente_id; // <-- unica fonte di verità per il tenant

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // ===== Cambio stato: solo POST, cliente_id preso dalla sessione =====
    if (req.method === 'POST') {
      const { numero_utente, nuovo_stato } = req.body || {};
      if (!numero_utente || !nuovo_stato) {
        return res.status(400).send('Parametri mancanti');
      }
      await fetch(
        `${SUPABASE_URL}/rest/v1/richieste_clienti?cliente_id=eq.${encodeURIComponent(cliente_id)}&numero_utente=eq.${encodeURIComponent(numero_utente)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ stato: nuovo_stato, updated_at: new Date().toISOString() }),
        }
      );
      res.writeHead(302, { Location: '/api/dashboard' });
      return res.end();
    }

    if (req.method !== 'GET') {
      return res.status(405).send('Metodo non permesso');
    }

    // Info cliente
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?id=eq.${encodeURIComponent(cliente_id)}&select=nome_attivita`,
      { headers }
    );
    const clienteData = await clienteRes.json();
    const nomeAttivita = clienteData[0]?.nome_attivita || 'Attività';

    // Richieste del cliente (SEMPRE filtrate per il cliente_id di sessione)
    const richiesteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/richieste_clienti?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=*&order=updated_at.desc`,
      { headers }
    );
    const richieste = await richiesteRes.json();
    const lista = Array.isArray(richieste) ? richieste : [];

    const contaTotali = lista.length;
    const contaUrgenti = lista.filter((r) => r.stato === 'urgente').length;
    const contaInCorso = lista.filter((r) => r.stato === 'in_corso').length;
    const contaCompletate = lista.filter((r) => r.stato === 'completata').length;

    const statoBadge = {
      urgente: { colore: '#dc2626', bg: '#fef2f2', label: '🚨 Urgente' },
      completata: { colore: '#16a34a', bg: '#f0fdf4', label: '✅ Completata' },
      in_corso: { colore: '#d97706', bg: '#fffbeb', label: '⏳ In corso' },
    };

    const formAzione = (num, stato, label) => `
      <form method="POST" action="/api/dashboard" style="display:inline;">
        <input type="hidden" name="numero_utente" value="${escapeHtml(num)}" />
        <input type="hidden" name="nuovo_stato" value="${escapeHtml(stato)}" />
        <button type="submit" class="btn-stato">${label}</button>
      </form>`;

    const righe = lista
      .map((r) => {
        const dati = r.dati_raccolti || {};
        const campiDati = Object.entries(dati)
          .filter(([k]) => k !== 'urgente' && !k.startsWith('_'))
          .map(([k, v]) => `<div class="campo"><span class="campo-nome">${escapeHtml(k)}</span>${escapeHtml(v)}</div>`)
          .join('');
        const badge = statoBadge[r.stato] || statoBadge.in_corso;
        const data = r.updated_at ? new Date(r.updated_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

        return `<tr>
          <td><span class="badge" style="background:${badge.bg};color:${badge.colore}">${badge.label}</span></td>
          <td>${campiDati || '<i style="color:#9ca3af">nessun dato</i>'}</td>
          <td><a href="tel:${escapeHtml(r.numero_utente)}" class="telefono">${escapeHtml(r.numero_utente)}</a></td>
          <td class="data-col">${data}</td>
          <td class="azioni">
            ${formAzione(r.numero_utente, 'in_corso', 'In corso')}
            ${formAzione(r.numero_utente, 'completata', 'Completata')}
          </td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>Dashboard — ${escapeHtml(nomeAttivita)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px;
      background: #f3f4f6;
      color: #111827;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 { font-size: 24px; margin: 0; color: #111827; }
    .sottotitolo { color: #6b7280; font-size: 14px; margin-top: 4px; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 14px 18px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      text-align: center;
      min-width: 90px;
    }
    .stat-num { font-size: 22px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #111827;
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td { padding: 14px 16px; border-bottom: 1px solid #f0f1f3; font-size: 14px; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #fafafa; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .campo { margin-bottom: 4px; font-size: 13px; }
    .campo-nome { color: #6b7280; margin-right: 6px; }
    .campo-nome::after { content: ':'; }
    .telefono { color: #2563eb; text-decoration: none; }
    .telefono:hover { text-decoration: underline; }
    .data-col { color: #6b7280; font-size: 13px; white-space: nowrap; }
    .azioni { white-space: nowrap; }
    .azioni form { display: inline-block; margin-right: 6px; }
    .btn-stato {
      font: inherit;
      font-size: 12px;
      padding: 5px 10px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      color: #374151;
      background: #f9fafb;
      cursor: pointer;
    }
    .btn-stato:hover { background: #f3f4f6; border-color: #9ca3af; }
    .empty { text-align: center; padding: 50px 20px; color: #9ca3af; }
    footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>📋 ${escapeHtml(nomeAttivita)}</h1>
      <div class="sottotitolo">Richieste ricevute via WhatsApp</div>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="stat-num">${contaTotali}</div><div class="stat-label">Totali</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#dc2626">${contaUrgenti}</div><div class="stat-label">Urgenti</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#d97706">${contaInCorso}</div><div class="stat-label">In corso</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#16a34a">${contaCompletate}</div><div class="stat-label">Completate</div></div>
    </div>
  </header>
  <div class="card">
    ${lista.length > 0 ? `<table>
      <tr><th>Stato</th><th>Dati raccolti</th><th>Telefono</th><th>Aggiornato</th><th>Azioni</th></tr>
      ${righe}
    </table>` : '<div class="empty">Nessuna richiesta ancora ricevuta.</div>'}
  </div>
  <footer>Aggiornamento automatico ogni 30 secondi</footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send('<h2>Errore nel caricamento della dashboard</h2>');
  }
}
