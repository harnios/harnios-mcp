# Data Model — Harnios Chat MVP

## Chat session

Rappresenta la conversazione temporanea gestita dal runtime client.

| Campo | Tipo | Vincoli |
|---|---|---|
| `id` | string | Generato dal runtime; non persistito. |
| `messages` | array di `ChatMessage` | Ordine cronologico; contiene messaggi e parti tool. |
| `status` | enum | `ready`, `submitted`, `streaming`, `error`. |
| `error` | stringa opzionale | Solo messaggio non sensibile per la UI. |
| `mode` | enum | `harnios` o `general`; default `harnios`, non persistito. |

Lifecycle: creata al mount del provider globale, mantenuta durante la navigazione client-side, azzerata su refresh completo o chiusura della scheda.

La modalità può cambiare solo quando la sessione non sta producendo una risposta e non contiene un'approvazione irrisolta. Il cambio non rimuove i messaggi esistenti e vale dalla richiesta successiva.

## Chat message

Messaggio visualizzato nella chat e inviato al modello.

| Campo | Tipo | Vincoli |
|---|---|---|
| `id` | string | Unico nella sessione. |
| `role` | enum | `user`, `assistant`, `system`, `tool` secondo il formato AI SDK. |
| `parts` | array | Testo, reasoning, tool call, tool result o approval; il rendering non deve assumere solo testo. |
| `state` | enum opzionale | `streaming`, `complete`, `error`, `approval-required`. |

## Model configuration

Configurazione server-side del provider utilizzato dalla chat.

| Campo | Tipo | Vincoli |
|---|---|---|
| `provider` | string | Identifica l'adapter, inizialmente `mistral`. |
| `model` | string | Identificatore del modello del provider. |
| `apiKey` | secret server-side | Mai inviato al browser o incluso nei messaggi. |

La configurazione non viene salvata nello storage del Company OS.

## Harnios base context

Contesto costruito server-side per ogni richiesta.

| Componente | Origine | Regola |
|---|---|---|
| Base instructions | codice del chat runtime | Istruzioni brevi per il comportamento della chat. |
| `AGENTS.md` | `os/AGENTS.md` nello storage | Letto server-side; errore leggibile se storage non raggiungibile. |
| MCP tool catalog | server MCP in-process | Include solo tool abilitati e disponibili al momento della richiesta. |

Il catalogo MCP viene costruito solo in modalità `harnios`. In modalità `general` il contesto mantiene le istruzioni di base e `AGENTS.md`, ma non include strumenti eseguibili.

## MCP tool invocation

Rappresenta una richiesta o esecuzione di uno strumento MCP.

| Campo | Tipo | Vincoli |
|---|---|---|
| `toolName` | string | Deve appartenere al catalogo MCP corrente. |
| `input` | JSON object | Validato dallo schema dichiarato dal tool. |
| `approval` | enum opzionale | `not-required`, `requested`, `approved`, `denied`. |
| `state` | enum | `queued`, `running`, `completed`, `failed`. |
| `result` | JSON/text opzionale | Sanitizzato prima del rendering. |

I tool mutativi, side-effecting, esterni o non classificati come read-only richiedono `approval=approved` prima dell'esecuzione.

## Relationships

```text
ChatSession 1 ─── N ChatMessage
ChatMessage 1 ─── N MCPToolInvocation (quando contiene tool-call/tool-result)
ChatSession N ─── 1 ModelConfiguration (configurazione corrente server-side)
```

Nessuna entità viene persistita nello storage durante questo MVP.
