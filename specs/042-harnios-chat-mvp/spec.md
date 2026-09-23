# Feature Specification: Harnios Chat MVP

**Feature Branch**: `042-harnios-chat-mvp`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Creare una struttura minima funzionante per una chat globale nell'app: un pulsante disponibile da qualsiasi pagina per il cliente loggato, una finestra chat minimale con invio messaggi e risposte, usando AI SDK latest, useChat e assistant-ui. La persistenza, i comandi e gli strumenti avanzati verranno dopo, ma l'architettura deve tenerli in considerazione."

## Clarifications

### Session 2026-09-22

- Q: La conversazione deve restare disponibile quando l'utente naviga tra pagine dell'app senza fare un refresh completo? → A: Sì, conserva messaggi e stato durante la navigazione client-side; perdi la conversazione con refresh o chiusura della scheda.
- Q: Nel MVP, cosa deve significare concretamente “Harnios MCP sempre incluso” nel contesto della chat? → A: La chat deve avere accesso reale agli strumenti Harnios MCP disponibili al modello.
- Q: Quali strumenti Harnios MCP può usare la chat nel MVP? → A: Tutti gli strumenti abilitati dall'istanza; nel MVP vengono eseguiti direttamente senza una conferma intermedia.
- Q: Come deve distinguere la chat le richieste operative Harnios dalle conversazioni generali? → A: Tramite una modalità esplicita scelta nell'interfaccia, con `Harnios` attiva per impostazione predefinita e `Generale` disponibile senza strumenti MCP.
- Q: Cosa accade alla conversazione cambiando modalità? → A: La cronologia resta visibile e la nuova modalità si applica ai messaggi successivi; il cambio è bloccato durante una risposta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversare con l'assistente (Priority: P1)

Come cliente autenticato, voglio aprire una chat dall'app e inviare un messaggio per ricevere una risposta dell'assistente senza cambiare pagina.

**Why this priority**: È il valore minimo dimostrabile della funzionalità e il prerequisito per ogni evoluzione futura della chat.

**Independent Test**: Accedere a una pagina autenticata, aprire la chat, inviare un messaggio e verificare che la risposta venga mostrata nella stessa finestra.

**Acceptance Scenarios**:

1. **Given** un cliente autenticato su una pagina applicativa, **When** seleziona il pulsante flottante della chat, **Then** si apre una finestra chat sovrapposta alla pagina corrente.
2. **Given** la finestra chat aperta, **When** il cliente inserisce un messaggio non vuoto e lo invia, **Then** il messaggio viene mostrato nella conversazione e l'assistente inizia a produrre una risposta.
3. **Given** una risposta in corso, **When** arrivano nuovi contenuti, **Then** la risposta viene mostrata progressivamente senza richiedere un nuovo caricamento della pagina.
4. **Given** una conversazione già aperta, **When** il cliente chiude e riapre la finestra nella stessa pagina, **Then** i messaggi restano disponibili nello stato corrente della pagina.
5. **Given** una conversazione aperta, **When** il cliente naviga verso un'altra pagina applicativa senza un refresh completo, **Then** la chat conserva messaggi e stato correnti.

### User Story 2 - Chat disponibile nell'app autenticata (Priority: P1)

Come cliente autenticato, voglio poter aprire la chat da qualsiasi sezione dell'app senza dover raggiungere una pagina dedicata.

**Why this priority**: La chat deve essere una capacità trasversale dell'app, non una sezione isolata.

**Independent Test**: Visitare più sezioni autenticate dell'app, inclusa l'area file quando applicabile, e verificare che il pulsante flottante sia disponibile e che l'apertura non abbandoni la pagina.

**Acceptance Scenarios**:

1. **Given** un cliente autenticato, **When** visita una qualsiasi pagina applicativa supportata, **Then** il pulsante chat è visibile nell'angolo inferiore destro.
2. **Given** un visitatore non autenticato o una superficie pubblica/pre-autenticazione, **When** la pagina viene visualizzata, **Then** il pulsante chat non è disponibile.
3. **Given** una finestra chat aperta, **When** il cliente interagisce con la pagina sottostante o la chiude, **Then** la chat non modifica l'URL corrente e non altera i form o la navigazione esistenti.

### User Story 3 - Contesto Harnios coerente (Priority: P2)

Come cliente, voglio che ogni messaggio venga elaborato con le istruzioni operative di base di Harnios, così l'assistente mantiene il contesto del sistema anche nella chat interna.

**Why this priority**: Il contesto coerente è necessario per evolvere la chat verso strumenti MCP, riferimenti a file e comandi, pur senza implementare ancora quelle interazioni.

**Independent Test**: Inviare un messaggio che richieda conoscenza del contesto operativo e verificare che la richiesta venga elaborata con le istruzioni di base e il contesto Harnios previsti.

**Acceptance Scenarios**:

1. **Given** una richiesta inviata dalla chat, **When** viene elaborata, **Then** il contesto di base di Harnios e le istruzioni operative `AGENTS.md` sono inclusi nella richiesta all'assistente.
2. **Given** il contesto della chat, **When** l'assistente decide che serve un'operazione MCP, **Then** può richiamare gli strumenti Harnios MCP disponibili e la chat mostra lo stato e il risultato dell'operazione.
3. **Given** una chat in modalità Harnios, **When** il cliente invia un nuovo messaggio, **Then** l'assistente esegue almeno un'operazione MCP prima di produrre la risposta conclusiva.
4. **Given** una chat in modalità Generale, **When** il cliente invia un messaggio, **Then** l'assistente risponde senza poter invocare strumenti MCP.
5. **Given** una conversazione esistente, **When** il cliente cambia modalità mentre la chat è inattiva, **Then** i messaggi esistenti restano visibili e la nuova modalità si applica dal messaggio successivo.

## Edge Cases

- Un cliente invia un messaggio vuoto o composto solo da spazi: il messaggio non viene inviato e l'interfaccia resta utilizzabile.
- Il provider del modello non è configurato: la chat mostra un errore comprensibile e non espone segreti o dettagli interni.
- Il provider interrompe la risposta o restituisce un errore: la chat conserva il messaggio dell'utente e mostra lo stato di errore senza bloccare il resto dell'app.
- Il cliente invia più messaggi rapidamente: l'interfaccia impedisce invii duplicati non intenzionali mentre una richiesta è in corso oppure li gestisce in modo deterministico.
- La finestra è visualizzata su una viewport stretta: resta leggibile, utilizzabile e non copre in modo irreversibile i controlli essenziali.
- Una pagina applicativa non usa l'header standard: la chat mantiene comunque la regola di visibilità basata sulla sessione e sulla natura della superficie.
- La sessione owner scade mentre la chat è aperta: la richiesta successiva viene rifiutata senza esporre contenuti del modello o dati dell'app.
- Un'operazione MCP modifica o cancella dati: nel MVP il tool viene eseguito direttamente e la chat mostra comunque stato, risultato o errore.
- Un tool MCP non è disponibile, è disabilitato o restituisce un errore: la chat mostra un risultato di errore comprensibile e non simula il completamento dell'azione.
- Il client invia una modalità sconosciuta: la richiesta viene rifiutata come non valida senza avviare il modello o MCP.
- Il cliente tenta di cambiare modalità mentre il modello risponde: il selettore resta bloccato fino alla conclusione dell'operazione.
- Il provider configurato non supporta l'uso obbligatorio degli strumenti: la chat mostra un errore sicuro e non degrada silenziosamente a una risposta non verificata.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST mostrare un pulsante flottante per aprire la chat a ogni cliente con una sessione owner attiva sulle pagine applicative supportate.
- **FR-002**: Il sistema MUST nascondere il pulsante e rifiutare le richieste chat per visitatori non autenticati e superfici pubbliche o di pre-autenticazione.
- **FR-003**: Il sistema MUST aprire la chat come finestra sovrapposta senza navigare a un nuovo URL o ricaricare la pagina corrente.
- **FR-004**: La finestra MUST avere come dimensione di riferimento circa due terzi della larghezza della viewport e un terzo della sua altezza, con adattamento minimo per viewport strette.
- **FR-005**: Il cliente MUST poter inserire e inviare un messaggio non vuoto dalla finestra chat.
- **FR-006**: Il sistema MUST mostrare i messaggi inviati dal cliente e le risposte dell'assistente in ordine cronologico nella stessa conversazione.
- **FR-007**: Il sistema MUST mostrare la risposta dell'assistente progressivamente quando il provider lo consente e MUST rendere visibili gli stati di attesa e di errore.
- **FR-008**: Il sistema MUST utilizzare un modello reale configurabile senza associare la UI a un provider specifico.
- **FR-009**: Ogni richiesta chat MUST includere il contesto operativo di base di Harnios, le istruzioni contenute in `AGENTS.md` e gli strumenti Harnios MCP autorizzati per la sessione.
- **FR-010**: Il sistema MUST mantenere la conversazione nello stato condiviso dell'app durante la navigazione client-side e MUST NOT salvarla automaticamente nello storage o nel browser in questo MVP; un refresh completo o la chiusura della scheda può azzerare la conversazione.
- **FR-011**: Il sistema MUST preservare le route, i form, l'autenticazione e il comportamento delle pagine esistenti fuori dalla chat.
- **FR-012**: Il sistema MUST supportare una chiusura esplicita della finestra e la sua riapertura senza perdere i messaggi finché resta disponibile lo stato condiviso dell'app, anche durante la navigazione client-side.
- **FR-013**: Il MVP MUST NOT implementare ancora salvataggio manuale, cancellazione persistente, cronologia S3, allegati o comandi `@`, `#`, `/`; l'architettura MUST lasciare punti di estensione per queste capacità, mentre l'invocazione degli strumenti Harnios MCP autorizzati è inclusa.
- **FR-014**: Tutti i nuovi testi visibili e le etichette accessibili MUST passare dal sistema di dizionari multilingue esistente.
- **FR-015**: La chat MUST poter utilizzare tutti gli strumenti Harnios MCP abilitati e disponibili per l'istanza, inclusi gli strumenti provenienti da connessioni esterne già esposte dall'istanza.
- **FR-016**: Il sistema MUST eseguire direttamente ogni operazione MCP autorizzata dall'istanza, senza richiedere una conferma intermedia nel MVP.
- **FR-017**: La chat MUST mostrare in modo distinguibile l'inizio, l'esecuzione, il risultato e l'errore di ogni operazione MCP senza esporre credenziali o segreti.
- **FR-023**: Il risultato di ogni operazione MCP MUST essere disponibile nella chat in un pannello richiudibile; i risultati strutturati MUST essere formattati come JSON leggibile e il pannello MUST essere chiuso inizialmente.
- **FR-024**: Gli argomenti inviati a ogni operazione MCP MUST essere disponibili nella chat in un pannello richiudibile e formattati come JSON leggibile; il pannello MUST essere chiuso inizialmente.
- **FR-025**: Durante una risposta in corso la chat MUST offrire un pulsante `Stop` con icona quadrata che annulla la risposta corrente e lascia visibili i contenuti già ricevuti.
- **FR-026**: La chat MUST offrire un pulsante `Reset` che elimina immediatamente i messaggi dalla conversazione locale corrente senza scrivere o cancellare dati persistenti.
- **FR-027**: La finestra chat MUST occupare verticalmente tutto lo spazio dal fondo dell'header applicativo alla base della viewport; su viewport mobili il composer MUST restare sempre visibile mentre solo la conversazione scorre.
- **FR-018**: La chat MUST offrire una scelta esplicita tra modalità `Harnios` e modalità `Generale`, con `Harnios` selezionata per impostazione predefinita.
- **FR-019**: Per ogni nuovo messaggio inviato in modalità Harnios, il sistema MUST imporre almeno una chiamata a uno strumento MCP disponibile prima che l'assistente produca la risposta conclusiva.
- **FR-020**: In modalità Generale, il sistema MUST NOT esporre o invocare strumenti MCP per la richiesta.
- **FR-021**: Il cambio modalità MUST conservare la conversazione corrente, applicarsi ai messaggi successivi e restare disponibile solo quando non è presente una risposta in corso.
- **FR-022**: Il sistema MUST validare la modalità lato server, usare `Harnios` quando il campo è assente per compatibilità e rifiutare valori diversi da quelli supportati.

### Key Entities

- **Chat session**: conversazione temporanea associata allo stato condiviso dell'app nella scheda browser, composta dai messaggi correnti, mantenuta durante la navigazione client-side e non persistita nello storage o nel browser in questo MVP.
- **Chat message**: messaggio del cliente o dell'assistente, con ruolo, contenuto, stato e ordine di visualizzazione.
- **Model configuration**: selezione configurabile del provider e del modello utilizzato per generare le risposte.
- **Harnios base context**: istruzioni operative di base, `AGENTS.md` e contesto Harnios MCP aggiunti a ogni elaborazione della chat.
- **MCP tool invocation**: richiesta di esecuzione di uno strumento Harnios MCP, con nome, input, stato, risultato o errore.
- **Chat mode**: stato temporaneo della chat con valore `Harnios` o `Generale`; determina la disponibilità e l'obbligatorietà degli strumenti MCP per i messaggi successivi e non viene persistito.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente autenticato può aprire la chat e inviare il primo messaggio in non più di due interazioni dal caricamento di una pagina applicativa.
- **SC-002**: In una verifica manuale su almeno cinque pagine applicative, il pulsante chat è disponibile per il cliente autenticato e assente per il visitatore non autenticato.
- **SC-003**: Almeno il 95% dei messaggi inviati con provider configurato produce uno stato di risposta visibile o un errore esplicito entro 10 secondi.
- **SC-004**: In una verifica manuale, il primo contenuto della risposta viene visualizzato progressivamente quando il provider restituisce una risposta in streaming.
- **SC-005**: Il 100% delle conversazioni del MVP resta non persistito nello storage, salvo future funzionalità esplicitamente abilitate.
- **SC-006**: Nessun errore di autenticazione, provider o configurazione espone chiavi, token, prompt interni o dettagli sensibili al cliente.
- **SC-007**: Le route e i flussi esistenti continuano a funzionare senza variazioni osservabili dopo l'aggiunta della chat globale.
- **SC-008**: Il 100% delle operazioni MCP autorizzate viene avviato senza una conferma intermedia e produce uno stato di esecuzione, completamento o errore.
- **SC-009**: Il cliente può distinguere, per ogni operazione MCP, se è in esecuzione, completata o fallita.
- **SC-010**: Nel 100% dei turni completati in modalità Harnios è visibile almeno una chiamata MCP precedente alla risposta conclusiva.
- **SC-011**: Nel 100% dei turni completati in modalità Generale non viene eseguita alcuna chiamata MCP.
- **SC-012**: Il cliente può cambiare modalità con una sola interazione quando la chat è inattiva, senza perdere alcun messaggio della conversazione corrente.

## Assumptions

- Il cliente autenticato corrisponde all'attuale sessione owner già usata dall'app.
- Il modello iniziale viene configurato lato server; la UI non sceglie ancora provider o modello.
- La risposta reale del modello è richiesta già nel MVP; non viene usato un mock.
- La chat può essere disponibile anche nell'editor file autenticato, purché il suo layout non la escluda tecnicamente.
- Le superfici `/oauth/*`, `/init` e `/share/*` restano escluse perché non rappresentano aree operative autenticate del cliente.
- La persistenza su S3, il pulsante di salvataggio e la pulizia persistente saranno specificati in una feature successiva; un refresh completo o la chiusura della scheda possono perdere la chat MVP.
- I comandi `@`, `#` e `/`, allegati, diff e cronologia saranno aggiunti dopo il completamento del flusso base; le invocazioni MCP sono invece parte del MVP e vengono eseguite direttamente secondo i permessi dell'istanza.
- Il supporto a provider locali e OpenAI-compatible è un vincolo architetturale futuro; il primo provider concreto può essere quello già configurato nell'ambiente.
- La modalità vale dal messaggio successivo, resta nello stato temporaneo condiviso della scheda e torna a `Harnios` dopo un refresh completo.
- La modalità Harnios richiede un provider capace di tool calling obbligatorio; un provider incompatibile produce un errore esplicito invece di un fallback senza strumenti.
- Nessun commit Git o push remoto fa parte della feature.
