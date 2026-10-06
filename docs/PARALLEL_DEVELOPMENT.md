# Parallel Claude + ChatGPT Development Protocol

## Purpose
Use Claude and ChatGPT in parallel without creating conflicting edits.

## Division of labour

### Claude
Primary implementation agent:
- repository-wide coding
- refactors
- tests
- migrations prepared in Git
- deployment preparation

### ChatGPT
Architecture and control layer:
- inspect live GitHub/Supabase state
- audit security and data boundaries
- review diffs
- research current platform capabilities
- design contracts
- generate implementation prompts
- verify migrations and production state

## Branch ownership

Before starting a task, declare:
- branch
- files owned
- database objects owned
- acceptance criteria

Never have two agents modify the same file at the same time.

## Database rule

Permanent schema changes must exist as versioned migration files in GitHub.

Do not make an irreversible production schema change merely to test an idea.

For experiments, use a development branch/database where available.

## Merge rule

Before merging:
1. Review changed files.
2. Run automated tests.
3. Review SQL/migrations.
4. Run Supabase security advisor.
5. Run performance advisor.
6. Confirm tenant isolation.
7. Confirm no secret/service-role key is exposed to browser code.
8. Confirm deployment environment variables are unchanged or intentionally updated.

## Current ownership suggestion

### Core / ai-setup-agency-webhook
Own:
- webhook
- dashboard
- knowledge
- governance
- vertical engine
- shared contracts

### JARVIS
Own:
- orchestration UI
- operational summaries
- diagnostics
- task proposals

JARVIS must not become a second source of truth for client operational data.

### Notion
Own:
- agency CRM
- projects
- invoices
- internal docs
- optional selective sync

## First integration milestone

Create a stable contract layer in Core and connect Jarvis to it read-only first. Do not begin by merging the two repositories physically.

The first milestone is successful observation and reporting, not autonomous mutation.
