// lib/governance/approvazioni.js
//
// Richieste di approvazione per azioni a livello 4. Best-effort: se la tabella
// non esiste ritorna null e il chiamante prosegue nel ramo prudente (non esegue).
// NOTA: la risoluzione (approva/rifiuta) è esposta come funzione; manca ancora
// l'interfaccia per il titolare (dashboard o bottoni Telegram): vedi REMAINING.

export async function richiediApprovazione({ SUPABASE_URL, headers, fetchImpl = fetch }, { cliente_id, agent, action, payload }) {
  try {
    const res = await fetchImpl(`${SUPABASE_URL}/rest/v1/approval_requests`, {
      method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ cliente_id, agent_id: agent, action, payload }),
    });
    const j = await res.json();
    return Array.isArray(j) && j[0]?.id ? j[0].id : null;
  } catch (e) {
    console.error('Errore creazione richiesta di approvazione:', e);
    return null;
  }
}

// Filtra SEMPRE per cliente_id: un titolare non può decidere richieste di un altro tenant.
export async function risolviApprovazione({ SUPABASE_URL, headers, fetchImpl = fetch }, { cliente_id, id, decisione, decided_by }) {
  if (!['approved', 'rejected'].includes(decisione)) return { ok: false, motivo: 'decisione non valida' };
  try {
    const res = await fetchImpl(
      `${SUPABASE_URL}/rest/v1/approval_requests?id=eq.${encodeURIComponent(id)}&cliente_id=eq.${encodeURIComponent(cliente_id)}&stato=eq.pending`,
      { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ stato: decisione, decided_at: new Date().toISOString(), decided_by }) }
    );
    const j = await res.json();
    return Array.isArray(j) && j.length > 0 ? { ok: true, richiesta: j[0] } : { ok: false, motivo: 'non trovata, già decisa o di un altro tenant' };
  } catch (e) {
    return { ok: false, motivo: String(e.message || e) };
  }
}
