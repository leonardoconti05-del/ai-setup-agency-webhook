# AI Setup Agency — Architettura "Governed AI" v1

Specifica tecnica che parte da ciò che esiste oggi (codice e database verificati il 5/10/2026) e traduce l'analisi sul "Sovereign AI Business OS" in lavoro costruibile, in ordine, con criteri di accettazione.

## 0. Verdetto sull'analisi

**Cosa regge.** Il valore difendibile non è "più funzioni" ma governance: l'AI vede solo il necessario, ogni risposta è tracciabile a una fonte approvata, ogni azione ha un livello di autonomia, ogni tenant è isolato. Il Motore Verticale che abbiamo costruito (pack, `verificaRisposta`, handoff, stato) è già il nucleo di questo modello.

**Cosa non va preso alla lettera.**
- Le affermazioni sui concorrenti (Salesforce, HubSpot, Odoo, Zoho, Microsoft) non sono state verificate da me: non le uso per decidere. Il testo stesso premette che non può escludere prodotti proprietari.
- Digital twin con simulazione "cosa succede se", crittografia per tenant, local/EU model router, residenza dati per categoria, event bus, "Business OS" a 7 strati: sono architettura da azienda con decine di clienti pagati. Oggi: 31 righe in `clienti`, 1 conversazione reale, 1 cliente pilota con un numero WhatsApp vero. Costruirli ora brucia mesi senza vendere nulla.
- "Immutabile", "AI Act high-risk", "Zero-Trust" sono parole di marketing finché non esiste il test che le dimostra. Un assistente di prenotazione non è in genere un sistema "high-risk" ai sensi dell'AI Act; la classificazione va confermata da un legale, non assunta.

**Regola di priorità usata qui.** Si costruisce ora solo ciò che (a) riduce un rischio reale già presente, (b) si vende a un titolare ("vedi cosa ha fatto l'AI e perché") o (c) è prerequisito del passo (a)/(b).

## 1. Baseline reale (cosa c'è già)

| Area | Stato oggi | Evidenza |
|---|---|---|
| Isolamento tenant | Logico, applicativo: il webhook usa la service role e filtra per `cliente_id`/`numero_whatsapp`. Tutte le 11 tabelle hanno RLS attiva **senza policy** (= nessun accesso diretto da client, solo service role). | Advisor Supabase: `rls_enabled_no_policy` ×11 (INFO) |
| Dati di settore vs tenant | Separati: pack in `sector_profiles` (non ancora applicata), dati del tenant in `configurazioni_cliente`, `servizi_cliente`, `personale_cliente`, KB. Il pack non contiene dati di tenant. | migrazione 010 nel repo; tabelle `sector_*` assenti nel DB |
| Anti-invenzione | `verificaRisposta` blocca importi/percentuali/orari non presenti nei dati del tenant. | `lib/engine/safety.js`, test |
| Minimizzazione del contesto | Parziale: il prompt del motore riceve identità di settore, piano di risposta, dati del tenant, KB pertinente, ultimi 12 messaggi per l'analisi. Non riceve altri tenant né altri clienti. | `lib/engine/prompt.js` |
| Tracciabilità | `event_log` per fase (osservabilità). Il motore scrive telemetria (intent, azione, costo). **Non** registra quali fonti hanno sostenuto una risposta, né versione di prompt/policy. | 66 righe; `fase = 'motore'` |
| Livelli di autonomia | Impliciti e fissi: risponde da solo; crea l'evento calendario solo dopo la scelta del cliente; notifica lo staff; passa a persona su reclamo/disdetta/sposta/emergenza. Nessuna configurazione per tenant. | `lib/engine/actions.js` |
| Permessi degli agenti | Non esistono: c'è un solo "agente" (il webhook) con service role. Jarvis è un'app separata (`jarvis_summaries`). | — |
| Memoria | Conversazione 48 h in `richieste_clienti`. Nessuna memoria a lungo termine, quindi nulla da esportare/cancellare oltre la riga stessa. | — |
| Residenza dati | Supabase in eu-west-1. **`vercel.json` non imposta `regions`: le funzioni girano nella regione di default (USA)**. Le chiamate all'API del modello e a Twilio escono comunque dall'UE. | `vercel.json` |
| Hardening DB | 2 funzioni senza `search_path` fissato (`match_knowledge_chunks`, `incrementa_utilizzo_mensile`); estensione `vector` nello schema `public`. | Advisor Supabase (WARN) |

## 2. Mappa: ogni idea dell'analisi → decisione

| Idea | Decisione | Quando |
|---|---|---|
| Audit ledger (chi/cosa/perché/dati/modello/policy) | **Costruire** (versione append-only con hash a catena, per tenant) | Fase 1 |
| Data lineage di ogni risposta | **Costruire in forma ridotta**: il ledger registra i riferimenti alle fonti usate (servizio, FAQ, chunk KB, pack+versione) | Fase 1 |
| Livelli di autonomia 0–5 | **Costruire** come tabella per tenant × tipo di azione | Fase 2 |
| Agent permission matrix | **Costruire** quando esiste il secondo agente (Jarvis in scrittura, follow-up cron). Prima: registro + deny-by-default | Fase 2 |
| Human approval kernel | **Costruire** su 3 azioni reali: modifica prezzi/servizi, invio follow-up/campagne, cancellazione dati | Fase 2 |
| Contextual data minimization | **Formalizzare** in un unico modulo (`buildContext`) con allowlist dei campi per intent, testato | Fase 1 |
| Business Constitution | **Costruire** come documento versionato per tenant che compone le regole già sparse (tono, urgenze, campi, orari, info) | Fase 3 |
| "Non so → knowledge gap → proposta → approvazione" | **Costruire**: è già il comportamento di `verificaRisposta`+fallback; manca solo registrare il gap e mostrarlo al titolare | Fase 3 |
| Memory ownership / Privacy Command Center | **Costruire in forma minima**: inventario dati per cliente finale, export e cancellazione | Fase 3 |
| Tenant isolation per policy RLS con claim | **Quando c'è accesso da client** (portale cliente). Oggi il confine reale è il server | Fase 4 |
| Model Gateway / router | **Costruire un'interfaccia sottile** (un solo punto che chiama il modello, con log e costo). Il routing multi-modello **dopo** | Fase 2 (interfaccia), Fase 5 (routing) |
| Residenza dati | **Fare subito la parte gratuita** (regione Vercel in UE), il resto dopo | Fase 0 |
| Cifratura per tenant, bucket separati, vector isolation avanzata | **Rimandare**: nessun cliente lo chiede; la KB è già filtrata per `cliente_id` | Fase 5 |
| Business Digital Twin + simulazione | **Rimandare**; prima servono mesi di dati reali di conversioni | Fase 5 |
| Event bus / workflow runtime | **Non costruire**: Vercel cron + tabelle bastano finché i flussi sono pochi | — |
| "Control plane sopra CRM/POS/contabilità" | **Direzione di prodotto**, non lavoro tecnico ora: serve prima un secondo canale/integrazione reale | Fase 5 |

## 3. Modello dati (da applicare dopo la migrazione 010)

Tutto additivo e idempotente, RLS attiva senza policy (stessa postura attuale). Bozza SQL; **non applicata**.

### 3.1 Registro di audit (`ai_action_ledger`)
```sql
create table if not exists ai_action_ledger (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references clienti(id) on delete cascade,
  request_id uuid,                      -- stesso id di event_log
  created_at timestamptz not null default now(),
  actor text not null,                  -- 'agent:whatsapp' | 'agent:followup' | 'owner:<id>' ...
  action text not null,                 -- 'reply_sent' | 'handoff_created' | 'calendar_event_created' | ...
  autonomy_level smallint not null,     -- livello con cui è stata eseguita (0-5)
  approval text not null default 'not_required',  -- not_required | pending | approved | rejected
  reason text,                          -- motivo dell'azione (azione.reason del motore)
  subject_ref text,                     -- riferimento al cliente finale (hash del telefono, non il numero)
  sources jsonb not null default '[]',  -- lineage: [{tipo:'servizio',id:'..'},{tipo:'pack',settore:'dentista',versione:1},{tipo:'faq',id:'..'}]
  model text, prompt_version text, policy_version text, pack_version int,
  input_hash text,                      -- hash del messaggio, non il testo
  output_excerpt text,                  -- primi 300 caratteri della risposta
  result text not null default 'ok',
  prev_hash text, row_hash text         -- catena per tenant: row_hash = sha256(prev_hash || contenuto)
);
create index on ai_action_ledger (cliente_id, created_at desc);
-- Append-only: UPDATE e DELETE vietati dal database (tranne la cancellazione a cascata del tenant).
create or replace function ai_ledger_block_mutation() returns trigger language plpgsql as $$
begin raise exception 'ai_action_ledger è append-only'; end $$;
create trigger ai_ledger_no_update before update on ai_action_ledger
  for each row execute function ai_ledger_block_mutation();
```
Note oneste: "immutabile" qui significa *append-only + verificabile* (la catena di hash rileva manomissioni dopo il fatto). Chi ha la service role può comunque scrivere righe nuove o cancellare in blocco il tenant; per un'immutabilità reale servirebbe archiviazione esterna in sola scrittura, rimandata. Il testo del cliente non viene salvato nel ledger (solo hash ed estratto della risposta) per non duplicare dati personali.

### 3.2 Autonomia e permessi
```sql
create table if not exists agent_registry (
  agent_id text primary key,            -- 'whatsapp', 'followup', 'jarvis'
  descrizione text not null,
  attivo boolean not null default true
);
create table if not exists tenant_action_policy (
  cliente_id uuid not null references clienti(id) on delete cascade,
  agent_id text not null references agent_registry(agent_id),
  action text not null,                 -- 'reply' | 'create_calendar_event' | 'send_followup' | 'edit_price' | 'delete_data'
  autonomy_level smallint not null check (autonomy_level between 0 and 5),
  condizioni jsonb not null default '{}',  -- es. {"richiede":"campaign_approved"}
  primary key (cliente_id, agent_id, action)
);
create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  agent_id text not null, action text not null, payload jsonb not null,
  stato text not null default 'pending' check (stato in ('pending','approved','rejected','expired')),
  created_at timestamptz not null default now(), decided_at timestamptz, decided_by text
);
```
**Regola base: deny-by-default.** Se per (tenant, agente, azione) non c'è una riga, l'azione scala al livello 1 (propone, non esegue). I default sono scritti in codice e riproducono il comportamento di oggi, così la migrazione non cambia nulla finché un titolare non modifica una policy.

Livelli (come nell'analisi): 0 osserva, 1 raccomanda, 2 prepara bozza, 3 esegue azioni a basso rischio, 4 esegue con approvazione, 5 autonomo entro policy. **Limite fisso non configurabile dal tenant:** sicurezza clinica/legale del pack (CRITICAL, richieste sensibili, `vietato`) non è un livello di autonomia ma un vincolo; nessuna policy può disattivarlo.

Default iniziali (= comportamento attuale): `whatsapp.reply` = 5; `whatsapp.create_calendar_event` = 3 (solo dopo scelta esplicita del cliente); `whatsapp.notify_staff` = 3; `whatsapp.handoff` = 5; `followup.send_followup` = 3 con tetto del cron; `edit_price` / `delete_data` = 4 (richiedono approvazione).

### 3.3 Business Constitution
Una riga versionata per tenant che **non introduce nuove regole**, compone quelle esistenti in un solo documento leggibile e modificabile: `tono`, `campi_da_raccogliere`, `criteri_urgenza`, `orari_apertura`, `info_generali`, contatto di escalation, `limite_messaggi_mese`, policy di autonomia (3.2) e retention. Il motore la legge al posto di campi sparsi in `configurazioni_cliente`; la costituzione **non può** contenere override del pack di sicurezza (validazione in scrittura).
```sql
create table if not exists business_constitution (
  cliente_id uuid not null references clienti(id) on delete cascade,
  version int not null, status text not null default 'draft' check (status in ('draft','approved','archived')),
  contenuto jsonb not null, approved_by text, approved_at timestamptz,
  primary key (cliente_id, version)
);
```

### 3.4 Privacy operativa
```sql
create table if not exists data_subject_requests (   -- richieste del cliente finale (accesso/cancellazione/export)
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  subject_ref text not null, tipo text not null check (tipo in ('export','delete','restrict')),
  stato text not null default 'open', created_at timestamptz default now(), closed_at timestamptz
);
```
Inventario dati per cliente finale (oggi): `richieste_clienti` (dati raccolti, conversazione, `_stato`, `_handoff`), `event_log` (telefono), ledger (solo `subject_ref` hash). Retention proposta, da far validare: conversazione 48 h già implicita; `richieste_clienti` e `event_log` con scadenza configurabile (default da decidere col titolare/legale).

## 4. Codice: moduli e interfacce

Cartella nuova `lib/governance/`, ciascun modulo piccolo, puro dove possibile, con test:

| Modulo | Funzione | Dettaglio |
|---|---|---|
| `contesto.js` | `costruisciContesto({intent, azione, tenant, cliente})` | **Allowlist** dei campi per intent (es. conferma appuntamento = data/ora + nome; mai indirizzo, storico, altre conversazioni). Unico punto da cui i dati arrivano al prompt. Test: nessun campo fuori allowlist compare nel prompt. |
| `policy.js` | `valutaAzione({cliente_id, agent, action, contesto})` → `{consentita, livello, richiedeApprovazione, motivo}` | Legge `tenant_action_policy` (cache 60 s come i pack); deny-by-default; ritorna sempre un esito, mai eccezione. |
| `approvazioni.js` | `richiediApprovazione(...)`, `risolvi(...)` | Scrive `approval_requests`, notifica via Telegram (canale esistente), scade dopo N ore. |
| `ledger.js` | `registra({...})` | Calcola `row_hash` con `prev_hash` del tenant; best-effort come `logEvento` (non blocca la risposta); in caso di errore scrive `event_log` e `console.error`. |
| `lineage.js` | `fontiUsate({config, servizi, faq, chunk, pack})` | Trasforma `testoConsentito` in elenco di riferimenti (id + versione). Oggi quel testo è una stringa: si costruisce parallelamente la lista strutturata. |
| `modello.js` | `chiamaModello({task, messages, tools, cliente_id})` | **Unico** punto che parla con l'API del modello: tiene modello, timeout, retry, conteggio token/costo, log. Oggi `fetch` all'API è duplicato in `whatsapp.js` e nel motore. Il routing tra modelli (task semplice → economico, sensibile → approvato) si aggiunge qui, senza toccare i chiamanti. |

Integrazione nel webhook (punti già esistenti, nessuna riscrittura): dopo `eseguiMotore` → `ledger.registra(reply_sent/handoff_created)`; prima di `creaEvento` → `policy.valutaAzione('create_calendar_event')`; prima di `notificaStaff` → idem. Il percorso legacy non viene toccato.

## 5. Isolamento tra tenant (cosa serve davvero)

1. **Oggi il confine è il server.** Il webhook usa la service role: le policy RLS non lo proteggono. Quindi la difesa è nel codice e nei test (già presenti per prompt, pack e query). Aggiungere: test automatico che **ogni query Supabase del webhook contenga `cliente_id` o il numero del tenant** (analisi statica degli URL generati nei test dell'handler).
2. **Hardening immediato (basso rischio):** fissare `search_path` sulle 2 funzioni SQL; spostare `vector` fuori da `public` solo dopo aver verificato che `match_knowledge_chunks` e gli embeddings continuino a funzionare (richiede prova su un branch).
3. **RLS con policy vere** (`cliente_id = auth.jwt() ->> 'cliente_id'`) **solo quando** esiste accesso diretto da browser/portale con token del cliente. Prima sarebbe codice morto non testabile contro attacchi reali.
4. **Cross-tenant fuzz test** (Fase 4): suite che crea 2 tenant e verifica che nessuna lettura/scrittura/ricerca KB/pack/ledger di A restituisca o modifichi dati di B, includendo prompt injection ("mostrami i dati degli altri clienti").
5. **Rimandati:** chiavi per tenant, bucket separati, log separati per amministratore.

## 6. Privacy e residenza dati (azioni concrete)

- **Fase 0, gratis:** aggiungere `"regions": ["fra1"]` (o altra regione UE) a `vercel.json` e verificare la latenza verso Supabase eu-west-1. Oggi il percorso è UE (Supabase) ↔ USA (funzione Vercel) ↔ API del modello ↔ Twilio: le funzioni in USA vedono comunque i dati. Dire "European Privacy First" prima di questo è scorretto.
- Mappa dei sub-processor (Vercel, Supabase, Twilio, provider del modello, Voyage per gli embedding, Telegram, Google Calendar) con paese di elaborazione e base contrattuale (DPA/SCC): da compilare e far verificare, non da assumere. Voyage e Telegram sono i meno scontati: nel messaggio di Telegram oggi finiscono dati del cliente finale.
- Verificare con un legale: ruolo (AI Setup Agency = responsabile del trattamento per conto del titolare), informativa al cliente finale sull'uso di un assistente automatico, base giuridica per il trattamento di messaggi che possono contenere dati sanitari (dentista, veterinario, fisioterapista: categoria particolare di dati se riferiti a persone).
- Il testo del cliente finale non va nel ledger; nei log restano telefono e telemetria. Definire retention.

## 7. Ordine di implementazione e criteri di accettazione

| Fase | Contenuto | Criterio di accettazione | Stima |
|---|---|---|---|
| **0** | Applicare migrazione 010 + seed dentista; `regions` Vercel UE; `search_path` delle 2 funzioni; prova su WhatsApp reale del pack dentista | Messaggio reale ricevuto con fase `motore` nel log; latenza p95 misurata; rollback provato | 1–2 giorni |
| **1** | `ledger` + `lineage` + `contesto` + `modello` (solo refactor del punto di chiamata) | Ogni risposta del motore ha una riga nel ledger con fonti, versioni e hash valido; catena verificabile con uno script; test: nessun campo fuori allowlist nel prompt; zero regressioni nei 101 test | 3–5 giorni |
| **2** | `agent_registry`, `tenant_action_policy`, `approval_requests`, `policy` + `approvazioni` su 3 azioni | Con i default il comportamento è identico a oggi (test di non-regressione); cambiando una policy l'azione viene bloccata o richiede approvazione via Telegram; azione senza riga → livello 1 | 4–6 giorni |
| **3** | Business Constitution (lettura), registro "knowledge gap", scheda Privacy per il titolare (inventario, export, cancellazione) | Titolare vede "cosa non ho saputo rispondere" e approva una risposta che entra come FAQ del tenant; export e cancellazione di un cliente finale verificati end-to-end | 1–2 settimane |
| **4** | Cross-tenant fuzz test; RLS con claim solo se nasce un portale client | Suite verde su 2+ tenant, incluse prompt injection | 3–4 giorni |
| **5** | Model routing, digital twin, cifratura per tenant, integrazioni "control plane" | Solo con ≥ 5–10 clienti paganti e una richiesta concreta | non pianificata |

Dipendenza esterna alla Fase 1: i tre dati che oggi mancano per un lineage vero sono `servizi_cliente`/`documents` senza `approvato_da`/`aggiornato_il`. Si aggiungono colonne opzionali in Fase 1 (nullable), così "approvato dal titolare il …" è mostrabile solo dove il dato esiste, senza inventarlo.

## 8. Rischi e decisioni aperte (per te)

1. **Priorità commerciale:** la Fase 0 vale più di qualunque altra: oggi il motore non è in produzione. Finché non gira su un cliente reale, il resto è teoria.
2. **Dati sanitari:** tre settori (dentista, veterinario per i proprietari, fisioterapista) possono trattare dati particolari. Serve parere legale prima di vendere come "conforme".
3. **Chi approva i prezzi?** Il modello "il titolare approva e il sistema ricorda da chi" richiede una UI di approvazione: nella dashboard esistente o solo via Telegram?
4. **Retention:** quanti giorni conservare conversazioni e log? Va deciso con il titolare del primo cliente.
5. **Messaggi di marketing:** "privacy-first", "zero-trust", "immutabile", "AI Act ready" vanno usati solo quando il test corrispondente esiste e passa; altrimenti diventano un rischio legale e di reputazione.
6. **Limiti ereditati dal motore** (vedi `SECTOR_ENGINE.md`): la valutazione è deterministica, nessuna prova con l'AI reale; queste fasi non li risolvono.

## 9. Cosa NON cambia
Percorso legacy per i settori senza pack; filtri `cliente_id` su ogni query; firma Twilio fail-closed; dedupe SID; lock ottimistico; limite mensile; tutte le migrazioni sono additive con rollback documentato.
