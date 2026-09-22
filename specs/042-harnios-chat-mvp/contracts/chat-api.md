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
- eventuali `tool-approval-response` provenienti da una conferma/negazione dell'utente;
- nessuna credenziale, configurazione provider o contenuto S3 inviato direttamente dal browser come contesto privilegiato.

Il server valida la struttura dei messaggi e costruisce il contesto trusted (`AGENTS.md`, istruzioni base e catalogo MCP) server-side.

Un valore `mode` sconosciuto restituisce `400 invalid_request` prima di creare il client MCP o invocare il provider.

### Successful response

- Status `200`.
- Content type e formato stream compatibili con il transport corrente di AI SDK e con `useChat`/`useChatRuntime`.
- Lo stream può contenere testo assistant, stati tool, richieste di approval, risultati tool ed errori non sensibili.
- In modalità `harnios`, il primo step generativo richiede una tool call; gli step successivi possono produrre testo o altre tool call.
- In modalità `general`, la richiesta non espone tool e lo stream non contiene nuove parti tool.

### Error responses

| Status | Code | Condizione |
|---|---|---|
| `400` | `invalid_request` | Body o messaggi non validi. |
| `401` | `unauthorized` | Sessione owner mancante/scaduta. |
| `409` | `approval_required` | Tentativo di eseguire un'operazione mutativa senza approval valida. |
| `500` | `chat_unavailable` | Configurazione provider, MCP o errore inatteso non recuperabile. |
| `502` | `provider_unreachable` | Provider modello o tool esterno non raggiungibile. |

I messaggi di errore sono adatti alla UI e non contengono API key, token, prompt riservati o stack trace.

## Tool approval contract

1. Il modello genera una tool call.
2. Il server classifica il tool.
3. Per tool mutativi, side-effecting, esterni o non classificati come read-only, lo stream espone una richiesta di approval e non esegue il tool.
4. La UI mostra nome tool e input sintetizzato in modo leggibile.
5. La UI invia `approved=true` o `approved=false` tramite il protocollo AI SDK.
6. Solo una approval positiva consente al server di eseguire `client.callTool`.
7. Il risultato o errore del tool torna nello stream e viene mostrato nella conversazione.

## Security invariants

- Il client non può scegliere tool fuori dal catalogo MCP corrente.
- Il client non può bypassare una approval mutativa alterando il payload: il server riclassifica sempre il tool.
- I tool disabilitati dall'istanza non vengono esposti al modello.
- Il client non può rendere opzionali i tool in modalità `harnios`; la policy di scelta viene applicata dal server.
- La modalità `general` non inizializza il client MCP e non può eseguire tool, anche se la cronologia contiene precedenti parti tool.
- Le credenziali del provider, dei proxy esterni e dello storage restano server-side.
