// lib/password.js
//
// Hashing password con scrypt (modulo nativo Node 'crypto', nessuna
// dipendenza esterna da aggiungere tipo bcrypt). Ogni password ha un salt
// casuale proprio, quindi due utenti con la stessa password hanno hash
// diversi — e il confronto in fase di verifica usa timingSafeEqual per
// evitare timing attack.
//
// Formato salvato: "<salt-hex>:<hash-hex>"

import crypto from 'crypto';

const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verificaPassword(password, hashSalvato) {
  if (!password || !hashSalvato || typeof hashSalvato !== 'string' || !hashSalvato.includes(':')) {
    return false;
  }
  const [salt, hashAtteso] = hashSalvato.split(':');
  try {
    const hashCalcolato = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
    const a = Buffer.from(hashCalcolato, 'hex');
    const b = Buffer.from(hashAtteso, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
