# Respiro

Una piccola app per iPhone che aiuta a gestire l'ansia nei momenti difficili e a conoscerla meglio nel tempo.

È una **web app installabile** (PWA): si aggiunge alla schermata Home come una normale app, funziona **offline** e **tutti i dati restano sul telefono**. Niente account, niente server, niente App Store.

## Cosa contiene

| Sezione | A cosa serve |
|---|---|
| **Respira** | 4 esercizi guidati con un cerchio animato: respiro quadrato, 4-7-8, respiro coerente, sospiro fisiologico |
| **Torna al presente** | Tecnica di grounding 5-4-3-2-1, un passo alla volta |
| **Diario** | Check-in rapido: livello d'ansia 0–10, emozioni, sensazioni nel corpo, cosa è successo. Grafico degli ultimi 14 giorni |
| **Pensieri** | Diario cognitivo (tecnica della terapia cognitivo-comportamentale): si scrive un pensiero ansioso, si riconoscono le "trappole" e si cerca una lettura più equilibrata, misurando l'ansia prima e dopo |
| **SOS** | Schermata calma per i momenti peggiori: passi semplici, frasi personali, contatti di fiducia da chiamare con un tocco, numeri di emergenza e di ascolto |
| **Altro** | Nome, contatti, frasi personali, backup ed eliminazione dei dati |

Se un check-in registra un'ansia di 7 o più, l'app apre da sola la schermata SOS.

> ⚠️ L'app è un supporto, non sostituisce un medico o uno psicologo.

## Come installarla sull'iPhone

L'iPhone installa le web app solo da un indirizzo **https**. Il modo più semplice e gratuito è GitHub Pages:

1. Unisci questo branch su `main`.
2. Su GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (Con un account GitHub gratuito, Pages funziona solo se il repository è **pubblico**. Il codice non contiene dati personali: quelli restano sul telefono.)
3. Al primo push su `main` il workflow `.github/workflows/pages.yml` pubblica l'app su `https://<utente>.github.io/progetto-app/`.
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

Dopo aver modificato i file, cambia il nome della cache in `sw.js` (es. `respiro-v1` → `respiro-v2`) e pubblica. Alla successiva apertura con la connessione attiva l'iPhone scarica la nuova versione (a volte serve chiudere e riaprire l'app).

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
