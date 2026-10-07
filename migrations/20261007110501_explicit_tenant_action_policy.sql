-- Explicit tenant policy bootstrap.
-- Registry defaults are not authorization. Every executable action must have
-- a tenant-specific policy row.

insert into public.tenant_action_policy (cliente_id, agent_id, action, autonomy_level, condizioni)
select c.id, p.agent_id, p.action, p.autonomy_level, p.condizioni
from public.clienti c
cross join (values
  ('whatsapp'::text, 'reply'::text, 3, '{}'::jsonb),
  ('whatsapp'::text, 'handoff'::text, 3, '{}'::jsonb),
  ('whatsapp'::text, 'emergency_escalation'::text, 5, '{}'::jsonb),
  ('whatsapp'::text, 'create_calendar_event'::text, 3, '{}'::jsonb),
  ('whatsapp'::text, 'notify_staff'::text, 3, '{}'::jsonb),
  ('followup'::text, 'send_followup'::text, 3, '{}'::jsonb)
) as p(agent_id, action, autonomy_level, condizioni)
on conflict (cliente_id, agent_id, action) do nothing;

create or replace function private.seed_default_tenant_action_policies()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  insert into public.tenant_action_policy (cliente_id, agent_id, action, autonomy_level, condizioni)
  values
    (new.id, 'whatsapp', 'reply', 3, '{}'::jsonb),
    (new.id, 'whatsapp', 'handoff', 3, '{}'::jsonb),
    (new.id, 'whatsapp', 'emergency_escalation', 5, '{}'::jsonb),
    (new.id, 'whatsapp', 'create_calendar_event', 3, '{}'::jsonb),
    (new.id, 'whatsapp', 'notify_staff', 3, '{}'::jsonb),
    (new.id, 'followup', 'send_followup', 3, '{}'::jsonb)
  on conflict (cliente_id, agent_id, action) do nothing;
  return new;
end;
$$;

drop trigger if exists clienti_seed_action_policy on public.clienti;
create trigger clienti_seed_action_policy
after insert on public.clienti
for each row execute function private.seed_default_tenant_action_policies();

comment on function private.seed_default_tenant_action_policies()
is 'Creates explicit initial tenant action policies; authorization remains tenant-specific and editable.';