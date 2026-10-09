-- Le tabelle documents, knowledge_chunks ed event_log sono state create in
-- una migrazione precedente senza i GRANT di base per service_role (a
-- differenza di clienti/richieste_clienti/configurazioni_cliente, che li
-- hanno). Risultato: ogni richiesta REST del backend (che usa sempre la
-- chiave service_role) veniva rifiutata con 403 "permission denied",
-- indipendentemente da RLS. Questo allinea i permessi allo stesso schema
-- già in uso per le altre tabelle applicative.
grant select, insert, update, delete on public.documents to service_role;
grant select, insert, update, delete on public.knowledge_chunks to service_role;
grant select, insert, update, delete on public.event_log to service_role;