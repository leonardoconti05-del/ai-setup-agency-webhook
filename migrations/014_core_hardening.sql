-- 014_core_hardening.sql
-- Safe, additive performance hardening identified by Supabase advisors.
-- No data mutation and no change to the current authorization boundary.

create index if not exists configurazioni_cliente_cliente_id_idx
  on public.configurazioni_cliente (cliente_id);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

create index if not exists tenant_action_policy_agent_id_idx
  on public.tenant_action_policy (agent_id);

-- Keep this migration intentionally free of RLS policy changes.
-- Direct client access to these tables requires a separate tenant-aware RLS migration.
