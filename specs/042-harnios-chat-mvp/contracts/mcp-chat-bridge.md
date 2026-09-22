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

Il catalogo è ricostruito per richiesta per riflettere i tool disabilitati/abilitati e le connessioni esterne correnti.

## Tool execution

Ogni tool AI SDK delega a `client.callTool({ name, arguments })`. Il risultato mantiene il contenuto MCP e il flag di errore, trasformandoli in un risultato serializzabile per lo stream.

## Classification

Read-only iniziali:

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

Tutti gli altri tool nativi e tutti i tool esterni richiedono approval. Questa lista è una policy del bridge, non una modifica alle descrizioni MCP.

## Cleanup and failures

- Il client MCP viene chiuso in `finally` dopo la risposta o l'errore.
- Un fallimento di discovery o di esecuzione non viene trasformato in successo.
- Tool esterni mantengono i timeout e gli error code del proxy esistente.
- La risposta alla chat non include token, URL autenticati o dettagli di connessione.
