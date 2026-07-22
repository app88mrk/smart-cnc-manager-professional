# Smart CNC Manager — Professional Edition

Base professionale sviluppata con Next.js, React, TypeScript e Firebase.

## Funzioni già incluse
- Dashboard professionale responsive
- Macchine, manuali, utensili, lavorazioni, allarmi, manutenzioni e Knowledge Base
- Programmi CNC e materiali predisposti
- Ricerca globale
- Inserimento ed eliminazione elementi
- Allegati predisposti
- Backup e ripristino JSON
- Modalità demo locale
- Firebase Authentication, Firestore e Storage predisposti
- Regole Firestore e Storage per dati isolati per utente

## Avvio
```bash
npm install
npm run dev
```
Apri http://localhost:3000

## Configurazione Firebase
1. Crea un progetto Firebase.
2. Attiva Authentication con Email/Password.
3. Crea Firestore.
4. Attiva Storage.
5. Copia `.env.example` in `.env.local` e inserisci i valori Firebase.
6. Pubblica `firestore.rules` e `storage.rules` dalla console Firebase.

## Pubblicazione su Vercel
Importa il repository in Vercel oppure esegui `vercel` dalla cartella del progetto. Aggiungi in Vercel le stesse variabili presenti in `.env.local`.

## Stato corrente
L'interfaccia funziona subito con dati locali. Il prossimo passaggio è sostituire il repository locale con il repository Firestore e attivare login e upload reali su Cloud Storage.

## Versione 1.3 - Manuali e allegati

La scheda macchina include ora una sezione per caricare, aprire, scaricare ed eliminare documenti tecnici. I metadati sono salvati in Firestore e i file in Firebase Storage, con un limite massimo di 100 MB per file.
