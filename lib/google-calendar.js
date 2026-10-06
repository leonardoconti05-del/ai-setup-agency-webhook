// lib/google-calendar.js
// Autenticazione service account + creazione evento, condivisi da api/whatsapp.js
// e dall'esecuzione delle azioni approvate (lib/governance/esegui-approvata.js).
import crypto from 'crypto';

// ===== GOOGLE CALENDAR: autenticazione =====
function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function getGoogleAccessToken() {
  const keyJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: keyJson.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(keyJson.private_key));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token Google non ottenuto: ' + JSON.stringify(data));
  return data.access_token;
}

// ===== GOOGLE CALENDAR: crea evento =====
export async function creaEvento(calendarId, slot, riepilogoDati, nomeAttivita) {
  const accessToken = await getGoogleAccessToken();
  const titolo = riepilogoDati.nome_paziente || riepilogoDati.nome_cliente || riepilogoDati.nome || 'Cliente';
  const event = {
    summary: `${nomeAttivita} — ${titolo}`,
    description: Object.entries(riepilogoDati)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
    start: { dateTime: slot.inizio.toISOString(), timeZone: 'Europe/Rome' },
    end: { dateTime: slot.fine.toISOString(), timeZone: 'Europe/Rome' },
  };
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(event),
  });
  return res.json();
}

