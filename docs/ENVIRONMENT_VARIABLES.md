# Variabili d'ambiente

Configurate su Vercel (Project Settings → Environment Variables, ambiente
Production). Nessuna di queste va mai committata nel codice o nel
repository — solo su Vercel.

## Richieste

| Variabile | Usata da | Descrizione |
|---|---|---|
| `SUPABASE_URL` | tutte le route `api/*.js` | URL del progetto Supabase (REST endpoint). |
| `SUPABASE_SERVICE_ROLE_KEY` | tutte le route `api/*.js` | Chiave di servizio Supabase (accesso completo, bypassa RLS). Da trattare come segreto a tutti gli effetti — mai esposta al client. |
| `SESSION_SECRET` | `lib/session.js`, `api/dashboard.js`, `api/dashboard-login.js`, `api/info-cliente.js` | Chiave usata per firmare/verificare i cookie di sessione (HMAC-SHA256). Deve essere lunga e casuale; se cambia, tutte le sessioni attive vengono invalidate (gli utenti dovranno rifare login). |
| `TWILIO_AUTH_TOKEN` | `api/whatsapp.js`, `lib/twilio-signature.js`, `api/cron/follow-up.js` | Auth Token Twilio, usato per verificare che le richieste al webhook arrivino davvero da Twilio e per autenticare le chiamate REST in uscita (follow-up proattivi). Senza questa variabile il webhook rifiuta ogni richiesta (fail-closed, vedi fix P0-2 in `docs/DECISIONS.md`) a meno che `ALLOW_UNVERIFIED_WEBHOOK` non sia impostata. |
| `TWILIO_ACCOUNT_SID` | `api/cron/follow-up.js` | Account SID Twilio, richiesto insieme a `TWILIO_AUTH_TOKEN` per inviare messaggi WhatsApp proattivi (follow-up) via API REST di Twilio. |
| `ANTHROPIC_API_KEY` | `api/whatsapp.js` | Chiave API Anthropic, per le due chiamate a Claude (risposta al cliente + estrazione dati). |
| `CRON_SECRET` | `api/cron/follow-up.js` | Segreto condiviso con Vercel Cron per autenticare le chiamate al cron dei follow-up (Vercel lo invia automaticamente come header `Authorization: Bearer <valore>` se la variabile è impostata). Senza questa variabile l'endpoint rifiuta ogni richiesta (fail-closed, stesso principio di `TWILIO_AUTH_TOKEN`). |

## Opzionali

| Variabile | Usata da | Descrizione |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `api/whatsapp.js` | Token del bot Telegram usato per notificare lo staff di nuove richieste/urgenze. Se assente, la notifica viene semplicemente saltata (nessun errore bloccante). |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `api/whatsapp.js` | Chiave JSON completa del service account Google (come stringa), usata per l'integrazione con Google Calendar (proposta slot liberi, creazione eventi). Necessaria solo per i clienti che hanno `google_calendar_id` configurato in `configurazioni_cliente`; se un cliente non ha un calendario collegato, questa parte del flusso viene semplicemente saltata. |
| `ALLOW_UNVERIFIED_WEBHOOK` | `api/whatsapp.js` | Impostare a `true` **solo in sviluppo** per bypassare la verifica della firma Twilio quando `TWILIO_AUTH_TOKEN` non è ancora configurato. **Non impostare mai in produzione** — vedi P0-2 in `docs/DECISIONS.md`. Il codice logga un avviso esplicito ogni volta che questa modalità è attiva. |
| `VOYAGE_API_KEY` | `lib/embeddings.js` (Knowledge Base / RAG) | Chiave API Voyage AI, usata per generare gli embedding dei documenti caricati in `/api/knowledge` e delle domande dei clienti (ricerca semantica). Se assente, il salvataggio dei documenti funziona comunque ma senza indicizzazione (best-effort, non blocca il resto del flusso). |
| `TWILIO_CONTENT_SID_FOLLOWUP` | `api/cron/follow-up.js` | Content SID (`HXxxxxxxxx...`) di un template WhatsApp **pre-approvato da Meta**, con un'unica variabile `{{1}}` = nome attività. Se impostata, i follow-up automatici vengono inviati tramite questo template invece che come testo libero — necessario perché WhatsApp permette testo libero solo entro 24 ore dall'ultimo messaggio del cliente, e il follow-up per definizione scatta dopo un periodo di silenzio. Senza questa variabile il cron usa il testo libero come fallback (funziona solo entro le 24 ore) e logga chiaramente l'errore Twilio 63016 quando viene rifiutato fuori da quella finestra. Vedi la sezione dedicata in `docs/DECISIONS.md` per come creare e sottomettere il template. |

## Non più necessaria

| Variabile | Nota |
|---|---|
| `DASHBOARD_PASSWORD` | Residuo del vecchio sistema di login (password unica condivisa fra tutti i clienti, sostituita dal fix P0-1 con `dashboard_token` per-cliente — vedi `migrations/001_dashboard_auth.sql`). Il file `api/dashboard-login.js` attuale non la legge più. Può essere rimossa da Vercel una volta confermato che il nuovo flusso di login funziona stabilmente (attualmente verificato funzionante in produzione, 22/9/2026). |

## Note

- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono condivise fra
  `ai-setup-agency-webhook` e il progetto Supabase `ai-setup-agency`
  (separato dal progetto Supabase di produzione di BuroFacile).
- Se una qualsiasi delle variabili **richieste** manca, il comportamento
  di ciascuna route è pensato per fallire in modo esplicito e visibile
  (log di errore + risposta 500), non silenziosamente — vedi i controlli
  `if (!SESSION_SECRET)` / `if (!TWILIO_AUTH_TOKEN)` in cima agli
  handler.
