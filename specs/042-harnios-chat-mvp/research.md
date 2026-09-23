# Research — Harnios Chat MVP

## Decision 1: AI SDK come contratto unico tra UI e modelli

- **Decision**: usare `ai` e `@ai-sdk/react` con il transport HTTP standard verso `/api/chat`; configurare il modello lato server tramite un resolver provider/modello.
- **Rationale**: l'API corrente di `useChat` usa un'architettura transport-based, gestisce stato e streaming e mantiene la UI indipendente dal provider. Il resolver può iniziare con Mistral e aggiungere in seguito provider locali/OpenAI-compatible senza cambiare la chat.
- **Alternatives considered**: mantenere il client `@mistralai/mistralai` direttamente nella UI o nel route handler; scartato perché lega il nuovo flusso a Mistral e duplica la gestione dello streaming.
- **References**: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat, https://ai-sdk.dev/docs/ai-sdk-ui/transport, https://ai-sdk.dev/providers/ai-sdk-providers/mistral

## Decision 2: assistant-ui come runtime e primitive, senza imporre un nuovo design system

- **Decision**: usare `@assistant-ui/react` e `@assistant-ui/ai-sdk`, con `AssistantRuntimeProvider` e `useChatRuntime`; costruire una superficie minimale composta da primitive assistant-ui e classi CSS già presenti in `globals.css`.
- **Rationale**: assistant-ui collega direttamente il runtime AI SDK, supporta streaming e tool call/approval e permette di sostituire gli elementi UI con componenti propri. Evitare il vecchio pacchetto pre-stilizzato e template Tailwind riduce il conflitto con il design system plain CSS del repository.
- **Alternatives considered**: UI custom basata solo su `useChat`; scartata perché richiederebbe reimplementare subito rendering dei messaggi, streaming, tool state e approval. `@assistant-ui/react-ui` legacy; scartato perché non è il percorso corrente di personalizzazione.
- **References**: https://github.com/assistant-ui/assistant-ui

## Decision 3: MCP in-process, non loopback HTTP

- **Decision**: creare il client MCP in-process con `McpServer` + `InMemoryTransport`, riusando `registerNativeTools` e aggiungendo `registerExternalTools` per lo stesso catalogo disponibile sull'endpoint `/mcp`.
- **Rationale**: il repository possiede già questo pattern in `lib/scheduler/toolRuntime.ts`; evita una seconda autenticazione, una chiamata HTTP interna e una divergenza tra tool visti dalla chat e tool esposti da Harnios. I tool vengono scoperti con `client.listTools()` e adattati al formato AI SDK.
- **Alternatives considered**: chiamare `/mcp` via HTTP come client esterno; scartato perché introduce OAuth/token handling interno e loopback fragile in ambienti serverless. Duplicare manualmente le funzioni dei tool; scartato perché crea drift con il catalogo MCP.

## Decision 4: esecuzione diretta dei tool MCP nel MVP

- **Decision**: eseguire direttamente tutti i tool MCP presenti nel catalogo autorizzato dall'istanza, senza `needsApproval` o conferme intermedie.
- **Rationale**: il flusso di approvazione è stato rimosso dal MVP per evitare che la conversazione resti bloccata in attesa; la chat continua comunque a mostrare stato, risultato ed errore del tool.
- **Future extension**: una policy di conferma potrà essere aggiunta in seguito per tool mutativi, side-effecting o esterni.

## Decision 5: contesto base letto server-side a ogni richiesta

- **Decision**: leggere `os/AGENTS.md` dallo storage server-side e includerlo nel system context insieme a una descrizione breve della disponibilità di Harnios MCP; non inviare il file come stato gestito dal browser.
- **Rationale**: `AGENTS.md` è la fonte operativa corrente del Company OS e può cambiare nello storage. La lettura per richiesta evita cache stale e non espone istruzioni interne nel client prima dell'invio.
- **Alternatives considered**: includere un duplicato statico nel bundle; scartato perché divergerebbe dal Company OS reale. Usare solo `MCP_BOOTSTRAP_PATH`; scartato perché la specifica richiede sempre `os/AGENTS.md`, indipendentemente dalla configurazione opzionale di bootstrap.

## Decision 6: runtime chat nel root layout

- **Decision**: montare un unico provider/client chat sotto il root layout, attivo solo per sessioni owner e superfici applicative, così lo stato sopravvive alla navigazione client-side.
- **Rationale**: Next.js mantiene il root layout durante la navigazione tra route; un provider più profondo verrebbe ricreato quando cambia il segmento. La decisione soddisfa la chiarificazione sulla persistenza in memoria senza aggiungere storage locale o S3.
- **Alternatives considered**: montare il componente dentro ogni pagina; scartato perché duplica la chat e perde lo stato tra route. Montarlo solo nell'header; scartato perché `/files` ha chrome proprio e la chat deve essere globale.

## Decision 7: modello iniziale configurabile con compatibilità futura

- **Decision**: introdurre `CHAT_MODEL` come identificatore provider/modello, con fallback compatibile alla configurazione Mistral già presente; implementare inizialmente il provider Mistral AI SDK e mantenere il resolver separato dalla UI.
- **Rationale**: il requisito richiede un modello reale configurabile e futura compatibilità con modelli locali. La separazione consente di aggiungere `@ai-sdk/openai-compatible` o un provider Ollama in seguito senza cambiare il contratto `/api/chat`.
- **Alternatives considered**: usare sempre `MISTRAL_MODEL`; scartato perché non esprime il provider e impedisce una transizione pulita a modelli locali.

## Decision 8: modalità esplicita invece di classificazione implicita

- **Decision**: mostrare un selettore `Harnios`/`General`, con Harnios predefinita. La modalità viene inviata dal transport a ogni richiesta e resta solo nello stato client della scheda.
- **Rationale**: un prompt che invita il modello a usare tool “quando utili” non garantisce grounding, mentre un classificatore aggiuntivo introduce latenza e può sbagliare. La scelta esplicita rende l'intento deterministico e comprensibile all'utente.
- **Alternatives considered**: prompt più forte senza enforcement, scartato perché non garantisce tool use; classificatore modello, scartato per latenza e incertezza; tool obbligatorio su ogni messaggio indipendentemente dalla modalità, scartato perché produce chiamate inutili nelle conversazioni generali.

## Decision 9: tool obbligatorio soltanto sul primo step Harnios

- **Decision**: in modalità Harnios usare tool choice obbligatoria sul primo step di ogni richiesta e automatica nei passi successivi; in modalità General non creare il client MCP e non esporre tool.
- **Rationale**: il primo step obbligatorio garantisce almeno una fonte MCP, mentre i passi successivi automatici consentono una risposta conclusiva e impediscono loop di tool call. Non creare MCP in modalità General rende la separazione verificabile anche lato server.
- **Alternatives considered**: tool choice obbligatoria su tutti gli step, scartata perché impedisce una normale risposta finale; lasciare i tool opzionali in General, scartato perché rende la modalità ambigua; fallback prompt-only per provider incompatibili, scartato perché violerebbe la garanzia dichiarata.
