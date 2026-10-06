// Registro dei pack disponibili. Import con percorsi LETTERALI (così il bundler di Vercel include i file).
export const SETTORI_DISPONIBILI = ["autofficina", "bar_caffetteria", "dentista", "elettricista", "estetista", "fisioterapista", "immobiliare", "parrucchiere", "ristorante", "veterinario"];

const caricatori = {
  autofficina: async () => ({ ...(await import('./autofficina.js')), ...(await import('./autofficina.scenari.js')) }),
  bar_caffetteria: async () => ({ ...(await import('./bar_caffetteria.js')), ...(await import('./bar_caffetteria.scenari.js')) }),
  dentista: async () => ({ ...(await import('./dentista.js')), ...(await import('./dentista.scenari.js')) }),
  elettricista: async () => ({ ...(await import('./elettricista.js')), ...(await import('./elettricista.scenari.js')) }),
  estetista: async () => ({ ...(await import('./estetista.js')), ...(await import('./estetista.scenari.js')) }),
  fisioterapista: async () => ({ ...(await import('./fisioterapista.js')), ...(await import('./fisioterapista.scenari.js')) }),
  immobiliare: async () => ({ ...(await import('./immobiliare.js')), ...(await import('./immobiliare.scenari.js')) }),
  parrucchiere: async () => ({ ...(await import('./parrucchiere.js')), ...(await import('./parrucchiere.scenari.js')) }),
  ristorante: async () => ({ ...(await import('./ristorante.js')), ...(await import('./ristorante.scenari.js')) }),
  veterinario: async () => ({ ...(await import('./veterinario.js')), ...(await import('./veterinario.scenari.js')) }),
};

export async function caricaDefinizionePack(settore) {
  if (!Object.prototype.hasOwnProperty.call(caricatori, settore)) return null;
  return caricatori[settore]();
}
