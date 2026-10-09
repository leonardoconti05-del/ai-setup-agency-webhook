-- Isolamento tenant sulle tabelle con barriera RLS. Autosufficiente: crea due tenant di prova DENTRO la transazione (annullata dal rollback),
-- quindi funziona anche su un database di test vuoto. Prima dipendeva da una riga già presente in configurazioni_cliente: su un database vuoto
-- il test 4 falliva e gli altri passavano a vuoto (zero righe = zero righe), senza provare nulla.
begin;

select plan(9);

select ok((select relrowsecurity from pg_class where oid = 'public.configurazioni_cliente'::regclass), 'configurazioni_cliente has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.documents'::regclass), 'documents has RLS enabled');

select policies_are(
  'public',
  'configurazioni_cliente',
  array['tenant_rls_config_select','tenant_rls_config_update'],
  'configurazioni_cliente exposes only the expected tenant policies'
);

-- due tenant di prova (UUID v4 validi, riconosciuti da private.current_cliente_id())
insert into public.clienti (id, nome_attivita, dashboard_token) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tenant A (test)', 'tok-test-a'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Tenant B (test)', 'tok-test-b');
insert into public.configurazioni_cliente (cliente_id, numero_whatsapp, nome_attivita, settore, campi_da_raccogliere) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'whatsapp:+10000000001', 'Tenant A (test)', 'test', '[]'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'whatsapp:+10000000002', 'Tenant B (test)', 'test', '[]'::jsonb);

select set_config(
  'request.jwt.claims',
  json_build_object('app_metadata', json_build_object('cliente_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))::text,
  true
);

set local role authenticated;

select is(
  (select count(*)::int from public.configurazioni_cliente where cliente_id = private.current_cliente_id()),
  1,
  'authenticated tenant sees its own configuration'
);

select is(
  (select count(*)::int from public.configurazioni_cliente where cliente_id <> private.current_cliente_id()),
  0,
  'authenticated tenant cannot see another tenant configuration'
);

select is(
  (select count(*)::int from public.configurazioni_cliente where cliente_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid),
  0,
  'forged cross-tenant filter returns no rows (the other tenant exists)'
);

select is(
  (select count(distinct cliente_id)::int from public.tenant_action_policy),
  1,
  'authenticated tenant sees action policies of one tenant only'
);

select set_config('request.jwt.claims', '{"app_metadata":{}}', true);

select is((select count(*)::int from public.configurazioni_cliente), 0, 'missing tenant context fails closed');
select is((select count(*)::int from public.tenant_action_policy), 0, 'missing tenant context cannot read action policies');

select * from finish();
rollback;
