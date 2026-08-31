# Villa Comunale di Torre de' Passeri — Prenotazione campi sportivi

App web per la gestione delle prenotazioni dei campi sportivi della Villa
Comunale di Torre de' Passeri: **calcetto**, **padel** e **tennis**.

## Funzionalità

- Registrazione e accesso utenti (email + password).
- Calendario giornaliero per ciascun campo con fasce libere/occupate e
  navigazione tra i giorni. L'orario di inizio si può scegliere con
  precisione (di default ogni 15 minuti, es. 14:15) e non solo alle ore
  esatte — la granularità è configurabile per campo (`Field.slotMinutes`
  in `prisma/seed.ts`).
- Prenotazione di una fascia libera, con calcolo automatico di prezzo totale
  e acconto richiesto in base alla durata scelta.
- Pagamento online dell'acconto, del saldo o dell'intero importo tramite
  **Stripe Checkout**. Se le chiavi Stripe non sono configurate, l'app usa un
  flusso di pagamento "demo" che marca il pagamento come effettuato subito
  (utile in sviluppo/dimostrazione).
- Pagamento alternativo tramite **bonifico bancario**: l'utente riceve IBAN e
  causale univoca, dichiara di aver effettuato il bonifico e l'amministratore
  lo conferma manualmente dal pannello admin una volta ricevuto l'accredito
  (zero commissioni, nessun account su un provider esterno).
- Dashboard utente con le proprie prenotazioni, stato del pagamento e
  possibilità di annullare.
- Pannello amministratore con vista di tutte le prenotazioni (filtrabili per
  campo, stato e data), gestione dello stato delle prenotazioni,
  registrazione di pagamenti manuali (es. contanti in loco), conferma/rifiuto
  dei bonifici in attesa e messaggistica diretta con l'utente che ha
  prenotato.
- Gestione utenti: un amministratore può promuovere qualsiasi utente
  registrato ad amministratore (o togliergli il ruolo) da "Admin → Gestisci
  utenti". La registrazione pubblica crea sempre account normali, per
  sicurezza: solo un admin già esistente può crearne altri.

## Stack tecnico

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + **PostgreSQL** (compatibile con qualsiasi
  Postgres gestito: Neon, Supabase, Vercel Postgres, RDS, ecc.)
- [Auth.js / NextAuth v5](https://authjs.dev) (provider Credentials)
- [Stripe](https://stripe.com) per i pagamenti online

## Avvio in locale

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Procurati un database Postgres. Il modo più rapido e gratuito è
   [Neon](https://neon.tech) (nessuna carta richiesta): crea un progetto e
   copia la connection string.

3. Copia il file di esempio delle variabili d'ambiente:

   ```bash
   cp .env.example .env
   ```

   Incolla la connection string Postgres in `DATABASE_URL` e genera un
   `AUTH_SECRET` casuale (`openssl rand -base64 32`, oppure su Windows
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
   Le variabili `STRIPE_*` sono opzionali: se lasciate vuote, i pagamenti
   funzionano comunque tramite il flusso demo.

4. Applica lo schema al database e lancia il seed (crea i 3 campi e l'utente
   amministratore):

   ```bash
   npm run db:push
   npm run db:seed
   ```

   Le credenziali dell'amministratore di default sono quelle indicate in
   `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

5. Avvia il server di sviluppo:

   ```bash
   npm run dev
   ```

   L'app sarà disponibile su [http://localhost:3000](http://localhost:3000).

## Script utili

| Comando              | Descrizione                                    |
| --------------------- | ----------------------------------------------- |
| `npm run dev`          | Avvia il server di sviluppo                     |
| `npm run build`        | Build di produzione                             |
| `npm start`            | Avvia il server in produzione (dopo build)      |
| `npm run lint`         | Esegue ESLint                                   |
| `npm run db:push`      | Sincronizza lo schema Prisma sul database        |
| `npm run db:seed`      | Esegue il seed (campi + admin)                  |
| `npm run db:studio`    | Apre Prisma Studio per ispezionare il database  |

## Mettere online l'app gratuitamente (per farla testare a qualcuno)

Combinazione consigliata: **Neon** (database Postgres gratuito) +
**Vercel** (hosting gratuito, pensato per Next.js).

1. **Database**: su [neon.tech](https://neon.tech), crea un account gratuito
   e un nuovo progetto. Copia la connection string mostrata (inizia con
   `postgresql://...`).
2. Da locale, punta temporaneamente `DATABASE_URL` in `.env` a quella
   connection string ed esegui una volta:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   (questo crea le tabelle, i 3 campi e l'utente admin sul database Neon)

3. **Hosting**: su [vercel.com](https://vercel.com), accedi con GitHub e
   scegli "Add New… → Project", seleziona il repository
   `gestione_villa_comunale` e il branch
   `claude/sports-field-booking-app-dhe0yf`.
4. Prima di premere "Deploy", apri "Environment Variables" e aggiungi le
   stesse variabili del tuo `.env` (come minimo `DATABASE_URL` con la
   connection string di Neon, `AUTH_SECRET`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`; `STRIPE_*`/`BANK_*` solo se vuoi provarli online).
5. Premi "Deploy". Dopo 1-2 minuti Vercel assegna un indirizzo pubblico tipo
   `https://gestione-villa-comunale.vercel.app` — condividi quel link con il
   tuo collega.

Ogni push sul branch collegato aggiorna automaticamente il sito online.

## Configurare Stripe (opzionale)

Per abilitare i pagamenti reali con carta:

1. Crea un account Stripe e recupera `STRIPE_SECRET_KEY` dalla dashboard
   (Sviluppatori → Chiavi API). Il pagamento usa Stripe Checkout in modalità
   redirect gestito interamente lato server: non serve alcuna chiave
   pubblicabile lato browser.
2. Configura un endpoint webhook verso `/api/webhooks/stripe` e imposta
   `STRIPE_WEBHOOK_SECRET` con il segreto generato da Stripe.
3. Riavvia l'app: da questo momento i pulsanti di pagamento reindirizzano a
   Stripe Checkout invece di usare il flusso demo.

## Configurare il bonifico bancario (opzionale)

Per offrire il bonifico come alternativa gratuita a Stripe, valorizza in
`.env`:

```
BANK_IBAN="IT..."
BANK_INTESTATARIO="Nome dell'ente/associazione"
BANK_ISTITUTO="Nome della banca"  # facoltativo
```

Se `BANK_IBAN` non è impostato, l'opzione bonifico semplicemente non compare
nell'app. Quando è attiva, il flusso è:

1. L'utente sceglie "Paga con bonifico bancario" per l'acconto, il saldo o
   l'intero importo: l'app genera una causale univoca e mostra IBAN,
   intestatario e importo da versare.
2. L'utente effettua il bonifico dalla propria banca (nessuna commissione per
   voi che lo ricevete).
3. L'amministratore, dal pannello admin sulla prenotazione interessata,
   controlla l'estratto conto e preme "Conferma ricevuto": la prenotazione si
   aggiorna automaticamente (o "Rifiuta" se il bonifico non risulta arrivato).

Il pannello admin mostra anche un contatore "Bonifici da confermare" per non
perdere le richieste in sospeso.

## Note sui dati

I tre campi (Calcetto, Padel, Tennis) con prezzo orario e percentuale di
acconto sono definiti in `prisma/seed.ts` e possono essere modificati da lì
o direttamente dal database (es. con `npm run db:studio`).
