-- 006_follow_up.sql
--
-- Follow-up automatici per lead non convertiti (stato = 'in_corso', cioè
-- una conversazione WhatsApp iniziata ma mai completata né sfociata in
-- urgenza). Configurabile per cliente, con opt-in esplicito: senza
-- follow_up_attivo = true, nessun messaggio automatico viene mai inviato.
--
-- Il conteggio dei follow-up già inviati per una specifica richiesta vive
-- in richieste_clienti.dati_raccolti (chiavi _follow_up_count e
-- _ultimo_follow_up_il), seguendo la stessa convenzione già usata nel
-- progetto per lo stato interno (_sids, _fase, _slotOptions in api/whatsapp.js)
-- — nessuna nuova colonna su richieste_clienti, coerente con l'esistente.

alter table configurazioni_cliente
  add column if not exists follow_up_attivo boolean not null default false,
  add column if not exists follow_up_dopo_ore integer not null default 24,
  add column if not exists follow_up_max_messaggi integer not null default 2,
  add column if not exists follow_up_orario_da time not null default '09:00',
  add column if not exists follow_up_orario_a time not null default '19:00',
  add column if not exists follow_up_messaggio text;

comment on column configurazioni_cliente.follow_up_attivo is 'Opt-in esplicito: se false (default), nessun follow-up automatico viene mai inviato per questo cliente.';
comment on column configurazioni_cliente.follow_up_dopo_ore is 'Ore di silenzio del cliente prima di inviare un follow-up (e tra un follow-up e il successivo).';
comment on column configurazioni_cliente.follow_up_max_messaggi is 'Numero massimo di follow-up automatici per una singola conversazione non completata.';
comment on column configurazioni_cliente.follow_up_orario_da is 'Il cron (api/cron/follow-up.js) invia messaggi solo dentro questa fascia oraria (fuso Europe/Rome).';
comment on column configurazioni_cliente.follow_up_orario_a is 'Vedi follow_up_orario_da.';
comment on column configurazioni_cliente.follow_up_messaggio is 'Testo del follow-up. Se vuoto/null, si usa un messaggio generico predefinito.';
