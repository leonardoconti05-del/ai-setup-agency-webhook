
create schema if not exists private;

create or replace function private.current_cliente_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'cliente_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then (auth.jwt() -> 'app_metadata' ->> 'cliente_id')::uuid
    else null
  end
$$;

create or replace function private.current_cliente_id_text()
returns text
language sql
stable
set search_path = ''
as $$ select (select private.current_cliente_id())::text $$;

revoke all on function private.current_cliente_id() from public;
revoke all on function private.current_cliente_id_text() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_cliente_id() to authenticated;
grant execute on function private.current_cliente_id_text() to authenticated;

revoke all on table public.configurazioni_cliente, public.richieste_clienti, public.documents,
  public.knowledge_chunks, public.lacune_conoscenza, public.servizi_cliente,
  public.personale_cliente, public.utilizzo_mensile, public.ai_action_ledger,
  public.approval_requests, public.tenant_action_policy, public.whatsapp_conversations,
  public.event_log, public.richieste_pazienti from anon, authenticated;

grant select, update on table public.configurazioni_cliente to authenticated;
grant select, update on table public.richieste_clienti to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select on table public.knowledge_chunks to authenticated;
grant select, update on table public.lacune_conoscenza to authenticated;
grant select, insert, update, delete on table public.servizi_cliente to authenticated;
grant select, insert, update, delete on table public.personale_cliente to authenticated;
grant select on table public.utilizzo_mensile to authenticated;
grant select on table public.ai_action_ledger to authenticated;
grant select, update on table public.approval_requests to authenticated;
grant select, insert, update, delete on table public.tenant_action_policy to authenticated;
grant select on table public.whatsapp_conversations to authenticated;
grant select on table public.event_log to authenticated;
grant select, update on table public.richieste_pazienti to authenticated;

do $$
declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies
  where schemaname='public' and policyname like 'tenant_rls_%'
  loop execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
end $$;

create policy tenant_rls_config_select on public.configurazioni_cliente for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_config_update on public.configurazioni_cliente for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_richieste_select on public.richieste_clienti for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_richieste_update on public.richieste_clienti for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_documents_select on public.documents for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_documents_insert on public.documents for insert to authenticated with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_documents_update on public.documents for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_documents_delete on public.documents for delete to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_chunks_select on public.knowledge_chunks for select to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_gaps_select on public.lacune_conoscenza for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_gaps_update on public.lacune_conoscenza for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_services_select on public.servizi_cliente for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_services_insert on public.servizi_cliente for insert to authenticated with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_services_update on public.servizi_cliente for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_services_delete on public.servizi_cliente for delete to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_staff_select on public.personale_cliente for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_staff_insert on public.personale_cliente for insert to authenticated with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_staff_update on public.personale_cliente for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_staff_delete on public.personale_cliente for delete to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_usage_select on public.utilizzo_mensile for select to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_ledger_select on public.ai_action_ledger for select to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_approval_select on public.approval_requests for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_approval_update on public.approval_requests for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_policy_select on public.tenant_action_policy for select to authenticated using ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_policy_insert on public.tenant_action_policy for insert to authenticated with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_policy_update on public.tenant_action_policy for update to authenticated using ((select private.current_cliente_id()) = cliente_id) with check ((select private.current_cliente_id()) = cliente_id);
create policy tenant_rls_policy_delete on public.tenant_action_policy for delete to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_whatsapp_select on public.whatsapp_conversations for select to authenticated using ((select private.current_cliente_id_text()) = cliente_id);

create policy tenant_rls_event_select on public.event_log for select to authenticated using ((select private.current_cliente_id()) = cliente_id);

create policy tenant_rls_pazienti_select on public.richieste_pazienti for select to authenticated using ((select private.current_cliente_id_text()) = cliente_id);
create policy tenant_rls_pazienti_update on public.richieste_pazienti for update to authenticated using ((select private.current_cliente_id_text()) = cliente_id) with check ((select private.current_cliente_id_text()) = cliente_id);
