# Smart CNC Manager — Professional Edition

Applicazione professionale per organizzare dati, documentazione e attività di
un reparto CNC. Sviluppata con Next.js, React, TypeScript e Firebase.

Versione corrente: **2.8.0**.

## Moduli disponibili

- Dashboard operativa e responsive.
- Macchine con schede tecniche, foto e documenti.
- Manutenzioni preventive, correttive, guasti e ispezioni.
- Manuali con allegati.
- Utensili professionali con:
  - codice, categoria, produttore e specifiche geometriche;
  - materiale, rivestimento, attacco e macchina collegata;
  - quantità disponibile, scorta minima, posizione e fornitore;
  - costo unitario, vita prevista, ore utilizzate e ultimo utilizzo;
  - filtri per categoria, stato e priorità;
  - avvisi automatici per scorta bassa e vita esaurita.
- Parametri di taglio con:
  - calcolo di giri mandrino, avanzamento e tempo stimato;
  - modalità foratura, fresatura e tornitura;
  - punte HSS e HM, frese HSS e HM e placchette;
  - selezione dedicata tra 15 famiglie di placchette da tornitura:
    CNMG, DNMG, KNUX, SNMG, TNMG, VNMG, WNMG, RNGN, CCMT,
    DCGT/DCMT, RC.T/RC.X, SCGT/SCMT, TCGT/TCMT, VBGT/VBMT e VCGT/VCMT;
  - materiali ISO N, P, M, K, S e H;
  - profili prudente, catalogo e produttivo;
  - controllo dei limiti di giri e avanzamento della macchina;
  - codice articolo e pagina sorgente del catalogo sempre visibili;
  - valori iniziali verificati sul catalogo Hoffmann Group 56.
- Archivio cataloghi PDF con:
  - caricamento multiplo e indicizzazione automatica pagina per pagina;
  - ricerca per codice, famiglia, marca, materiale e testo;
  - rilevamento di `Vc`, `f`, `fz`, `ap` e `ae`;
  - selezione della riga catalogo e trasferimento dei valori nel calcolatore;
  - profilo prudente, standard o produttivo applicato agli intervalli rilevati;
  - fonte PDF, articolo e pagina mantenuti nel risultato di calcolo;
  - calcolo guidato con scelta di catalogo, lavorazione, materiale,
    codice e scheda tecnica compatibile;
  - risultati presentati come utensili pronti da applicare, senza
    dover scegliere manualmente pagina e singoli valori estratti;
  - caricamento del primo PDF direttamente dal blocco di calcolo;
  - risultati nascosti finché diametro, `Vc` e avanzamento non sono
    validi, senza pannelli duplicati o valori a zero;
  - archivio strutturato di punte, frese e placchette ricavato
    automaticamente dai PDF;
  - ricerca per codice, famiglia, materiale utensile, diametro e
    raggio;
  - scelta dell’utensile e del set di parametri tramite menu a tendina,
    con caricamento immediato nel calcolatore;
  - recupero di `Vc`, `f/fz`, `ap` e `ae` direttamente dai PDF caricati;
  - calcolo manuale separato, con campi inizialmente vuoti;
  - assenza di valori preimpostati finché non viene scelta una scheda;
  - pagina sorgente e anteprima del testo sempre visibili;
  - salvataggio locale persistente nel browser tramite IndexedDB.
- Lavorazioni.
- Storico allarmi.
- Knowledge Base.
- Programmi CNC con allegati.
- Materiali.

Ogni scheda dei moduli professionali può essere collegata a una macchina,
ricercata, modificata ed eliminata.

Le schede utensile create nelle versioni precedenti restano compatibili e
vengono completate con i nuovi campi alla prima modifica.

## Sicurezza

- Accesso tramite Firebase Authentication.
- Registrazione pubblica disabilitata.
- Accesso applicativo limitato all'utente autorizzato.
- Regole Firestore e Storage limitate allo stesso utente.
- App Check predisposto tramite reCAPTCHA v3 per bloccare client non autorizzati.
- Cache Firestore persistente multi-scheda per lavorare anche con connessione instabile.
- Service worker limitato ai file dell’app: i contenuti Firebase non vengono inseriti nella cache pubblica del browser.
- Limite massimo degli allegati: 500 MB.

## Backup e ripristino

Il menu laterale permette di scaricare e ripristinare un backup JSON.

Il backup comprende:

- macchine;
- manutenzioni;
- schede di tutti i moduli professionali;
- metadati dei documenti macchina;
- riferimenti a foto e allegati conservati in Firebase Storage.

I file binari restano in Firebase Storage e non vengono duplicati nel JSON.
Prima del ripristino viene sempre richiesta una conferma.

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

Senza configurazione Firebase l'applicazione usa la modalità demo nel browser.

## Configurazione Firebase

1. Attiva Authentication con Email/Password.
2. Crea Firestore.
3. Attiva Storage.
4. Copia `.env.example` in `.env.local` e inserisci i valori Firebase.
5. Pubblica `firestore.rules` e `storage.rules`.
6. Facoltativo ma consigliato: abilita App Check nel progetto Firebase e imposta
   `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` in Vercel. Dopo la verifica, attiva
   l’enforcement App Check per Firestore e Storage dalla console Firebase.

La cache offline conserva sul dispositivo i dati già sincronizzati: usa l’app
solo su un profilo browser personale e protetto.

## Installazione come app

In produzione Smart CNC Manager è una PWA installabile. Dal browser scegli
“Installa Smart CNC” per aggiungerla al desktop o alla schermata Home. La shell
dell’app resta disponibile senza rete e Firestore sincronizza le modifiche
quando la connessione ritorna.

## Verifica

```bash
npm run test
npm run build
```

I test controllano formule CNC, limiti numerici, isolamento delle regole
Firebase e comportamento sicuro del service worker. La build controlla
compilazione Next.js e validità TypeScript. Per eseguire tutto insieme usa
`npm run check`.

Il calcolatore usa valori iniziali del costruttore. Prima della produzione è
necessario verificare serraggio, sporgenza, refrigerazione, stabilità, potenza e
limiti reali della macchina.

## Pubblicazione

Il branch di sviluppo è `develop`; `main` è riservato alle versioni stabili.

```bash
git push origin develop
vercel --prod
```
