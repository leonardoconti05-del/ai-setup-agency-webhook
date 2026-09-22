// lib/twilio-signature.js
//
// Verifica che una richiesta arrivi davvero da Twilio, secondo l'algoritmo
// ufficiale (https://www.twilio.com/docs/usage/security#validating-requests):
// concatena l'URL completo con chiave+valore di ogni parametro POST ordinato
// alfabeticamente, calcola HMAC-SHA1 con l'Auth Token, confronta in modo
// timing-safe con l'header X-Twilio-Signature.
//
// Estratta come modulo indipendente (nessuna chiamata di rete, nessun
// accesso a variabili d'ambiente al suo interno) per poter essere testata
// in isolamento — vedi tests/twilio-signature.test.js.

import crypto from 'crypto';

export function validaFirmaTwilio(authToken, firmaRicevuta, urlCompleto, parametri) {
  if (!authToken || !firmaRicevuta || !urlCompleto) return false;

  const chiaviOrdinate = Object.keys(parametri || {}).sort();
  let dati = urlCompleto;
  for (const chiave of chiaviOrdinate) {
    dati += chiave + parametri[chiave];
  }

  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(Buffer.from(dati, 'utf-8'));
  const firmaAttesa = hmac.digest('base64');

  try {
    const a = Buffer.from(firmaAttesa);
    const b = Buffer.from(firmaRicevuta);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
