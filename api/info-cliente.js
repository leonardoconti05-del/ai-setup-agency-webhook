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
// Estesa il 30/9/2026 (Task #7) con tre sezioni pensate per far diventare
// questa pagina + la dashboard un vero gestionale, non solo un webhook:
// - Servizi offerti (tabella servizi_cliente, migrations/008): elenco
//   strutturato nome+prezzo, non più solo testo libero.
// - Personale (tabella personale_cliente, migrations/008): elenco semplice,
//   non un sistema di turni/permessi.
// - Orari di apertura (colonna configurazioni_cliente.orari_apertura,
//   jsonb, esisteva già ma senza un'interfaccia per modificarla — è letta
//   da api/whatsapp.js per rispondere a "quando siete aperti?").
// Le due nuove tabelle usano un pattern ad "azione" (come api/knowledge.js)
// per aggiungere/eliminare righe, separato dal salvataggio del form
// principale (info generali, follow-up, valore medio, orari).

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { etichetteSettore, nomeSettore } from '../lib/settori.js';

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
  { chiave: 'prezzi_note', etichetta: 'Prezzi / listino (testo libero, oltre alla tabella Servizi qui sotto)', tipo: 'textarea', placeholder: 'Note generali sui prezzi...' },
  { chiave: 'altre_informazioni', etichetta: 'Altre informazioni utili', tipo: 'textarea', placeholder: 'Parcheggio disponibile, accesso disabili, si accettano solo contanti...' },
];

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
    const azione = params.azione || 'salva_info';

    try {
      // ===== Servizi: aggiungi/elimina (tabella servizi_cliente) =====
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
        res.writeHead(302, { Location: '/api/info-cliente#servizi' });
        return res.end();
      }
      if (azione === 'elimina_servizio' && params.servizio_id) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/servizi_cliente?id=eq.${encodeURIComponent(params.servizio_id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'DELETE', headers }
        );
        res.writeHead(302, { Location: '/api/info-cliente#servizi' });
        return res.end();
      }

      // ===== Personale: aggiungi/elimina (tabella personale_cliente) =====
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
        res.writeHead(302, { Location: '/api/info-cliente#personale' });
        return res.end();
      }
      if (azione === 'elimina_personale' && params.personale_id) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/personale_cliente?id=eq.${encodeURIComponent(params.personale_id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'DELETE', headers }
        );
        res.writeHead(302, { Location: '/api/info-cliente#personale' });
        return res.end();
      }

      // ===== Salvataggio principale: info generali, follow-up, statistiche, orari =====
      const nuoveInfo = {};
      for (const campo of CAMPI_FORM) {
        nuoveInfo[campo.chiave] = (params[campo.chiave] || '').trim();
      }

      const followUpAttivo = params.follow_up_attivo === 'on';
      const followUpDopoOre = Math.max(1, parseInt(params.follow_up_dopo_ore, 10) || 24);
      const followUpMaxMessaggi = Math.max(0, parseInt(params.follow_up_max_messaggi, 10) || 2);
      const followUpOrarioDa = /^\d{2}:\d{2}$/.test(params.follow_up_orario_da || '') ? params.follow_up_orario_da : '09:00';
      const followUpOrarioA = /^\d{2}:\d{2}$/.test(params.follow_up_orario_a || '') ? params.follow_up_orario_a : '19:00';
      const followUpMessaggio = (params.follow_up_messaggio || '').trim() || null;

      const valoreMedioCliente = params.valore_medio_cliente && String(params.valore_medio_cliente).trim() !== ''
        ? Math.max(0, parseFloat(String(params.valore_medio_cliente).replace(',', '.')) || 0)
        : null;

      // Orari di apertura: un testo libero per giorno ("9:00-13:00, 15:00-19:00"),
      // non un editor a fasce multiple — più semplice da compilare e comunque
      // sufficiente per informare sia il cliente WhatsApp sia il titolare.
      // Un giorno lasciato vuoto viene salvato esplicitamente come "Chiuso",
      // così il bot non lo ignora e non lo dà per scontato.
      const orariApertura = {};
      for (const giorno of GIORNI) {
        const valore = (params[`orario_${giorno.chiave}`] || '').trim();
        orariApertura[giorno.chiave] = valore || 'Chiuso';
      }

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
            orari_apertura: orariApertura,
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
      console.error('Errore salvataggio dati cliente:', e);
      res.status(500).send('Errore nel salvataggio. Riprova.');
      return;
    }
    res.writeHead(302, { Location: '/api/info-cliente?salvato=1' });
    res.end();
    return;
  }

  // ===== GET: recupera i dati attuali e mostra il form =====
  let config = null;
  let servizi = [];
  let personale = [];
  try {
    const [configRes, serviziRes, personaleRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=info_generali,follow_up_attivo,follow_up_dopo_ore,follow_up_max_messaggi,follow_up_orario_da,follow_up_orario_a,follow_up_messaggio,valore_medio_cliente,orari_apertura,settore,clienti(nome_attivita)`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/servizi_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=id,nome,prezzo,durata_minuti&order=creato_il.asc`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/personale_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=id,nome,ruolo,telefono&order=creato_il.asc`,
        { headers }
      ),
    ]);
    const configData = await configRes.json();
    config = Array.isArray(configData) ? configData[0] : null;
    const serviziData = await serviziRes.json();
    servizi = Array.isArray(serviziData) ? serviziData : [];
    const personaleData = await personaleRes.json();
    personale = Array.isArray(personaleData) ? personaleData : [];
  } catch (e) {
    console.error('Errore lettura configurazione:', e);
  }

  if (!config) {
    res.status(404).setHeader('Content-Type', 'text/html');
    res.send('<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;padding:40px;"><h2>Cliente non trovato</h2></body></html>');
    return;
  }

  const nomeAttivita = config.clienti?.nome_attivita || 'Cliente';
  const et = etichetteSettore(config.settore);
  const infoAttuali = config.info_generali && typeof config.info_generali === 'object' ? config.info_generali : {};
  const orariAttuali = config.orari_apertura && typeof config.orari_apertura === 'object' ? config.orari_apertura : {};
  const salvatoOraOra = req.query && req.query.salvato === '1';

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

  const orariHtml = GIORNI.map((g) => `
    <label class="campo campo-orario">
      <span>${escapeHtml(g.etichetta)}</span>
      <input type="text" name="orario_${g.chiave}" value="${escapeHtml(orariAttuali[g.chiave] && orariAttuali[g.chiave] !== 'Chiuso' ? orariAttuali[g.chiave] : '')}" placeholder="Es. 9:00-13:00, 15:00-19:00 (vuoto = chiuso)" />
    </label>`).join('\n');

  const serviziRigheHtml = servizi.length > 0
    ? servizi.map((s) => `
      <tr>
        <td>${escapeHtml(s.nome)}</td>
        <td>${s.prezzo != null ? `€${Number(s.prezzo).toLocaleString('it-IT')}` : '<i style="color:#9ca3af">—</i>'}</td>
        <td>${s.durata_minuti != null ? `${s.durata_minuti} min` : '<i style="color:#9ca3af">—</i>'}</td>
        <td>
          <form method="POST" action="/api/info-cliente" onsubmit="return confirm('Eliminare questo servizio?');">
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
          <form method="POST" action="/api/info-cliente" onsubmit="return confirm('Rimuovere questa persona?');">
            <input type="hidden" name="azione" value="elimina_personale" />
            <input type="hidden" name="personale_id" value="${escapeHtml(p.id)}" />
            <button type="submit" class="btn-elimina">Rimuovi</button>
          </form>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty-riga">Nessuna persona in elenco ancora.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Setup Agency — ${escapeHtml(nomeAttivita)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f6f8; margin: 0; padding: 24px; color: #1a1a1a; }
  .container { max-width: 720px; margin: 0 auto; }
  a.torna { color: #2563eb; text-decoration: none; font-size: 14px; }
  h1 { font-size: 1.4rem; margin: 8px 0 2px; }
  .settore-pill { display: inline-flex; align-items: center; gap: 6px; background: #eef2ff; color: #4338ca; font-size: 0.78rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 20px; font-size: 0.9rem; }
  .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
  .card h2 { font-size: 1.05rem; margin: 0 0 4px; }
  .card p.desc { color: #6b7280; font-size: 0.85rem; margin: 0 0 16px; }
  .campo { display: block; margin-bottom: 18px; }
  .campo span { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
  input[type="text"], input[type="number"], textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d8dc; border-radius: 8px; font-size: 0.95rem; font-family: inherit; }
  textarea { resize: vertical; }
  button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .banner-ok { background: #dcfce7; color: #166534; padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 0.9rem; }
  .nota { font-size: 0.8rem; color: #888; margin-top: 20px; text-align: center; }
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
  hr.sep { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
</style>
</head>
<body>
  <div class="container">
    <a class="torna" href="/api/dashboard">&larr; Torna alla dashboard</a>
    <div class="settore-pill">${et.icona} ${escapeHtml(nomeSettore(config.settore))}</div>
    <h1>${escapeHtml(nomeAttivita)}</h1>
    <p class="sub">Queste informazioni vengono usate dal bot WhatsApp per rispondere automaticamente a domande dei clienti (prezzi, orari, servizi, ecc.) e alimentano la dashboard.</p>
    ${salvatoOraOra ? '<div class="banner-ok">Informazioni salvate correttamente.</div>' : ''}

    <div class="card" id="servizi">
      <h2>🧾 Servizi offerti</h2>
      <p class="desc">Il listino strutturato che compare nella dashboard e che il bot può citare con prezzi precisi.</p>
      <table class="mini">
        <tr><th>Servizio</th><th>Prezzo</th><th>Durata</th><th></th></tr>
        ${serviziRigheHtml}
      </table>
      <form method="POST" action="/api/info-cliente#servizi" class="form-riga">
        <input type="hidden" name="azione" value="aggiungi_servizio" />
        <label class="campo"><span>Nome servizio</span><input type="text" name="servizio_nome" placeholder="Es. Pulizia dentale" required /></label>
        <label class="campo" style="max-width:120px;"><span>Prezzo (€)</span><input type="number" min="0" step="0.01" name="servizio_prezzo" placeholder="60" /></label>
        <label class="campo" style="max-width:120px;"><span>Durata (min)</span><input type="number" min="0" name="servizio_durata" placeholder="30" /></label>
        <button type="submit">Aggiungi</button>
      </form>
    </div>

    <div class="card" id="personale">
      <h2>👥 Personale</h2>
      <p class="desc">Un elenco semplice del tuo staff — non gestisce turni o permessi, solo un promemoria visibile in dashboard.</p>
      <table class="mini">
        <tr><th>Nome</th><th>Ruolo</th><th>Telefono</th><th></th></tr>
        ${personaleRigheHtml}
      </table>
      <form method="POST" action="/api/info-cliente#personale" class="form-riga">
        <input type="hidden" name="azione" value="aggiungi_personale" />
        <label class="campo"><span>Nome</span><input type="text" name="personale_nome" placeholder="Es. Maria Rossi" required /></label>
        <label class="campo"><span>Ruolo</span><input type="text" name="personale_ruolo" placeholder="Es. Igienista" /></label>
        <label class="campo"><span>Telefono</span><input type="text" name="personale_telefono" placeholder="Facoltativo" /></label>
        <button type="submit">Aggiungi</button>
      </form>
    </div>

    <div class="card">
      <form method="POST" action="/api/info-cliente">
        <input type="hidden" name="azione" value="salva_info" />
        <h2>🕒 Orari di apertura</h2>
        <p class="desc">Lascia vuoto un giorno se sei chiuso. Usati dal bot per rispondere a "quando siete aperti?".</p>
        <div class="griglia-orari">${orariHtml}</div>

        <hr class="sep" />
        <h2>ℹ️ Informazioni generali</h2>
        <p class="desc">Indirizzo, contatti e note che il bot può citare quando serve.</p>
        ${campiHtml}

        <hr class="sep" />
        <h2>🔁 Follow-up automatici</h2>
        <p class="desc">Se un cliente scrive ma non completa la richiesta, il sistema può scrivergli di nuovo automaticamente dopo un po' di silenzio. Si ferma da solo appena il cliente risponde.</p>

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
          <small style="color:#6b7280;display:block;margin-top:4px;">Nota: per policy WhatsApp, i follow-up inviati oltre 24 ore dopo l'ultimo messaggio del cliente possono usare solo un testo fisso pre-approvato da Meta. Questo campo personalizzato viene usato solo finché quel template non è configurato lato agenzia.</small>
        </label>

        <hr class="sep" />
        <h2>💶 Statistiche</h2>
        <label class="campo">
          <span>Valore medio di un ${et.evento.toLowerCase()} (€, facoltativo)</span>
          <input type="number" min="0" step="0.01" name="valore_medio_cliente" value="${escapeHtml(String(valoreMedioAttuale))}" placeholder="Es. 80" />
        </label>
        <p class="desc" style="margin-top:-10px;">Se lo indichi, la dashboard mostrerà anche una stima del valore generato (mai un numero garantito, solo una stima).</p>

        <button type="submit">Salva tutte le informazioni</button>
      </form>
    </div>
    <p class="nota">Pagina ad accesso riservato — non condividere questo link con persone esterne allo staff.</p>
  </div>
</body>
</html>`;

  res.status(200).setHeader('Content-Type', 'text/html');
  res.send(html);
}
