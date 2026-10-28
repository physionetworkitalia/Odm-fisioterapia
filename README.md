# Fisio · Ospedale del Mare — Firebase

Gestionale per 18 reparti, 15 fisioterapisti e 5 squadre, con Firebase Hosting, autenticazione Google e Cloud Firestore. Le assegnazioni rimangono **simulate** e non modificano i sistemi ospedalieri. Nessun dato di pazienti.

Questa copia è separata dal gestionale già pubblicato con Sites. Il progetto Firebase reale e la repository GitHub non sono ancora collegati; non sono stati inventati identificativi o credenziali.

## Cosa cambia

- Catalogo e cognomi sono conservati nel database, fuori dai file pubblici del sito.
- Solo gli account esplicitamente abilitati possono leggere lo spazio. Autenticarsi con Google non concede da solo l’accesso.
- Ruoli `owner` ed `editor` possono modificare; `viewer` può consultare ed esportare.
- Un unico scenario condiviso viene aggiornato in tempo reale su tutti i dispositivi abilitati.
- Una transazione confronta la revisione corrente con quella letta dal dispositivo: una modifica obsoleta viene respinta e deve essere riaperta sui dati aggiornati.
- Salvataggio, annullamento e ripristino richiedono la connessione. Non viene mostrata una conferma prima che Firestore abbia confermato la scrittura.
- Nessuna nuova autoabilitazione dal browser. I ruoli sono gestiti solo con privilegi amministrativi.

## Repository GitHub

Creare una **repository privata** chiamata `odm-fisio-gestionale` oppure scegliere una repository privata esistente. Il file `private/catalog.json` contiene i dati nominali iniziali e non va pubblicato in una repository pubblica. Le cartelle `dist/`, `node_modules/`, i token e le credenziali amministrative non devono essere caricate nel repository.

## Collegamento Firebase

1. Selezionare o creare il progetto Firebase e abilitare **Authentication → Google**.
2. Creare **Cloud Firestore Standard, Native mode**, scegliendo la località del database prima della creazione. Le regole incluse impediscono l’accesso a utenti non abilitati.
3. Registrare una Web App. Copiare il suo oggetto di configurazione nel campo `firebase` di `firebase.web.json`, conservando `workspaceId: "odm"`. La configurazione Web è pubblica per definizione; non usare qui una chiave privata di un service account.
4. Autorizzare in Authentication il dominio Firebase Hosting utilizzato dall’app.
5. Installare le dipendenze e verificare:

   ```bash
   npm ci
   npm test
   npm run test:rules
   npm run build
   ```

   Node 22 o successivo e Java 21 o successivo sono richiesti per gli emulatori correnti.

6. Pubblicare la pagina di accesso e le regole, con Firebase CLI autenticata sul progetto selezionato:

   ```bash
   npx firebase deploy --only hosting,firestore:rules --project ID_PROGETTO
   ```

7. Il proprietario effettua il primo accesso Google. In questa fase l’app mostra “account da abilitare”; nei dettagli amministrativi è disponibile il suo UID Firebase. Con credenziali amministrative locali via Application Default Credentials, inizializzare lo spazio:

   ```bash
   npm run provision -- --project ID_PROGETTO --owner-uid UID_FIREBASE
   ```

   Lo script verifica che l’account esista, sia verificato e non disabilitato. Crea i dati iniziali e la prima abilitazione solo se mancanti. Non sovrascrive scenari o cataloghi esistenti e non cambia ruoli preesistenti.

8. Il proprietario esce e accede nuovamente per aprire il gestionale. Altri account possono essere aggiunti dall’amministratore come documenti `workspaces/odm/members/UID` con `role` ed `enabled: true`. Nessun invito viene inviato automaticamente.

## Schema dati

| Percorso Firestore | Contenuto | Accesso client |
| --- | --- | --- |
| `workspaces/odm/members/{uid}` | Ruolo ed abilitazione | Lettura del proprio documento; scritture vietate |
| `workspaces/odm/catalog/main` | 18 reparti e 15 professionisti iniziali | Lettura ai membri; scritture vietate |
| `workspaces/odm/scenarios/main` | Stato, revisione, autore e timestamp server | Lettura ai membri; aggiornamento a owner/editor |

Neurologia mantiene palazzina e piano non definiti. I codici F01–F15 e i cognomi sono conservati. Le assegnazioni prevalenti non rappresentano la copertura clinica del turno.

## GitHub Actions

Il workflow CI esegue test di logica, verifica dell’assenza di cognomi nel bundle pubblico e test delle regole sull’emulatore. Il workflow di deploy è **manuale** e chiede l’ID reale del progetto. Prima dell’uso occorre configurare l’ambiente GitHub `production` e il secret `FIREBASE_DEPLOY_CREDENTIALS` con una credenziale di deploy autorizzata per quel progetto. Nessuna credenziale è inclusa in questo pacchetto. Non abilitare una pubblicazione automatica o cambiare i permessi IAM senza una scelta esplicita del proprietario.

## Limiti di validazione

I test locali verificano logica e accessi Firestore tramite emulatore. Accesso Google reale, sincronizzazione su due dispositivi reali e URL di produzione richiedono il collegamento degli account GitHub e Firebase e il progetto di destinazione. Finché la configurazione è vuota, `npm run build` blocca la compilazione destinata al deploy; `npm run build:preview` mostra soltanto la schermata di collegamento.

## Riferimenti ufficiali

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/hosting
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
