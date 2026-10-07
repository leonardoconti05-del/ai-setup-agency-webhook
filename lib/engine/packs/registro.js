// Registro dei pack disponibili (uno per ogni settore di lib/settori.js). Import con percorsi LETTERALI (così il bundler di Vercel include i file).
export const SETTORI_DISPONIBILI = ["dentista", "medico", "veterinario", "fisioterapista", "estetista", "parrucchiere", "palestra_personal_trainer", "elettricista", "fabbro", "imbianchino", "giardiniere", "autofficina", "carrozzeria", "gommista", "traslochi", "pulizie", "avvocato", "commercialista", "consulente", "amministratore_condominio", "immobiliare", "agenzia_web_grafica", "fotografo_videomaker", "organizzazione_eventi", "bar_caffetteria", "ristorante", "noleggio", "scuola_guida", "centro_corsi"];

const caricatori = {
  dentista: async () => ({ ...(await import('./dentista.js')), ...(await import('./dentista.scenari.js')) }),
  medico: async () => ({ ...(await import('./medico.js')), ...(await import('./medico.scenari.js')) }),
  veterinario: async () => ({ ...(await import('./veterinario.js')), ...(await import('./veterinario.scenari.js')) }),
  fisioterapista: async () => ({ ...(await import('./fisioterapista.js')), ...(await import('./fisioterapista.scenari.js')) }),
  estetista: async () => ({ ...(await import('./estetista.js')), ...(await import('./estetista.scenari.js')) }),
  parrucchiere: async () => ({ ...(await import('./parrucchiere.js')), ...(await import('./parrucchiere.scenari.js')) }),
  palestra_personal_trainer: async () => ({ ...(await import('./palestra_personal_trainer.js')), ...(await import('./palestra_personal_trainer.scenari.js')) }),
  elettricista: async () => ({ ...(await import('./elettricista.js')), ...(await import('./elettricista.scenari.js')) }),
  fabbro: async () => ({ ...(await import('./fabbro.js')), ...(await import('./fabbro.scenari.js')) }),
  imbianchino: async () => ({ ...(await import('./imbianchino.js')), ...(await import('./imbianchino.scenari.js')) }),
  giardiniere: async () => ({ ...(await import('./giardiniere.js')), ...(await import('./giardiniere.scenari.js')) }),
  autofficina: async () => ({ ...(await import('./autofficina.js')), ...(await import('./autofficina.scenari.js')) }),
  carrozzeria: async () => ({ ...(await import('./carrozzeria.js')), ...(await import('./carrozzeria.scenari.js')) }),
  gommista: async () => ({ ...(await import('./gommista.js')), ...(await import('./gommista.scenari.js')) }),
  traslochi: async () => ({ ...(await import('./traslochi.js')), ...(await import('./traslochi.scenari.js')) }),
  pulizie: async () => ({ ...(await import('./pulizie.js')), ...(await import('./pulizie.scenari.js')) }),
  avvocato: async () => ({ ...(await import('./avvocato.js')), ...(await import('./avvocato.scenari.js')) }),
  commercialista: async () => ({ ...(await import('./commercialista.js')), ...(await import('./commercialista.scenari.js')) }),
  consulente: async () => ({ ...(await import('./consulente.js')), ...(await import('./consulente.scenari.js')) }),
  amministratore_condominio: async () => ({ ...(await import('./amministratore_condominio.js')), ...(await import('./amministratore_condominio.scenari.js')) }),
  immobiliare: async () => ({ ...(await import('./immobiliare.js')), ...(await import('./immobiliare.scenari.js')) }),
  agenzia_web_grafica: async () => ({ ...(await import('./agenzia_web_grafica.js')), ...(await import('./agenzia_web_grafica.scenari.js')) }),
  fotografo_videomaker: async () => ({ ...(await import('./fotografo_videomaker.js')), ...(await import('./fotografo_videomaker.scenari.js')) }),
  organizzazione_eventi: async () => ({ ...(await import('./organizzazione_eventi.js')), ...(await import('./organizzazione_eventi.scenari.js')) }),
  bar_caffetteria: async () => ({ ...(await import('./bar_caffetteria.js')), ...(await import('./bar_caffetteria.scenari.js')) }),
  ristorante: async () => ({ ...(await import('./ristorante.js')), ...(await import('./ristorante.scenari.js')) }),
  noleggio: async () => ({ ...(await import('./noleggio.js')), ...(await import('./noleggio.scenari.js')) }),
  scuola_guida: async () => ({ ...(await import('./scuola_guida.js')), ...(await import('./scuola_guida.scenari.js')) }),
  centro_corsi: async () => ({ ...(await import('./centro_corsi.js')), ...(await import('./centro_corsi.scenari.js')) }),
};

export async function caricaDefinizionePack(settore) {
  if (!Object.prototype.hasOwnProperty.call(caricatori, settore)) return null;
  return caricatori[settore]();
}
