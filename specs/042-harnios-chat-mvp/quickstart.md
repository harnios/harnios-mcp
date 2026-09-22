# Quickstart — Harnios Chat MVP

## Prerequisites

- Storage S3-compatible configurato e raggiungibile.
- Company OS inizializzato con `os/AGENTS.md`.
- Credenziali owner configurate e sessione autenticata.
- `MISTRAL_API_KEY` valorizzata per il provider iniziale, oppure configurazione `CHAT_MODEL` supportata dal resolver.

## Install and run

```sh
cd frontend
npm install
npm run dev
```

Aprire `http://localhost:3000`, autenticarsi e verificare il pulsante flottante nell'angolo inferiore destro.

## Scenario 1 — Basic chat

1. Aprire `/` o `/tools` con sessione owner attiva.
2. Fare click sul pulsante chat.
3. Verificare una finestra di circa due terzi della viewport in larghezza e un terzo in altezza.
4. Inviare `Rispondi con una frase breve.`
5. Verificare il messaggio utente e la risposta assistant in streaming.
6. Chiudere e riaprire la finestra; verificare che i messaggi restino presenti.

## Scenario 2 — Navigation state

1. Con una conversazione aperta, navigare da `/` a `/tools` e poi `/schedules` senza refresh completo.
2. Verificare che il pulsante, la finestra e la conversazione mantengano lo stato.
3. Fare refresh completo.
4. Verificare che la conversazione temporanea sia stata persa e che non siano comparsi oggetti di cronologia nello storage.

## Scenario 3 — Authentication boundary

1. Eseguire il logout.
2. Aprire una pagina pubblica o `/oauth/login`.
3. Verificare che il pulsante chat non sia presente.
4. Chiamare `POST /api/chat` senza sessione e verificare `401 unauthorized`.

## Scenario 4 — Harnios context and read tool

1. Autenticarsi e aprire la chat.
2. Inviare una richiesta che richieda la lettura di un file noto, ad esempio `Leggi os/AGENTS.md e riassumi le regole di routing.`
3. Verificare che il modello possa proporre/eseguire `read_file`.
4. Verificare che il risultato MCP e lo stato del tool siano visibili nella conversazione.

## Scenario 5 — Mutating approval

1. Chiedere un'operazione che modifichi un file.
2. Verificare che compaia una richiesta di conferma prima dell'esecuzione.
3. Negare la richiesta e verificare che il file non cambi.
4. Ripetere approvando e verificare risultato o errore esplicito.

## Scenario 6 — Failure states

- Rimuovere temporaneamente la configurazione del provider: la UI mostra un errore non sensibile.
- Disabilitare un tool dalla pagina Tools: il tool non appare nella discovery successiva.
- Rendere irraggiungibile una connessione MCP esterna: la chat mostra un errore proxy senza dichiarare successo.

## Static verification

```sh
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Verificare inoltre che la cronologia non venga scritta su S3 e che le route/form esistenti restino funzionanti.
