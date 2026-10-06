# Conservazione dei dati

Cron giornaliero `/api/cron/retention` (03:30 UTC), protetto da `CRON_SECRET`. Il risultato (righe eliminate per tabella) è nei log di Vercel.

| Dato | Scadenza predefinita | Variabile Vercel (opzionale) |
|---|---|---|
| `event_log` (log tecnici, contengono il numero di telefono) | 90 giorni (min. 7) | `RETENTION_LOG_GIORNI` |
| `approval_requests` già decise (mai quelle in attesa) | 180 giorni (min. 30) | `RETENTION_APPROVAZIONI_GIORNI` |
| `lacune_conoscenza` risolte | 90 giorni (min. 7) | `RETENTION_LACUNE_GIORNI` |
| `richieste_clienti` (nome e conversazioni dei clienti finali) | **mai, finché non scegli** | `RETENTION_RICHIESTE_GIORNI` (min. 30) |
| `ai_action_ledger` | mai (append-only, senza testi dei clienti) | — |

`richieste_clienti`: il periodo giusto dipende dall'informativa privacy e dal tipo di attività: va deciso con un consulente (GDPR). Impostando la variabile, le richieste ferme da più di N giorni vengono cancellate per intero (anche i dati degli appuntamenti sul database; il Google Calendar non viene toccato).

Cancellazione a richiesta di un singolo cliente finale (diritto all'oblio): al momento è manuale (`delete from richieste_clienti where cliente_id=... and numero_utente=...`).
