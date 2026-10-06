// lib/insights.js
//
// Insight operativi per il titolare, calcolati SOLO su dati già presenti in
// richieste_clienti (nessuna tabella nuova, nessuna stima inventata).
// Cosa NON fa, di proposito: non stima ore risparmiate né euro generati
// (servirebbero ipotesi del titolare) e non calcola le richieste fuori orario
// (la conversazione non salva l'ora di ogni messaggio).
// Funzione pura: testabile senza database.

const GIORNO = 24 * 3600 * 1000;
const MOTIVI = {
  richiesta_persona: 'Il cliente ha chiesto una persona',
  non_compreso: 'Il bot non ha capito la richiesta',
  richiesta_sensibile_insistente: 'Richiesta sensibile insistente',
  intent_complaint: 'Reclamo',
  intent_cancellation: 'Annullamento',
  intent_reschedule: 'Spostamento',
  emergenza: 'Emergenza',
};

const ultimoMessaggioCliente = (r) => {
  const c = Array.isArray(r.conversazione) ? r.conversazione : [];
  for (let i = c.length - 1; i >= 0; i--) if (c[i].role === 'user') return String(c[i].content || '').slice(0, 160);
  return '';
};

export function calcolaInsight(lista, { adesso = Date.now(), giorni = 30, valoreMedio = null } = {}) {
  const dal = adesso - giorni * GIORNO;
  const r = (Array.isArray(lista) ? lista : []).filter((x) => x.updated_at && new Date(x.updated_at).getTime() >= dal);
  const dati = (x) => x.dati_raccolti || {};
  const stato = (x) => dati(x)._stato || null;

  const perIntent = {};
  for (const x of r) { const i = stato(x)?.intent; if (i && i !== 'unknown') perIntent[i] = (perIntent[i] || 0) + 1; }

  const motiviHandoff = {};
  for (const x of r) {
    const m = dati(x)._handoff?.motivo;
    if (m) motiviHandoff[m] = (motiviHandoff[m] || 0) + 1;
  }

  const nonCapite = r.filter((x) => dati(x)._handoff?.motivo === 'non_compreso' || (stato(x)?.unknown_turns || 0) >= 1);
  const confermati = r.filter((x) => dati(x)._fase === 'confermato').length;

  // Lead "freddi": hanno lasciato dei dati, non hanno concluso, silenzio da più di 24 ore.
  const freddi = r.filter((x) => {
    const d = dati(x);
    const haDati = Object.entries(d).some(([k, v]) => v && !k.startsWith('_') && k !== 'urgente');
    const chiuso = d._fase === 'confermato' || x.stato === 'completata';
    return haDati && !chiuso && adesso - new Date(x.updated_at).getTime() > GIORNO;
  });

  return {
    giorni,
    conversazioni: r.length,
    appuntamenti_confermati: confermati,
    urgenze: r.filter((x) => x.stato === 'urgente' || dati(x).urgente === true || dati(x).urgente === 'true').length,
    passate_allo_staff: r.filter((x) => x.stato === 'handoff').length,
    per_intent: Object.entries(perIntent).sort((a, b) => b[1] - a[1]).slice(0, 6),
    motivi_handoff: Object.entries(motiviHandoff).sort((a, b) => b[1] - a[1]).map(([k, n]) => [MOTIVI[k] || k, n]),
    domande_non_capite: nonCapite.slice(0, 5).map((x) => ultimoMessaggioCliente(x)).filter(Boolean),
    lead_da_recuperare: freddi.length,
    valore_appuntamenti: valoreMedio != null ? confermati * valoreMedio : null,
  };
}
