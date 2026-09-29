# Decisioni tecniche

Questo file documenta le decisioni prese durante l'intervento di fix P0/P1
del 21/9/2026 (e i giorni immediatamente successivi). Non è un changelog
esaustivo: registra il **perché** dietro alle scelte più importanti, per chi
(incluso il futuro autore stesso) si ritrova a chiedersi "perché è fatto
così e non in un altro modo".

---

## P0-1 — Autenticazione: cliente_id SOLO dalla sessione

**Problema.** La dashboard e la pagina informazioni cliente identificavano
il cliente tramite `?cliente_id=X&password=Y` nella query string, con `Y`
identico per tutti i clienti. Chiunque conoscesse la password (condivisa)
poteva vedere i dati di qualsiasi cliente cambiando semplicemente `X`
nell'URL — un problema di isolamento fra tenant, non solo di autenticazione
debole.

**Decisione.** Il `cliente_id` non viene più letto da nessun input diretto
del client (query string, body, header custom). Viene determinato
**esclusivamente** dal contenuto di un cookie di sessione firmato
(`agency_session`), verificato lato server. Login tramite codice/token
univoco per cliente (`dashboard_token`, vedi `migrations/001_dashboard_auth.sql`)
→ `api/dashboard-login.js` imposta il cookie dopo la verifica → tutte le
route protette (`api/dashboard.js`, `api/info-cliente.js`) leggono
`cliente_id` solo da lì.

**Perché HMAC fatto a mano invece di una libreria JWT.** Il caso d'uso è
volutamente piccolo: un payload minimo (`{ cliente_id, exp }`), firmato,
con scadenza. Un formato custom (`base64url(payload).base64url(firma)`,
HMAC-SHA256) evita di introdurre una dipendenza esterna per qualcosa che
richiede poche righe di codice — vedi `lib/session.js`. Non è un NIH
ideologico: se in futuro servissero funzionalità più ricche (refresh
token, revoca centralizzata, claims complessi), vale la pena rivalutare
una libreria vera.

**Perché il confronto della firma usa `crypto.timingSafeEqual`.** Un
confronto ingenuo (`firmaA === firmaB`) è vulnerabile a timing attack: il
tempo di esecuzione di un confronto stringa "esce" appena trova il primo
carattere diverso, permettendo in teoria di indovinare la firma byte per
byte misurando i tempi di risposta. `timingSafeEqual` confronta in tempo
costante. Per lo stesso motivo, `validaFirmaTwilio` in
`lib/twilio-signature.js` fa lo stesso confronto sulla firma Twilio.

**Verificato con test:** `tests/tenant-isolation.test.js` — non solo che
un cliente autenticato vede i propri dati, ma soprattutto che tentativi
espliciti di iniezione (`cliente_id` nel body POST, `numero_utente` di un
altro cliente indovinato, cookie manomesso, nessuna sessione) vengono
tutti respinti senza mai interrogare i dati dell'altro cliente.

---

## P0-2 — Verifica firma Twilio: fail-closed, non fail-open

**Problema.** Il comportamento originale: se `TWILIO_AUTH_TOKEN` non era
configurato, il webhook elaborava comunque la richiesta. In pratica,
chiunque conoscesse l'URL del webhook poteva inviare richieste POST
fingendosi Twilio, senza alcuna verifica — un problema serio se la
variabile d'ambiente fosse mai mancata per errore in produzione (es. un
redeploy che la perde, un nuovo ambiente Vercel non configurato).

**Decisione.** Il comportamento di default è ora **fail-closed**: senza
`TWILIO_AUTH_TOKEN`, il webhook rifiuta ogni richiesta con `500`. Esiste
una modalità di sviluppo esplicita (`ALLOW_UNVERIFIED_WEBHOOK=true`), che
va impostata consapevolmente e **mai** in produzione — il codice logga un
avviso esplicito ogni volta che viene usata.

**Perché la logica di verifica è stata estratta in `lib/twilio-signature.js`.**
Prima era mescolata dentro l'handler HTTP di `api/whatsapp.js`, il che la
rendeva difficile da testare in isolamento (avrebbe richiesto di simulare
un'intera richiesta Vercel). Estratta come funzione pura
(`validaFirmaTwilio(authToken, firma, url, parametri)`, nessuna chiamata
di rete, nessun accesso a variabili d'ambiente al suo interno), è
verificabile con un semplice test unitario — vedi
`tests/twilio-signature.test.js`, che include anche il vettore di test
**ufficiale** pubblicato da Twilio nella loro documentazione, per
garantire conformità con l'algoritmo reale e non solo coerenza interna.

---

## P1-1 — Lock ottimistico sulla scrittura di richieste_clienti

**Problema.** Due messaggi ravvicinati dello stesso numero WhatsApp
possono essere elaborati in parallelo (es. il cliente scrive due messaggi
di seguito prima che il primo sia stato processato). Entrambe le
esecuzioni leggono lo stesso stato di partenza, calcolano in memoria un
nuovo `dati_raccolti` completo, e chi scrive per ultimo sovrascrive
silenziosamente il lavoro dell'altro — un lost update classico. L'upsert
di per sé è atomico a livello Postgres, ma il "merge" dei dati avviene in
JavaScript **prima** della scrittura, non nella query SQL stessa: è lì
che si perde l'informazione.

**Decisione.** Se la riga esisteva già (`ultimoAggiornamento` non nullo),
il `PATCH` è condizionato anche su `updated_at = ultimoAggiornamento`
(concorrenza ottimistica). Se la `PATCH` modifica 0 righe, vuol dire che
qualcun altro ha scritto nel frattempo: si rilegge la versione più
recente, si uniscono **solo i campi nuovi** estratti in questo turno sopra
di essa (mai una sovrascrittura totale), e si riprova con un upsert
incondizionato. Non è un lock distribuito vero e proprio, ma elimina la
perdita silenziosa di dati nel caso comune, e rende visibile nei log ogni
conflitto residuo (vedi `salvaRichiesta` in `api/whatsapp.js`).

---

## P1-7 — Cambio stato: da link GET a form POST

**Problema.** Il cambio di stato di una richiesta (es. "segna come
completata") avveniva tramite un semplice link cliccabile
(`?action=set_stato&...`), una richiesta GET. I link GET sono vulnerabili
a prefetching del browser (alcuni browser/estensioni precaricano i link
visibili in una pagina) e più in generale a pattern CSRF-like, dato che un
GET non dovrebbe mai avere effetti collaterali.

**Decisione.** Il cambio di stato richiede ora una richiesta `POST`
esplicita, tramite un piccolo `<form>` per ogni bottone azione (vedi
`formAzione` in `api/dashboard.js`). Non risolve CSRF in senso stretto
(richiederebbe un token CSRF dedicato), ma elimina il rischio di
attivazione involontaria/automatica che un link GET comporta.

---

## P1-9 — Limite di utilizzo mensile per cliente

**Problema.** Nessun limite al numero di messaggi che un singolo cliente
poteva generare in un mese, quindi nessun limite al consumo di credito
Anthropic associato — un rischio economico diretto in caso di traffico
anomalo (bot, spam, uso improprio) su un singolo numero.

**Decisione.** Un contatore mensile per cliente (`utilizzo_mensile`,
`migrations/002_cost_control.sql`), incrementato **atomicamente** da una
funzione Postgres (`incrementa_utilizzo_mensile`) — non da un
"leggi-incrementa-scrivi" lato applicazione, che introdurrebbe la stessa
classe di race condition già vista e risolta in P1-1.

**Perché il controllo è fail-open, a differenza della verifica Twilio
(P0-2).** Se il meccanismo di conteggio fallisce (es. la funzione SQL
manca ancora, un errore di rete verso Supabase), la richiesta viene
comunque elaborata invece di essere bloccata. È una scelta deliberata e
asimmetrica rispetto a P0-2: bloccare **tutti** i clienti per un guasto
del solo sistema di controllo costi sarebbe un danno al servizio
peggiore del rischio economico che il controllo dei costi cerca di
limitare. L'evento viene comunque loggato per restare visibile.

---

## P2-1 — Follow-up automatici e la finestra delle 24 ore di WhatsApp

**Il problema.** WhatsApp Business (tramite Twilio) impone che un'azienda
possa scrivere per prima a un cliente con testo libero **solo entro 24 ore**
dall'ultimo messaggio ricevuto da quel cliente. Passata quella finestra,
Meta richiede un "template" di messaggio pre-approvato, con eventuali
variabili ma testo fisso — non testo libero arbitrario.

Il follow-up automatico (`migrations/006_follow_up.sql`,
`api/cron/follow-up.js`) scatta per definizione dopo un periodo di silenzio
del cliente (default: 24 ore) — cade quindi quasi sempre **fuori** dalla
finestra consentita. Un invio con testo libero in quel momento viene
rifiutato da Twilio con l'errore `63016`, anche se tutto il resto del
codice è corretto: è un vincolo della piattaforma WhatsApp, non un bug
risolvibile lato applicazione.

**La soluzione implementata.** `api/cron/follow-up.js` supporta l'invio
tramite un template WhatsApp pre-approvato, attivato impostando la
variabile d'ambiente `TWILIO_CONTENT_SID_FOLLOWUP` (vedi
`docs/ENVIRONMENT_VARIABLES.md`). Se impostata, il messaggio viene inviato
con `ContentSid` + `ContentVariables` (Content API di Twilio) invece che
con `Body` libero — valido anche fuori dalla finestra delle 24 ore. Se non
impostata, il cron usa il testo libero come fallback (utile solo per test
entro le 24 ore) e logga in modo esplicito l'errore 63016 quando si
verifica, invece di fallire silenziosamente.

**Limite noto.** Il testo del template è fisso e approvato da Meta con una
sola variabile (`{{1}}` = nome attività): il campo "messaggio personalizzato
del follow-up" nella dashboard cliente (`api/info-cliente.js`) resta quindi
inutilizzato quando il template è configurato — non è possibile un testo
libero per-cliente fuori dalla finestra delle 24 ore, per policy di
WhatsApp, non per una limitazione del codice.

**Come creare e sottomettere il template (richiede un'azione manuale, non
automatizzabile da qui):**
1. Vai su [Twilio Console → Content Template Builder](https://console.twilio.com/us1/develop/sms/content-template-builder) (serve un account Twilio con un WhatsApp Sender già approvato).
2. Crea un nuovo template di tipo "WhatsApp" con testo, ad es.:
   `Ciao! Siamo ancora a disposizione per la sua richiesta a {{1}}. Se ha bisogno di altro tempo o ha domande, scriva pure qui.`
3. Sottometti il template per l'approvazione WhatsApp (categoria consigliata: "Utility"). L'approvazione da parte di Meta richiede in genere da qualche ora a un giorno.
4. Una volta approvato, copia il **Content SID** (inizia con `HX...`) e impostalo come `TWILIO_CONTENT_SID_FOLLOWUP` su Vercel.
5. Redeploy: da quel momento i follow-up useranno il template invece del testo libero.

Finché il template non è pronto, i follow-up restano attivi ma andranno
verificati con cautela (probabile errore 63016 fuori dalla finestra delle
24 ore) — visibile in `event_log` con `fase = 'follow_up_inviato'` e
`stato = 'errore'`.

---

## Altre decisioni minori, per completezza

- **Deduplicazione messaggi Twilio**: Twilio può ritrasmettere lo stesso
  messaggio (es. per timeout di rete). Vengono tenuti gli ultimi 20
  `MessageSid` già processati per numero; un duplicato viene ignorato
  silenziosamente (risposta TwiML vuota), per evitare doppio consumo di
  Claude e doppie notifiche Telegram.
- **Scadenza conversazione a 48 ore**: oltre le 48 ore dall'ultimo
  scambio, la cronologia viene azzerata invece di trascinarsi
  indefinitamente (costo crescente ad ogni turno, e un cliente che
  riscrive dopo settimane non deve ritrovarsi in mezzo a una
  conversazione passata).
- **Estrazione dati tramite tool-use forzato, non JSON in testo libero.**
  Un bug precedente (un array restituito al posto di un oggetto) nasceva
  dal chiedere a Claude di scrivere JSON come testo e interpretarlo a
  mano — fragile per costruzione. Con `tool_choice: { type: 'tool',
  name: 'estrai_dati' }`, è l'API stessa a garantire che l'output rispetti
  lo schema dichiarato: quella classe di bug non può più verificarsi.
- **`campoValido` non tratta `false`/`0` come "campo mancante".** Un
  controllo "truthy" (`if (!valore)`) scarterebbe erroneamente risposte
  legittime a domande booleane/numeriche (es. "ha già fatto la pulizia
  quest'anno? no" → `false`, valore completo, non mancante). Vedi
  `tests/campo-valido.test.js` per il comportamento atteso esatto,
  inclusi i casi limite (stringa di soli spazi, oggetti, array).
