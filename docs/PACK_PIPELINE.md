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
