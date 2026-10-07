# Tenant Isolation Certification

## Trust-boundary classification

### Tenant-scoped

- ai_action_ledger
- approval_requests
- configurazioni_cliente
- documents
- event_log
- knowledge_chunks
- lacune_conoscenza
- personale_cliente
- richieste_clienti
- richieste_pazienti
- servizi_cliente
- tenant_action_policy
- utilizzo_mensile
- whatsapp_conversations

### Global / backend-controlled

- action_registry
- agent_registry
- clienti
- sector_eval_runs
- sector_faq
- sector_profiles
- sector_test_scenarios
- jarvis_summaries

clienti is the tenant root record rather than a child tenant table. Global sector intelligence is backend-controlled. jarvis_summaries remains backend-only until its multi-tenant ownership model is explicitly defined.

## Runtime evidence — 2026-10-07

- All 22 public tables currently have RLS enabled.
- Tenant policies use private.current_cliente_id() or its text variant and fail closed when the claim is absent/invalid.
- A live authenticated-role test showed an authorized tenant can see its own configuration and a forged filter for another tenant returns zero rows.
- A live no-tenant test returned zero rows for configurazioni_cliente, documents, and tenant_action_policy.
- action_registry is backend-controlled: no anon/authenticated DML or SELECT grants; service-role SELECT only.
- Security Advisor reports 8 RLS-enabled-no-policy findings. These correspond to intentionally backend/global tables above, not missing tenant policies.
- Security Advisor also reports the existing vector extension in public; this is tracked separately because moving it is unrelated to tenant isolation and RAG is not yet active.

## Remaining certification

1. Run this pgTAP suite through supabase test db.
2. Add CI execution for database tests once the repository's Supabase CLI/migration layout is standardized.
3. Add CRUD negative tests for every tenant table.
4. Certify service_role is used only server-side.
5. Resolve the whatsapp_conversations.cliente_id text-vs-UUID mismatch as a separate schema-hardening task if it remains required by the final architecture.
