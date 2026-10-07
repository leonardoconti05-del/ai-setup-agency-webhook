-- 015_action_registry.sql
-- Central registry for executable AI actions.
-- Deny-by-default: an action is executable only if it exists here and is active.
-- The registry is backend-controlled; tenant/client roles must not mutate it.

create table if not exists public.action_registry (
  action_id text primary key,
  name text not null,
  description text not null,
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  required_autonomy smallint not null check (required_autonomy between 0 and 5),
  approval_required boolean not null default false,
  executor text not null,
  executor_version text not null default '1',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.action_registry enable row level security;

revoke all on table public.action_registry from anon, authenticated;
grant select on table public.action_registry to service_role;

insert into public.action_registry
  (action_id, name, description, risk_level, required_autonomy, approval_required, executor, executor_version, metadata)
values
  ('reply', 'Reply to customer', 'Send a governed WhatsApp reply to the customer conversation.', 'low', 3, false, 'whatsapp.reply', '1', '{"agent":"whatsapp"}'::jsonb),
  ('handoff', 'Handoff to staff', 'Escalate a conversation to a human staff member.', 'medium', 3, false, 'whatsapp.handoff', '1', '{"agent":"whatsapp"}'::jsonb),
  ('create_calendar_event', 'Create calendar event', 'Create an appointment in the configured calendar.', 'medium', 3, false, 'calendar.create_event', '1', '{"agent":"whatsapp"}'::jsonb),
  ('notify_staff', 'Notify staff', 'Send an internal notification to configured staff.', 'medium', 3, false, 'telegram.notify_staff', '1', '{"agent":"whatsapp"}'::jsonb),
  ('send_followup', 'Send follow-up', 'Send an automated follow-up to an eligible lead.', 'medium', 3, false, 'whatsapp.send_followup', '1', '{"agent":"followup"}'::jsonb)
on conflict (action_id) do update set
  name = excluded.name,
  description = excluded.description,
  risk_level = excluded.risk_level,
  required_autonomy = excluded.required_autonomy,
  approval_required = excluded.approval_required,
  executor = excluded.executor,
  executor_version = excluded.executor_version,
  metadata = excluded.metadata,
  active = true;
