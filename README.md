# Fisio — Équipe connessa

Gestionale **HTML, CSS e JavaScript** per GitHub Pages, con accesso Google (Firebase Authentication) e dati condivisi su Cloud Firestore. Non richiede Excel né un server applicativo da gestire. Non è ancora collegato al tuo progetto Firebase: `config.js` contiene campi vuoti.

## Prova subito

Dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Apri `http://localhost:8000` e scegli **Prova con dati fittizi**. La demo funziona in memoria, non contatta Firebase e non conserva i pazienti dopo il ricaricamento. Non aprire `index.html` con doppio clic: i moduli JavaScript richiedono HTTP/HTTPS.

## Cosa è incluso

- 15 fisioterapisti, cognomi e cinque squadre trascritti dalla foto fornita.
- 17 reparti con ubicazioni reali fornite; Neurologia rimane senza ubicazione da completare.
- Rotazioni settembre 2026–gennaio 2027, modificabili per mese. Nessun prolungamento automatico oltre i mesi configurati.
- Presenza, assenza e Barra per giorno. Barra esclude dalla distribuzione. L'opzione **DH corrisponde a Barra** è inizialmente disattivata, perché questa equivalenza non è stata confermata. Una presenza impostata esplicitamente prevale sulla rotazione automatica.
- Pazienti con nome, cognome, stanza/letto, reparto, diagnosi, trattamento, ingresso, dimissione e operatore di riferimento.
- Distribuzione per numero di pazienti: mantiene i riferimenti presenti; assegna nuovi pazienti e sostituzioni a chi ha il carico minimo, privilegiando a parità di carico lo stesso reparto e poi la stessa palazzina/piano. Il reparto prevalente è quello con più pazienti già assegnati; se ancora vuoto, usa la destinazione mensile quando nota. Le rotazioni guidano la vicinanza e non costituiscono un vincolo esclusivo di reparto.
- Il giorno della dimissione è incluso: il paziente esce dal carico dal giorno successivo.
- Riequilibrio esplicito con differenza massima di un paziente tra i disponibili, se desiderato. Può cambiare anche assegnazioni manuali: viene chiesta conferma.
- Piano giornaliero pubblicabile e revisionabile. Ogni nuova pubblicazione conserva la versione precedente.
- Scheda personale stampabile con aggiunti, aggiornati, rimossi, motivo del passaggio e stato del trattamento. Confronto con l'ultimo giorno precedente pubblicato, anche se non coincide con ieri.
- Accessi abilitati nominativamente tramite UID Firebase. Un account Google da solo non consente di leggere i pazienti.
- Aggiornamenti in tempo reale, controllo delle revisioni per evitare sovrascritture concorrenti, registro tecnico delle modifiche principali.

I dati paziente dimostrativi non sono inclusi nella configurazione iniziale condivisa. L'inizializzazione carica solo équipe, reparti e rotazioni.

## Attivazione — una volta sola

### 1. Crea Firebase

1. Accedi a https://console.firebase.google.com/ e crea un progetto dedicato.
2. Registra un'app **Web** nelle impostazioni del progetto.
3. Copia il blocco `firebaseConfig` e compila `config.js`:

```js
window.FISIO_CONFIG = {
  clinicId: 'odm',
  firebase: {
    apiKey: 'VALORE_DEL_TUO_PROGETTO',
    authDomain: 'TUO-PROGETTO.firebaseapp.com',
    projectId: 'TUO-PROGETTO',
    appId: 'VALORE_DEL_TUO_PROGETTO'
  }
};
```

Questi sono parametri pubblici dell'app web. **Non inserire password, chiavi private, file service account o credenziali Admin nel repository.** Le autorizzazioni sono applicate dalle regole Firestore, non nascondendo la configurazione web.

### 2. Abilita Google e crea il database

- In **Authentication → Sign-in method**, abilita Google e configura il support email richiesto dalla console.
- In **Authentication → Settings → Authorized domains**, aggiungi `TUO-UTENTE.github.io` (solo il dominio, senza nome repository o `/`). Se usi un dominio personalizzato, aggiungi anche quello. Per prove locali aggiungi esplicitamente `localhost`.
- Crea **Cloud Firestore**, database `(default)`, scegliendo intenzionalmente la localizzazione coerente con la tua organizzazione. Parti con regole restrittive, non con accesso pubblico in modalità test.
- In **Firestore → Rules**, sostituisci il contenuto con il file `firestore.rules` e pubblica.
- Il file `firestore.indexes.json` disattiva l'indicizzazione di campi grandi che non vengono interrogati. Puoi distribuirlo, insieme alle regole, da CLI:

```bash
npm ci
npx firebase login
npx firebase deploy --only firestore --project TUO-PROGETTO
```

Nessuna configurazione di Firebase Hosting è necessaria: l'HTML è ospitato su GitHub Pages.

### 3. Carica su GitHub Pages

1. Crea un repository dedicato, per esempio `fisio-odm`.
2. Estrai lo ZIP e carica **il contenuto** nella radice del repository, non lo ZIP e non una cartella contenitore. Devono esserci `index.html`, `config.js`, gli altri file e la cartella `.github/workflows/`.
3. Usa il ramo `main`.
4. In **Settings → Pages → Build and deployment**, seleziona **GitHub Actions**.
5. Nella scheda **Actions**, esegui o attendi `Publish GitHub Pages`. La workflow prepara Node e Java 21, esegue i test del motore, della UI e delle regole, quindi pubblica soltanto una lista esplicita di file web. Se un test fallisce, la pubblicazione si ferma: consulta il log in Actions.
6. L'indirizzo sarà quello restituito da GitHub Pages, normalmente `https://TUO-UTENTE.github.io/fisio-odm/`.

Non sono richiesti GitHub Secrets per la configurazione web Firebase. Le credenziali amministrative Firebase non vanno inserite nella workflow. Nessun dato paziente deve essere caricato su GitHub: vive nel database.

### 4. Abilita il primo coordinatore

Il primo coordinatore si abilita dalla console Firebase, una sola volta. Non c'è un pulsante pubblico che consenta di attribuirsi privilegi.

1. Apri il sito e accedi con il tuo account Google.
2. La pagina mostra **Account non ancora abilitato** e il tuo **UID**. Puoi trovarlo anche in Firebase Authentication → Users.
3. In Firestore crea il documento `clinics/odm/members/IL_TUO_UID`. Se la console richiede il documento intermedio `clinics/odm`, puoi crearlo con un campo descrittivo `name`.
4. Inserisci esattamente questi campi, con i tipi indicati:

| Campo | Tipo | Valore |
|---|---|---|
| `role` | string | `coordinator` |
| `active` | boolean | `true` |
| `staffId` | string | stringa vuota, oppure il tuo codice `F01`–`F15` |

5. Torna al sito: il listener riceve l'abilitazione. Se necessario ricarica.
6. Clicca **Inizializza équipe e reparti**. L'anagrafica pazienti sarà vuota.

Se cambi `clinicId` in `config.js`, usa lo stesso identificativo nei percorsi Firestore. Non mettere lo slash nel codice struttura.

### 5. Abilita gli altri colleghi

1. Ogni collega accede al sito con Google e ti comunica UID e indirizzo account.
2. Verifica in Firebase Authentication che l'UID corrisponda effettivamente al collega.
3. Come coordinatore apri **Accessi**, inserisci l'UID, scegli il ruolo e associa il fisioterapista.
4. Per il ruolo `therapist`, il codice fisioterapista è obbligatorio. Evita di associare lo stesso codice a persone diverse.
5. Per revocare, reinserisci lo stesso UID e disattiva **Accesso attivo**. Il listener dell'account revocato chiude la vista del gestionale.

Tutti gli utenti abilitati possono leggere il piano e l'anagrafica dell'équipe. Il fisioterapista può registrare soltanto i trattamenti dei pazienti assegnati al proprio codice nel piano pubblicato. Il coordinatore può gestire dati, presenze, pubblicazioni e altri accessi; non può modificare il proprio accesso dall'interfaccia. Per cambiare il proprio ruolo serve un altro coordinatore o la console.

## Uso quotidiano

1. Seleziona la data. Aggiorna presenze/assenze/Barra e controlla la rotazione del mese.
2. Inserisci nuovi ingressi e dimissioni. La continuità si basa sul riferimento del paziente: le sostituzioni giornaliere non lo modificano.
3. Controlla i pazienti non assegnati. Con zero disponibili restano esplicitamente senza operatore; la pubblicazione è bloccata finché non sono assegnati.
4. Se necessario usa **Equilibra** o cambia manualmente l'operatore per la giornata.
5. Premi **Pubblica piano**. I colleghi vedono il piano pubblicato e possono registrare i trattamenti di propria competenza.
6. Se arrivano nuovi pazienti nella stessa giornata, premi **Modifica piano**, applica le modifiche e **Pubblica revisione**. Fino alla nuova pubblicazione il piano già pubblicato resta quello condiviso. I completamenti registrati per gli stessi pazienti restano validi per la giornata.
7. Apri **La scheda personale**, scegli l'operatore e premi **Stampa / Salva PDF**. La stampa include diagnosi, trattamento, ubicazione e variazioni. In anteprima usa A4 orizzontale; controlla righe con testi lunghi e intestazioni del browser.
8. Selezionando una data passata con piano pubblicato visualizzi i dati conservati di quel giorno, non una ricostruzione dall'anagrafica attuale. Una data senza piano pubblicato mostra invece una preparazione calcolata dai dati attuali.

Le versioni precedenti della stessa giornata sono conservate nella sottocollezione `versions`; l'interfaccia quotidiana mostra l'ultima versione pubblicata. Il confronto aggiunti/rimossi usa l'ultima versione pubblicata dell'ultimo giorno precedente. La prima giornata non mostra false aggiunte: indica “Confronto non disponibile”.

Le modifiche ai dati operativi sono salvate con controllo della revisione. Se un collega salva mentre hai una scheda aperta, la tua modifica viene rifiutata con un messaggio: riapri la scheda e ripeti l'aggiornamento. Le scritture richiedono una connessione attiva. Non è prevista una coda di modifiche offline.

## Struttura dei dati e manutenzione

```text
clinics/{clinicId}/members/{uid}                    ruoli e abilitazioni
clinics/{clinicId}/data/state                       anagrafica e impostazioni operative
clinics/{clinicId}/plans/{YYYY-MM-DD}                ultima revisione del piano
clinics/{clinicId}/plans/{YYYY-MM-DD}/versions/{n}   versioni precedenti immutabili
clinics/{clinicId}/plans/{YYYY-MM-DD}/completions/{patientId}
clinics/{clinicId}/audit/{eventId}                   operazione, autore e data
```

Per questo team il modello usa un documento operativo con revisioni e transazioni, più documenti separati per piani, versioni e trattamenti. Limiti applicativi: **500 pazienti complessivi in anagrafica operativa**, payload operativo **700 KB**. Lo storico dei piani è separato. Prima di raggiungere questi limiti serve una manutenzione pianificata o una migrazione verso documenti per singolo paziente. Non eliminare manualmente pazienti o codici senza controllare riferimenti e storico. I conteggi sono per paziente e non rappresentano minuti, intensità o appropriatezza clinica.

I pazienti non vengono salvati in `localStorage` o in una cache persistente Firestore. La sessione Google usa persistenza di sessione del browser. Le viste tengono dati in memoria durante l'accesso; stampe e PDF sono copie che l'operatore deve gestire. Configura nel progetto Firebase le politiche di backup, conservazione e monitoraggio adeguate: non sono implementate dal sito statico. Il registro tecnico delle operazioni non sostituisce un sistema aziendale completo di tracciamento degli accessi e delle letture.

Prima di introdurre dati sanitari reali, fai validare dal responsabile aziendale il progetto Firebase, le abilitazioni, le ubicazioni dei dati e la procedura operativa. Questo pacchetto non costituisce una certificazione di conformità o una cartella clinica certificata.

## Verifiche

```bash
npm ci
npm test
npm run test:ui
npm run test:rules
```

- `npm test`: 13 casi del motore (assegnazione, vicinanza, Barra, dimissioni, riequilibrio, storico, validazione).
- `npm run test:ui`: test DOM della demo, incluso ingresso paziente, pubblicazione/revisione, completamento, stampa e escaping del testo. Non è una prova in un browser reale.
- `npm run test:rules`: suite per Firestore Emulator, richiede **Java 21+** per la versione CLI inclusa. Controlla utente anonimo/non abilitato, ruoli, revoca, pazienti di altri operatori, storico e revisioni. Non usa un database reale (progetto `demo-fisio`).

Alla consegna sono passati i 13 test del motore e il test DOM. La suite delle regole è inclusa ma **non è stata eseguita con successo nell'ambiente di preparazione**, che disponeva di Java 17; il tentativo alternativo è stato bloccato prima del completamento dell'accesso di rete. Eseguila prima di usare dati reali. Login Google, sincronizzazione su più dispositivi e stampa nel browser richiedono la verifica finale sul tuo progetto configurato.

## Problemi frequenti

- **Firebase da configurare**: compila i quattro campi di `config.js` e pubblica il commit.
- **Popup bloccato**: consenti il popup per il sito. Non viene richiesto di incollare password Google.
- **auth/unauthorized-domain**: aggiungi il dominio esatto in Authentication → Authorized domains.
- **permission-denied**: verifica regole pubblicate, `clinicId`, UID, tipi dei campi, `active: true`, ruolo e associazione operatore.
- **Nessun dato condiviso**: assicurati di essere nella versione Firebase e non nella demo; confronta `projectId` e `clinicId` sui dispositivi.
- **La nuova assegnazione non compare ai colleghi**: pubblica la revisione dopo aver modificato il piano.
- **Un aggiornamento è rifiutato**: un altro utente potrebbe avere salvato prima; riapri la scheda.
- **404 su GitHub Pages**: controlla ramo `main`, file alla radice, workflow Pages e risultato in Actions. I percorsi dei file sono relativi per funzionare anche sotto il nome repository.

## Riferimenti ufficiali

- Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
- Firebase via CDN: https://firebase.google.com/docs/web/alt-setup
- Regole di sicurezza: https://firebase.google.com/docs/firestore/security/rules-conditions
- Transazioni: https://firebase.google.com/docs/firestore/manage-data/transactions
- GitHub Pages con Actions: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
