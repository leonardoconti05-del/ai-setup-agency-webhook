// ===== Supabase finto in memoria (stessi vincoli del database reale: unique, trigger di gate, max 1000 righe) =====
export function dbFinto() {
  const t = { sector_profiles: [], sector_faq: [], sector_test_scenarios: [], sector_eval_runs: [], sector_pack_audit: [] };
  let seq = 0;
  const filtri = (qs) => {
    const f = [];
    for (const [k, v] of qs.entries()) {
      if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
      const m = /^(eq|neq|gte|in)\.(.*)$/.exec(v);
      if (!m) continue;
      f.push([k, m[1], m[1] === 'in' ? m[2].replace(/^\(|\)$/g, '').split(',') : m[2]]);
    }
    return f;
  };
  const passa = (r, f) => f.every(([k, op, val]) => (op === 'eq' ? String(r[k]) === val : op === 'neq' ? String(r[k]) !== val : op === 'gte' ? String(r[k]) >= val : val.includes(String(r[k]))));
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url);
    const tab = u.pathname.split('/').pop();
    const metodo = o.method || 'GET';
    const rows = t[tab];
    const risp = (status, corpo) => ({ ok: status < 300, status, text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)), json: async () => corpo });
    if (!rows) return risp(404, { error: 'tabella' });
    const f = filtri(u.searchParams);
    if (metodo === 'GET') {
      let r = rows.filter((x) => passa(x, f));
      const ord = u.searchParams.get('order');
      if (ord) { const [c, d] = ord.split('.'); r = [...r].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (d === 'desc' ? -1 : 1)); }
      const off = Number(u.searchParams.get('offset') || 0);
      const lim = Math.min(Number(u.searchParams.get('limit') || 1000), 1000);
      return risp(200, JSON.parse(JSON.stringify(r.slice(off, off + lim))));
    }
    if (metodo === 'POST') {
      const nuovi = [].concat(JSON.parse(o.body)).map((x) => ({ id: tab === 'sector_pack_audit' ? ++seq : `id${++seq}`, created_at: new Date().toISOString(), ...x }));
      for (const n of nuovi) {
        if (tab === 'sector_profiles' && rows.some((x) => x.settore === n.settore && x.version === n.version)) return risp(409, { error: 'unique' });
        if (tab === 'sector_test_scenarios' && rows.some((x) => x.settore === n.settore && x.codice === n.codice)) return risp(409, { error: 'unique' });
      }
      rows.push(...nuovi);
      return risp(201, (o.headers?.Prefer || '').includes('representation') ? nuovi : undefined);
    }
    if (metodo === 'PATCH') {
      for (const r of rows.filter((x) => passa(x, f))) {
        const patch = JSON.parse(o.body);
        if (tab === 'sector_profiles' && patch.status === 'production' && r.status !== 'production') {
          const ok = t.sector_eval_runs.some((e) => e.profile_id === r.id && e.gate_passed === true);
          if (!ok) return risp(400, { message: 'Promozione bloccata' });
        }
        if (tab === 'sector_pack_audit') return risp(400, { message: 'append-only' });
        Object.assign(r, patch);
      }
      return risp(204);
    }
    if (metodo === 'DELETE') {
      if (tab === 'sector_pack_audit') return risp(400, { message: 'append-only' });
      t[tab] = rows.filter((x) => !passa(x, f)); // sostituisce l'array
      return risp(204);
    }
    return risp(405, {});
  };
  // l'accesso alle tabelle deve vedere sempre l'array corrente dopo una DELETE
  const proxy = new Proxy(t, {});
  return { t: proxy, fetchImpl, ctx: { SUPABASE_URL: 'https://finto.supabase.co', headers: {}, fetchImpl } };
}
