# Come funziona

Panoramica end-to-end del sistema: cosa succede dal messaggio WhatsApp del
cliente finale fino alla dashboard che vede lo staff. Per il *perché* delle
scelte fatte, vedi `docs/DECISIONS.md`.

---

## Struttura del repository

```
/api/whatsapp.js          webhook Twilio — riceve e risponde ai messaggi WhatsApp
/api/dashboard.js         dashboard dello staff (protetta da sessione)
/api/dashboard-login.js   pagina di login (token -> cookie di sessione)
/api/info-cliente.js      form per indirizzo/prezzi/servizi (protetta da sessione)
/lib/session.js           sessione firmata HMAC (login dashboard)
/lib/twilio-signature.js  verifica che le richieste arrivino davvero da Twilio
/tests/                   test automatici (node --test tests/*.test.js)
/migrations/              storico delle modifiche allo schema Supabase
```

## Le tre tabelle principali su Supabase

- **`clienti`** — un'attività cliente (es. uno studio dentistico). Contiene
  `nome_attivita` e `dashboard_token` (usato per il login).
- **`configurazioni_cliente`** — la configurazione del bot per quel cliente:
  numero WhatsApp collegato, settore, tono, i campi da raccogliere
  (`campi_da_raccogliere`, jsonb), i criteri di urgenza, gli orari di
  apertura, le informazioni generali (`info_generali`, jsonb — indirizzo,
  prezzi, servizi), l'eventuale calendario Google collegato, il limite di
  messaggi mensile.
- **`richieste_clienti`** — una riga per ogni conversazione WhatsApp in
  corso (o conclusa) con un cliente finale: i dati raccolti finora
  (`dati_raccolti`, jsonb), lo stato (`in_corso` / `urgente` /
  `completata`), la cronologia dei messaggi (`conversazione`, jsonb).

Una quarta tabella, **`utilizzo_mensile`**, tiene il conteggio dei
messaggi elaborati per cliente e per mese (vedi P1-9 in DECISIONS.md).

## 1. Un messaggio WhatsApp arriva (`api/whatsapp.js`)

1. **Verifica di sicurezza**: la richiesta deve avere una firma Twilio
   valida (`X-Twilio-Signature`), calcolata da `lib/twilio-signature.js`.
   Senza `TWILIO_AUTH_TOKEN` configurato, la richiesta viene **rifiutata**
   (fail-closed — vedi P0-2).
2. **Trova la configurazione** del cliente in base al numero WhatsApp a
   cui è stato scritto (`configurazioni_cliente.numero_whatsapp`).
3. **Recupera la conversazione esistente** (se il cliente finale ha già
   scritto prima) da `richieste_clienti`. Se sono passate più di 48 ore
   dall'ultimo scambio, la cronologia riparte da zero.
4. **Controlla i duplicati**: se questo `MessageSid` è già stato
   processato (Twilio a volte ritrasmette), il messaggio viene ignorato.
5. **Se il cliente sta scegliendo un orario** proposto in precedenza
   (fase `attesa_slot`), interpreta la risposta (1/2/3) e crea l'evento
   su Google Calendar, senza passare dal punto 6.
6. **Altrimenti, flusso normale**: il messaggio viene passato a Claude
   (modello `claude-haiku-4-5-20251001`) con un system prompt costruito
   dinamicamente da `buildSystemPrompt` (include la scaletta di domande,
   gli orari, le informazioni generali del cliente, i criteri di
   urgenza). Claude risponde in linguaggio naturale.
7. **Estrazione dati**: una seconda chiamata a Claude, con
   `tool_choice` forzato sullo strumento `estrai_dati`, estrae i campi
   che il cliente ha effettivamente fornito nella conversazione,
   garantendo che l'output rispetti sempre lo schema atteso (niente
   parsing di JSON scritto a mano).
8. **Se sono stati raccolti tutti i campi**, non è urgente, e il cliente
   ha un calendario Google collegato: vengono proposti fino a 3 slot
   liberi nei prossimi giorni feriali (orari fissi: 9, 10, 11, 15, 16,
   17), controllando la disponibilità con `freeBusy` di Google Calendar.
9. **Notifica staff**: se è stato raccolto almeno un dato, viene inviato
   un messaggio Telegram allo staff (urgente o normale a seconda dei
   criteri configurati).
10. **Salvataggio**: `salvaRichiesta` scrive su `richieste_clienti` con
    un meccanismo di lock ottimistico per evitare che due messaggi
    ravvicinati si sovrascrivano a vicenda (vedi P1-1 in DECISIONS.md).
11. **Risposta**: il messaggio di Claude (o quello di conferma
    appuntamento) viene rimandato al cliente come TwiML.

Un limite di utilizzo mensile (opzionale, per cliente) può bloccare
l'elaborazione prima del punto 6 se superato — vedi P1-9.

## 2. Lo staff accede alla dashboard

1. **Login** (`api/dashboard-login.js`): lo staff apre
   `/api/dashboard-login?token=<dashboard_token del cliente>`. Il token
   viene verificato contro `clienti.dashboard_token`; se valido, viene
   impostato un cookie `agency_session` (HttpOnly, firmato con HMAC,
   scadenza di default 24 ore — vedi `lib/session.js`).
2. **Dashboard** (`api/dashboard.js`): legge il `cliente_id`
   **esclusivamente** dal cookie di sessione (mai da query string o
   body — vedi P0-1), poi mostra tutte le richieste di quel cliente con
   contatori (totali, urgenti, in corso, completate). Ogni riga ha
   bottoni "In corso" / "Completata" che inviano un `POST` (non più un
   link GET, vedi P1-7) per cambiare stato.
3. **Informazioni cliente** (`api/info-cliente.js`): stessa
   autenticazione a sessione. Permette allo staff di compilare
   indirizzo, prezzi, servizi offerti e altre informazioni, salvate in
   `configurazioni_cliente.info_generali` e usate dal bot per rispondere
   a domande fuori scaletta (punto 6 sopra, sezione "INFORMAZIONI SU
   ..." del prompt).

## Isolamento fra clienti (multi-tenant)

Il sistema serve più clienti dallo stesso deployment. La garanzia
architetturale chiave: **il `cliente_id` non arriva mai da un input
diretto del client** (query string, body, header) in nessuna delle route
protette — arriva sempre e solo dalla sessione firmata, verificata lato
server. Questo vale sia in lettura (un cliente non può vedere i dati di
un altro) sia in scrittura (un cliente non può modificare le richieste di
un altro, nemmeno conoscendo il numero di telefono esatto di una
richiesta altrui). Verificato esplicitamente in
`tests/tenant-isolation.test.js`.

## Variabili d'ambiente richieste

Vedi `docs/ENVIRONMENT_VARIABLES.md` per l'elenco completo con
descrizione di ciascuna.

## Test automatici

```
npm test
```

Esegue tutti i file in `tests/*.test.js` con il test runner nativo di
Node (nessuna dipendenza esterna necessaria). Copertura attuale:
- `lib/session.js` — firma/verifica sessione, scadenza, tampering, cookie
- `lib/twilio-signature.js` — verifica firma Twilio, incluso il vettore
  di test ufficiale pubblicato da Twilio
- `campoValido` (`api/whatsapp.js`) — validazione campi raccolti
- Isolamento fra clienti (`api/dashboard.js`, `api/info-cliente.js`)
