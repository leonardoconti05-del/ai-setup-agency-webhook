// Verifica l'integrità della catena del registro azioni AI di un tenant.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verifica-ledger.mjs <cliente_id>
import { verificaCatena } from '../lib/governance/ledger.js';
const cliente = process.argv[2];
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!cliente || !SUPABASE_URL || !KEY) { console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verifica-ledger.mjs <cliente_id>'); process.exit(1); }
const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_action_ledger?cliente_id=eq.${encodeURIComponent(cliente)}&select=*&order=id.asc&limit=100000`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const righe = await res.json();
if (!Array.isArray(righe)) { console.error('Errore di lettura:', righe); process.exit(1); }
const v = verificaCatena(righe);
console.log(v.ok ? `Catena integra: ${v.righe} righe.` : `CATENA NON VALIDA alla riga ${v.indice}: ${v.motivo}`);
process.exit(v.ok ? 0 : 2);
