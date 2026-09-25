# Contract: MCP Chat Bridge

## Purpose

Adattare il server MCP Harnios esistente al modello di tool calling dell'AI SDK senza duplicare l'implementazione dei tool.

## Tool discovery

Per ogni richiesta chat il bridge:

1. crea una coppia `McpServer`/`Client` in-process;
2. registra i tool nativi con il gating dello storage;
3. registra i tool esterni abilitati, applicando catalogo, collisioni e rate limit già esistenti;
4. esegue `client.listTools()`;
5. converte nome, descrizione e JSON Schema MCP in tool AI SDK.

Il bridge viene inizializzato esclusivamente per richieste con modalità `harnios`. In modalità `general` il route handler non crea il client MCP e non esegue discovery. Sul primo step Harnios il modello deve scegliere almeno uno dei tool scoperti; dagli step successivi la scelta torna automatica per permettere la sintesi finale.

Il catalogo è ricostruito per richiesta per riflettere i tool disabilitati/abilitati e le connessioni esterne correnti. Per ogni nuovo turno Harnios, il server esegue `read_file` con `{"path":"AGENTS.md"}` prima di avviare il modello, nella stessa sessione MCP; il catalogo completo resta esposto al modello per tutti gli step successivi.

## Tool execution

Ogni tool AI SDK delega a `client.callTool({ name, arguments })`. Il risultato mantiene il contenuto MCP e il flag di errore, trasformandoli in un risultato serializzabile per lo stream.

## Tool execution

Il bridge espone tutti i tool abilitati dall'istanza e li esegue direttamente quando il modello li invoca. Non viene applicata una classificazione read-only e non viene richiesto `needsApproval` nel MVP.

Read-only iniziali già presenti nel catalogo:

- `read_file`
- `list_directory`
- `list_directory_tree`
- `find_files_by_name`
- `search_file_content`
- `get_os_engine`
- `get_os_upgrade`
- `get_os_init`
- `get_inbox`
- `get_docs`

Gli altri tool nativi e i tool esterni restano disponibili secondo il catalogo e i permessi dell'istanza.

## Cleanup and failures

- Il client MCP viene chiuso in `finally` dopo la risposta o l'errore.
- Un fallimento di discovery o di esecuzione non viene trasformato in successo.
- Tool esterni mantengono i timeout e gli error code del proxy esistente.
- La risposta alla chat non include token, URL autenticati o dettagli di connessione.
