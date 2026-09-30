// api/agenzia.js
//
// Dashboard master per il titolare dell'agenzia (Task #9): a differenza di
// api/dashboard.js (un cliente vede SOLO i propri dati), questa pagina
// aggrega TUTTI i clienti, raggruppati per settore — per capire quali
// settori funzionano meglio, quanti clienti hanno automazioni attive,
// dove intervenire. Login separato: api/agenzia-login.js (password unica,
// cookie 'agency_admin_session', mai lo stesso cookie/sessione dei clienti).
//
// Query aggregate fatte lato applicazione (non SQL) perché il numero di
// clienti è ancora piccolo (decine, non migliaia) — se dovesse crescere di
// molto, questo andrebbe spostato su una vista/funzione Postgres dedicata,
// non prima.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { etichetteSettore, nomeSettore, SETTORI } from '../lib/settori.js';

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111827;margin:0;">
    <div style="background:white;padding:32px;border-radius:12px;text-align:center;">
      <h2 style="margin-top:0;">Sessione admin scaduta</h2>
      <a href="/api/agenzia-login" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Accedi di nuovo</a>
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

  const cookieToken = leggiCookieSessione(req, 'agency_admin_session');
  const sessione = verificaSessione(cookieToken, SESSION_SECRET);
  if (!sessione || sessione.admin !== true) {
    return res.status(401).send(paginaNonAutenticato());
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Metodo non permesso');
  }

  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  try {
    const [clientiRes, configRes, richiesteRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,nome_attivita&order=nome_attivita.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/configurazioni_cliente?select=cliente_id,settore,attivo,follow_up_attivo,valore_medio_cliente`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/richieste_clienti?select=cliente_id,stato,dati_raccolti,updated_at`, { headers }),
    ]);
    const clienti = await clientiRes.json();
    const configurazioni = await configRes.json();
    const richieste = await richiesteRes.json();

    const listaClienti = Array.isArray(clienti) ? clienti : [];
    const listaConfig = Array.isArray(configurazioni) ? configurazioni : [];
    const listaRichieste = Array.isArray(richieste) ? richieste : [];

    const configPerCliente = Object.fromEntries(listaConfig.map((c) => [c.cliente_id, c]));

    // Aggregazione richieste per cliente_id (lead, appuntamenti confermati)
    const statsPerCliente = {};
    for (const r of listaRichieste) {
      const s = statsPerCliente[r.cliente_id] || (statsPerCliente[r.cliente_id] = { totale: 0, lead: 0, appuntamenti: 0 });
      s.totale++;
      const dati = r.dati_raccolti || {};
      if (Object.entries(dati).some(([k, v]) => k !== 'urgente' && !k.startsWith('_') && v)) s.lead++;
      if (dati._fase === 'confermato') s.appuntamenti++;
    }

    // Righe per-cliente, con settore ed etichette
    const righeClienti = listaClienti.map((cl) => {
      const cfg = configPerCliente[cl.id] || {};
      const stats = statsPerCliente[cl.id] || { totale: 0, lead: 0, appuntamenti: 0 };
      const conversione = stats.lead > 0 ? Math.round((stats.appuntamenti / stats.lead) * 100) : 0;
      return {
        id: cl.id,
        nome: cl.nome_attivita,
        settore: cfg.settore || null,
        attivo: cfg.attivo !== false,
        followUpAttivo: cfg.follow_up_attivo === true,
        ...stats,
        conversione,
      };
    });

    // Raggruppamento per settore
    const perSettore = {};
    for (const r of righeClienti) {
      const chiave = r.settore || '(non impostato)';
      const g = perSettore[chiave] || (perSettore[chiave] = { clienti: 0, totale: 0, lead: 0, appuntamenti: 0 });
      g.clienti++;
      g.totale += r.totale;
      g.lead += r.lead;
      g.appuntamenti += r.appuntamenti;
    }
    const righeSettori = Object.entries(perSettore)
      .sort((a, b) => b[1].totale - a[1].totale)
      .map(([settore, g]) => {
        const et = etichetteSettore(settore === '(non impostato)' ? null : settore);
        const conversione = g.lead > 0 ? Math.round((g.appuntamenti / g.lead) * 100) : 0;
        return `<tr>
          <td>${et.icona} ${escapeHtml(settore === '(non impostato)' ? settore : nomeSettore(settore))}</td>
          <td>${g.clienti}</td>
          <td>${g.totale}</td>
          <td>${g.lead}</td>
          <td>${g.appuntamenti}</td>
          <td>${conversione}%</td>
        </tr>`;
      }).join('');

    // Clienti raggruppati per settore, per l'elenco navigabile di TUTTI i
    // tipi di attività (anche quelli senza ancora nessun cliente) — cliccando
    // un settore si vede chi lo usa, e da lì si entra nei suoi
    // servizi/personale/orari (api/agenzia-cliente.js).
    const clientiPerSettore = {};
    for (const r of righeClienti) {
      const chiave = r.settore || '(non impostato)';
      (clientiPerSettore[chiave] || (clientiPerSettore[chiave] = [])).push(r);
    }
    const chiaviSettoriConClienti = Object.keys(clientiPerSettore).filter((k) => k !== '(non impostato)' && !SETTORI[k]);
    const chiaviSettoriDaMostrare = [...Object.keys(SETTORI), ...chiaviSettoriConClienti];

    const direttorioSettoriHtml = chiaviSettoriDaMostrare
      .map((chiave, i) => {
        const et = etichetteSettore(chiave);
        const clientiSettore = clientiPerSettore[chiave] || [];
        const clientiHtml = clientiSettore.length > 0
          ? `<ul class="lista-clienti-settore">${clientiSettore.map((c) => `
              <li>
                <a href="/api/agenzia-cliente?cliente_id=${encodeURIComponent(c.id)}">${escapeHtml(c.nome)}</a>
                ${!c.attivo ? '<span class="badge-off">Non attivo</span>' : ''}
                <span class="mini-stat">${c.totale} richieste · ${c.appuntamenti} ${et.eventoPlurale.toLowerCase()}</span>
              </li>`).join('')}</ul>`
          : `<div class="empty-settore">Nessun cliente ancora in questo settore.</div>`;
        return `<div class="settore-riga">
          <button type="button" class="settore-sommario" data-toggle="settore-${i}">
            <span class="settore-icona">${et.icona}</span>
            <span class="settore-nome">${escapeHtml(nomeSettore(chiave))}</span>
            <span class="settore-conteggio">${clientiSettore.length}</span>
            <span class="settore-freccia">▾</span>
          </button>
          <div class="settore-clienti" id="settore-${i}">${clientiHtml}</div>
        </div>`;
      }).join('');
    const nonImpostatoClienti = clientiPerSettore['(non impostato)'] || [];
    const direttorioNonImpostatoHtml = nonImpostatoClienti.length > 0
      ? `<div class="settore-riga">
          <button type="button" class="settore-sommario" data-toggle="settore-non-impostato">
            <span class="settore-icona">🏢</span>
            <span class="settore-nome">Settore non impostato</span>
            <span class="settore-conteggio">${nonImpostatoClienti.length}</span>
            <span class="settore-freccia">▾</span>
          </button>
          <div class="settore-clienti" id="settore-non-impostato"><ul class="lista-clienti-settore">${nonImpostatoClienti.map((c) => `
            <li><a href="/api/agenzia-cliente?cliente_id=${encodeURIComponent(c.id)}">${escapeHtml(c.nome)}</a></li>`).join('')}</ul></div>
        </div>`
      : '';

    // KPI totali agenzia
    const totClienti = righeClienti.length;
    const totClientiAttivi = righeClienti.filter((r) => r.attivo).length;
    const totRichieste = righeClienti.reduce((s, r) => s + r.totale, 0);
    const totAppuntamenti = righeClienti.reduce((s, r) => s + r.appuntamenti, 0);
    const totFollowUpAttivi = righeClienti.filter((r) => r.followUpAttivo).length;
    const settoriCoperti = new Set(righeClienti.map((r) => r.settore).filter(Boolean)).size;

    const righeClientiHtml = righeClienti
      .sort((a, b) => b.totale - a.totale)
      .map((r) => {
        const et = etichetteSettore(r.settore);
        return `<tr>
          <td>${!r.attivo ? '<span class="badge-off">Non attivo</span> ' : ''}${escapeHtml(r.nome)}</td>
          <td>${et.icona} ${escapeHtml(r.settore ? nomeSettore(r.settore) : '—')}</td>
          <td>${r.totale}</td>
          <td>${r.lead}</td>
          <td>${r.appuntamenti}</td>
          <td>${r.lead > 0 ? `${r.conversione}%` : '—'}</td>
          <td>${r.followUpAttivo ? '✅' : '—'}</td>
        </tr>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="60">
  <title>Dashboard agenzia</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f1f2f6; color: #111827; }
    .app-shell { display: flex; min-height: 100vh; }
    .sidebar { width: 240px; flex-shrink: 0; background: #111827; color: #d1d5db; padding: 20px 0; position: sticky; top: 0; align-self: flex-start; height: 100vh; overflow-y: auto; }
    .sidebar-brand { padding: 0 20px 18px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 14px; }
    .sidebar-brand .icona { font-size: 22px; }
    .sidebar-brand h1 { font-size: 14px; margin: 0; color: white; }
    .sidebar-brand .settore { font-size: 11px; color: #9ca3af; }
    .sidebar-group { margin-bottom: 14px; }
    .sidebar-group-titolo { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: .06em; padding: 0 20px 6px; }
    .sidebar-link { display: flex; align-items: center; gap: 9px; padding: 9px 20px; color: #d1d5db; font-size: 13.5px; text-decoration: none; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
    .sidebar-link:hover { background: rgba(255,255,255,.06); color: white; }
    .sidebar-link.attivo { background: #2563eb; color: white; font-weight: 600; }
    .sidebar-link .conteggio { margin-left: auto; background: rgba(255,255,255,.15); font-size: 10.5px; padding: 1px 7px; border-radius: 10px; }
    .sidebar-link.attivo .conteggio { background: rgba(255,255,255,.3); }
    .main { flex: 1; min-width: 0; padding: 28px 32px 48px; }
    .main-titolo { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    .main-sub { color: #6b7280; font-size: 13px; margin: 0 0 24px; }
    .tab-pannello { display: none; }
    .tab-pannello.attivo { display: block; }
    .wrap { max-width: 1200px; margin: 0; padding: 0; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); text-align: center; flex: 1; min-width: 110px; }
    .stat-num { font-size: 26px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .sezione-titolo { font-size: 15px; font-weight: 600; margin: 28px 0 12px; color: #374151; }
    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #111827; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 12px 14px; border-bottom: 1px solid #f0f1f3; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #fafafa; }
    .badge-off { display: inline-block; background: #f3f4f6; color: #6b7280; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-right: 6px; }
    .empty { text-align: center; padding: 50px 20px; color: #9ca3af; }
    footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
    /* Direttorio settori (tutti i 29 tipi di attività, navigabile) */
    .settore-riga { border-bottom: 1px solid #f0f1f3; }
    .settore-riga:last-child { border-bottom: none; }
    .settore-sommario { display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 16px; background: none; border: none; cursor: pointer; font: inherit; text-align: left; }
    .settore-sommario:hover { background: #fafafa; }
    .settore-icona { font-size: 17px; }
    .settore-nome { flex: 1; font-size: 14px; font-weight: 600; color: #1f2937; }
    .settore-conteggio { background: #f3f4f6; color: #374151; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 10px; }
    .settore-freccia { color: #9ca3af; transition: transform .15s; }
    .settore-riga.aperta .settore-freccia { transform: rotate(180deg); }
    .settore-clienti { display: none; padding: 0 16px 14px 47px; }
    .settore-riga.aperta .settore-clienti { display: block; }
    .lista-clienti-settore { list-style: none; margin: 0; padding: 0; }
    .lista-clienti-settore li { padding: 7px 0; border-bottom: 1px solid #f6f7f8; font-size: 13.5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .lista-clienti-settore li:last-child { border-bottom: none; }
    .lista-clienti-settore a { color: #2563eb; text-decoration: none; font-weight: 600; }
    .lista-clienti-settore a:hover { text-decoration: underline; }
    .mini-stat { color: #9ca3af; font-size: 12px; margin-left: auto; }
    .empty-settore { color: #9ca3af; font-size: 13px; padding: 6px 0; font-style: italic; }
    @media (max-width: 860px) {
      .app-shell { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: static; }
      .main { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <div class="sidebar">
      <div class="sidebar-brand">
        <span class="icona">🏢</span>
        <div>
          <h1>AI Setup Agency</h1>
          <div class="settore">Area amministrativa</div>
        </div>
      </div>

      <div class="sidebar-group">
        <a href="#panoramica" class="sidebar-link tab-link attivo" data-tab="panoramica">🏠 Panoramica</a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Struttura</div>
        <a href="#settori" class="sidebar-link tab-link" data-tab="settori">📁 Tipi di attività <span class="conteggio">${Object.keys(SETTORI).length}</span></a>
      </div>
    </div>

    <div class="main">
      <div class="tab-pannello attivo" data-pannello="panoramica">
        <div class="main-titolo">🏢 Dashboard agenzia</div>
        <p class="main-sub">Vista aggregata su tutti i clienti — non visibile ai singoli clienti.</p>

        <div class="stats">
          <div class="stat-card"><div class="stat-num">${totClienti}</div><div class="stat-label">Clienti totali</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#16a34a">${totClientiAttivi}</div><div class="stat-label">Attivi</div></div>
          <div class="stat-card"><div class="stat-num">${settoriCoperti}</div><div class="stat-label">Settori coperti</div></div>
          <div class="stat-card"><div class="stat-num">${totRichieste}</div><div class="stat-label">Richieste totali</div></div>
          <div class="stat-card"><div class="stat-num">${totAppuntamenti}</div><div class="stat-label">Appuntamenti confermati</div></div>
          <div class="stat-card"><div class="stat-num">${totFollowUpAttivi}</div><div class="stat-label">Con follow-up attivi</div></div>
        </div>

        <div class="sezione-titolo">📊 Per settore</div>
        <div class="card">
          ${righeSettori ? `<table>
            <tr><th>Settore</th><th>Clienti</th><th>Richieste</th><th>Lead</th><th>Appuntamenti</th><th>Conversione</th></tr>
            ${righeSettori}
          </table>` : '<div class="empty">Nessun dato ancora.</div>'}
        </div>

        <div class="sezione-titolo">🏪 Per cliente</div>
        <div class="card">
          ${righeClientiHtml ? `<table>
            <tr><th>Cliente</th><th>Settore</th><th>Richieste</th><th>Lead</th><th>Appuntamenti</th><th>Conversione</th><th>Follow-up</th></tr>
            ${righeClientiHtml}
          </table>` : '<div class="empty">Nessun cliente ancora.</div>'}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="settori">
        <div class="main-titolo">📁 Tipi di attività</div>
        <p class="main-sub">Tutti i ${Object.keys(SETTORI).length} settori supportati. Apri un tipo di attività per vedere i clienti che lo usano ed entrare nei loro servizi, personale e orari.</p>
        <div class="card">
          ${direttorioSettoriHtml}${direttorioNonImpostatoHtml}
        </div>
      </div>

      <footer>Aggiornamento automatico ogni 60 secondi</footer>
    </div>
  </div>

  <script>
    (function () {
      var tabLinks = document.querySelectorAll('.tab-link');
      var pannelli = document.querySelectorAll('.tab-pannello');
      function attivaTab(tab) {
        pannelli.forEach(function (p) { p.classList.toggle('attivo', p.getAttribute('data-pannello') === tab); });
        document.querySelectorAll('.sidebar-link.tab-link').forEach(function (l) { l.classList.toggle('attivo', l.getAttribute('data-tab') === tab); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      tabLinks.forEach(function (l) {
        l.addEventListener('click', function (e) {
          e.preventDefault();
          attivaTab(l.getAttribute('data-tab'));
        });
      });
      var iniziale = window.location.hash.replace('#', '');
      if (iniziale && document.querySelector('.tab-pannello[data-pannello="' + iniziale + '"]')) {
        attivaTab(iniziale);
      }

      document.querySelectorAll('[data-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.closest('.settore-riga').classList.toggle('aperta');
        });
      });
    })();
  </script>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (err) {
    console.error('Errore dashboard agenzia:', err);
    return res.status(500).send('<h2>Errore nel caricamento della dashboard agenzia</h2>');
  }
}
