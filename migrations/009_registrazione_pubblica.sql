-- migrations/009_registrazione_pubblica.sql
--
-- Supporta la registrazione pubblica (api/registrati.js): qualunque
-- attività può creare il proprio account scegliendo il settore, invece di
-- dover essere creata a mano dall'agenzia su Supabase e ricevere un link
-- con token (flusso che resta comunque valido e supportato, per i client
-- già provisionati così — vedi api/dashboard-login.js, che accetta
-- ENTRAMBI i metodi di accesso).
--
-- Login con email+password: l'email vive già in clienti.email_contatto,
-- qui aggiungiamo solo l'hash della password (mai la password in chiaro
-- — vedi lib/password.js, scrypt con salt casuale per hash).
--
-- Un indice UNIQUE case-insensitive su email_contatto impedisce due
-- account con la stessa email; è parziale (where email_contatto is not
-- null) perché i client storici creati dall'agenzia potrebbero non avere
-- un'email salvata.

alter table clienti add column if not exists password_hash text;

create unique index if not exists clienti_email_contatto_unique_idx
  on clienti (lower(email_contatto))
  where email_contatto is not null;

comment on column clienti.password_hash is 'Hash scrypt (lib/password.js) della password di accesso, impostata in fase di registrazione pubblica. NULL per i client storici che accedono ancora solo con dashboard_token.';
