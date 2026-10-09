#!/usr/bin/env python3
"""Trasforma un file pgTAP di supabase/tests/database/ in un unico blocco DO eseguibile dall'editor SQL (o da qualunque client SQL)
SENZA la CLI di Supabase. Le asserzioni girano con la vera libreria pgTAP; i risultati vengono raccolti in una tabella temporanea e restituiti
come messaggio di un'eccezione finale, che annulla TUTTO (nessun dato di prova resta nel database).
Uso: python3 scripts/db-test/pgtap-come-do-block.py supabase/tests/database/<file>.sql > /tmp/blocco.sql
Solo per un database di TEST. Limite: non sostituisce `supabase test db` in CI (vedi docs/AUDIT_FASE1.md).
"""
import sys
f=sys.argv[1]
out=[]
for l in open(f).read().split('\n'):
    s=l.strip()
    if s.startswith('--') or s in ('begin;','rollback;') or s=='select * from finish();': continue
    if l.startswith('select '): l='insert into pg_temp.res(line) select '+l[7:]
    out.append(l)
print("do $tap$\nbegin\ncreate temp table res(n serial, line text); grant all on pg_temp.res to public; grant usage on sequence pg_temp.res_n_seq to public;\n"+'\n'.join(out)+"\nraise exception 'RISULTATI%', E'\\n'||(select string_agg(line, E'\\n' order by n) from pg_temp.res);\nend $tap$;")
