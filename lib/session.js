// lib/session.js
//
// Sessione firmata HMAC, senza dipendenze esterne (no JWT library — non
// serve, il caso d'uso è semplice: un payload piccolo, firmato, con
// scadenza). Il valore del cookie NON contiene mai il secret originale:
// contiene un payload (es. { cliente_id, exp }) + una firma che ne
// garantisce integrità e provenienza. Un tentativo di modificare il
// payload (es. cambiare cliente_id) invalida la firma e la sessione
// viene rifiutata.
//
// Formato token: base64url(JSON payload) + "." + HMAC-SHA256 (base64url)
//
// Usato da: api/dashboard.js, api/dashboard-login.js, api/info-cliente.js

import crypto from 'crypto';

export function firmaSessione(payload, secret, ttlSecondi = 60 * 60 * 24) {
  const corpo = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSecondi };
  const json = Buffer.from(JSON.stringify(corpo)).toString('base64url');
  const firma = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return `${json}.${firma}`;
}

export function verificaSessione(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const punto = token.indexOf('.');
  if (punto === -1) return null;

  const json = token.slice(0, punto);
  const firmaRicevuta = token.slice(punto + 1);
  const firmaAttesa = crypto.createHmac('sha256', secret).update(json).digest('base64url');

  try {
    const a = Buffer.from(firmaAttesa);
    const b = Buffer.from(firmaRicevuta);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) {
    return null;
  }
  return payload;
}

export function leggiCookieSessione(req) {
  const raw = req.headers?.cookie || '';
  const match = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith('agency_session='));
  if (!match) return null;
  return decodeURIComponent(match.slice('agency_session='.length));
}

export function impostaCookieSessione(res, token, { secure = true, maxAgeSecondi = 60 * 60 * 24 } = {}) {
  const parti = [
    `agency_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSecondi}`,
    'SameSite=Lax',
  ];
  if (secure) parti.push('Secure');
  res.setHeader('Set-Cookie', parti.join('; '));
}

export function cancellaCookieSessione(res, { secure = true } = {}) {
  const parti = ['agency_session=', 'HttpOnly', 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (secure) parti.push('Secure');
  res.setHeader('Set-Cookie', parti.join('; '));
}
