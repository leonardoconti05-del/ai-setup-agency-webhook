function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sendTwiml(res, message) {
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  );
}

async function notificaStaff(chatId, fields, telefono, nomeAttivita, urgente = false) {
  try {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_TOKEN || !chatId) return;

    const prefix = urgente ? '🚨 URGENTE' : '📋 Nuova richiesta';
    const testo = `${prefix} — ${nomeAttivita}\nNome: ${fields.nome || '?'}\nMotivo: ${fields.motivo || '?'}\nTel: ${telefono}\nDisponibilità: ${fields.disponibilita || '?'}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: testo }),
    });
  } catch (e) {
    console.error('Errore notifica Telegram:', e);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Metodo non permesso');
  }

  // Twilio manda: Body (testo del messaggio), From (mittente), To (numero che ha ricevuto -> identifica il cliente)
  const body = req.body || {};
  const messaggio = body.Body;
  const fromRaw = body.From || '';
  const toRaw = body.To || '';
  const telefono = fromRaw.replace('whatsapp:', '');

  if (!messaggio || !telefono) {
    return sendTwiml(res, 'Messaggio non ricevuto correttamente. Riprova tra poco.');
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 0. Trova QUALE cliente/business corrisponde al numero WhatsApp che ha ricevuto il messaggio
    const clienteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/agency_clienti?numero_whatsapp=eq.${encodeURIComponent(toRaw)}&attivo=eq.true&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const clienteData = await clienteRes.json();
    const cliente = Array.isArray(clienteData) ? clienteData[0] : null;

    if (!cliente) {
      console.error('Nessun cliente configurato per il numero:', toRaw);
      return sendTwiml(res, 'Servizio momentaneamente non disponibile. Riprova più tardi.');
    }

    const cliente_id = cliente.cliente_id;

    // 1. Recupera lo storico della conversazione con questo numero (se esiste), per QUESTO cliente
    let history = [];
    try {
      const convRes = await fetch(
        `${SUPABASE_URL}/rest/v1/whatsapp_conversations?telefono=eq.${encodeURIComponent(telefono)}&cliente_id=eq.${encodeURIComponent(cliente_id)}&select=storico`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const convData = await convRes.json();
      if (Array.isArray(convData) && convData[0]?.storico) {
        history = convData[0].storico;
      }
    } catch (e) {
      console.error('Errore lettura storico:', e);
    }

    history.push({ role: 'user', content: messaggio });

    // 2. Chiede a Claude la risposta, usando il prompt SPECIFICO di questo cliente (dal database)
    const chatResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: cliente.system_prompt,
        messages: history,
      }),
    });
    const chatData = await chatResponse.json();

    if (!chatData.content) {
      console.error('Anthropic chat error:', JSON.stringify(chatData));
      return sendTwiml(res, 'Al momento non riesco a risponderle, la contatteremo noi appena possibile.');
    }

    const reply = chatData.content.find((b) => b.type === 'text')?.text || 'Mi scusi, può ripetere?';
    history.push({ role: 'assistant', content: reply });

    // 3. Estrae i dati, usando il prompt di estrazione SPECIFICO di questo cliente (dal database)
    let fields = {};
    try {
      const extractResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 300,
          system: cliente.extraction_prompt,
          messages: [{ role: 'user', content: JSON.stringify(history) }],
        }),
      });
      const extractData = await extractResponse.json();
      const rawJson = extractData.content?.find((b) => b.type === 'text')?.text || '{}';
      fields = JSON.parse(rawJson.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error('Errore estrazione campi:', e);
    }

    // 3bis. Notifica lo staff DI QUESTO cliente su Telegram (gruppo specifico, letto dal database)
    if (fields.nome || fields.motivo) {
      await notificaStaff(cliente.telegram_chat_id, fields, telefono, cliente.nome_attivita, fields.urgenza === 'alta');
    }

    // 4. Salva/aggiorna lo storico della conversazione
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        telefono,
        cliente_id,
        storico: history,
        updated_at: new Date().toISOString(),
      }),
    });

    // 5. Salva la richiesta raccolta (dati del cliente/paziente)
    await fetch(`${SUPABASE_URL}/rest/v1/richieste_pazienti`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        cliente_id,
        nome: fields.nome,
        motivo: fields.motivo,
        urgenza: fields.urgenza,
        disponibilita: fields.disponibilita,
        tipo_paziente: fields.tipo_cliente,
        telefono,
      }),
    });

    // 6. Risponde al cliente su WhatsApp (formato che Twilio si aspetta)
    return sendTwiml(res, reply);
  } catch (err) {
    console.error('Handler crash:', err);
    return sendTwiml(res, 'Abbiamo riscontrato un problema tecnico, la contatteremo noi a breve.');
  }
}
