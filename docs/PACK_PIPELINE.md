# Pipeline dei Sector Pack (GitHub → import → TEST → valutazione → ACTIVE → runtime)

Codice: `lib/admin/pack-pipeline.js` (logica) e `lib/admin/pack-http.js` (indirizzo `/api/admin-pack`, ospitato dalla funzione `api/cron/retention.js` perché il piano Vercel gratuito ammette 12 funzioni e sono già tutte usate). Audit: `migrations/016_sector_pack_audit.sql`.

## Stati (nessuna colonna nuova: si riusa `sector_profiles.status`)
| Stato | Valore nel database | Servito ai clienti? |
|---|---|---|
| DRAFT | `draft` | no |
| TEST | `test` | no |
| ACTIVE | `production` | **sì** (il runtime legge solo `production`) |
| SUSPENDED | `archived` | no |

## Regole
- L'import crea/aggiorna solo profili in draft/test, mai direttamente ACTIVE. Un profilo già ACTIVE/SUSPENDED non viene toccato dall'import ("saltato").
- Import idempotente: stesso contenuto = "invariato" (nessun duplicato); contenuto cambiato = aggiornamento di profilo, FAQ, scenari e nuova valutazione.
- Prima di scrivere: settore valido, pack valido (`validaPack`), intent/FAQ/scenari/holdout presenti, versione intera ≥ 1, codici scenario univoci (set principale + holdout), primo giro dell'holdout registrato (`lib/engine/packs/primo-giro-holdout.js`) e coerente col numero di scenari.
- Promozione TEST → ACTIVE (una per settore, esplicita): ricontrolla il pack **che sta nel database** (stesso contenuto del codice, validazione, compatibilità col caricamento runtime, gate di valutazione sul pack del db, ultima valutazione registrata con gate superato). Il trigger del database rifiuta comunque la promozione senza gate superato. Gate fallito = resta TEST.
- Il dato di generalizzazione ufficiale è il **primo giro dell'holdout**. Il risultato dopo le correzioni non è una prova e non compare nei metadata.
- Ogni import, verifica, promozione, sospensione e tentativo di accesso fallito è una riga append-only in `sector_pack_audit` (settore, versione, stati prima/dopo, conteggi, gate, primo giro, commit SHA, hash del contenuto, errore, timestamp). Il token non viene mai scritto.

## Uso (dopo aver applicato la migrazione 016 e fatto il merge)
1. Vercel → Settings → Environment Variables: aggiungi `PACK_ADMIN_TOKEN` (stringa casuale di almeno 32 caratteri), poi Redeploy.
2. Apri `/api/admin-pack` sul dominio del progetto: modulo con campo token (il token viaggia solo nel corpo della richiesta).
3. «Importa tutti in TEST», poi «Verifica stato»: atteso `29 settori attesi / 29 trovati / 29 validati / 29 in TEST (+ ACTIVE) / 29 metadata coerenti / 0 duplicati`.
4. «Compatibilità runtime» per settore; «Promuovi ad ACTIVE» solo per i settori scelti, uno alla volta.
5. **Rimuovi `PACK_ADMIN_TOKEN` da Vercel** e fai Redeploy: l'endpoint torna chiuso (503).

Protezioni: token solo da variabile d'ambiente (≥32 caratteri, altrimenti 503), confronto a tempo costante, 401 senza o con token errato, 400 per payload/azione/settore non validi, 429 dopo troppi tentativi (per IP e globale persistente), ritardo fisso sugli errori, nessun token nelle risposte né nei log.

## Runtime Compatibility Harness (`lib/engine/harness.js`)

Prova end-to-end che un pack in **TEST** funziona con lo stesso percorso del runtime reale, **senza promuoverlo e senza modificare il database**:

`caricaPackPerHarness` (stesso codice di `caricaPackProduzione`) → `eseguiMotore` → `authorizeAction` (governance reale).

- Si usa dalla pagina `/api/admin-pack` con il pulsante **Harness runtime** (azione `harness`, protetta da `PACK_ADMIN_TOKEN`). Va eseguito prima di ogni promozione.
- Sonde: ricavate dal pack stesso (primo esempio di ogni intent, prima frase di urgenza critica, prima richiesta di una persona, prima richiesta sensibile, un saluto). Nessun dato di clienti.
- Controlla: nessuna eccezione; risposta valida (non vuota, senza segnaposto); azione riconosciuta; telemetria coerente con settore e versione; urgenza critica scalata; richiesta di una persona gestita; la governance non nega `reply` / `handoff` / `emergency_escalation` (registry di agenti e azioni letti dal database reale).
- Garanzie: zero scritture (ogni richiesta non-GET è bloccata e fa fallire la prova); stato del profilo riletto prima e dopo; l'unica traccia è una riga in `sector_pack_audit` (evento `verifica`, solo conteggi).
- Il webhook **non** importa il loader dell'harness (c'è un test): i clienti vedono solo pack in `production`.
- **Limiti dichiarati:** il modello è simulato (si verifica l'integrazione, non la qualità delle risposte LLM) e la riga `tenant_action_policy` del tenant di prova è simulata (autonomia 5). Superare l'harness non sostituisce né il Pack Gate né l'holdout.

## Promozione verificata e in serie (`promuovi_verificato`)

Per ridurre i click senza ridurre i controlli. Per **un** settore (azione `promuovi_verificato`): harness runtime → (se superato) promozione con tutti i controlli già previsti (stesso contenuto del codice, validazione, compatibilità, gate, metadata holdout, trigger del database) → audit.

- **Settori regolamentati** (`SETTORI_REGOLAMENTATI` in `pack-pipeline.js`): la serie normale li rifiuta. Si promuovono dal campo "Serie regolamentati", che esegue gli stessi controlli (harness, compatibilità, gate, audit) e richiede di scrivere a mano la parola `CONFERMO`: il server accetta solo il testo esatto, e l'audit registra una riga `verifica` con `regolamentato_confermato: true` prima della promozione. La conferma non sostituisce la revisione professionale dei contenuti: è la presa in carico esplicita del titolare.
- **Serie:** il campo "Promuovi in serie" della pagina admin prende fino a 8 settori scritti da te, chiede conferma e li esegue **uno alla volta, nell'ordine**, fermandosi al primo problema (i successivi non vengono toccati). Nessuna promozione parte da sola e nessun settore non elencato viene toccato.
- **Auditabile:** ogni rifiuto e ogni promozione lascia una riga in `sector_pack_audit` (con la fase in cui si è fermato).
- Il primo giro dell'holdout resta il dato ufficiale di generalizzazione e viene registrato a ogni promozione; superare harness e gate non lo sostituisce.
