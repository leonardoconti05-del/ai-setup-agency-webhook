// api/cron/retention.js — conservazione dei dati (vedi lib/retention.js). Una volta al giorno.
// Protetto da CRON_SECRET (fail-closed, come follow-up).
import { eseguiConservazione } from '../../lib/retention.js';

export default async function handler(req, res) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) return res.status(500).json({ error: 'Server misconfigured: CRON_SECRET missing' });
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'Non autorizzato' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const esito = await eseguiConservazione({ SUPABASE_URL, headers });
  console.log('Conservazione dati:', JSON.stringify(esito));
  return res.status(200).json({ ok: true, esito });
}
