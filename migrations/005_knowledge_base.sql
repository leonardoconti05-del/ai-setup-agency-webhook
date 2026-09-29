-- 005_knowledge_base.sql
--
-- Knowledge Base + RAG per cliente. Invece di infilare tutto nel prompt
-- (come faceva finora configurazioni_cliente.info_generali, un unico
-- blob jsonb), il titolare può caricare testo (listino, FAQ, regolamento,
-- procedure...) che viene spezzato in "chunk" e trasformato in embedding.
-- Quando arriva una domanda su WhatsApp, cerchiamo solo i chunk più
-- pertinenti (similarità coseno via pgvector) invece di mandare tutto il
-- documento a Claude ad ogni turno — risposte più precise e prompt più
-- piccoli anche con centinaia di pagine caricate.
--
-- Richiede l'estensione pgvector (disponibile di default su Supabase).

create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  titolo text not null,
  contenuto text not null, -- testo originale completo, per rigenerare i chunk se serve
  creato_il timestamptz not null default now()
);

create index if not exists documents_cliente_idx on documents (cliente_id);

-- Dimensione 1024: modello voyage-4-lite con output_dimension esplicito a
-- 1024 (vedi lib/embeddings.js). Se in futuro si cambia modello/dimensione,
-- questa colonna va ricreata e tutti i chunk vanno rigenerati.
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  cliente_id uuid not null references clienti(id) on delete cascade, -- duplicato qui per poter filtrare/isolare senza join
  chunk_index int not null,
  contenuto text not null,
  embedding vector(1024),
  creato_il timestamptz not null default now()
);

create index if not exists knowledge_chunks_cliente_idx on knowledge_chunks (cliente_id);

-- Indice approssimato per la ricerca per similarità. ivfflat richiede che
-- la tabella abbia già dei dati per essere costruito in modo efficace;
-- con pochi documenti per cliente funziona comunque correttamente (solo
-- meno ottimizzato) anche a tabella vuota.
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Funzione di ricerca per similarità, isolata per cliente_id (mai passare
-- un embedding e basta: senza il filtro cliente_id, un cliente potrebbe
-- in teoria ricevere risposte basate sui documenti di un altro cliente —
-- stesso principio di isolamento multi-tenant già applicato ovunque nel
-- progetto).
create or replace function match_knowledge_chunks(
  p_cliente_id uuid,
  p_query_embedding vector(1024),
  p_match_count int default 4
)
returns table (id uuid, contenuto text, similarity float)
language sql stable
as $$
  select id, contenuto, 1 - (embedding <=> p_query_embedding) as similarity
  from knowledge_chunks
  where cliente_id = p_cliente_id
  order by embedding <=> p_query_embedding
  limit p_match_count;
$$;

comment on table documents is 'Documenti caricati dal cliente (listino, FAQ, regolamento...) per la Knowledge Base RAG.';
comment on table knowledge_chunks is 'Frammenti di documenti con embedding, usati per il retrieval nel webhook WhatsApp.';
