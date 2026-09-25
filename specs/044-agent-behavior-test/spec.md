# Feature Specification: Agent Behavior Test Tool

**Feature Branch**: `044-agent-behavior-test`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Aggiungere uno strumento MCP che permetta a un agente esterno di testare subito il comportamento di skill e istruzioni con il modello della chat interna. La simulazione deve riprodurre la chat reale, usare gli stessi tool e non applicare modifiche: ogni operazione con effetti viene restituita come proposta dry-run nel report JSON valutato dal modello principale."

## Clarifications

### Session 2026-09-25

- Q: Quali capacità di sola lettura deve poter usare il modello di prova oltre ai file passati esplicitamente? → A: I contenuti dei file non vengono mai passati nel prompt; il modello deve recuperarli sempre chiamando tool read-only.
- Q: La simulazione deve riprodurre al 100% la chat reale? → A: Sì, con la stessa superficie di tool e lo stesso comportamento di orchestrazione; le azioni con effetti sono intercettate come dry-run e non vengono applicate.
- Q: Quale risultato deve ricevere il modello quando seleziona un'azione dry-run che nella chat reale avrebbe modificato dati o contattato un servizio? → A: Un risultato di successo simulato, come se l'azione fosse riuscita.
- Q: Anche l'AGENTS.md base della chat deve essere letto dal modello esclusivamente tramite tool, rinunciando a includerlo nel prompt di sistema come fa oggi la chat reale? → A: Pre-caricare solo l'AGENTS.md base; tutte le altre skill e file vengono letti con tool.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simulare il comportamento di un agente (Priority: P1)

Un agente esterno connesso al server MCP vuole sottoporre un prompt a un modello di prova insieme a skill e istruzioni, così da verificare come l'agente si comporterebbe prima di modificare il contenuto operativo dell'istanza.

**Why this priority**: Consente un ciclo di creazione, prova e correzione delle istruzioni senza affidarsi a una chat manuale o introdurre modifiche accidentali.

**Independent Test**: Fornire uno scenario, un'istruzione inline e il percorso di una skill; ricevere una risposta simulata con una proposta concreta di modifiche, senza che alcun file o servizio dell'istanza venga modificato.

**Acceptance Scenarios**:

1. **Given** un agente MCP autorizzato e un modello di chat configurato, **When** richiama `test_agent_behavior` con uno scenario e istruzioni inline o percorsi di contesto, **Then** riceve un report strutturato della simulazione.
2. **Given** una simulazione completata, **When** il modello di prova considera le istruzioni insufficienti o ambigue, **Then** il report contiene una proposta di modifiche concreta e motivata.
3. **Given** una simulazione completata, **When** il modello di prova considera il materiale adeguato, **Then** il report contiene comunque una raccomandazione esplicita e motivata per il modello principale.

---

### User Story 2 - Consultare il contesto senza produrre effetti (Priority: P1)

Un agente esterno vuole che il modello di prova veda la stessa superficie di strumenti della chat reale e possa consultare il contesto pertinente, senza che una simulazione alteri dati o contatti sistemi esterni.

**Why this priority**: La fedeltà del test richiede gli stessi strumenti e la stessa sequenza decisionale della chat reale; la sicurezza richiede che ogni effetto venga soltanto simulato.

**Independent Test**: Eseguire un test che consulta file e propone una modifica; verificare che il report dichiari le letture, la chiamata di modifica dry-run e che nessun file, messaggio, job o sistema esterno sia modificato.

**Acceptance Scenarios**:

1. **Given** percorsi validi di file o skill, **When** il modello di prova necessita di contesto aggiuntivo, **Then** recupera il contenuto invocando gli stessi strumenti di lettura disponibili nella chat reale.
2. **Given** una simulazione in corso, **When** il modello seleziona un'azione che modifica file, esegue codice, invia messaggi, avvia job o chiama un servizio esterno, **Then** riceve un risultato di successo simulato, senza che l'azione venga eseguita.
3. **Given** una simulazione completata, **When** il chiamante legge il report, **Then** può identificare tutti gli strumenti selezionati, gli argomenti usati e se ciascuna chiamata è stata letta realmente o simulata.

---

### User Story 3 - Valutare il risultato in modo automatizzabile (Priority: P2)

Un agente principale vuole ricevere un risultato strutturato e controllare criteri semplici sulla risposta, così da decidere autonomamente se aggiornare skill o istruzioni.

**Why this priority**: Il report deve essere utilizzabile sia in un ciclo automatico sia in una revisione guidata, senza delegare al tool il potere di cambiare contenuti.

**Independent Test**: Inviare criteri che richiedono e vietano termini o pattern e verificare che il report includa l'esito di ogni criterio insieme alla risposta e alla proposta.

**Acceptance Scenarios**:

1. **Given** un test con criteri di verifica, **When** la risposta della simulazione viene prodotta, **Then** il report indica separatamente l'esito di ogni criterio.
2. **Given** una risposta o proposta non conforme al formato richiesto, **When** il test termina, **Then** il chiamante riceve un errore sicuro e distinguibile, senza un esito inventato.
3. **Given** un errore di configurazione o raggiungibilità del modello, **When** il test non può essere eseguito, **Then** il chiamante riceve un errore comprensibile privo di segreti, prompt interni e dettagli infrastrutturali.

### Edge Cases

- Il chiamante omette lo scenario, passa un tipo di criterio non supportato o indica un percorso non valido: il test viene rifiutato prima di avviare il modello.
- Un file indicato non è leggibile, non esiste o eccede i limiti di contesto: il report identifica in sicurezza il contesto non disponibile e non accede a percorsi alternativi.
- Il modello esaurisce il tempo o il limite di passaggi consentiti: il test termina senza eseguire azioni mutanti e restituisce uno stato sicuro.
- Il modello seleziona un tool con effetti, incluso un tool esterno: il risultato dry-run conserva nome e argomenti della proposta, non contatta la destinazione e viene presentato al modello come successo simulato.
- Il provider configurato non è disponibile o non supporta il comportamento richiesto: nessun fallback modifica il contenuto dell'istanza.
- La risposta supera il limite di dimensione oppure non contiene una proposta comprensibile: il risultato viene segnalato come non valido per la valutazione, senza generare proposte dal sistema.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST esporre agli agenti MCP autorizzati lo strumento `test_agent_behavior` per eseguire una simulazione di comportamento.
- **FR-002**: Lo strumento MUST richiedere uno scenario testuale (`prompt`), MAY accettare istruzioni inline e MAY accettare riferimenti a file autorizzati dell'istanza; il contenuto di ciascun file indicato MUST NOT essere pre-caricato nel prompt della simulazione.
- **FR-003**: Lo strumento MUST usare per impostazione predefinita la stessa configurazione di modello della chat interna; il chiamante MUST NOT poter trasmettere credenziali o selezionare liberamente un provider o modello.
- **FR-004**: Il modello di prova MUST ricevere lo stesso contesto, la stessa configurazione di strumenti abilitati e le stesse regole di orchestrazione della modalità operativa della chat interna, incluso il contesto trusted ottenuto dall'`AGENTS.md` base, salvo l'intercettazione dry-run delle azioni con effetti.
- **FR-005**: Durante una simulazione, il modello MUST ottenere il contenuto di ogni skill o file di test soltanto invocando gli strumenti di lettura della chat reale; il sistema MUST NOT pre-caricare nel prompt il contenuto dei file indicati nella richiesta. L'`AGENTS.md` base trusted costituisce l'unica eccezione.
- **FR-006**: Durante una simulazione, il sistema MUST esporre al modello gli stessi strumenti nativi ed esterni abilitati della chat reale; le operazioni di sola lettura autorizzate MAY essere eseguite, mentre ogni operazione con effetti o connessione esterna MUST essere intercettata come dry-run, MUST NOT essere inviata alla sua destinazione e MUST restituire al modello un risultato di successo simulato.
- **FR-007**: Lo strumento MUST restituire un report JSON con risposta della simulazione, proposta o raccomandazione, strumenti selezionati, argomenti, modalità di esecuzione reale o dry-run, stato di successo simulato ove applicabile, modello, durata ed eventuale errore sicuro.
- **FR-008**: Lo strumento MUST accettare criteri opzionali per termini richiesti, termini vietati e pattern richiesti e MUST riportare l'esito deterministico di ciascun criterio nel report.
- **FR-009**: Il sistema MUST dichiarare il test non valido se la risposta non contiene una proposta o raccomandazione utilizzabile; MUST NOT generarne una autonomamente né segnare il test come superato.
- **FR-010**: Il sistema MUST applicare alle istruzioni inline, ai percorsi, al contesto consultabile, al numero di passaggi e alla dimensione dell'output limiti che evitino accessi non autorizzati, costi o durate non controllati, senza alterare la superficie di strumenti visibile al modello rispetto alla chat reale.
- **FR-011**: Il sistema MUST mantenere prompt, risposta e report soltanto per la durata della chiamata; MUST NOT salvarli automaticamente né nel contenuto operativo dell'istanza né in una cronologia persistente.
- **FR-012**: Il sistema MUST rispettare la configurazione che abilita o disabilita i tool MCP dell'istanza anche per `test_agent_behavior`.
- **FR-013**: Gli errori restituiti dal tool MUST essere comprensibili al chiamante e MUST NOT includere chiavi, token, contenuti non autorizzati, prompt riservati, URL sensibili o stack trace.

### Key Entities

- **Behavior test request**: uno scenario di prova con istruzioni inline, riferimenti di contesto e criteri opzionali inviati da un agente MCP autorizzato.
- **Dry-run tool call**: selezione di uno strumento della chat reale con i relativi argomenti, intercettata prima di produrre effetti, restituita al modello come successo simulato e registrata nel report come proposta non applicata.
- **Read-only test context**: insieme limitato di riferimenti a skill, file e documentazione disponibili soltanto durante la simulazione; i relativi contenuti sono ottenibili dal modello solo tramite chiamate tool, mentre l'`AGENTS.md` base trusted resta parte del contesto della chat.
- **Behavior test report**: risultato effimero e strutturato contenente risposta, proposta o raccomandazione, esiti dei criteri, chiamate tool reali e dry-run e stato della simulazione.
- **Assertion result**: esito deterministico di un criterio richiesto dal chiamante, con tipo, valore controllato e stato.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un agente MCP autorizzato può inviare uno scenario e ottenere un report valido o un errore esplicito con una sola chiamata allo strumento.
- **SC-002**: Il 100% delle simulazioni completate restituisce una proposta o raccomandazione esplicita, oppure uno stato non valido chiaramente distinguibile.
- **SC-003**: Il 100% delle simulazioni riproduce la stessa superficie di strumenti della chat reale e non modifica file, configurazioni, messaggi, job o sistemi esterni dell'istanza.
- **SC-004**: Il 100% dei criteri validi inclusi in una richiesta riporta un esito individuale nel report.
- **SC-005**: Nel 95% delle richieste con modello configurato e contesto entro i limiti, il chiamante riceve un report o un errore esplicito entro 30 secondi.
- **SC-006**: In una revisione di report di errore, nessun valore restituito espone credenziali, token, prompt riservati o dettagli interni non autorizzati.

## Assumptions

- Il chiamante è un agente esterno già autenticato e autorizzato all'uso dei tool MCP dell'istanza.
- La configurazione della chat interna fornisce un modello disponibile per le simulazioni; l'implementazione iniziale usa il provider già supportato dalla chat.
- Il modello principale chiamante interpreta il report, decide se le proposte sono adeguate e applica eventuali modifiche tramite i normali workflow autorizzati.
- I riferimenti di file sono limitati al namespace di contenuti dell'istanza già protetto dai tool di consultazione esistenti.
- L'`AGENTS.md` base trusted è l'unico file incluso nel contesto iniziale per allineare il test alla chat reale; ogni skill e ogni altro file indicato nella richiesta viene letto dal modello solo tramite tool.
- La fedeltà "al 100%" riguarda modello, contesto, strumenti esposti, selezione dei tool e orchestrazione della chat; gli effetti osservabili delle azioni mutanti o esterne sono intenzionalmente sostituiti dal rispettivo risultato dry-run.
- Il risultato dry-run presentato al modello imita un successo per consentire la prosecuzione realistica della conversazione; il report rivolto al modello principale conserva sempre la distinzione tra successo simulato e azione applicata.
- Le verifiche automatiche della prima versione sono intenzionalmente deterministiche e limitate a termini e pattern; una valutazione tramite un secondo modello non fa parte della feature.
- Non fanno parte della feature persistenza dello storico dei test, esecuzione di modifiche proposte, selezione del modello da parte del chiamante o chiamate effettive a tool esterni.
