// api/registrati.js
//
// Registrazione pubblica: qualunque attività può crearsi un account da
// sola, scegliendo il proprio settore tra quelli supportati (lib/settori.js
// — la stessa mappa usata ovunque nella dashboard, così un settore scelto
// qui si traduce subito in etichette, nome e badge coerenti nel resto del
// software).
//
// Cosa NON fa questa pagina: non assegna un numero WhatsApp reale. Un
// numero Twilio con compliance approvata è un'attivazione che l'agenzia fa
// a mano per ogni cliente (vedi /areas/ai-setup-agency.md — modello ISV
// Reseller). L'account creato qui è subito utilizzabile per esplorare e
// configurare la dashboard (servizi, personale, orari, knowledge base),
// con il numero WhatsApp che resta "Non collegato" nello stato sistema
// finché l'agenzia non lo assegna — niente di finto o nascosto, lo stato
// riflette la realtà.
//
// Sicurezza: password con hash scrypt (lib/password.js), mai in chiaro.
// Email univoca (indice UNIQUE parziale, migrations/009). Dopo la
// creazione, l'utente riceve SUBITO una sessione valida (stesso cookie
// agency_session di api/dashboard-login.js) — nessun passaggio aggiuntivo.

import { firmaSessione, impostaCookieSessione } from '../lib/session.js';
import { hashPassword } from '../lib/password.js';
import { icon } from '../lib/icons.js';
import { SETTORI } from '../lib/settori.js';
import crypto from 'crypto';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CAMPI_DEFAULT = [
  { campo: 'nome', domanda: 'Come ti chiami?' },
  { campo: 'richiesta', domanda: 'Come possiamo aiutarti?' },
];

function opzioniSettore(selezionato) {
  return Object.entries(SETTORI)
    .map(([chiave, dati]) => `<option value="${escapeHtml(chiave)}" ${selezionato === chiave ? 'selected' : ''}>${escapeHtml(dati.nome)}</option>`)
    .join('');
}

function paginaForm({ errore, valori = {} } = {}) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Setup Agency — Crea il tuo account</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 32px 16px; background: radial-gradient(1100px 500px at 15% -10%, #eef0fb 0%, #f4f5f9 45%, #f4f5f9 100%); color: #0f172a; -webkit-font-smoothing: antialiased; }
    .card { background: white; padding: 36px 32px; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 28px rgba(15,23,42,.08); max-width: 420px; width: 100%; }
    .marchio { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin-bottom: 14px; border-radius: 11px; background: linear-gradient(135deg,#4f46e5,#6366f1); color: white; box-shadow: 0 2px 8px rgba(79,70,229,.4); }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #4f46e5; margin-bottom: 6px; }
    h2 { margin: 0 0 4px; color: #0f172a; letter-spacing: -.01em; }
    p.sub { color: #6b7280; font-size: 0.9rem; margin: 0 0 22px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
    .campo { margin-bottom: 16px; }
    input[type="text"], input[type="email"], input[type="password"], select {
      width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d8dc; border-radius: 9px;
      font-size: 0.95rem; font-family: inherit; background: white;
    }
    .nota-campo { font-size: 12px; color: #9ca3af; margin-top: 5px; }
    button { width: 100%; background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 9px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background .15s ease; margin-top: 4px; }
    button:hover { background: #4338ca; }
    .errore { background: #fef2f2; color: #dc2626; padding: 10px 14px; border-radius: 9px; margin-bottom: 16px; font-size: 0.85rem; }
    .accedi { text-align: center; margin-top: 18px; font-size: 13px; color: #6b7280; }
    .accedi a { color: #4f46e5; text-decoration: none; font-weight: 600; }
  </style>
  </head>
  <body>
    <div class="card">
      <div class="marchio">${icon('sparkle', { size: 19 })}</div>
      <div class="eyebrow">AI Setup Agency</div>
      <h2>Crea il tuo account</h2>
      <p class="sub">Scegli il settore della tua attività e inizia subito a configurare il tuo assistente AI.</p>
      ${errore ? `<div class="errore">${escapeHtml(errore)}</div>` : ''}
      <form method="POST" action="/api/registrati">
        <div class="campo">
          <label for="nome_attivita">Nome dell'attività</label>
          <input type="text" id="nome_attivita" name="nome_attivita" placeholder="Es. Studio Rossi" required value="${escapeHtml(valori.nome_attivita)}" />
        </div>
        <div class="campo">
          <label for="settore">Settore</label>
          <select id="settore" name="settore" required>
            <option value="" disabled ${!valori.settore ? 'selected' : ''}>Seleziona il tuo settore</option>
            ${opzioniSettore(valori.settore)}
          </select>
        </div>
        <div class="campo">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" placeholder="tu@attivita.it" required value="${escapeHtml(valori.email)}" />
        </div>
        <div class="campo">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Almeno 8 caratteri" required minlength="8" />
          <div class="nota-campo">Almeno 8 caratteri.</div>
        </div>
        <button type="submit">Crea account</button>
      </form>
      <div class="accedi">Hai già un account? <a href="/api/dashboard-login">Accedi</a></div>
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

  if (req.method === 'GET') {
    return res.status(200).send(paginaForm());
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Metodo non permesso');
  }

  const { nome_attivita, settore, email, password } = req.body || {};
  const valori = { nome_attivita, settore, email };

  if (!nome_attivita || !String(nome_attivita).trim()) {
    return res.status(400).send(paginaForm({ errore: 'Inserisci il nome della tua attività.', valori }));
  }
  if (!settore || !SETTORI[settore]) {
    return res.status(400).send(paginaForm({ errore: 'Seleziona un settore dall\'elenco.', valori }));
  }
  const emailPulita = String(email || '').trim().toLowerCase();
  if (!emailPulita || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPulita)) {
    return res.status(400).send(paginaForm({ errore: 'Inserisci un indirizzo email valido.', valori }));
  }
  if (!password || String(password).length < 8) {
    return res.status(400).send(paginaForm({ errore: 'La password deve avere almeno 8 caratteri.', valori }));
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // Email già usata? L'indice UNIQUE lo garantirebbe comunque, ma un
    // controllo esplicito prima permette un messaggio d'errore chiaro
    // invece di un 500 generico sul conflitto.
    const esistenteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?email_contatto=eq.${encodeURIComponent(emailPulita)}&select=id`,
      { headers }
    );
    const esistenti = await esistenteRes.json();
    if (Array.isArray(esistenti) && esistenti.length > 0) {
      return res.status(400).send(paginaForm({ errore: 'Esiste già un account con questa email. Prova ad accedere invece.', valori }));
    }

    const passwordHash = hashPassword(password);
    const dashboardToken = crypto.randomBytes(24).toString('hex');

    // 1. Crea il cliente
    const clienteRes = await fetch(`${SUPABASE_URL}/rest/v1/clienti`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        nome_attivita: String(nome_attivita).trim(),
        email_contatto: emailPulita,
        password_hash: passwordHash,
        dashboard_token: dashboardToken,
      }),
    });
    const clienteData = await clienteRes.json();
    const cliente = Array.isArray(clienteData) ? clienteData[0] : null;
    if (!cliente) {
      console.error('Errore creazione cliente in registrazione:', JSON.stringify(clienteData));
      return res.status(500).send(paginaForm({ errore: 'Errore tecnico durante la creazione dell\'account. Riprova tra poco.', valori }));
    }

    // 2. Crea la configurazione collegata: numero_whatsapp vuoto di
    // proposito ('' è falsy, quindi lo "Stato sistema" in dashboard.js lo
    // mostra correttamente come "Non collegato" finché l'agenzia non
    // assegna un numero reale — vedi nota in testa al file).
    const configRes = await fetch(`${SUPABASE_URL}/rest/v1/configurazioni_cliente`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cliente_id: cliente.id,
        numero_whatsapp: '',
        nome_attivita: String(nome_attivita).trim(),
        settore,
        campi_da_raccogliere: CAMPI_DEFAULT,
      }),
    });
    if (!configRes.ok) {
      const errTxt = await configRes.text();
      console.error('Errore creazione configurazione in registrazione:', errTxt);
      // Il cliente esiste già a questo punto: non blocchiamo la
      // registrazione per questo, la configurazione può essere creata in
      // seguito dall'agenzia. L'utente accede comunque alla dashboard.
    }

    const sessionToken = firmaSessione({ cliente_id: cliente.id }, SESSION_SECRET);
    impostaCookieSessione(res, sessionToken);

    res.writeHead(302, { Location: '/api/dashboard' });
    return res.end();
  } catch (e) {
    console.error('Errore durante la registrazione:', e);
    return res.status(500).send(paginaForm({ errore: 'Errore tecnico durante la registrazione. Riprova tra poco.', valori }));
  }
}
