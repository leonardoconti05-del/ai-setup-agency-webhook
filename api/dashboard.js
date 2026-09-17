function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const { cliente_id, password } = req.query;

  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
  if (!DASHBOARD_PASSWORD || password !== DASHBOARD_PASSWORD) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(401).send('<h2>Accesso non autorizzato</h2><p>Password mancante o errata.</p>');
  }

  if (!cliente_id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send('<h2>Parametro cliente_id mancante</h2>');
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  try {
    // Info cliente
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clienti?id=eq.${encodeURIComponent(cliente_id)}&select=nome_attivita`,
      { headers }
    );
    const clienteData = await clienteRes.json();
    const nomeAttivita = clienteData[0]?.nome_attivita || 'Attività';

    // Richieste del cliente, più recenti prima
    const richiesteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/richieste_clienti?cliente_id=eq.${encodeURIComponent(cliente_id)}&select=*&order=updated_at.desc`,
      { headers }
    );
    const richieste = await richiesteRes.json();

    const righe = (Array.isArray(richieste) ? richieste : [])
      .map((r) => {
        const dati = r.dati_raccolti || {};
        const campiDati = Object.entries(dati)
          .filter(([k]) => k !== 'urgente')
          .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
          .join('<br>');
        const statoColore = r.stato === 'urgente' ? '#fee2e2' : r.stato === 'completata' ? '#dcfce7' : '#fef9c3';
        const statoTesto = r.stato === 'urgente' ? '🚨 Urgente' : r.stato === 'completata' ? '✅ Completata' : '⏳ In corso';
        const data = r.updated_at ? new Date(r.updated_at).toLocaleString('it-IT') : '';

        return `<tr style="background:${statoColore}">
          <td style="padding:10px;border:1px solid #ddd">${statoTesto}</td>
          <td style="padding:10px;border:1px solid #ddd">${campiDati || '<i>nessun dato</i>'}</td>
          <td style="padding:10px;border:1px solid #ddd">${escapeHtml(r.numero_utente)}</td>
          <td style="padding:10px;border:1px solid #ddd">${data}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard — ${escapeHtml(nomeAttivita)}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 30px auto; padding: 0 15px; background: #f9fafb; }
    h1 { color: #1f2937; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #1f2937; color: white; padding: 10px; text-align: left; }
    .empty { text-align: center; padding: 40px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>📋 Richieste — ${escapeHtml(nomeAttivita)}</h1>
  <table>
    <tr><th>Stato</th><th>Dati raccolti</th><th>Telefono</th><th>Ultimo aggiornamento</th></tr>
    ${righe || '<tr><td colspan="4" class="empty">Nessuna richiesta ancora ricevuta.</td></tr>'}
  </table>
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
