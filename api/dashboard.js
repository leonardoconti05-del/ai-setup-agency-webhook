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
//
// Redesign 30/9/2026 (Task #8): da "lista di richieste WhatsApp" a un vero
// gestionale a sezioni — Panoramica, Finanziario, Servizi, Personale, Orari,
// Richieste — con etichette adattate al settore del cliente (lib/settori.js)
// e dati reali dalle nuove tabelle servizi_cliente/personale_cliente
// (migrations/008). Nessuna sezione mostra numeri inventati: dove manca un
// dato reale, la sezione lo dice esplicitamente invece di stimare.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { etichetteSettore, nomeSettore } from '../lib/settori.js';

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

const GIORNI = [
  { chiave: 'lunedi', etichetta: 'Lun' },
  { chiave: 'martedi', etichetta: 'Mar' },
  { chiave: 'mercoledi', etichetta: 'Mer' },
  { chiave: 'giovedi', etichetta: 'Gio' },
  { chiave: 'venerdi', etichetta: 'Ven' },
  { chiave: 'sabato', etichetta: 'Sab' },
  { chiave: 'domenica', etichetta: 'Dom' },
];

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

    // ===== Dati cliente + settore =====
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?id=eq.${encodeURIComponent(cliente_id)}&select=nome_attivita`,
      { headers }
    );
    const clienteData = await clienteRes.json();
    const nomeAttivita = clienteData[0]?.nome_attivita || 'Attività';

    const configRes = await fetch(
      `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=valore_medio_cliente,settore,orari_apertura`,
      { headers }
    );
    const configData = await configRes.json();
    const configCliente = Array.isArray(configData) ? configData[0] : null;
    const valoreMedioCliente = configCliente?.valore_medio_cliente != null ? Number(configCliente.valore_medio_cliente) : null;
    const settore = configCliente?.settore || null;
    const orariApertura = configCliente?.orari_apertura && typeof configCliente.orari_apertura === 'object' ? configCliente.orari_apertura : {};
    const et = etichetteSettore(settore);

    // ===== Richieste del cliente (SEMPRE filtrate per il cliente_id di sessione) =====
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

    // ===== Analytics / mini-CRM =====
    const contaLead = lista.filter((r) => {
      const dati = r.dati_raccolti || {};
      return Object.entries(dati).some(([k, v]) => k !== 'urgente' && !k.startsWith('_') && v);
    }).length;
    const contaAppuntamenti = lista.filter((r) => (r.dati_raccolti || {})._fase === 'confermato').length;
    const tassoConversione = contaLead > 0 ? Math.round((contaAppuntamenti / contaLead) * 100) : 0;
    const roiStimato = valoreMedioCliente != null ? contaAppuntamenti * valoreMedioCliente : null;

    // Messaggi totali ricevuti (da event_log)
    let messaggiTotali = 0;
    try {
      const msgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/event_log?cliente_id=eq.${encodeURIComponent(cliente_id)}&fase=eq.ricevuto&select=id&limit=1`,
        { headers: { ...headers, Prefer: 'count=exact' } }
      );
      const range = msgRes.headers.get('content-range');
      const totale = range ? range.split('/')[1] : null;
      messaggiTotali = totale && totale !== '*' ? parseInt(totale, 10) : 0;
    } catch (e) {
      console.error('Errore conteggio messaggi totali:', e);
    }

    // ===== Servizi e personale (migrations/008) =====
    let servizi = [];
    let personale = [];
    try {
      const [serviziRes, personaleRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/servizi_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&attivo=eq.true&select=nome,prezzo,durata_minuti&order=creato_il.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/personale_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&attivo=eq.true&select=nome,ruolo&order=creato_il.asc`, { headers }),
      ]);
      const serviziData = await serviziRes.json();
      servizi = Array.isArray(serviziData) ? serviziData : [];
      const personaleData = await personaleRes.json();
      personale = Array.isArray(personaleData) ? personaleData : [];
    } catch (e) {
      console.error('Errore lettura servizi/personale:', e);
    }

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

    const serviziHtml = servizi.length > 0
      ? `<table class="tabella-compatta">
          <tr><th>Servizio</th><th>Prezzo</th><th>Durata</th></tr>
          ${servizi.map((s) => `<tr>
            <td>${escapeHtml(s.nome)}</td>
            <td>${s.prezzo != null ? `€${Number(s.prezzo).toLocaleString('it-IT')}` : '—'}</td>
            <td>${s.durata_minuti != null ? `${s.durata_minuti} min` : '—'}</td>
          </tr>`).join('')}
        </table>`
      : `<div class="sezione-vuota">Nessun servizio in elenco. <a href="/api/info-cliente#servizi">Aggiungine uno &rarr;</a></div>`;

    const personaleHtml = personale.length > 0
      ? `<ul class="lista-persone">${personale.map((p) => `<li><strong>${escapeHtml(p.nome)}</strong>${p.ruolo ? ` — ${escapeHtml(p.ruolo)}` : ''}</li>`).join('')}</ul>`
      : `<div class="sezione-vuota">Nessuna persona in elenco. <a href="/api/info-cliente#personale">Aggiungine una &rarr;</a></div>`;

    const orariHtml = GIORNI.map((g) => {
      const valore = orariApertura[g.chiave];
      const chiuso = !valore || valore === 'Chiuso';
      return `<div class="giorno-orario ${chiuso ? 'chiuso' : ''}">
        <div class="giorno-nome">${g.etichetta}</div>
        <div class="giorno-valore">${chiuso ? 'Chiuso' : escapeHtml(valore)}</div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>Gestionale — ${escapeHtml(nomeAttivita)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      background: #f1f2f6;
      color: #111827;
    }
    .topbar {
      background: #111827;
      color: white;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .topbar .brand { display: flex; align-items: center; gap: 10px; }
    .topbar .brand-icona { font-size: 22px; }
    .topbar h1 { font-size: 17px; margin: 0; font-weight: 600; }
    .topbar .settore { font-size: 12px; color: #9ca3af; }
    .topbar nav { display: flex; gap: 18px; flex-wrap: wrap; }
    .topbar nav a { color: #d1d5db; text-decoration: none; font-size: 13px; }
    .topbar nav a:hover { color: white; }
    .wrap { max-width: 1160px; margin: 0 auto; padding: 24px 20px 40px; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 14px 20px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      text-align: center;
      min-width: 100px;
      flex: 1;
    }
    .stat-num { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .griglia-sezioni { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
      padding: 22px 24px;
    }
    .card h2 { font-size: 15px; margin: 0 0 4px; }
    .card p.desc { color: #9ca3af; font-size: 12px; margin: 0 0 16px; }
    .card-tabella { padding: 0; }
    .analytics-grid { display: flex; gap: 24px; flex-wrap: wrap; }
    .analytics-num-blocco { min-width: 100px; }
    .analytics-num { font-size: 26px; font-weight: 700; color: #111827; }
    .analytics-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .analytics-nota { font-size: 12px; color: #9ca3af; margin: 16px 0 0; }
    .analytics-nota a { color: #2563eb; text-decoration: none; }
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
    table.tabella-compatta th { background: none; color: #6b7280; padding: 6px 4px; font-size: 11px; }
    table.tabella-compatta td { padding: 8px 4px; font-size: 13px; }
    .lista-persone { list-style: none; margin: 0; padding: 0; }
    .lista-persone li { padding: 8px 0; border-bottom: 1px solid #f0f1f3; font-size: 14px; }
    .lista-persone li:last-child { border-bottom: none; }
    .sezione-vuota { color: #9ca3af; font-size: 13px; padding: 8px 0; }
    .sezione-vuota a { color: #2563eb; text-decoration: none; }
    .griglia-orari-mini { display: flex; flex-direction: column; gap: 4px; }
    .giorno-orario { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px solid #f6f7f8; }
    .giorno-orario:last-child { border-bottom: none; }
    .giorno-nome { font-weight: 600; color: #374151; width: 44px; }
    .giorno-valore { color: #374151; text-align: right; }
    .giorno-orario.chiuso .giorno-valore { color: #9ca3af; }
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
    .sezione-titolo { font-size: 15px; font-weight: 600; margin: 28px 0 12px; color: #374151; }
    footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <span class="brand-icona">${et.icona}</span>
      <div>
        <h1>${escapeHtml(nomeAttivita)}</h1>
        <div class="settore">${escapeHtml(nomeSettore(settore))}</div>
      </div>
    </div>
    <nav>
      <a href="#panoramica">Panoramica</a>
      <a href="#servizi-personale">Servizi &amp; Personale</a>
      <a href="#richieste">${escapeHtml(et.eventoPlurale)}</a>
      <a href="/api/knowledge">📚 Knowledge Base</a>
      <a href="/api/info-cliente">⚙️ Impostazioni</a>
    </nav>
  </div>

  <div class="wrap">
    <div class="stats" id="panoramica">
      <div class="stat-card"><div class="stat-num">${contaTotali}</div><div class="stat-label">${escapeHtml(et.clientiPlurale)} totali</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#dc2626">${contaUrgenti}</div><div class="stat-label">Urgenti</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#d97706">${contaInCorso}</div><div class="stat-label">In corso</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#16a34a">${contaCompletate}</div><div class="stat-label">Completate</div></div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h2>💶 Finanziario</h2>
      <p class="desc">Dati reali dalle conversazioni WhatsApp — nessuna stima non richiesta.</p>
      <div class="analytics-grid">
        <div class="analytics-num-blocco"><div class="analytics-num">${messaggiTotali}</div><div class="analytics-label">Messaggi ricevuti</div></div>
        <div class="analytics-num-blocco"><div class="analytics-num">${contaTotali}</div><div class="analytics-label">Conversazioni</div></div>
        <div class="analytics-num-blocco"><div class="analytics-num">${contaLead}</div><div class="analytics-label">Lead (dati raccolti)</div></div>
        <div class="analytics-num-blocco"><div class="analytics-num">${contaAppuntamenti}</div><div class="analytics-label">${escapeHtml(et.eventoPlurale)} confermati</div></div>
        <div class="analytics-num-blocco"><div class="analytics-num">${tassoConversione}%</div><div class="analytics-label">Conversione lead&rarr;${et.evento.toLowerCase()}</div></div>
        ${roiStimato != null ? `<div class="analytics-num-blocco"><div class="analytics-num" style="color:#16a34a">€${roiStimato.toLocaleString('it-IT')}</div><div class="analytics-label">Valore stimato generato*</div></div>` : ''}
      </div>
      ${roiStimato != null
        ? `<p class="analytics-nota">*Stima basata sul valore medio che hai indicato (€${valoreMedioCliente.toLocaleString('it-IT')} per ${et.evento.toLowerCase()}) — non è fatturato garantito.</p>`
        : `<p class="analytics-nota">Vuoi vedere anche una stima del valore generato? <a href="/api/info-cliente">Imposta il valore medio</a>.</p>`}
    </div>

    <div class="griglia-sezioni" id="servizi-personale">
      <div class="card">
        <h2>🧾 Servizi offerti</h2>
        <p class="desc">Il tuo listino. <a href="/api/info-cliente#servizi" style="color:#2563eb;text-decoration:none;">Gestisci &rarr;</a></p>
        ${serviziHtml}
      </div>
      <div class="card">
        <h2>👥 Personale</h2>
        <p class="desc">Il tuo staff. <a href="/api/info-cliente#personale" style="color:#2563eb;text-decoration:none;">Gestisci &rarr;</a></p>
        ${personaleHtml}
      </div>
      <div class="card">
        <h2>🕒 Orari di apertura</h2>
        <p class="desc">Usati anche dal bot WhatsApp. <a href="/api/info-cliente" style="color:#2563eb;text-decoration:none;">Modifica &rarr;</a></p>
        <div class="griglia-orari-mini">${orariHtml}</div>
      </div>
    </div>

    <div class="sezione-titolo" id="richieste">📋 ${escapeHtml(et.eventoPlurale)} recenti</div>
    <div class="card card-tabella">
      ${lista.length > 0 ? `<table>
        <tr><th>Stato</th><th>Dati raccolti</th><th>Telefono</th><th>Aggiornato</th><th>Azioni</th></tr>
        ${righe}
      </table>` : `<div class="empty">Nessuna richiesta ancora ricevuta.</div>`}
    </div>
    <footer>Aggiornamento automatico ogni 30 secondi</footer>
  </div>
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
