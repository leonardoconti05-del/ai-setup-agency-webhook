// api/info-cliente.js
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

    // Follow-up automatici (migrations/006_follow_up.sql): colonne dirette
    // su configurazioni_cliente, non dentro il jsonb info_generali — sono
    // usate direttamente in SQL/filtri dal cron, non solo lette dal prompt.
    const followUpAttivo = params.follow_up_attivo === 'on';
    const followUpDopoOre = Math.max(1, parseInt(params.follow_up_dopo_ore, 10) || 24);
    const followUpMaxMessaggi = Math.max(0, parseInt(params.follow_up_max_messaggi, 10) || 2);
    const followUpOrarioDa = /^\d{2}:\d{2}$/.test(params.follow_up_orario_da || '') ? params.follow_up_orario_da : '09:00';
    const followUpOrarioA = /^\d{2}:\d{2}$/.test(params.follow_up_orario_a || '') ? params.follow_up_orario_a : '19:00';
    const followUpMessaggio = (params.follow_up_messaggio || '').trim() || null;

    // Valore medio per la stima ROI in dashboard (migrations/007_analytics.sql)
    // — facoltativo, inserito volontariamente dal titolare. Mai inventato da noi.
    const valoreMedioCliente = params.valore_medio_cliente && String(params.valore_medio_cliente).trim() !== ''
      ? Math.max(0, parseFloat(String(params.valore_medio_cliente).replace(',', '.')) || 0)
      : null;

    try {
      const salvataggio = await fetch(
        `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            info_generali: nuoveInfo,
            follow_up_attivo: followUpAttivo,
            follow_up_dopo_ore: followUpDopoOre,
            follow_up_max_messaggi: followUpMaxMessaggi,
            follow_up_orario_da: followUpOrarioDa,
            follow_up_orario_a: followUpOrarioA,
            follow_up_messaggio: followUpMessaggio,
            valore_medio_cliente: valoreMedioCliente,
          }),
        }
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
      `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=info_generali,follow_up_attivo,follow_up_dopo_ore,follow_up_max_messaggi,follow_up_orario_da,follow_up_orario_a,follow_up_messaggio,valore_medio_cliente,clienti(nome_attivita)`,
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

  // Valori attuali follow-up (con i default della migration se mai valorizzati)
  const fu = {
    attivo: config.follow_up_attivo === true,
    dopoOre: config.follow_up_dopo_ore ?? 24,
    maxMessaggi: config.follow_up_max_messaggi ?? 2,
    orarioDa: (config.follow_up_orario_da || '09:00').slice(0, 5),
    orarioA: (config.follow_up_orario_a || '19:00').slice(0, 5),
    messaggio: config.follow_up_messaggio || '',
  };
  const valoreMedioAttuale = config.valore_medio_cliente != null ? config.valore_medio_cliente : '';

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

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <h2 style="font-size:1.1rem;margin-top:0;">Follow-up automatici</h2>
        <p class="sub" style="margin-bottom:16px;">Se un cliente scrive ma non completa la richiesta, il sistema può scrivergli di nuovo automaticamente dopo un po' di silenzio. Si ferma da solo appena il cliente risponde.</p>

        <label class="campo" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" name="follow_up_attivo" ${fu.attivo ? 'checked' : ''} style="width:auto;" />
          <span style="margin-bottom:0;">Attiva i follow-up automatici</span>
        </label>

        <label class="campo">
          <span>Dopo quante ore di silenzio inviare un follow-up</span>
          <input type="number" min="1" name="follow_up_dopo_ore" value="${fu.dopoOre}" />
        </label>

        <label class="campo">
          <span>Numero massimo di follow-up per conversazione</span>
          <input type="number" min="0" name="follow_up_max_messaggi" value="${fu.maxMessaggi}" />
        </label>

        <label class="campo">
          <span>Orario consentito per l'invio (dalle)</span>
          <input type="time" name="follow_up_orario_da" value="${fu.orarioDa}" />
        </label>

        <label class="campo">
          <span>Orario consentito per l'invio (alle)</span>
          <input type="time" name="follow_up_orario_a" value="${fu.orarioA}" />
        </label>

        <label class="campo">
          <span>Messaggio del follow-up (lascia vuoto per il messaggio predefinito)</span>
          <textarea name="follow_up_messaggio" rows="3" placeholder="Ciao! Siamo ancora a disposizione per la sua richiesta...">${escapeHtml(fu.messaggio)}</textarea>
        </label>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <h2 style="font-size:1.1rem;margin-top:0;">Statistiche</h2>
        <label class="campo">
          <span>Valore medio di un appuntamento (€, facoltativo)</span>
          <input type="number" min="0" step="0.01" name="valore_medio_cliente" value="${escapeHtml(String(valoreMedioAttuale))}" placeholder="Es. 80" />
        </label>
        <p class="sub" style="margin-top:-10px;margin-bottom:16px;">Se lo indichi, la dashboard mostrerà anche una stima del valore generato dagli appuntamenti confermati (mai un numero garantito, solo una stima).</p>

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
