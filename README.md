# Smart CNC Manager — Professional Edition

Applicazione professionale per organizzare dati, documentazione e attività di
un reparto CNC. Sviluppata con Next.js, React, TypeScript e Firebase.

Versione corrente: **2.12.0**.

## Moduli disponibili

- Dashboard operativa e responsive.
- Macchine con schede tecniche, foto e documenti.
- Manutenzioni preventive, correttive, guasti e ispezioni.
- Centro documentale tecnico professionale con:
  - manuali macchina, cataloghi, procedure, disegni, manutenzione, qualità e sicurezza;
  - codice documento, costruttore, revisione, emissione e prossima verifica;
  - lingua, responsabile, riservatezza e tag ricercabili;
  - documenti TOP e collezioni intelligenti;
  - centro revisioni con avvisi per documenti scaduti o prossimi alla scadenza;
  - controllo dei metadati incompleti e degli allegati mancanti;
  - ricerca per titolo, codice, costruttore, macchina, tag e descrizione;
  - anteprima interna di PDF, immagini e video;
  - vista griglia o elenco, filtri per macchina, stato e formato;
  - conteggio delle consultazioni e documenti aperti di recente;
  - compatibilità automatica con tutti i manuali già caricati.
- Utensili professionali con:
  - codice, categoria, produttore e specifiche geometriche;
  - materiale, rivestimento, attacco e macchina collegata;
  - quantità disponibile, scorta minima, posizione e fornitore;
  - costo unitario, vita prevista, ore utilizzate e ultimo utilizzo;
  - filtri per categoria, stato e priorità;
  - avvisi automatici per scorta bassa e vita esaurita.
- Parametri di taglio con:
  - interfaccia ordinata in quattro aree separate: Calcolo, Parametri catalogo,
    Cataloghi PDF e Storico;
  - calcolo guidato in quattro passaggi: dati, parametri, verifica e salvataggio;
  - analisi setup, strategia macchina ed esperienza storica apribili solo quando servono;
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
- Schede di lavorazione CNC professionali con:
  - commessa, cliente, disegno, revisione, pezzo, materiale e grezzo;
  - macchina, serraggio, attrezzatura, origine pezzo e istruzioni di setup;
  - ciclo operativo composto da più operazioni numerate;
  - collegamento di utensile, programma CNC e calcolo parametri a ogni fase;
  - confronto tra tempi previsti ed effettivi;
  - consumo automatico della vita dei diversi utensili alla chiusura;
  - quote nominali, tolleranze, misure, strumenti ed esito qualità;
  - quantità prodotte, scarti, operatore, approvazione e note finali;
  - riepilogo professionale stampabile o salvabile in PDF;
  - conversione automatica delle precedenti lavorazioni guidate.
- Storico allarmi.
- Knowledge Base.
- Archivio programmi CNC professionale con:
  - file collegato obbligatoriamente alla macchina di destinazione;
  - codice programma, particolare, disegno, revisione e controllo CNC;
  - versioni semantiche, motivo della modifica e stato operativo;
  - validazione nominativa prima dell’uso in produzione;
  - checksum SHA-256 per verificare l’integrità del file;
  - analisi automatica di righe, utensili e origini G54–G59;
  - ricerca e filtri per macchina, stato e completezza;
  - anteprima interna del codice CNC con numerazione delle righe;
  - conservazione automatica dei file sostituiti in Firebase Storage;
  - timeline delle revisioni con download, confronto e ripristino;
  - ritorno automatico in Bozza dopo il ripristino di una release;
  - collegamenti alle schede di lavorazione che usano il programma;
  - compatibilità con i programmi creati nelle versioni precedenti.
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
