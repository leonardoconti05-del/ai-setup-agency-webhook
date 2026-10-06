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
import { etichetteSettore, nomeSettore, inizialiSettore, coloreSettore, SETTORI } from '../lib/settori.js';
import { icon } from '../lib/icons.js';

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Badge colorato con le iniziali del settore, al posto delle emoji —
// deterministico (lib/settori.js: coloreSettore), non scelto a mano.
function badgeSettore(settore, size = 22) {
  const colore = coloreSettore(settore);
  const iniziali = settore ? inizialiSettore(settore) : '—';
  return `<span class="badge-settore" style="width:${size}px;height:${size}px;background:${colore};font-size:${Math.round(size * 0.4)}px;">${escapeHtml(iniziali)}</span>`;
}

// Etichette leggibili per le "fasi" scritte in event_log da lib/logger.js
// (vedi api/whatsapp.js) — lo stesso vocabolario usato sia nella System
// Health sia nel Log eventi, per restare coerenti.
const FASE_ETICHETTE = {
  ricevuto: 'Messaggio ricevuto',
  twilio_verificato: 'WhatsApp (Twilio)',
  tenant_identificato: 'Identificazione cliente',
  conversazione_recuperata: 'Database (Supabase)',
  knowledge_base: 'Knowledge Base',
  claude: 'Assistente AI (Claude)',
  estrazione_dati: 'Estrazione dati',
  motore: 'Motore verticale (intent, azione, costo)',
  calendar: 'Google Calendar',
  telegram: 'Telegram (notifiche staff)',
  follow_up_inviato: 'Follow-up automatico',
  limite_mensile: 'Limite messaggi mensile',
  esito: 'Esito elaborazione',
};

// Sottoinsieme di fasi mostrato come "integrazione" nella System Health —
// solo quelle che corrispondono a un servizio esterno reale, non ogni
// singolo passaggio interno della pipeline.
const INTEGRAZIONI = [
  { fase: 'twilio_verificato', nome: 'WhatsApp (Twilio)' },
  { fase: 'claude', nome: 'Assistente AI (Claude)' },
  { fase: 'conversazione_recuperata', nome: 'Database (Supabase)' },
  { fase: 'knowledge_base', nome: 'Knowledge Base' },
  { fase: 'calendar', nome: 'Google Calendar' },
  { fase: 'telegram', nome: 'Telegram (notifiche staff)' },
  { fase: 'follow_up_inviato', nome: 'Follow-up automatici' },
];

function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const ore = Math.floor(min / 60);
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`;
  const giorni = Math.floor(ore / 24);
  return `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} fa`;
}

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><body style="font-family:'Archivo',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#15181D;margin:0;">
    <div style="background:white;padding:32px;border-radius:12px;text-align:center;">
      <h2 style="margin-top:0;">Sessione admin scaduta</h2>
      <a href="/api/agenzia-login" style="display:inline-block;background:#0E6E62;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Accedi di nuovo</a>
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
    const [clientiRes, configRes, richiesteRes, eventiRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/clienti?select=id,nome_attivita&order=nome_attivita.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/configurazioni_cliente?select=cliente_id,settore,attivo,follow_up_attivo,valore_medio_cliente`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/richieste_clienti?select=cliente_id,stato,dati_raccolti,updated_at`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/event_log?select=id,cliente_id,fase,stato,dettaglio,created_at&order=created_at.desc&limit=300`, { headers }),
    ]);
    const clienti = await clientiRes.json();
    const configurazioni = await configRes.json();
    const richieste = await richiesteRes.json();
    const eventi = await eventiRes.json();

    const listaClienti = Array.isArray(clienti) ? clienti : [];
    const listaConfig = Array.isArray(configurazioni) ? configurazioni : [];
    const listaRichieste = Array.isArray(richieste) ? richieste : [];
    const listaEventi = Array.isArray(eventi) ? eventi : [];

    const configPerCliente = Object.fromEntries(listaConfig.map((c) => [c.cliente_id, c]));
    const nomePerClienteId = Object.fromEntries(listaClienti.map((c) => [c.id, c.nome_attivita]));

    // ===== System Health: stato più recente per ogni integrazione reale,
    // dedotto da event_log — mai inventato. Se un'integrazione non compare
    // negli ultimi 300 eventi, lo stato è esplicitamente "nessun dato
    // recente", non "operativo" per default. =====
    const ultimoEventoPerFase = {};
    for (const ev of listaEventi) {
      if (!ultimoEventoPerFase[ev.fase]) ultimoEventoPerFase[ev.fase] = ev;
    }
    const righeSalute = INTEGRAZIONI.map(({ fase, nome }) => {
      const ev = ultimoEventoPerFase[fase];
      if (!ev) return { nome, stato: 'sconosciuto', etichetta: 'Nessun dato recente', quando: null };
      const ok = ev.stato !== 'errore';
      return {
        nome,
        stato: ok ? 'ok' : 'errore',
        etichetta: ok ? 'Operativo' : 'Errore recente',
        quando: tempoRelativo(ev.created_at),
      };
    });
    const integrazioniInErrore = righeSalute.filter((r) => r.stato === 'errore').length;

    // ===== Log eventi: ultime righe, per capire cosa sta facendo il
    // sistema senza dover incrociare log Vercel a mano. =====
    const righeEventiHtml = listaEventi.slice(0, 80).map((ev) => {
      const nomeCliente = ev.cliente_id ? (nomePerClienteId[ev.cliente_id] || '—') : '—';
      const etichettaFase = FASE_ETICHETTE[ev.fase] || ev.fase;
      const isErrore = ev.stato === 'errore';
      let dettaglioTesto = '';
      if (ev.dettaglio && typeof ev.dettaglio === 'object') {
        dettaglioTesto = Object.entries(ev.dettaglio).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 140);
      }
      return `<tr>
        <td class="cella-orario">${new Date(ev.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
        <td>${escapeHtml(etichettaFase)}</td>
        <td>${escapeHtml(nomeCliente)}</td>
        <td><span class="badge-stato-${isErrore ? 'errore' : 'ok'}">${isErrore ? 'Errore' : 'OK'}</span></td>
        <td class="cella-dettaglio">${escapeHtml(dettaglioTesto)}</td>
      </tr>`;
    }).join('');

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
        const chiaveSettore = settore === '(non impostato)' ? null : settore;
        const conversione = g.lead > 0 ? Math.round((g.appuntamenti / g.lead) * 100) : 0;
        return `<tr>
          <td class="cella-settore">${badgeSettore(chiaveSettore, 20)} ${escapeHtml(settore === '(non impostato)' ? settore : nomeSettore(settore))}</td>
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
            ${badgeSettore(chiave)}
            <span class="settore-nome">${escapeHtml(nomeSettore(chiave))}</span>
            <span class="settore-conteggio">${clientiSettore.length}</span>
            <span class="settore-freccia">${icon('chevronDown', { size: 15 })}</span>
          </button>
          <div class="settore-clienti" id="settore-${i}">${clientiHtml}</div>
        </div>`;
      }).join('');
    const nonImpostatoClienti = clientiPerSettore['(non impostato)'] || [];
    const direttorioNonImpostatoHtml = nonImpostatoClienti.length > 0
      ? `<div class="settore-riga">
          <button type="button" class="settore-sommario" data-toggle="settore-non-impostato">
            ${badgeSettore(null)}
            <span class="settore-nome">Settore non impostato</span>
            <span class="settore-conteggio">${nonImpostatoClienti.length}</span>
            <span class="settore-freccia">${icon('chevronDown', { size: 15 })}</span>
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
        return `<tr>
          <td>${!r.attivo ? '<span class="badge-off">Non attivo</span> ' : ''}${escapeHtml(r.nome)}</td>
          <td class="cella-settore">${badgeSettore(r.settore, 20)} ${escapeHtml(r.settore ? nomeSettore(r.settore) : '—')}</td>
          <td>${r.totale}</td>
          <td>${r.lead}</td>
          <td>${r.appuntamenti}</td>
          <td>${r.lead > 0 ? `${r.conversione}%` : '—'}</td>
          <td>${r.followUpAttivo ? icon('check', { size: 15 }) : '—'}</td>
        </tr>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="60">
  <title>Dashboard agenzia</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #FAFAF8; color: #15181D; -webkit-font-smoothing: antialiased; }
    .app-shell { display: flex; min-height: 100vh; }
    .sidebar { width: 240px; flex-shrink: 0; background: #15181D; color: #d1d5db; padding: 20px 0; position: sticky; top: 0; align-self: flex-start; height: 100vh; overflow-y: auto; }
    .sidebar-brand { padding: 0 20px 18px; display: flex; align-items: center; gap: 11px; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 14px; }
    .sidebar-brand .marchio { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px; background: #0E6E62; color: white; }
    .sidebar-brand h1 { font-size: 14px; margin: 0; color: white; letter-spacing: -.01em; }
    .sidebar-brand .settore { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    .icona-ui { flex-shrink: 0; vertical-align: -3px; }
    .sidebar-group { margin-bottom: 14px; }
    .sidebar-group-titolo { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: .06em; padding: 0 20px 6px; }
    .sidebar-link { display: flex; align-items: center; gap: 9px; padding: 9px 20px; border-left: 3px solid transparent; color: #a9adb4; font-size: 13.5px; text-decoration: none; cursor: pointer; border-top: none; border-right: none; border-bottom: none; background: none; width: 100%; text-align: left; font-family: inherit; }
    .sidebar-link:hover { background: rgba(255,255,255,.05); color: white; }
    .sidebar-link.attivo { background: rgba(255,255,255,.06); border-left: 3px solid #138577; padding-left: 17px; color: white; font-weight: 600; }
    .sidebar-link .conteggio { margin-left: auto; background: rgba(255,255,255,.15); font-size: 10.5px; padding: 1px 7px; border-radius: 10px; }
    .sidebar-link.attivo .conteggio { background: rgba(255,255,255,.3); }
    .conteggio-errore { background: #B23A2E !important; color: white; }
    .main { flex: 1; min-width: 0; padding: 28px 32px 48px; }
    .main-titolo { font-size: 21px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.015em; display: flex; align-items: center; gap: 9px; }
    .main-sub { color: #6b7280; font-size: 13px; margin: 0 0 24px; }
    .tab-pannello { display: none; }
    .tab-pannello.attivo { display: block; }
    .wrap { max-width: 1200px; margin: 0; padding: 0; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05); text-align: center; flex: 1; min-width: 110px; transition: box-shadow .15s ease, transform .15s ease; }
    .stat-card:hover { box-shadow: 0 2px 4px rgba(15,23,42,.05), 0 8px 18px rgba(15,23,42,.08); transform: translateY(-1px); }
    .stat-num { font-size: 27px; font-weight: 700; letter-spacing: -.02em; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .sezione-titolo { font-size: 15px; font-weight: 600; margin: 28px 0 12px; color: #374151; display: flex; align-items: center; gap: 7px; }
    .sezione-titolo .icona-ui { color: #138577; }
    .cella-settore { display: flex; align-items: center; gap: 8px; }
    .card { background: white; border: 1px solid #E3E1DB; border-radius: 10px; box-shadow: none; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #15181D; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 12px 14px; border-bottom: 1px solid #f0f1f3; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: #fafafa; }
    .badge-off { display: inline-block; background: #F0EEE8; color: #6b7280; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-right: 6px; }
    .empty { text-align: center; padding: 50px 20px; color: #9ca3af; }
    footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
    /* Direttorio settori (tutti i 29 tipi di attività, navigabile) */
    .settore-riga { border-bottom: 1px solid #f0f1f3; }
    .settore-riga:last-child { border-bottom: none; }
    .settore-sommario { display: flex; align-items: center; gap: 12px; width: 100%; padding: 13px 16px; background: none; border: none; cursor: pointer; font: inherit; text-align: left; }
    .settore-sommario:hover { background: #fafafa; }
    .badge-settore { display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; color: white; font-weight: 700; letter-spacing: .01em; flex-shrink: 0; }
    .settore-nome { flex: 1; font-size: 14px; font-weight: 600; color: #1f2937; }
    .settore-conteggio { background: #F0EEE8; color: #374151; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 10px; }
    .settore-freccia { color: #9ca3af; transition: transform .15s; }
    .settore-riga.aperta .settore-freccia { transform: rotate(180deg); }
    .settore-clienti { display: none; padding: 0 16px 14px 47px; }
    .settore-riga.aperta .settore-clienti { display: block; }
    .lista-clienti-settore { list-style: none; margin: 0; padding: 0; }
    .lista-clienti-settore li { padding: 7px 0; border-bottom: 1px solid #f6f7f8; font-size: 13.5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .lista-clienti-settore li:last-child { border-bottom: none; }
    .lista-clienti-settore a { color: #0E6E62; text-decoration: none; font-weight: 600; }
    .lista-clienti-settore a:hover { text-decoration: underline; }
    .mini-stat { color: #9ca3af; font-size: 12px; margin-left: auto; }
    .empty-settore { color: #9ca3af; font-size: 13px; padding: 6px 0; font-style: italic; }
    /* System Health */
    .riga-salute { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-bottom: 1px solid #f0f1f3; }
    .riga-salute:last-child { border-bottom: none; }
    .pallino-salute { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .pallino-ok { background: #0E6E62; }
    .pallino-errore { background: #B23A2E; }
    .pallino-sconosciuto { background: #d1d5db; }
    .salute-nome { font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; }
    .salute-stato { font-size: 12.5px; font-weight: 600; }
    .salute-stato-ok { color: #0E6E62; }
    .salute-stato-errore { color: #B23A2E; }
    .salute-stato-sconosciuto { color: #9ca3af; font-weight: 400; }
    .salute-quando { font-size: 12px; color: #9ca3af; min-width: 70px; text-align: right; }
    /* Log eventi */
    .cella-orario { white-space: nowrap; font-size: 12.5px; color: #6b7280; font-variant-numeric: tabular-nums; }
    .cella-dettaglio { font-size: 12.5px; color: #6b7280; max-width: 320px; }
    .badge-stato-ok { display: inline-block; background: #e9f3f1; color: #0E6E62; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .badge-stato-errore { display: inline-block; background: #fbeae8; color: #B23A2E; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
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
        <span class="marchio">${icon('sparkle', { size: 16 })}</span>
        <div>
          <h1>AI Setup Agency</h1>
          <div class="settore">Area amministrativa</div>
        </div>
      </div>

      <div class="sidebar-group">
        <a href="#panoramica" class="sidebar-link tab-link attivo" data-tab="panoramica">${icon('home')} Panoramica</a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Struttura</div>
        <a href="#settori" class="sidebar-link tab-link" data-tab="settori">${icon('folder')} Tipi di attività <span class="conteggio">${Object.keys(SETTORI).length}</span></a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Sistema</div>
        <a href="#sistema" class="sidebar-link tab-link" data-tab="sistema">${icon('activity')} Stato sistema${integrazioniInErrore > 0 ? ` <span class="conteggio conteggio-errore">${integrazioniInErrore}</span>` : ''}</a>
        <a href="#eventi" class="sidebar-link tab-link" data-tab="eventi">${icon('list')} Log eventi</a>
      </div>
    </div>

    <div class="main">
      <div class="tab-pannello attivo" data-pannello="panoramica">
        <div class="main-titolo">${icon('building', { size: 20 })} Dashboard agenzia</div>
        <p class="main-sub">Vista aggregata su tutti i clienti — non visibile ai singoli clienti.</p>

        <div class="stats">
          <div class="stat-card"><div class="stat-num">${totClienti}</div><div class="stat-label">Clienti totali</div></div>
          <div class="stat-card"><div class="stat-num" style="color:#16a34a">${totClientiAttivi}</div><div class="stat-label">Attivi</div></div>
          <div class="stat-card"><div class="stat-num">${settoriCoperti}</div><div class="stat-label">Settori coperti</div></div>
          <div class="stat-card"><div class="stat-num">${totRichieste}</div><div class="stat-label">Richieste totali</div></div>
          <div class="stat-card"><div class="stat-num">${totAppuntamenti}</div><div class="stat-label">Appuntamenti confermati</div></div>
          <div class="stat-card"><div class="stat-num">${totFollowUpAttivi}</div><div class="stat-label">Con follow-up attivi</div></div>
        </div>

        <div class="sezione-titolo">${icon('chart', { size: 16 })} Per settore</div>
        <div class="card">
          ${righeSettori ? `<table>
            <tr><th>Settore</th><th>Clienti</th><th>Richieste</th><th>Lead</th><th>Appuntamenti</th><th>Conversione</th></tr>
            ${righeSettori}
          </table>` : '<div class="empty">Nessun dato ancora.</div>'}
        </div>

        <div class="sezione-titolo">${icon('building', { size: 16 })} Per cliente</div>
        <div class="card">
          ${righeClientiHtml ? `<table>
            <tr><th>Cliente</th><th>Settore</th><th>Richieste</th><th>Lead</th><th>Appuntamenti</th><th>Conversione</th><th>Follow-up</th></tr>
            ${righeClientiHtml}
          </table>` : '<div class="empty">Nessun cliente ancora.</div>'}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="settori">
        <div class="main-titolo">${icon('folder', { size: 20 })} Tipi di attività</div>
        <p class="main-sub">Tutti i ${Object.keys(SETTORI).length} settori supportati. Apri un tipo di attività per vedere i clienti che lo usano ed entrare nei loro servizi, personale e orari.</p>
        <div class="card">
          ${direttorioSettoriHtml}${direttorioNonImpostatoHtml}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="sistema">
        <div class="main-titolo">${icon('activity', { size: 20 })} Stato sistema</div>
        <p class="main-sub">Dedotto dagli eventi reali registrati negli ultimi messaggi gestiti — non un indicatore finto. Un'integrazione mai usata di recente compare come "Nessun dato recente", non come "operativa".</p>
        <div class="card">
          ${righeSalute.map((r) => `<div class="riga-salute">
            <span class="pallino-salute pallino-${r.stato}"></span>
            <span class="salute-nome">${escapeHtml(r.nome)}</span>
            <span class="salute-stato salute-stato-${r.stato}">${escapeHtml(r.etichetta)}</span>
            <span class="salute-quando">${r.quando ? escapeHtml(r.quando) : ''}</span>
          </div>`).join('')}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="eventi">
        <div class="main-titolo">${icon('list', { size: 20 })} Log eventi</div>
        <p class="main-sub">Le ultime ${Math.min(listaEventi.length, 80)} fasi registrate, più recenti prima. Il sistema non è una scatola nera: ogni passaggio di ogni messaggio lascia una traccia qui.</p>
        <div class="card">
          ${righeEventiHtml ? `<table>
            <tr><th>Quando</th><th>Fase</th><th>Cliente</th><th>Esito</th><th>Dettaglio</th></tr>
            ${righeEventiHtml}
          </table>` : '<div class="empty">Nessun evento registrato ancora.</div>'}
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
