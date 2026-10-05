-- Promozione a PRODUZIONE: attiva il motore per i clienti del settore "elettricista".
-- Il database la rifiuta se non esiste una valutazione con gate superato.
-- ROLLBACK immediato: update sector_profiles set status = 'archived' where settore = 'elettricista' and version = 1;
-- (senza pack in produzione il webhook torna da solo al percorso precedente entro 60 secondi)
update sector_profiles set status = 'production' where settore = 'elettricista' and version = 1;
update sector_faq set status = 'production' where settore = 'elettricista' and version = 1;
