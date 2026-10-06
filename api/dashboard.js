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
// Redesign 30/9/2026 (Fase 1 del "master prompt" — sidebar + inbox reale):
// da tab orizzontali a una sidebar a sezioni (Panoramica / Operatività /
// Attività), con Panoramica come vero control center (non più solo una
// lista) e Conversazioni come inbox con thread completo, non solo una
// tabella. Tutto costruito su dati che esistevano già (richieste_clienti,
// event_log) — nessuna nuova tabella in questa fase. Dove un dato reale non
// esiste ancora (es. date dei vecchi appuntamenti confermati prima del fix
// in api/whatsapp.js), la sezione lo dice esplicitamente invece di
// inventarlo o ometterlo in silenzio.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { etichetteSettore, nomeSettore } from '../lib/settori.js';
import { icon } from '../lib/icons.js';
import { calcolaInsight } from '../lib/insights.js';
import { decidiApprovazione, elencoApprovazioniPending } from '../lib/governance/esegui-approvata.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paginaNonAutenticato() {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="font-family:'Archivo',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FAFAF8;">
    <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;">
      <h2 style="margin-top:0;">Sessione scaduta o non autenticata</h2>
      <p style="color:#6b7280;">Accedi di nuovo con il tuo codice.</p>
      <a href="/api/dashboard-login" style="display:inline-block;background:#0E6E62;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Vai al login</a>
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

function saluto() {
  const ora = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false });
  const h = parseInt(ora, 10);
  if (h < 6) return 'Buonanotte';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
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
      // Decisione su una richiesta di approvazione dell'AI (livello 4).
      if (req.body?.approvazione_id) {
        const esito = await decidiApprovazione(
          { SUPABASE_URL, headers },
          { cliente_id, id: String(req.body.approvazione_id), decisione: req.body.decisione === 'approved' ? 'approved' : 'rejected', decided_by: 'titolare' }
        );
        const msg = esito.ok ? (esito.eseguita === false ? `Approvata ma non eseguita: ${esito.esito}` : esito.esito) : esito.motivo;
        res.writeHead(302, { Location: '/api/dashboard?esito=' + encodeURIComponent(msg || '') });
        return res.end();
      }
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

    // ===== Dati cliente + settore + integrazioni collegate =====
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?id=eq.${encodeURIComponent(cliente_id)}&select=nome_attivita`,
      { headers }
    );
    const clienteData = await clienteRes.json();
    const nomeAttivita = clienteData[0]?.nome_attivita || 'Attività';

    const configRes = await fetch(
      `${SUPABASE_URL}/rest/v1/configurazioni_cliente?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=valore_medio_cliente,settore,orari_apertura,numero_whatsapp,google_calendar_id,telegram_chat_id`,
      { headers }
    );
    const configData = await configRes.json();
    const configCliente = Array.isArray(configData) ? configData[0] : null;
    const valoreMedioCliente = configCliente?.valore_medio_cliente != null ? Number(configCliente.valore_medio_cliente) : null;
    const settore = configCliente?.settore || null;
    const orariApertura = configCliente?.orari_apertura && typeof configCliente.orari_apertura === 'object' ? configCliente.orari_apertura : {};
    const et = etichetteSettore(settore);

    // ===== Richieste del cliente, CON la conversazione completa (per l'inbox) =====
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
    const contaHandoff = lista.filter((r) => r.stato === 'handoff').length;
    const contaAttenzione = contaUrgenti + contaInCorso + contaHandoff;

    const contaLead = lista.filter((r) => {
      const dati = r.dati_raccolti || {};
      return Object.entries(dati).some(([k, v]) => k !== 'urgente' && !k.startsWith('_') && v);
    }).length;
    const contaAppuntamenti = lista.filter((r) => (r.dati_raccolti || {})._fase === 'confermato').length;
    const tassoConversione = contaLead > 0 ? Math.round((contaAppuntamenti / contaLead) * 100) : 0;
    const roiStimato = valoreMedioCliente != null ? contaAppuntamenti * valoreMedioCliente : null;

    // Prossimi appuntamenti reali: solo richieste con _appuntamento_inizio
    // salvato (fix in api/whatsapp.js del 30/9/2026) e nel futuro. Gli
    // appuntamenti confermati PRIMA di quel fix non hanno questo dato e
    // semplicemente non compaiono qui — non vengono inventati.
    const adesso = Date.now();
    const prossimiAppuntamenti = lista
      .map((r) => ({ r, inizio: (r.dati_raccolti || {})._appuntamento_inizio }))
      .filter((x) => x.inizio && new Date(x.inizio).getTime() > adesso)
      .sort((a, b) => new Date(a.inizio) - new Date(b.inizio))
      .slice(0, 5);

    // Messaggi totali ricevuti + follow-up inviati (da event_log)
    let messaggiTotali = 0;
    let followUpInviati = 0;
    try {
      const [msgRes, fuRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/event_log?cliente_id=eq.${encodeURIComponent(cliente_id)}&fase=eq.ricevuto&select=id&limit=1`, { headers: { ...headers, Prefer: 'count=exact' } }),
        fetch(`${SUPABASE_URL}/rest/v1/event_log?cliente_id=eq.${encodeURIComponent(cliente_id)}&fase=eq.follow_up_inviato&stato=eq.ok&select=id&limit=1`, { headers: { ...headers, Prefer: 'count=exact' } }),
      ]);
      const totMsg = msgRes.headers.get('content-range');
      messaggiTotali = totMsg && totMsg.split('/')[1] !== '*' ? parseInt(totMsg.split('/')[1], 10) : 0;
      const totFu = fuRes.headers.get('content-range');
      followUpInviati = totFu && totFu.split('/')[1] !== '*' ? parseInt(totFu.split('/')[1], 10) : 0;
    } catch (e) {
      console.error('Errore conteggio messaggi/follow-up:', e);
    }

    // ===== Azioni dell'AI in attesa di approvazione (migrations/012) =====
    const approvazioni = await elencoApprovazioniPending({ SUPABASE_URL, headers }, cliente_id);
    const esitoDecisione = req.query?.esito ? String(req.query.esito).slice(0, 200) : '';
    const descriviApprovazione = (a) => {
      const p = a.payload || {};
      if (a.action === 'create_calendar_event') return `Creare l'appuntamento del ${new Date(p.inizio).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })} e avvisare il cliente`;
      if (a.action === 'reply') return `Inviare questa risposta: «${String(p.bozza || '').slice(0, 300)}»`;
      return `Azione: ${a.action}`;
    };
    const approvazioniHtml = approvazioni.length > 0
      ? `<div class="alert-attenzione" style="display:block;">
          <div style="font-weight:700;margin-bottom:8px;">${icon('alert', { size: 17 })} L'assistente chiede la tua approvazione (${approvazioni.length})</div>
          ${approvazioni.map((a) => `<div style="padding:8px 0;border-top:1px solid #fde68a;">
            <div style="font-size:13px;">${escapeHtml(descriviApprovazione(a))}</div>
            <div style="font-size:12px;color:#6b7280;margin:2px 0 6px;">Cliente ${escapeHtml(a.payload?.numero_utente || '—')}</div>
            ${a.payload?.ultimo_errore ? `<div style="font-size:12px;color:#b91c1c;margin:0 0 6px;">Ultimo tentativo non riuscito: ${escapeHtml(a.payload.ultimo_errore)}</div>` : ''}
            <form method="POST" action="/api/dashboard" style="display:inline;"><input type="hidden" name="approvazione_id" value="${escapeHtml(a.id)}" /><input type="hidden" name="decisione" value="approved" /><button type="submit" class="btn-stato">Approva ed esegui</button></form>
            <form method="POST" action="/api/dashboard" style="display:inline;"><input type="hidden" name="approvazione_id" value="${escapeHtml(a.id)}" /><input type="hidden" name="decisione" value="rejected" /><button type="submit" class="btn-stato">Rifiuta</button></form>
          </div>`).join('')}
        </div>`
      : '';
    const esitoHtml = esitoDecisione ? `<div class="alert-attenzione ok">${icon('check', { size: 17 })}<span>${escapeHtml(esitoDecisione)}</span></div>` : '';

    const ins = calcolaInsight(lista, { valoreMedio: valoreMedioCliente });
    const insightHtml = ins.conversazioni === 0
      ? ''
      : `<div class="card" style="margin-bottom:20px;">
          <h2>${icon('check', { size: 15 })} Cosa ha fatto l'assistente — ultimi ${ins.giorni} giorni</h2>
          <p class="desc">Calcolato sulle conversazioni reali. Non include stime di ore risparmiate o fatturato oltre al valore medio che hai impostato.</p>
          <div class="analytics-grid">
            <div class="analytics-num-blocco"><div class="analytics-num">${ins.conversazioni}</div><div class="analytics-label">conversazioni</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${ins.appuntamenti_confermati}</div><div class="analytics-label">appuntamenti confermati</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${ins.urgenze}</div><div class="analytics-label">urgenze</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${ins.passate_allo_staff}</div><div class="analytics-label">passate allo staff</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${ins.lead_da_recuperare}</div><div class="analytics-label">lead senza esito da oltre 24 ore</div></div>
            ${ins.valore_appuntamenti != null ? `<div class="analytics-num-blocco"><div class="analytics-num">€${ins.valore_appuntamenti.toLocaleString('it-IT')}</div><div class="analytics-label">valore appuntamenti (stima da valore medio)</div></div>` : ''}
          </div>
          ${ins.per_intent.length ? `<p style="font-size:13px;margin:14px 0 4px;"><strong>Di cosa parlano i clienti:</strong> ${ins.per_intent.map(([i, n]) => `${escapeHtml(i.replace(/_/g, ' '))} (${n})`).join(', ')}</p>` : ''}
          ${ins.motivi_handoff.length ? `<p style="font-size:13px;margin:4px 0;"><strong>Perché passa a una persona:</strong> ${ins.motivi_handoff.map(([m, n]) => `${escapeHtml(m)} (${n})`).join(', ')}</p>` : ''}
          ${ins.domande_non_capite.length ? `<p style="font-size:13px;margin:10px 0 2px;"><strong>Domande che il bot non ha capito</strong> — valuta di aggiungerle alla knowledge base:</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#4b5563;">${ins.domande_non_capite.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul>` : ''}
        </div>`;

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
      urgente: { colore: '#dc2626', bg: '#fef2f2', label: 'Urgente', icona: 'alert' },
      handoff: { colore: '#7c3aed', bg: '#f5f3ff', label: 'Da richiamare', icona: 'alert' },
      completata: { colore: '#16a34a', bg: '#f0fdf4', label: 'Completata', icona: 'check' },
      in_corso: { colore: '#d97706', bg: '#fffbeb', label: 'In corso', icona: 'clock' },
    };

    const formAzione = (num, stato, label) => `
      <form method="POST" action="/api/dashboard" style="display:inline;" onclick="event.stopPropagation();">
        <input type="hidden" name="numero_utente" value="${escapeHtml(num)}" />
        <input type="hidden" name="nuovo_stato" value="${escapeHtml(stato)}" />
        <button type="submit" class="btn-stato">${label}</button>
      </form>`;

    // ===== Inbox conversazioni: riga sintetica + thread completo (accordion) =====
    const righeConversazioni = lista
      .map((r, i) => {
        const dati = r.dati_raccolti || {};
        const campiDati = Object.entries(dati)
          .filter(([k]) => k !== 'urgente' && !k.startsWith('_'))
          .map(([k, v]) => `<span class="campo-inline"><span class="campo-nome">${escapeHtml(k)}</span>${escapeHtml(v)}</span>`)
          .join('');
        const badge = statoBadge[r.stato] || statoBadge.in_corso;
        const data = r.updated_at ? new Date(r.updated_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const thread = Array.isArray(r.conversazione) ? r.conversazione : [];
        const threadHtml = thread.length > 0
          ? thread.map((m) => `<div class="msg-bolla msg-${m.role === 'assistant' ? 'ai' : 'utente'}"><span class="msg-etichetta">${m.role === 'assistant' ? 'Assistente AI' : 'Cliente'}</span>${escapeHtml(m.content)}</div>`).join('')
          : '<div class="sezione-vuota">Nessuno storico messaggi salvato per questa conversazione.</div>';

        return `<div class="conv-riga" data-stato="${escapeHtml(r.stato || 'in_corso')}">
          <div class="conv-sommario" data-toggle="conv-${i}">
            <span class="badge" style="background:${badge.bg};color:${badge.colore}">${icon(badge.icona, { size: 12 })}${badge.label}</span>
            <span class="conv-campi">${campiDati || '<i style="color:#9ca3af">nessun dato raccolto</i>'}</span>
            <a href="tel:${escapeHtml(r.numero_utente)}" class="telefono" onclick="event.stopPropagation();">${escapeHtml(r.numero_utente)}</a>
            <span class="data-col">${data}</span>
            <span class="conv-azioni">${formAzione(r.numero_utente, 'in_corso', 'In corso')}${formAzione(r.numero_utente, 'completata', 'Completata')}</span>
            <span class="conv-freccia">${icon('chevronDown', { size: 15 })}</span>
          </div>
          <div class="conv-thread" id="conv-${i}">${threadHtml}</div>
        </div>`;
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

    const prossimiAppuntamentiHtml = prossimiAppuntamenti.length > 0
      ? `<ul class="lista-appuntamenti">${prossimiAppuntamenti.map(({ r, inizio }) => {
          const dati = r.dati_raccolti || {};
          const nomeCliente = Object.entries(dati).find(([k]) => /nome/i.test(k))?.[1] || r.numero_utente;
          return `<li><strong>${new Date(inizio).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong> — ${escapeHtml(nomeCliente)}</li>`;
        }).join('')}</ul>`
      : `<div class="sezione-vuota">Nessun ${et.evento.toLowerCase()} imminente in programma.</div>`;

    const statoSistema = [
      { nome: 'WhatsApp', attivo: !!configCliente?.numero_whatsapp },
      { nome: 'Google Calendar', attivo: !!configCliente?.google_calendar_id },
      { nome: 'Telegram', attivo: !!configCliente?.telegram_chat_id },
      { nome: 'Assistente AI', attivo: true },
    ].map((s) => `<div class="stato-riga"><span>${s.nome}</span><span class="${s.attivo ? 'stato-on' : 'stato-off'}"><span class="pallino"></span>${s.attivo ? 'Attivo' : 'Non collegato'}</span></div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="60">
  <title>AI Setup Agency — ${escapeHtml(nomeAttivita)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
    .main { flex: 1; min-width: 0; padding: 28px 32px 48px; }
    .main-titolo { font-size: 21px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.015em; display: flex; align-items: center; gap: 9px; }
    .main-sub { color: #6b7280; font-size: 13px; margin: 0 0 24px; }
    .tab-pannello { display: none; }
    .tab-pannello.attivo { display: block; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat-card { background: white; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05); text-align: center; min-width: 110px; flex: 1; transition: box-shadow .15s ease, transform .15s ease; }
    .stat-card:hover { box-shadow: 0 2px 4px rgba(15,23,42,.05), 0 8px 18px rgba(15,23,42,.08); transform: translateY(-1px); }
    .stat-num { font-size: 27px; font-weight: 700; letter-spacing: -.02em; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .griglia-2col { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px; }
    .griglia-sezioni { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { background: white; border: 1px solid #E3E1DB; border-radius: 10px; box-shadow: none; overflow: hidden; padding: 20px 22px; }
    .card h2 { font-size: 14.5px; margin: 0 0 4px; letter-spacing: -.01em; display: flex; align-items: center; gap: 7px; color: #1e293b; }
    .card h2 .icona-ui { color: #138577; }
    .card p.desc { color: #9ca3af; font-size: 12px; margin: 0 0 14px; }
    .alert-attenzione { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .alert-attenzione.ok { background: #f0fdf4; border-color: #bbf7d0; }
    .alert-attenzione a { color: #0E6E62; text-decoration: none; font-size: 13px; font-weight: 600; white-space: nowrap; }
    .analytics-grid { display: flex; gap: 22px; flex-wrap: wrap; }
    .analytics-num-blocco { min-width: 90px; }
    .analytics-num { font-size: 24px; font-weight: 700; color: #15181D; }
    .analytics-label { font-size: 11.5px; color: #6b7280; margin-top: 2px; }
    .lista-appuntamenti { list-style: none; margin: 0; padding: 0; }
    .lista-appuntamenti li { padding: 8px 0; border-bottom: 1px solid #f0f1f3; font-size: 13.5px; }
    .lista-appuntamenti li:last-child { border-bottom: none; }
    .stato-riga { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; }
    .stato-on, .stato-off { display: inline-flex; align-items: center; gap: 6px; }
    .stato-on { color: #16a34a; font-weight: 600; }
    .stato-off { color: #9ca3af; }
    .pallino { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    table { width: 100%; border-collapse: collapse; }
    table.tabella-compatta th { background: none; color: #6b7280; padding: 6px 4px; font-size: 11px; text-align: left; }
    table.tabella-compatta td { padding: 8px 4px; font-size: 13px; border-bottom: 1px solid #f6f7f8; }
    .lista-persone { list-style: none; margin: 0; padding: 0; }
    .lista-persone li { padding: 8px 0; border-bottom: 1px solid #f0f1f3; font-size: 14px; }
    .lista-persone li:last-child { border-bottom: none; }
    .sezione-vuota { color: #9ca3af; font-size: 13px; padding: 8px 0; }
    .sezione-vuota a { color: #0E6E62; text-decoration: none; }
    .griglia-orari-mini { display: flex; flex-direction: column; gap: 4px; }
    .giorno-orario { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px solid #f6f7f8; }
    .giorno-orario:last-child { border-bottom: none; }
    .giorno-nome { font-weight: 600; color: #374151; width: 44px; }
    .giorno-valore { color: #374151; text-align: right; }
    .giorno-orario.chiuso .giorno-valore { color: #9ca3af; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .telefono { color: #0E6E62; text-decoration: none; }
    .telefono:hover { text-decoration: underline; }
    .data-col { color: #6b7280; font-size: 12.5px; white-space: nowrap; }
    .btn-stato { font: inherit; font-size: 11.5px; padding: 4px 9px; border-radius: 7px; border: 1px solid #d1d5db; color: #374151; background: #f9fafb; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
    .btn-stato:hover { background: #eef2ff; border-color: #a5b4fc; color: #0A4F46; }
    .empty { text-align: center; padding: 50px 20px; color: #9ca3af; }
    footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
    /* Inbox conversazioni */
    .conv-filtri { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .conv-filtro { font: inherit; font-size: 12.5px; padding: 6px 14px; border-radius: 20px; border: 1px solid #d1d5db; background: white; color: #374151; cursor: pointer; }
    .conv-filtro.attivo { background: #15181D; color: white; border-color: #15181D; }
    .conv-riga { border-bottom: 1px solid #f0f1f3; }
    .conv-riga:last-child { border-bottom: none; }
    .conv-sommario { display: flex; align-items: center; gap: 14px; padding: 14px 4px; cursor: pointer; flex-wrap: wrap; }
    .conv-sommario:hover { background: #fafafa; }
    .conv-campi { flex: 1; min-width: 160px; font-size: 13px; color: #374151; }
    .campo-inline { margin-right: 12px; }
    .campo-nome { color: #6b7280; margin-right: 4px; }
    .campo-nome::after { content: ':'; }
    .conv-azioni form { display: inline-block; margin-right: 6px; }
    .conv-freccia { color: #9ca3af; transition: transform .15s; }
    .conv-riga.aperta .conv-freccia { transform: rotate(180deg); }
    .conv-thread { display: none; padding: 4px 4px 18px 4px; }
    .conv-riga.aperta .conv-thread { display: block; }
    .msg-bolla { max-width: 70%; padding: 8px 12px; border-radius: 10px; margin-bottom: 8px; font-size: 13.5px; line-height: 1.4; }
    .msg-etichetta { display: block; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; margin-bottom: 3px; opacity: .65; }
    .msg-utente { background: #F0EEE8; color: #15181D; margin-right: auto; }
    .msg-ai { background: #eef2ff; color: #312e81; margin-left: auto; text-align: right; }
    @media (max-width: 860px) {
      .app-shell { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: static; }
      .griglia-2col { grid-template-columns: 1fr; }
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
          <div class="settore">${escapeHtml(nomeAttivita)} · ${escapeHtml(nomeSettore(settore))}</div>
        </div>
      </div>

      <div class="sidebar-group">
        <a href="#panoramica" class="sidebar-link tab-link attivo" data-tab="panoramica">${icon('home')} Panoramica</a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Operatività</div>
        <a href="#conversazioni" class="sidebar-link tab-link" data-tab="conversazioni">${icon('chat')} Conversazioni <span class="conteggio">${contaTotali}</span></a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Attività</div>
        <a href="#attivita" class="sidebar-link tab-link" data-tab="attivita">${icon('folder')} Servizi, personale e orari</a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Assistente AI</div>
        <a href="/api/knowledge" class="sidebar-link">${icon('book')} Knowledge Base</a>
        <a href="/api/info-cliente#follow-up" class="sidebar-link">${icon('repeat')} Follow-up</a>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group-titolo">Impostazioni</div>
        <a href="/api/info-cliente" class="sidebar-link">${icon('sliders')} Attività &amp; account</a>
      </div>
    </div>

    <div class="main">
      <div class="tab-pannello attivo" data-pannello="panoramica">
        ${esitoHtml}${approvazioniHtml}${insightHtml}
        <div class="main-titolo">${saluto()}, ${escapeHtml(nomeAttivita)}</div>
        <p class="main-sub">La tua attività, sempre sotto controllo.</p>

        ${contaAttenzione > 0
          ? `<div class="alert-attenzione">${icon('alert', { size: 17 })}<span><strong>${contaAttenzione}</strong> conversazione${contaAttenzione === 1 ? '' : 'i'} richiedono attenzione (urgenti o in corso).</span><a href="#conversazioni" class="tab-link" data-tab="conversazioni">Vai alle conversazioni &rarr;</a></div>`
          : `<div class="alert-attenzione ok">${icon('check', { size: 17 })}<span>Nessuna conversazione in sospeso al momento.</span></div>`}

        <div class="stats">
          <div class="stat-card"><div class="stat-num">${contaAppuntamenti}</div><div class="stat-label">${escapeHtml(et.eventoPlurale)} confermati</div></div>
          <div class="stat-card"><div class="stat-num">${contaLead}</div><div class="stat-label">Nuovi lead</div></div>
          <div class="stat-card"><div class="stat-num">${contaTotali}</div><div class="stat-label">Conversazioni totali</div></div>
          <div class="stat-card"><div class="stat-num">${contaTotali}</div><div class="stat-label">Gestite dall'AI</div></div>
        </div>

        <div class="griglia-2col">
          <div class="card">
            <h2>${icon('calendar')} Prossimi ${et.eventoPlurale.toLowerCase()}</h2>
            <p class="desc">Solo appuntamenti confermati dopo l'attivazione di questo tracciamento.</p>
            ${prossimiAppuntamentiHtml}
          </div>
          <div class="card">
            <h2>${icon('activity')} Stato sistema</h2>
            <p class="desc">Integrazioni collegate a questa attività.</p>
            ${statoSistema}
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h2>${icon('wallet')} Finanziario &amp; performance AI</h2>
          <p class="desc">Dati reali dalle conversazioni WhatsApp — nessuna stima non richiesta.</p>
          <div class="analytics-grid">
            <div class="analytics-num-blocco"><div class="analytics-num">${messaggiTotali}</div><div class="analytics-label">Messaggi ricevuti</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${contaAppuntamenti}</div><div class="analytics-label">${escapeHtml(et.eventoPlurale)} generati</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${contaUrgenti}</div><div class="analytics-label">Escalation (urgenti)</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${followUpInviati}</div><div class="analytics-label">Follow-up inviati</div></div>
            <div class="analytics-num-blocco"><div class="analytics-num">${tassoConversione}%</div><div class="analytics-label">Conversione lead&rarr;${et.evento.toLowerCase()}</div></div>
            ${roiStimato != null ? `<div class="analytics-num-blocco"><div class="analytics-num" style="color:#16a34a">€${roiStimato.toLocaleString('it-IT')}</div><div class="analytics-label">Valore stimato generato*</div></div>` : ''}
          </div>
          ${roiStimato != null
            ? `<p class="desc" style="margin-top:12px;margin-bottom:0;">*Stima basata sul valore medio che hai indicato (€${valoreMedioCliente.toLocaleString('it-IT')} per ${et.evento.toLowerCase()}) — non è fatturato garantito.</p>`
            : `<p class="desc" style="margin-top:12px;margin-bottom:0;">Vuoi vedere anche una stima del valore generato? <a href="/api/info-cliente" style="color:#0E6E62;">Imposta il valore medio</a>.</p>`}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="conversazioni">
        <div class="main-titolo">${icon('chat', { size: 20 })} Conversazioni</div>
        <p class="main-sub">Ogni riga è una conversazione WhatsApp — clicca per leggere lo storico completo con l'AI.</p>
        <div class="card">
          <div class="conv-filtri">
            <button class="conv-filtro attivo" data-filtro="tutte">Tutte (${contaTotali})</button>
            <button class="conv-filtro" data-filtro="urgente">Urgenti (${contaUrgenti})</button>
            ${contaHandoff > 0 ? `<button class="conv-filtro" data-filtro="handoff">Da richiamare (${contaHandoff})</button>` : ''}
            <button class="conv-filtro" data-filtro="in_corso">In corso (${contaInCorso})</button>
            <button class="conv-filtro" data-filtro="completata">Completate (${contaCompletate})</button>
          </div>
          ${lista.length > 0 ? `<div id="lista-conversazioni">${righeConversazioni}</div>` : `<div class="empty">Nessuna conversazione ancora ricevuta.</div>`}
        </div>
      </div>

      <div class="tab-pannello" data-pannello="attivita">
        <div class="main-titolo">${icon('folder', { size: 20 })} Servizi, personale e orari</div>
        <p class="main-sub">Questi dati alimentano anche le risposte del bot ai clienti. <a href="/api/info-cliente" style="color:#0E6E62;text-decoration:none;">Modifica tutto &rarr;</a></p>
        <div class="griglia-sezioni">
          <div class="card">
            <h2>${icon('list')} Servizi offerti</h2>
            <p class="desc">Il tuo listino.</p>
            ${serviziHtml}
          </div>
          <div class="card">
            <h2>${icon('users')} Personale</h2>
            <p class="desc">Il tuo staff.</p>
            ${personaleHtml}
          </div>
          <div class="card">
            <h2>${icon('clock')} Orari di apertura</h2>
            <p class="desc">Usati anche dal bot WhatsApp.</p>
            <div class="griglia-orari-mini">${orariHtml}</div>
          </div>
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

      // Accordion inbox conversazioni
      document.querySelectorAll('[data-toggle]').forEach(function (sommario) {
        sommario.addEventListener('click', function () {
          var riga = sommario.closest('.conv-riga');
          riga.classList.toggle('aperta');
        });
      });

      // Filtri inbox
      document.querySelectorAll('.conv-filtro').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.conv-filtro').forEach(function (b) { b.classList.remove('attivo'); });
          btn.classList.add('attivo');
          var f = btn.getAttribute('data-filtro');
          document.querySelectorAll('.conv-riga').forEach(function (riga) {
            riga.style.display = (f === 'tutte' || riga.getAttribute('data-stato') === f) ? '' : 'none';
          });
        });
      });
    })();
  </script>
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
