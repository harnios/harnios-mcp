# Contract: Chat API

## `POST /api/chat`

Endpoint autenticato usato dal runtime AI SDK/assistant-ui.

### Authentication

- Richiede una sessione owner attiva tramite lo stesso controllo usato dalle API protette dell'app.
- Una richiesta senza sessione valida termina prima di leggere lo storage o chiamare il provider.
- Risposta non autenticata: `401` con `{ "code": "unauthorized", "message": "Sign in required" }`.

### Request

Il body è il payload UI-message del transport AI SDK e contiene:

- messaggi della conversazione corrente;
- `mode`, enum opzionale `harnios | general`; se assente il server usa `harnios` per compatibilità;
- eventuali parti di cronologia AI SDK prodotte da versioni precedenti del client; il server non richiede approval per eseguire i tool;
- nessuna credenziale, configurazione provider o contenuto S3 inviato direttamente dal browser come contesto privilegiato.

Il server valida la struttura dei messaggi e costruisce il contesto trusted (`AGENTS.md`, istruzioni base e catalogo MCP) server-side.

Un valore `mode` sconosciuto restituisce `400 invalid_request` prima di creare il client MCP o invocare il provider.

### Successful response

- Status `200`.
- Content type e formato stream compatibili con il transport corrente di AI SDK e con `useChat`/`useChatRuntime`.
- Lo stream può contenere testo assistant, stati tool, risultati tool ed errori non sensibili.
- In modalità `harnios`, il primo step generativo richiede una tool call; gli step successivi possono produrre testo o altre tool call.
- In modalità `general`, la richiesta non espone tool e lo stream non contiene nuove parti tool.

### Error responses

| Status | Code | Condizione |
|---|---|---|
| `400` | `invalid_request` | Body o messaggi non validi. |
| `401` | `unauthorized` | Sessione owner mancante/scaduta. |
| `500` | `chat_unavailable` | Configurazione provider, MCP o errore inatteso non recuperabile. |
| `502` | `provider_unreachable` | Provider modello o tool esterno non raggiungibile. |

I messaggi di errore sono adatti alla UI e non contengono API key, token, prompt riservati o stack trace.

## Tool execution contract

1. Il modello genera una tool call.
2. Il server verifica che il tool appartenga al catalogo MCP autorizzato.
3. Il server esegue direttamente il tool senza una richiesta di approval intermedia nel MVP.
4. Il risultato o errore del tool torna nello stream e viene mostrato nella conversazione.

Gli argomenti e i risultati strutturati sono serializzabili come JSON e la UI li presenta in pannelli richiudibili, inizialmente chiusi.

## Security invariants

- Il client non può scegliere tool fuori dal catalogo MCP corrente.
- Il client non può invocare tool fuori dal catalogo MCP corrente: il server ricostruisce sempre il catalogo.
- I tool disabilitati dall'istanza non vengono esposti al modello.
- Il client non può rendere opzionali i tool in modalità `harnios`; la policy di scelta viene applicata dal server.
- La modalità `general` non inizializza il client MCP e non può eseguire tool, anche se la cronologia contiene precedenti parti tool.
- Le credenziali del provider, dei proxy esterni e dello storage restano server-side.
