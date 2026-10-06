# AI Setup Agency — Tenant Isolation Contract

## Purpose
This document defines the security boundary required before Jarvis receives write or autonomous capabilities.

## Core rule
The model may request a tenant resource, but it may never establish tenant authorization.

Trusted server authentication creates a TenantScope from the actor, agent identity, authorization source and allowed tenant set. A model/tool-provided cliente_id is only a requested resource selector.

## Data classification

### Global
Shared platform data not owned by a tenant:
- agent_registry
- sector_profiles
- sector_faq
- sector_test_scenarios
- sector_eval_runs

### Tenant
Operational data belonging to one cliente_id:
- clienti
- configurazioni_cliente
- richieste_clienti
- documents
- knowledge_chunks
- lacune_conoscenza
- servizi_cliente
- personale_cliente
- utilizzo_mensile
- ai_action_ledger
- approval_requests
- tenant_action_policy
- richieste_pazienti
- whatsapp_conversations (currently cliente_id is text)

Event_log is tenant-scoped when cliente_id is present and must not be used for cross-tenant reads without an explicit aggregate contract.

### Aggregate
Cross-tenant metrics are a separate authorization class. They must expose only the minimum aggregate information required and never silently expose tenant rows.

### Immutable audit
ai_action_ledger is tenant-scoped and also audit data. Its append-only and hash-chain semantics are separate invariants from ordinary tenant CRUD authorization.

## Required behavior
1. Missing tenant scope fails closed.
2. A requested tenant outside the server-derived scope is denied.
3. A multi-tenant scope without an explicit requested tenant is denied as ambiguous.
4. A single-tenant scope may resolve its only tenant without model input.
5. Service-role credentials stay server-side.
6. Tenant authorization must not depend on LLM output, prompt text or user-editable metadata.
7. Any future Action Gateway must consume the same scope contract.
8. Jarvis write/autonomous access remains disabled until Core/Jarvis use this boundary end-to-end.

## Test layers
Application tests in tests/tenant-isolation-contract.test.js verify the fail-closed contract and the negative case where an LLM requests an unauthorized tenant.

Database tests should add pgTAP tests for actual RLS policies once the direct-client authorization model is defined. Supabase recommends explicit allow and deny tests for SELECT/INSERT/UPDATE/DELETE and role-specific testing; do not invent tenant RLS policies before the identity source is finalized.

Integration tests must prove that the tenant in the authenticated server scope is the tenant used for database queries, rather than trusting the tool argument.

## Exit gate for Jarvis write access
Jarvis must not receive write/autonomous capabilities until all three layers pass:
- application contract tests;
- database isolation tests for any directly exposed tables;
- end-to-end Core/Jarvis tests proving server-derived scope cannot be expanded by tool/model input.
