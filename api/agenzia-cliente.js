// api/agenzia-cliente.js
//
// Vista admin di un SINGOLO cliente scelto dall'elenco settori della
// dashboard agenzia (api/agenzia.js) — permette al titolare di
// vedere/modificare Servizi, Personale e Orari di apertura di qualsiasi
// cliente, senza dover accedere con il suo dashboard_token.
//
// Differenza di sicurezza rispetto ad api/dashboard.js / api/info-cliente.js:
// lì il cliente_id arriva SOLO dalla sessione del cliente (mai da query
// string), perché un cliente non deve MAI poter scegliere di impersonare
// un altro cliente. Qui invece il cliente_id arriva volutamente da query
// string — ma l'accesso all'intera route è gated dalla sessione ADMIN
// ('agency_admin_session', sessione.admin === true), che è un singolo
// titolare fidato, non un cliente. Non è la stessa cosa del bug P0-1: lì
// l'identità di CHI GUARDA determinava quali dati vedere senza verifica;
// qui chi guarda è sempre verificato come admin, e sceglie esplicitamente
// quale cliente amministrare — esattamente come un pannello di supporto.
//
// Volutamente NON espone qui info_generali/follow-up/valore_medio_cliente:
// quelli restano riservati al cliente stesso via /api/info-cliente. Questa
// pagina copre solo Servizi, Personale, Orari — il minimo per rispondere
// alla richiesta "cliccando su un tipo di attività, arrivi ai suoi
// servizi/personale/orari".

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { nomeSettore, inizialiSettore, coloreSettore } from '../lib/settori.js';
import { icon } from '../lib/icons.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const GIORNI = [
  { chiave: 'lunedi', etichetta: 'Lunedì' },
  { chiave: 'martedi', etichetta: 'Martedì' },
  { chiave: 'mercoledi', etichetta: 'Mercoledì' },
  { chiave: 'giovedi', etichetta: 'Giovedì' },
  { chiave: 'venerdi', etichetta: 'Venerdì' },
  { chiave: 'sabato', etichetta: 'Sabato' },
  { chiave: 'domenica', etichetta: 'Domenica' },
];

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;margin:0;">
    <div style="background:white;padding:32px;border-radius:12px;text-align:center;">
      <h2 style="margin-top:0;">Sessione admin scaduta</h2>
      <a href="/api/agenzia-login" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Accedi di nuovo</a>
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

  // ===== Autenticazione: SOLO sessione admin (mai quella di un cliente) =====
  const cookieToken = leggiCookieSessione(req, 'agency_admin_session');
  const sessione = verificaSessione(cookieToken, SESSION_SECRET);
  if (!sessione || sessione.admin !== true) {
    return res.status(401).send(paginaNonAutenticato());
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Metodo non permesso');
  }

  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  // cliente_id: qui SI, da query string/body — ma solo perché chi lo sceglie
  // è già verificato come admin (vedi nota sopra). Verificato comunque
  // contro la tabella clienti prima di ogni lettura/scrittura.
  const cliente_id = req.method === 'POST' ? (req.body || {}).cliente_id : req.query?.cliente_id;
  if (!cliente_id || typeof cliente_id !== 'string') {
    return res.status(400).send('<h2>Cliente non specificato</h2><p><a href="/api/agenzia">&larr; Torna alla dashboard agenzia</a></p>');
  }

  const clienteCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/clienti?id=eq.${encodeURIComponent(cliente_id)}&select=id,nome_attivita`, { headers });
  const clienteCheckData = await clienteCheckRes.json();
  const clienteEsiste = Array.isArray(clienteCheckData) ? clienteCheckData[0] : null;
  if (!clienteEsiste) {
    return res.status(404).send('<h2>Cliente non trovato</h2><p><a href="/api/agenzia">&larr; Torna alla dashboard agenzia</a></p>');
  }
  const nomeAttivita = clienteEsiste.nome_attivita || 'Cliente';

  try {
    if (req.method === 'POST') {
      const params = req.body || {};
      const azione = params.azione || '';
      const tornaA = `/api/agenzia-cliente?cliente_id=${encodeURIComponent(cliente_id)}`;

      if (azione === 'aggiungi_servizio') {
        const nome = (params.servizio_nome || '').trim();
        if (nome) {
          const prezzo = params.servizio_prezzo && String(params.servizio_prezzo).trim() !== ''
            ? Math.max(0, parseFloat(String(params.servizio_prezzo).replace(',', '.')) || 0)
            : null;
          const durata = params.servizio_durata && String(params.servizio_durata).trim() !== ''
            ? Math.max(0, parseInt(params.servizio_durata, 10) || 0)
            : null;
          await fetch(`${SUPABASE_URL}/rest/v1/servizi_cliente`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cliente_id, nome, prezzo, durata_minuti: durata }),
          });
        }
        res.writeHead(302, { Location: `${tornaA}#servizi` });
        return res.end();
      }
      if (azione === 'elimina_servizio' && params.servizio_id) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/servizi_cliente?id=eq.${encodeURIComponent(params.servizio_id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'DELETE', headers }
        );
        res.writeHead(302, { Location: `${tornaA}#servizi` });
        return res.end();
      }
      if (azione === 'aggiungi_personale') {
        const nome = (params.personale_nome || '').trim();
        if (nome) {
          const ruolo = (params.personale_ruolo || '').trim() || null;
          const telefono = (params.personale_telefono || '').trim() || null;
          await fetch(`${SUPABASE_URL}/rest/v1/personale_cliente`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cliente_id, nome, ruolo, telefono }),
          });
        }
        res.writeHead(302, { Location: `${tornaA}#personale` });
        return res.end();
      }
      if (azione === 'elimina_personale' && params.personale_id) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/personale_cliente?id=eq.${encodeURIComponent(params.personale_id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'DELETE', headers }
        );
        res.writeHead(302, { Location: `${tornaA}#personale` });
        return res.end();
      }
      if (azione === 'salva_orari') {
        const orariApertura = {};
        for (const giorno of GIORNI) {
          const valore = (params[`orario_${giorno.chiave}`] || '').trim();
          orariApertura[giorno.chiave] = valore || 'Chiuso';
        }
        await fetch(
          `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'PATCH', headers, body: JSON.stringify({ orari_apertura: orariApertura }) }
        );
        res.writeHead(302, { Location: `${tornaA}#orari` });
        return res.end();
      }

      res.writeHead(302, { Location: tornaA });
      return res.end();
    }

    // ===== GET =====
    const [configRes, serviziRes, personaleRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=settore,orari_apertura`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/servizi_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=id,nome,prezzo,durata_minuti&order=creato_il.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/personale_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=id,nome,ruolo,telefono&order=creato_il.asc`, { headers }),
    ]);
    const configData = await configRes.json();
    const config = Array.isArray(configData) ? configData[0] : null;
    const serviziData = await serviziRes.json();
    const servizi = Array.isArray(serviziData) ? serviziData : [];
    const personaleData = await personaleRes.json();
    const personale = Array.isArray(personaleData) ? personaleData : [];

    const settore = config?.settore || null;
    const orariAttuali = config?.orari_apertura && typeof config.orari_apertura === 'object' ? config.orari_apertura : {};

    const serviziRigheHtml = servizi.length > 0
      ? servizi.map((s) => `
        <tr>
          <td>${escapeHtml(s.nome)}</td>
          <td>${s.prezzo != null ? `€${Number(s.prezzo).toLocaleString('it-IT')}` : '<i style="color:#9ca3af">—</i>'}</td>
          <td>${s.durata_minuti != null ? `${s.durata_minuti} min` : '<i style="color:#9ca3af">—</i>'}</td>
          <td>
            <form method="POST" action="/api/agenzia-cliente" onsubmit="return confirm('Eliminare questo servizio?');">
              <input type="hidden" name="cliente_id" value="${escapeHtml(cliente_id)}" />
              <input type="hidden" name="azione" value="elimina_servizio" />
              <input type="hidden" name="servizio_id" value="${escapeHtml(s.id)}" />
              <button type="submit" class="btn-elimina">Elimina</button>
            </form>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="empty-riga">Nessun servizio in elenco ancora.</td></tr>`;

    const personaleRigheHtml = personale.length > 0
      ? personale.map((p) => `
        <tr>
          <td>${escapeHtml(p.nome)}</td>
          <td>${escapeHtml(p.ruolo || '—')}</td>
          <td>${p.telefono ? `<a href="tel:${escapeHtml(p.telefono)}">${escapeHtml(p.telefono)}</a>` : '—'}</td>
          <td>
            <form method="POST" action="/api/agenzia-cliente" onsubmit="return confirm('Rimuovere questa persona?');">
              <input type="hidden" name="cliente_id" value="${escapeHtml(cliente_id)}" />
              <input type="hidden" name="azione" value="elimina_personale" />
              <input type="hidden" name="personale_id" value="${escapeHtml(p.id)}" />
              <button type="submit" class="btn-elimina">Rimuovi</button>
            </form>
          </td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="empty-riga">Nessuna persona in elenco ancora.</td></tr>`;

    const orariHtml = GIORNI.map((g) => `
      <label class="campo campo-orario">
        <span>${escapeHtml(g.etichetta)}</span>
        <input type="text" name="orario_${g.chiave}" value="${escapeHtml(orariAttuali[g.chiave] && orariAttuali[g.chiave] !== 'Chiuso' ? orariAttuali[g.chiave] : '')}" placeholder="Es. 9:00-13:00, 15:00-19:00 (vuoto = chiuso)" />
      </label>`).join('\n');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Setup Agency — Admin · ${escapeHtml(nomeAttivita)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: radial-gradient(1100px 500px at 15% -10%, #eef0fb 0%, #f4f5f9 45%, #f4f5f9 100%); margin: 0; padding: 24px; color: #0f172a; -webkit-font-smoothing: antialiased; }
  .container { max-width: 720px; margin: 0 auto; }
  a.torna { color: #4f46e5; text-decoration: none; font-size: 14px; }
  .admin-pill { display: inline-flex; align-items: center; gap: 6px; background: #0f172a; color: white; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 10px; border-radius: 999px; margin: 10px 0 6px; }
  h1 { font-size: 1.4rem; margin: 2px 0 2px; }
  .settore-pill { display: inline-flex; align-items: center; gap: 7px; background: #eef2ff; color: #4338ca; font-size: 0.78rem; font-weight: 600; padding: 4px 10px 4px 4px; border-radius: 999px; margin-bottom: 10px; }
  .badge-settore-mini { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 6px; color: white; font-size: 9px; font-weight: 700; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 20px; font-size: 0.9rem; }
  .card { background: white; border-radius: 14px; padding: 24px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06); margin-bottom: 20px; transition: box-shadow .15s ease; }
  .card h2 { font-size: 1.05rem; margin: 0 0 4px; display: flex; align-items: center; gap: 7px; color: #1e293b; }
  .card h2 .icona-ui { color: #6366f1; }
  .icona-ui { flex-shrink: 0; vertical-align: -3px; }
  .card p.desc { color: #6b7280; font-size: 0.85rem; margin: 0 0 16px; }
  .campo { display: block; margin-bottom: 18px; }
  .campo span { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
  input[type="text"], input[type="number"] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d8dc; border-radius: 8px; font-size: 0.95rem; font-family: inherit; }
  button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 9px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background .15s ease, transform .1s ease; }
  button:active { transform: translateY(1px); }
  button:hover { background: #4338ca; }
  table.mini { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.mini th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  table.mini td { padding: 8px; border-bottom: 1px solid #f0f1f3; font-size: 0.9rem; vertical-align: middle; }
  table.mini td form { margin: 0; }
  .empty-riga { color: #9ca3af; font-style: italic; }
  .btn-elimina { font: inherit; font-size: 12px; padding: 5px 10px; border-radius: 6px; border: 1px solid #fca5a5; color: #dc2626; background: #fef2f2; cursor: pointer; }
  .form-riga { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
  .form-riga .campo { flex: 1; min-width: 140px; margin-bottom: 0; }
  .form-riga button { white-space: nowrap; padding: 10px 18px; }
  .griglia-orari { display: grid; grid-template-columns: 1fr; gap: 6px; }
  .campo-orario { margin-bottom: 0; display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: 10px; }
  .campo-orario span { margin-bottom: 0; font-weight: 500; }
  .nota { font-size: 0.8rem; color: #888; margin-top: 20px; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <a class="torna" href="/api/agenzia">&larr; Torna alla dashboard agenzia</a>
    <div><span class="admin-pill">${icon('eye', { size: 12 })} Vista admin</span></div>
    <div class="settore-pill"><span class="badge-settore-mini" style="background:${coloreSettore(settore)}">${escapeHtml(settore ? inizialiSettore(settore) : '—')}</span> ${escapeHtml(nomeSettore(settore))}</div>
    <h1>${escapeHtml(nomeAttivita)}</h1>
    <p class="sub">Stai modificando i dati di questo cliente come amministratore dell'agenzia. Indirizzo, prezzi generali e follow-up restano gestiti dal cliente stesso nel suo account.</p>

    <div class="card" id="servizi">
      <h2>${icon('list')} Servizi offerti</h2>
      <p class="desc">Il listino strutturato usato anche dal bot WhatsApp di questo cliente.</p>
      <table class="mini">
        <tr><th>Servizio</th><th>Prezzo</th><th>Durata</th><th></th></tr>
        ${serviziRigheHtml}
      </table>
      <form method="POST" action="/api/agenzia-cliente#servizi" class="form-riga">
        <input type="hidden" name="cliente_id" value="${escapeHtml(cliente_id)}" />
        <input type="hidden" name="azione" value="aggiungi_servizio" />
        <label class="campo"><span>Nome servizio</span><input type="text" name="servizio_nome" placeholder="Es. Pulizia dentale" required /></label>
        <label class="campo" style="max-width:120px;"><span>Prezzo (€)</span><input type="number" min="0" step="0.01" name="servizio_prezzo" placeholder="60" /></label>
        <label class="campo" style="max-width:120px;"><span>Durata (min)</span><input type="number" min="0" name="servizio_durata" placeholder="30" /></label>
        <button type="submit">Aggiungi</button>
      </form>
    </div>

    <div class="card" id="personale">
      <h2>${icon('users')} Personale</h2>
      <p class="desc">Elenco dello staff di questo cliente.</p>
      <table class="mini">
        <tr><th>Nome</th><th>Ruolo</th><th>Telefono</th><th></th></tr>
        ${personaleRigheHtml}
      </table>
      <form method="POST" action="/api/agenzia-cliente#personale" class="form-riga">
        <input type="hidden" name="cliente_id" value="${escapeHtml(cliente_id)}" />
        <input type="hidden" name="azione" value="aggiungi_personale" />
        <label class="campo"><span>Nome</span><input type="text" name="personale_nome" placeholder="Es. Maria Rossi" required /></label>
        <label class="campo"><span>Ruolo</span><input type="text" name="personale_ruolo" placeholder="Es. Igienista" /></label>
        <label class="campo"><span>Telefono</span><input type="text" name="personale_telefono" placeholder="Facoltativo" /></label>
        <button type="submit">Aggiungi</button>
      </form>
    </div>

    <div class="card" id="orari">
      <form method="POST" action="/api/agenzia-cliente#orari">
        <input type="hidden" name="cliente_id" value="${escapeHtml(cliente_id)}" />
        <input type="hidden" name="azione" value="salva_orari" />
        <h2>${icon('clock')} Orari di apertura</h2>
        <p class="desc">Lascia vuoto un giorno se è chiuso. Usati dal bot per rispondere a "quando siete aperti?".</p>
        <div class="griglia-orari">${orariHtml}</div>
        <button type="submit" style="margin-top:14px;">Salva orari</button>
      </form>
    </div>

    <p class="nota">Pagina riservata all'amministratore dell'agenzia — non condividere questo link.</p>
  </div>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (err) {
    console.error('Errore vista admin cliente:', err);
    return res.status(500).send('<h2>Errore nel caricamento</h2>');
  }
}
