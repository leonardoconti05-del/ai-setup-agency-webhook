# Motore verticale (Sector Engine)

## Principio
Il settore è **dato**, non codice. Il codice (`lib/engine/*`) è unico; la conoscenza di un settore vive in un *Sector Pack* versionato (`sector_profiles.pack`, jsonb). Aggiungere un settore = scrivere `lib/engine/packs/<settore>.js` + `.scenari.js` + `.holdout.js`, valutarlo, pubblicarlo.

## Flusso di un messaggio (api/whatsapp.js)
1. Twilio firmato → tenant da `To` → `config` (invariato).
2. `caricaPackProduzione(config.settore)` (cache 60 s). **Nessun pack in produzione → percorso legacy identico a prima.** Errore del motore → ritorno automatico al legacy.
3. `eseguiMotore`: analisi deterministica (lessico → entità → intent → sicurezza → FAQ) → analisi LLM strutturata (saltata se urgenza CRITICAL o richiesta di una persona) → `pianifica` (stato + Next Best Action) → risposta **template** (emergenza/handoff, zero LLM) oppure risposta LLM guidata dal piano → `verificaRisposta` (blocca importi/percentuali/orari non presenti nei dati del tenant, promesse, frasi vietate) → fallback deterministico.
4. Chiamate LLM: max 2 per messaggio (come prima); 0 per emergenze/handoff.
5. Salvataggio con `salvaRichiesta` (invariato): entità nei campi di primo livello, stato in `dati_raccolti._stato`, pratica di passaggio in `dati_raccolti._handoff`, `stato` ∈ urgente | handoff | completata | in_corso.
6. `event_log` fase `motore`: settore, pack_version, intent, confidence, urgency, action, strategy, origine_risposta, chiamate_llm, latency_ms, token, costo_usd stimato, violazioni.

## Dati
`migrations/010_sector_engine.sql` (additiva, idempotente, rollback in fondo): `sector_profiles` (draft/test/approved/production/archived, una sola production per settore), `sector_faq`, `sector_test_scenarios`, `sector_eval_runs`, trigger che **rifiuta la promozione a production senza una valutazione con gate superato**. RLS attiva.
Pubblicazione: `node scripts/pubblica-pack.mjs <settore>` → `migrations/seed/<settore>_v1.sql` (stato `test` + FAQ + scenari + esito valutazione) e `<settore>_v1_PROMUOVI.sql` (promozione, con rollback in commento).

## Isolamento
Il pack non contiene dati di tenant. La query del pack filtra solo per settore. Prezzi/orari/servizi/personale arrivano solo da `config`, `servizi_cliente`, `personale_cliente`, KB, tutti filtrati per `cliente_id`. Il tenant non ha alcun campo che disattivi le regole di sicurezza del pack.

## Valutazione e regressione
`node scripts/valuta-pack.mjs <settore>`; `npm test` esegue per ogni pack: validità, ≥50 scenari su 9 categorie, FAQ senza importi/orari, gate, latenza. Soglie gate: intent/entity/action ≥90, booking ≥90, escalation ≥95, safety 100, tenant isolation 100, allucinazioni 0.

## Cosa NON misura (limiti dichiarati)
- È una valutazione **deterministica**: non misura la qualità del testo generato dall'LLM né l'accuratezza dell'analisi LLM su messaggi reali (servono chiamate live con chiave API).
- Set principale: tarato sui propri fallimenti (punteggio ~100 poco informativo). Il numero di generalizzazione onesto è l'**holdout al primo giro** (vedi tabella).
- Le FAQ di settore e le liste di sicurezza sono scritte da AI: vanno riviste da un professionista del settore prima di un uso reale.

| Settore | Scenari | Holdout 1° giro | Holdout dopo fix generali |
|---|---|---|---|
| dentista | 162 | 29/40 | 40/40 |
| parrucchiere | 174 | 37/57 | 55/57 |
| estetista | 169 | 45/50 | 50/50 |
| elettricista | 162 | 23/37 | 36/37 |
| autofficina | 168 | 27/34 | 34/34 |
| veterinario | 162 | 38/44 | 44/44 |
| fisioterapista | 215 | 28/34 | 34/34 |
| ristorante | 138 | 33/40 | 39/40 |
| bar_caffetteria | 161 | 23/28 | 28/28 |
| immobiliare | 154 | 27/32 | 32/32 |

## Limiti noti del motore (da affrontare in v2)
Frasi di urgenza/sicurezza contigue (niente prossimità né fuzzy sulle red flag); negazione solo sulle 2 parole precedenti e assente nei match per sovrapposizione; fuzzy a distanza 1 (fattura/frattura, pezzi/prezzi, vendere/vedere); estrazione deterministica di nome nudo, targa, km, budget, date generiche assente (resta all'LLM); `verificaRisposta` non controlla durate, nomi del personale, caratteristiche di immobili; una richiesta sensibile ha priorità sul flusso di prenotazione; un'entità ha un solo valore (vince la prima voce di lessico); annullamento/spostamento/reclamo vanno a un umano (il sistema non modifica prenotazioni esistenti); dopo `_fase = 'confermato'` una nuova prenotazione non riproporrebbe slot.

## Rollback
`update sector_profiles set status='archived' where settore='X' and status='production'` → entro 60 s il settore torna al percorso legacy. Rollback schema: vedi `010_sector_engine.sql`.

## Governance (Fasi 1-2 della specifica `ARCHITETTURA_SOVEREIGN_AI_v1.md`)
Codice in `lib/governance/`, migrazione `migrations/012_governance.sql` (non applicata al DB; il codice funziona anche senza, con default storici).
- **Registro azioni** (`ledger.js`): append-only con hash a catena per tenant, nessun testo del cliente né telefono (solo hash salato e estratto della risposta); `scripts/verifica-ledger.mjs <cliente_id>` ne verifica l'integrità. Non è immutabilità assoluta: la service role può comunque inserire righe o cancellare il tenant.
- **Lineage** (`lineage.js`): riferimenti alle fonti davvero date al modello (pack+versione, FAQ, sezioni dati del tenant).
- **Minimizzazione** (`contesto.js`): al modello arrivano solo le sezioni di dati utili all'intento (prenotazione: orari e servizi; reclamo/disdetta: nessun dato; personale solo se informativo).
- **Gateway modello** (`modello.js`): timeout 5 s (analisi) / 7 s (risposta), un retry su 429/5xx; il percorso legacy non ci passa.
- **Autonomia** (`policy.js`): livelli 0-5, deny-by-default (azione sconosciuta = livello 1), default = comportamento storico; `reply` < 3 o = 4 → bozza in `approval_requests` e messaggio neutro al cliente; `create_calendar_event` < 3 → richiesta di conferma al titolare invece di scrivere nel calendario. Il vincolo di sicurezza del pack non è un livello e non è disattivabile.
- **Non fatto:** interfaccia del titolare per approvare/rifiutare (esiste `risolviApprovazione`, manca dashboard/bottoni Telegram) ed esecuzione automatica dell'azione approvata; policy per `followup`/`dashboard` (definite nei default ma non ancora applicate dal codice di quei flussi).
