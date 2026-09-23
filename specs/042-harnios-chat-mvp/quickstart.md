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
5. Verificare che `Harnios` sia la modalità predefinita, che compaia almeno una tool call e poi la risposta assistant in streaming.
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
5. Aprire il pannello del risultato e verificare che il JSON sia leggibile; richiuderlo e verificare che resti chiuso.
6. Inviare una richiesta lunga, premere `Stop` e verificare che la risposta si interrompa mantenendo il contenuto già ricevuto.
7. Premere `Reset` e verificare che i messaggi della chat locale vengano rimossi senza modificare dati persistenti.
8. Su desktop e mobile verificare che la finestra arrivi fino alla base della viewport, inizi sotto l'header quando presente e mantenga sempre visibile il composer.

## Scenario 5 — Direct tool execution

1. Chiedere un'operazione che modifichi un file.
2. Verificare che il tool venga avviato direttamente senza richiesta di conferma.
3. Verificare che la UI mostri risultato o errore esplicito.

## Scenario 6 — Failure states

- Rimuovere temporaneamente la configurazione del provider: la UI mostra un errore non sensibile.
- Disabilitare un tool dalla pagina Tools: il tool non appare nella discovery successiva.
- Rendere irraggiungibile una connessione MCP esterna: la chat mostra un errore proxy senza dichiarare successo.
- Configurare un provider senza supporto al tool calling obbligatorio: la modalità Harnios mostra un errore sicuro e non risponde senza tool.

## Scenario 7 — Explicit chat modes

1. Con la chat inattiva, selezionare `Generale` e inviare una domanda generale.
2. Verificare che la risposta non contenga nuove tool call MCP.
3. Tornare a `Harnios` e verificare che la cronologia precedente resti visibile.
4. Inviare un nuovo messaggio e verificare almeno una tool call prima della risposta conclusiva.
5. Durante lo streaming, verificare che il selettore modalità sia disabilitato.
6. Chiamare `POST /api/chat` con una modalità sconosciuta e verificare `400 invalid_request`; omettere la modalità e verificare il default Harnios.

## Static verification

```sh
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Verificare inoltre che la cronologia non venga scritta su S3 e che le route/form esistenti restino funzionanti.
