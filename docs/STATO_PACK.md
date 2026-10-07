# Stato dei Sector Pack

Generato dal codice (valutazione deterministica offline, `node scripts/valuta-pack.mjs <settore>`). Non misura la qualità del testo generato dal modello. Le liste di sicurezza e le FAQ sono scritte da AI: ogni settore regolamentato va rivisto da un professionista prima dell'uso con clienti reali.

| Settore | Intent | FAQ | Scenari | Gate | Holdout (scenari) |
|---|---|---|---|---|---|
| dentista | 18 | 24 | 162/162 | superato | — |
| medico | 21 | 24 | 215/215 | superato | 60 |
| veterinario | 22 | 21 | 162/162 | superato | 44 |
| fisioterapista | 20 | 25 | 215/215 | superato | 34 |
| estetista | 20 | 30 | 169/169 | superato | 50 |
| parrucchiere | 20 | 25 | 174/174 | superato | 57 |
| palestra_personal_trainer | 28 | 26 | 192/192 | superato | 56 |
| elettricista | 20 | 21 | 162/162 | superato | 37 |
| fabbro | 22 | 26 | 209/209 | superato | 44 |
| imbianchino | 21 | 28 | 184/184 | superato | 46 |
| giardiniere | 21 | 24 | 206/206 | superato | 49 |
| autofficina | 20 | 27 | 168/168 | superato | 34 |
| carrozzeria | 27 | 30 | 235/235 | superato | 68 |
| gommista | 23 | 34 | 202/202 | superato | 48 |
| traslochi | 20 | 32 | 193/193 | superato | 54 |
| pulizie | 25 | 25 | 197/197 | superato | 45 |
| avvocato | 22 | 25 | 214/214 | superato | 73 |
| commercialista | 26 | 24 | 207/207 | superato | 60 |
| consulente | 32 | 23 | 194/194 | superato | 60 |
| amministratore_condominio | 23 | 28 | 182/182 | superato | 62 |
| immobiliare | 22 | 19 | 154/154 | superato | 32 |
| agenzia_web_grafica | 32 | 25 | 221/221 | superato | 66 |
| fotografo_videomaker | 30 | 27 | 227/227 | superato | 72 |
| organizzazione_eventi | 26 | 24 | 170/170 | superato | 52 |
| bar_caffetteria | 21 | 23 | 161/161 | superato | 28 |
| ristorante | 22 | 24 | 138/138 | superato | 40 |
| noleggio | 28 | 27 | 182/182 | superato | 79 |
| scuola_guida | 28 | 26 | 187/187 | superato | 53 |
| centro_corsi | 32 | 27 | 260/260 | superato | 72 |

Il primo giro dell'holdout (formulazioni nuove, a pack congelato) è riportato onestamente nel commento di testa di ogni file `<settore>.holdout.js`: è quello il dato di generalizzazione, non il risultato dopo le correzioni.
