// api/dashboard-login.js
//
// Pagina protetta che permette di inserire/modificare le informazioni
// generali di un cliente (indirizzo, prezzi, servizi, altre note) — usate
// dal bot su WhatsApp per rispondere a domande fuori dallo script.
//
// FIX P0-1 (21/9/2026): stessa autenticazione a sessione di api/dashboard.js
// — il cliente_id arriva SOLO dal cookie di sessione firmato, mai da query
// string o body. Login condiviso: /api/dashboard-login.
//
// Richiede la colonna "info_generali" (jsonb, default '{}') sulla tabella
// configurazioni_cliente — vedi migrations/001_dashboard_auth.sql per la
// colonna dashboard_token e verificare separatamente se info_generali esiste
// già (introdotta in una sessione precedente, non confermabile da qui).

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CAMPI_FORM = [
  { chiave: 'indirizzo', etichetta: 'Indirizzo', tipo: 'text', placeholder: 'Via Roma 1, Monterotondo (RM)' },
  { chiave: 'telefono_alternativo', etichetta: 'Telefono alternativo (oltre WhatsApp)', tipo: 'text', placeholder: '06 1234567' },
  { chiave: 'prezzi_note', etichetta: 'Prezzi / listino (testo libero)', tipo: 'textarea', placeholder: 'Visita di controllo: 50€. Pulizia dentale: 80€...' },
  { chiave: 'servizi_offerti', etichetta: 'Servizi offerti', tipo: 'textarea', placeholder: 'Igiene dentale, otturazioni, impianti, ortodonzia...' },
  { chiave: 'altre_informazioni', etichetta: 'Altre informazioni utili', tipo: 'textarea', placeholder: 'Parcheggio disponibile, accesso disabili, si accettano solo contanti...' },
];

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;padding:40px;text-align:center;">
    <h2>Sessione scaduta o non autenticata</h2>
    <p><a href="/api/dashboard-login">Accedi di nuovo</a></p>
  </body></html>`;
}

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET non configurato.');
    res.status(500).send('Configurazione mancante');
    return;
  }

  // ===== Autenticazione: SOLO dalla sessione =====
  const cookieToken = leggiCookieSessione(req);
  const sessione = verificaSessione(cookieToken, SESSION_SECRET);
  if (!sessione || !sessione.cliente_id) {
    res.status(401).setHeader('Content-Type', 'text/html');
    res.send(paginaNonAutenticato());
    return;
  }
  const cliente_id = sessione.cliente_id;

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).send('Metodo non permesso');
    return;
  }

  if (req.method === 'POST') {
    const params = req.body || {};
    const nuoveInfo = {};
    for (const campo of CAMPI_FORM) {
      nuoveInfo[campo.chiave] = (params[campo.chiave] || '').trim();
    }
    try {
      const salvataggio = await fetch(
        `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}`,
        { method: 'PATCH', headers, body: JSON.stringify({ info_generali: nuoveInfo }) }
      );
      if (!salvataggio.ok) {
        const errText = await salvataggio.text();
        console.error('Errore salvataggio info_generali:', errText);
        res.status(500).send('Errore nel salvataggio. Riprova.');
        return;
      }
    } catch (e) {
      console.error('Errore salvataggio info_generali:', e);
      res.status(500).send('Errore nel salvataggio. Riprova.');
      return;
    }
    res.writeHead(302, { Location: '/api/info-cliente?salvato=1' });
    res.end();
    return;
  }

  // GET: recupera i dati attuali e mostra il form (cliente_id sempre dalla sessione)
  let config = null;
  try {
    const configRes = await fetch(
      `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=info_generali,clienti(nome_attivita)`,
      { headers }
    );
    const configData = await configRes.json();
    config = Array.isArray(configData) ? configData[0] : null;
  } catch (e) {
    console.error('Errore lettura configurazione:', e);
  }

  if (!config) {
    res.status(404).setHeader('Content-Type', 'text/html');
    res.send('<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;padding:40px;"><h2>Cliente non trovato</h2></body></html>');
    return;
  }

  const nomeAttivita = config.clienti?.nome_attivita || 'Cliente';
  const infoAttuali = config.info_generali && typeof config.info_generali === 'object' ? config.info_generali : {};
  const salvatoOraOra = req.query && req.query.salvato === '1';

  const campiHtml = CAMPI_FORM.map((campo) => {
    const valore = escapeHtml(infoAttuali[campo.chiave] || '');
    if (campo.tipo === 'textarea') {
      return `
        <label class="campo">
          <span>${escapeHtml(campo.etichetta)}</span>
          <textarea name="${campo.chiave}" rows="3" placeholder="${escapeHtml(campo.placeholder)}">${valore}</textarea>
        </label>`;
    }
    return `
      <label class="campo">
        <span>${escapeHtml(campo.etichetta)}</span>
        <input type="text" name="${campo.chiave}" value="${valore}" placeholder="${escapeHtml(campo.placeholder)}" />
      </label>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informazioni azienda — ${escapeHtml(nomeAttivita)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f6f8; margin: 0; padding: 24px; color: #1a1a1a; }
  .container { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 24px; font-size: 0.9rem; }
  .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .campo { display: block; margin-bottom: 18px; }
  .campo span { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
  input[type="text"], textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d8dc; border-radius: 8px; font-size: 0.95rem; font-family: inherit; }
  textarea { resize: vertical; }
  button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .banner-ok { background: #dcfce7; color: #166534; padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 0.9rem; }
  .nota { font-size: 0.8rem; color: #888; margin-top: 20px; }
</style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(nomeAttivita)}</h1>
    <p class="sub">Queste informazioni vengono usate dal bot WhatsApp per rispondere automaticamente a domande dei clienti (prezzi, indirizzo, servizi, ecc.). Lascia vuoto un campo se non vuoi che il bot ne parli.</p>
    ${salvatoOraOra ? '<div class="banner-ok">Informazioni salvate correttamente.</div>' : ''}
    <div class="card">
      <form method="POST" action="/api/info-cliente">
        ${campiHtml}
        <button type="submit">Salva informazioni</button>
      </form>
    </div>
    <p class="nota">Pagina ad accesso riservato — non condividere questo link con persone esterne allo staff.</p>
  </div>
</body>
</html>`;

  res.status(200).setHeader('Content-Type', 'text/html');
  res.send(html);
}
