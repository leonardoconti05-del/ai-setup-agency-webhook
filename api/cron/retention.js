// api/cron/retention.js — conservazione dei dati (vedi lib/retention.js). Una volta al giorno.
// Protetto da CRON_SECRET (fail-closed, come follow-up).
// NB: questa funzione ospita anche /api/admin-pack (rewrite in vercel.json → ?modo=admin-pack): il piano
// Vercel gratuito ammette al massimo 12 funzioni e sono già tutte usate. L'accesso amministrativo ha
// un'autenticazione separata (PACK_ADMIN_TOKEN) e non passa mai da CRON_SECRET. Stessa cosa per /api/core-health (CORE_HEALTH_TOKEN, sola lettura).
import { eseguiConservazione } from '../../lib/retention.js';
import { gestisciAdminPack } from '../../lib/admin/pack-http.js';
import { gestisciCoreHealth } from '../../lib/core/health-http.js';

export default async function handler(req, res) {
  if (req.query?.modo === 'admin-pack') return gestisciAdminPack(req, res);
  if (req.query?.modo === 'core-health') return gestisciCoreHealth(req, res); // sola lettura, token separato (CORE_HEALTH_TOKEN)
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
