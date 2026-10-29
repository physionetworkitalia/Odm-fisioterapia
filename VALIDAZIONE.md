# Stato della migrazione

Preparato il 28 ottobre 2026. La versione Sites già pubblicata non è stata modificata.

## Verifiche concluse

`npm test`: **12 test superati**.

- Conservazione dei 18 reparti, 15 cognomi, codici F01–F15, 5 squadre e assegnazioni iniziali.
- Spostamenti, rimozioni, ripristino, piano terra, sede non definita e validazione degli stati.
- Rifiuto delle scritture basate su una revisione vecchia e conservazione delle modifiche precedenti quando si riparte dallo stato aggiornato.
- Compilazione dell’anteprima del blocco di accesso.
- Scansione di tutti i file pubblici compilati: nessun cognome del catalogo, nessun nome del proprietario, nessun catalogo JSON incluso.
- Blocco della build destinata alla pubblicazione quando manca la configurazione reale Firebase.
- Sintassi controllata per applicazione, accesso, sincronizzazione e script amministrativo.

## Verifiche predisposte ma non concluse

I sette test delle regole Firestore sono presenti in `tests/rules.test.mjs` e nel workflow GitHub CI. L’emulatore corrente richiede Java 21; l’ambiente disponibile ha Java 17. L’installazione di Java 21 non è riuscita per limiti dell’ambiente e l’accesso al download del produttore è stato rifiutato. Le regole non sono quindi state validate qui dall’emulatore. Il workflow CI configura Java 21 per eseguire queste prove.

## Collegamenti mancanti

GitHub e Firebase non risultano installati/collegati in questa conversazione. Di conseguenza:

- nessuna repository GitHub è stata creata o modificata;
- nessun progetto, database, regola o sito Firebase è stato creato o pubblicato;
- la configurazione Web rimane esplicitamente vuota;
- accesso Google reale, permessi e sincronizzazione tra due dispositivi reali restano da verificare dopo il collegamento.

Il pacchetto è un progetto di migrazione pronto per il collegamento, non una distribuzione Firebase già operativa. Nessun segreto amministrativo è incluso. La copia contenente il catalogo nominale è destinata a una repository **privata**.
