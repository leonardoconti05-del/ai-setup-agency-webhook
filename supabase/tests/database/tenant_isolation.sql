begin;

select plan(8);

select ok((select relrowsecurity from pg_class where oid = 'public.configurazioni_cliente'::regclass), 'configurazioni_cliente has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.documents'::regclass), 'documents has RLS enabled');

select policies_are(
  'public',
  'configurazioni_cliente',
  array['tenant_rls_config_select','tenant_rls_config_update'],
  'configurazioni_cliente exposes only the expected tenant policies'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'app_metadata',
    json_build_object(
      'cliente_id',
      (select cliente_id::text from public.configurazioni_cliente order by cliente_id limit 1)
    )
  )::text,
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
  (select count(*)::int from public.configurazioni_cliente where cliente_id = '87b903bf-7fb1-4d52-a9f9-14ea1cf524e1'::uuid and cliente_id <> private.current_cliente_id()),
  0,
  'forged cross-tenant filter returns no rows'
);

select set_config('request.jwt.claims', '{"app_metadata":{}}', true);

select is((select count(*)::int from public.configurazioni_cliente), 0, 'missing tenant context fails closed');
select is((select count(*)::int from public.tenant_action_policy), 0, 'missing tenant context cannot read action policies');

select * from finish();
rollback;
