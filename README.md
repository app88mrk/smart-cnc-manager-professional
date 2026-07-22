# Smart CNC Manager — Professional Edition

Applicazione Next.js + TypeScript con modalità demo locale e integrazione reale Firebase.

## Funzioni
- Login e registrazione Email/Password
- Dati isolati per utente in Cloud Firestore
- Upload file in Firebase Cloud Storage con avanzamento
- Eliminazione coordinata record + allegato
- Modalità demo automatica senza credenziali Firebase
- Dashboard, ricerca globale e moduli tecnici
- Backup e ripristino JSON
- Progetto pronto per Vercel

## Avvio locale
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Configurazione Firebase
1. Crea un progetto su Firebase Console.
2. In Authentication abilita **Email/Password**.
3. Crea il database Cloud Firestore.
4. Attiva Cloud Storage.
5. Registra una Web App e copia la configurazione in `.env.local`.
6. Pubblica `firestore.rules` e `storage.rules` dalla Console oppure con Firebase CLI.

## Variabili Vercel
Inserisci tutte le variabili `NEXT_PUBLIC_FIREBASE_*` anche in **Vercel → Project Settings → Environment Variables**.

## Sicurezza
I dati sono salvati in `users/{uid}/records/{recordId}` e i file in `users/{uid}/{module}/{recordId}/...`. Le regole incluse impediscono l'accesso ai dati di altri utenti.
