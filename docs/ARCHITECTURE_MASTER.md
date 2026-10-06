# AI Setup Agency — Master Architecture

## Status
- Core repository: `ai-setup-agency-webhook`
- Operational backend: Supabase project `ai-setup-agency`
- Orchestrator UI: `JARVIS/jarvis-web`
- Primary development agents: Claude + ChatGPT
- Date: 2026-10-06

## Product boundary

AI Setup Agency is the core AI Business Operating System. Other components are engines/modules, not separate products.

### Engine 1 — Vertical Intelligence
Owns sector knowledge, sector packs, FAQs, scenarios, evaluations and production gates.

Current code/data:
- `lib/engine/pack.js`
- `lib/engine/packs/`
- `sector_profiles`
- `sector_faq`
- `sector_test_scenarios`
- `sector_eval_runs`

### Engine 2 — Jarvis Orchestrator
Owns cross-system observation, prioritisation, diagnostics, recommendations and coordination. Jarvis must call stable Core contracts rather than duplicate business logic.

Target integration:
- Core exposes read-only health/metrics/context contracts.
- Jarvis proposes work.
- Code/database changes remain governed by GitHub/PR and explicit deployment decisions.

### Engine 3 — Knowledge → Decision → Action
Owns the loop from missing knowledge to governed action.

Existing primitives:
- `documents`
- `knowledge_chunks`
- `lacune_conoscenza`
- `agent_registry`
- `tenant_action_policy`
- `approval_requests`
- `ai_action_ledger`

Rules:
1. Tenant identity is never trusted from model output.
2. Every action is tenant-scoped.
3. Unknown actions are deny-by-default.
4. High-risk actions require approval.
5. Every consequential action is auditable.
6. Knowledge retrieval is tenant-scoped.
7. Prompt/model/policy/pack versions should be traceable.

## Source of truth

| System | Responsibility |
|---|---|
| Supabase | Runtime data, tenant data, knowledge, governance, usage, audit |
| GitHub | Source code, migrations, tests, architecture contracts |
| Vercel | Runtime/deployment |
| Twilio/WhatsApp | Customer channel |
| Notion | Agency CRM, projects, invoices, internal documentation |
| Jarvis | Internal orchestration and operations |
| Vertical engine | Sector intelligence |

Do not duplicate operational client data into Notion unless there is an explicit sync contract.

## Non-negotiable integration contracts

### TenantContext
Every internal engine invocation must have a resolved tenant context:
- `cliente_id`
- actor/agent
- authorization source
- request id

The tenant must be resolved from trusted server-side authentication or a trusted integration boundary.

### EngineResult
Engine calls should return structured results containing:
- `ok`
- `tenant_id`
- `request_id`
- `result`
- `telemetry`
- `sources`
- `version`
- `errors`

### GovernedAction
An action is executable only after policy evaluation:
- agent
- action
- tenant
- autonomy level
- approval state
- reason
- payload
- audit reference

## Current audit findings

### Positive
- Core webhook already contains a deterministic + LLM orchestration engine.
- Governance already has autonomy levels, approval requests and an append-only action ledger.
- Sector engine already has versioned profiles, FAQs, scenarios and evaluation runs.
- Knowledge-gap capture already exists.
- Dashboard identity is resolved from a signed session rather than a client-supplied tenant id.
- RLS is enabled on the relevant public tables.

### Critical follow-up
Supabase Security Advisor currently reports 20 public tables with RLS enabled but no policies. This is intentional in the current architecture because application endpoints use the service role and migrations explicitly grant service-role access; however, it must remain an explicit trust-boundary decision. If any table is ever exposed directly to authenticated/anon clients, tenant-specific RLS policies must be added before exposure.

### Performance follow-up
Advisor reports three foreign keys without covering indexes:
- `configurazioni_cliente.cliente_id`
- `knowledge_chunks.document_id`
- `tenant_action_policy.agent_id`

These should be reviewed and indexed when the next database-hardening migration is created.

### Vector follow-up
Advisor reports `vector` installed in `public`. Move it to a dedicated schema only after verifying all existing vector types/functions/indexes and application queries.

## Implementation order

1. Freeze and document module boundaries.
2. Audit Core/Jarvis/Vertical overlap.
3. Establish shared contracts.
4. Harden tenant/auth/action boundaries.
5. Add missing indexes and vector-schema hardening through migrations.
6. Integrate Jarvis through contracts/events, not copied code.
7. Upgrade dashboard around the Core data model.
8. Add end-to-end tenant-isolation and governance tests.
9. Deploy only after tests + advisors are clean or findings are explicitly accepted.

## Parallel development rule

Claude and ChatGPT may work in parallel, but never edit the same file/schema surface simultaneously.

Preferred workflow:
1. One task = one Git branch.
2. Each task states files/tables it owns.
3. Database changes are migrations in GitHub.
4. No direct production SQL for permanent schema changes.
5. Before merge: tests, diff review, security advisor, migration review.
6. ChatGPT is used for architecture/research/QA and can inspect the live system.
7. Claude is used for implementation and repository-wide refactors.
8. The canonical decision record lives in this file and the architecture issue.

## Definition of done for integration

The ecosystem is considered integrated when:
- Core owns the shared tenant/runtime contracts.
- Vertical Intelligence is callable as a versioned module.
- Jarvis can inspect Core health/state and create governed work proposals.
- Knowledge gaps can become validated knowledge.
- Actions are policy-gated and auditable.
- Dashboard exposes business operations without leaking cross-tenant data.
- Notion remains agency back-office, not a second operational database.
