-- core_hardening
-- Matches the migration already applied to the production Supabase project.
-- Additive performance hardening only.

create index if not exists configurazioni_cliente_cliente_id_idx
  on public.configurazioni_cliente (cliente_id);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

create index if not exists tenant_action_policy_agent_id_idx
  on public.tenant_action_policy (agent_id);
