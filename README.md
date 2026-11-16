# Fusa

Una piccola app per iPhone, con un gatto come compagno, per gestire l'ansia: soprattutto **pensieri a ciclo** e **paranoie** su lavoro, studio e giudizio degli altri. Tono dolce, con un po' di ironia.

È una **web app installabile** (PWA): si aggiunge alla schermata Home come una normale app, funziona **offline** e **tutti i dati restano sul telefono**. Niente account, niente server, niente App Store.

## Cosa contiene

| Sezione | A cosa serve |
|---|---|
| **Pensiero in loop** | Quando la testa gira in tondo: si scrive il pensiero e si capisce se c'è qualcosa di concreto da fare (→ un "piccolo passo" da spuntare) o se va lasciato andare (→ scatola, analisi, distrazione, respiro) |
| **Cosa penseranno di me?** | Per le paranoie sugli altri: "lo so o lo suppongo?", tre spiegazioni alternative, "tra un anno conterà?", l'effetto riflettore |
| **Scatola delle paranoie** | Si scrive cosa si teme e quanto se ne è sicure; dopo si segna com'è andata. L'app mostra quante paure non si sono avverate |
| **Pausa dal cervello** | Attività da provare: si segna cosa ha aiutato e l'app mette in cima quello che funziona per lei |
| **Respira** | 4 esercizi guidati con un gatto che si gonfia e sgonfia |
| **Torna al presente** | Grounding 5-4-3-2-1 |
| **Diario** | Check-in con livello d'ansia, argomento (lavoro/studio/giudizio), emozioni e corpo; grafico di 14 giorni e "cosa ti agita di più" |
| **Esamina un pensiero** | Diario cognitivo con le trappole mentali più comuni |
| **SOS** | Schermata calma per i momenti peggiori, contatti di fiducia, numeri utili |
| **Altro** | Nome, nome del gatto, contatti, frasi personali, backup |

Se un check-in registra ansia ≥ 7 si apre l'SOS; se segna "In loop" o "Paranoica" si apre lo strumento per i pensieri in loop.

> ⚠️ L'app è un supporto, non sostituisce un medico o uno psicologo.

## Come installarla sull'iPhone

L'iPhone installa le web app solo da un indirizzo **https**. Il modo più semplice e gratuito è GitHub Pages:

1. Unisci questo branch su `main`.
2. Su GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (Con un account GitHub gratuito, Pages funziona solo se il repository è **pubblico**. Il codice non contiene dati personali: quelli restano sul telefono.)
3. Al primo push su `main` il workflow `.github/workflows/pages.yml` pubblica l'app su `https://abusivo00.github.io/progetto-app/`.
4. Sull'iPhone apri quell'indirizzo con **Safari** → tasto **Condividi** → **Aggiungi alla schermata Home**.
5. Apri l'app dall'icona: da quel momento funziona anche senza connessione.

In alternativa a GitHub Pages va bene qualsiasi hosting statico https (Netlify, Cloudflare Pages, Vercel): basta caricare la cartella così com'è.

### Provarla sul computer

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Dati e privacy

- I dati sono salvati nel `localStorage` del telefono, dentro l'app installata. Non escono mai dal dispositivo.
- **Se si elimina l'icona dalla Home, i dati vengono cancellati.** Ogni tanto conviene usare *Altro → Esporta backup* (il file si può salvare in File/iCloud) e *Importa backup* per ripristinarli.

## Aggiornare l'app

Dopo aver modificato i file, cambia il nome della cache in `sw.js` (es. `fusa-v2` → `fusa-v3`) e pubblica. Alla successiva apertura con la connessione attiva l'iPhone scarica la nuova versione (a volte serve chiudere e riaprire l'app).

## Struttura

```
index.html            pagina principale
css/style.css         stile (chiaro/scuro automatico)
js/app.js             tutta la logica
sw.js                 service worker per l'uso offline
manifest.webmanifest  nome e icone per l'installazione
icons/                icone dell'app
```

I numeri di ascolto (Telefono Amico, Samaritans) sono in `js/app.js`, nella costante `EMERGENCY`: conviene controllarli ogni tanto sui siti ufficiali.
