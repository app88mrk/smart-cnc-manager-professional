# Smart CNC Manager — Professional Edition

Applicazione professionale per organizzare dati, documentazione e attività di
un reparto CNC. Sviluppata con Next.js, React, TypeScript e Firebase.

Versione corrente: **2.0.0**.

## Moduli disponibili

- Dashboard operativa e responsive.
- Macchine con schede tecniche, foto e documenti.
- Manutenzioni preventive, correttive, guasti e ispezioni.
- Manuali con allegati.
- Utensili.
- Lavorazioni.
- Storico allarmi.
- Knowledge Base.
- Programmi CNC con allegati.
- Materiali.

Ogni scheda dei moduli professionali può essere collegata a una macchina,
ricercata, modificata ed eliminata.

## Sicurezza

- Accesso tramite Firebase Authentication.
- Registrazione pubblica disabilitata.
- Accesso applicativo limitato all'utente autorizzato.
- Regole Firestore e Storage limitate allo stesso utente.
- Limite massimo degli allegati: 100 MB.

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

## Verifica

```bash
npm run build
```

La build controlla compilazione Next.js e validità TypeScript.

## Pubblicazione

Il branch di sviluppo è `develop`; `main` è riservato alle versioni stabili.

```bash
git push origin develop
vercel --prod
```
