// api/knowledge.js
//
// Pagina protetta (stessa sessione di api/dashboard.js) per gestire la
// Knowledge Base del cliente: incollare testo (listino, FAQ, regolamento,
// procedure...), che viene spezzato in chunk (lib/chunking.js), trasformato
// in embedding (lib/embeddings.js, Voyage AI) e salvato in knowledge_chunks.
// api/whatsapp.js userà questi chunk per rispondere con informazioni
// pertinenti invece di improvvisare o limitarsi al solo info_generali.
//
// v1 volutamente semplice: incolla-testo, non upload di file PDF — evita di
// introdurre una libreria di parsing PDF lato server prima di validare che
// il resto della pipeline (chunking + embedding + retrieval) funzioni bene.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { spezzaInChunk } from '../lib/chunking.js';
import { embedDocumenti } from '../lib/embeddings.js';
import { icon } from '../lib/icons.js';

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
      <a href="/api/dashboard-login" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Vai al login</a>
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

  const cookieToken = leggiCookieSessione(req);
  const sessione = verificaSessione(cookieToken, SESSION_SECRET);
  if (!sessione || !sessione.cliente_id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(401).send(paginaNonAutenticato());
  }
  const cliente_id = sessione.cliente_id;

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // ===== POST: nuovo documento, oppure eliminazione =====
    if (req.method === 'POST') {
      const { azione, titolo, contenuto, document_id } = req.body || {};

      if (azione === 'elimina' && document_id) {
        // ON DELETE CASCADE su knowledge_chunks si occupa dei chunk collegati.
        await fetch(
          `${SUPABASE_URL}/rest/v1/documents?id=eq.${encodeURIComponent(document_id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}`,
          { method: 'DELETE', headers }
        );
        res.writeHead(302, { Location: '/api/knowledge' });
        return res.end();
      }

      if (!titolo || !contenuto || !String(contenuto).trim()) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send('<h2>Titolo e contenuto sono obbligatori</h2>');
      }

      // 1. Crea il documento
      const docRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ cliente_id, titolo, contenuto }),
      });
      const docData = await docRes.json();
      const documento = Array.isArray(docData) ? docData[0] : null;
      if (!documento) {
        console.error('Errore creazione documento:', JSON.stringify(docData));
        res.setHeader('Content-Type', 'text/html');
        return res.status(500).send('<h2>Errore nel salvataggio del documento</h2>');
      }

      // 2. Chunking + embedding (best-effort: se l'embedding fallisce, il
      // documento resta comunque salvato — meglio un documento senza
      // retrieval che nessun documento).
      try {
        const chunk = spezzaInChunk(contenuto);
        const embeddings = await embedDocumenti(chunk);
        const righeChunk = chunk.map((testo, i) => ({
          document_id: documento.id,
          cliente_id,
          chunk_index: i,
          contenuto: testo,
          embedding: embeddings[i],
        }));
        if (righeChunk.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/knowledge_chunks`, {
            method: 'POST',
            headers,
            body: JSON.stringify(righeChunk),
          });
        }
      } catch (e) {
        console.error('Errore generazione embedding per documento', documento.id, ':', e);
      }

      res.writeHead(302, { Location: '/api/knowledge' });
      return res.end();
    }

    if (req.method !== 'GET') {
      return res.status(405).send('Metodo non permesso');
    }

    // ===== GET: lista documenti + form di caricamento =====
    const docsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=id,titolo,creato_il&order=creato_il.desc`,
      { headers }
    );
    const documenti = await docsRes.json();
    const lista = Array.isArray(documenti) ? documenti : [];

    const righe = lista
      .map((d) => {
        const data = d.creato_il ? new Date(d.creato_il).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `<tr>
          <td>${escapeHtml(d.titolo)}</td>
          <td class="data-col">${data}</td>
          <td class="azioni">
            <form method="POST" action="/api/knowledge" onsubmit="return confirm('Eliminare questo documento?');" style="display:inline;">
              <input type="hidden" name="azione" value="elimina" />
              <input type="hidden" name="document_id" value="${escapeHtml(d.id)}" />
              <button type="submit" class="btn-elimina">Elimina</button>
            </form>
          </td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Setup Agency — Knowledge Base</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 20px;
      background: radial-gradient(1100px 500px at 15% -10%, #eef0fb 0%, #f4f5f9 45%, #f4f5f9 100%);
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    h1 { font-size: 22px; margin-bottom: 4px; letter-spacing: -.015em; display: flex; align-items: center; gap: 8px; }
    h1 .icona-ui { color: #6366f1; flex-shrink: 0; }
    .sottotitolo { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06);
      padding: 20px;
      margin-bottom: 20px;
    }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
    input[type=text], textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font: inherit;
      margin-bottom: 16px;
    }
    textarea { min-height: 220px; resize: vertical; }
    button.btn-principale {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font: inherit;
      cursor: pointer;
    }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px; border-bottom: 1px solid #f0f1f3; font-size: 14px; }
    .data-col { color: #6b7280; font-size: 13px; white-space: nowrap; }
    .btn-elimina { font: inherit; font-size: 12px; padding: 5px 10px; border-radius: 6px; border: 1px solid #fca5a5; color: #dc2626; background: #fef2f2; cursor: pointer; }
    .empty { color: #9ca3af; padding: 12px 0; }
    a.torna { color: #4f46e5; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <a class="torna" href="/api/dashboard">&larr; Torna alla dashboard</a>
  <h1>${icon('book', { size: 21 })} Knowledge Base</h1>
  <div class="sottotitolo">Il testo caricato qui viene usato dall'assistente WhatsApp per rispondere con precisione (listino, FAQ, regolamento, procedure...).</div>

  <div class="card">
    <form method="POST" action="/api/knowledge">
      <label for="titolo">Titolo del documento</label>
      <input type="text" id="titolo" name="titolo" placeholder="Es. Listino prezzi 2026" required />
      <label for="contenuto">Contenuto</label>
      <textarea id="contenuto" name="contenuto" placeholder="Incolla qui il testo (listino, FAQ, orari, procedure...)" required></textarea>
      <button type="submit" class="btn-principale">Carica documento</button>
    </form>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0;">Documenti caricati</h2>
    ${lista.length > 0 ? `<table>
      <tr><th>Titolo</th><th>Caricato il</th><th></th></tr>
      ${righe}
    </table>` : '<div class="empty">Nessun documento caricato ancora.</div>'}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Knowledge base error:', err);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send('<h2>Errore nella gestione della knowledge base</h2>');
  }
}
