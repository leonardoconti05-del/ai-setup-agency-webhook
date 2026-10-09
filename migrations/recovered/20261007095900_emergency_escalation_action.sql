insert into public.action_registry
  (action_id, name, description, risk_level, required_autonomy, approval_required, executor, executor_version, metadata)
values
  ('emergency_escalation', 'Emergency escalation', 'Escalate a critical conversation immediately without model continuation.', 'critical', 5, false, 'whatsapp.emergency_escalation', '1', '{"agent":"whatsapp","safety":"critical"}'::jsonb)
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