# Villa Comunale di Torre de' Passeri — Prenotazione campi sportivi

App web per la gestione delle prenotazioni dei campi sportivi della Villa
Comunale di Torre de' Passeri: **calcetto**, **padel** e **tennis**.

## Funzionalità

- Registrazione e accesso utenti (email + password).
- Calendario giornaliero per ciascun campo con slot liberi/occupati e
  navigazione tra i giorni.
- Prenotazione di uno slot libero, con calcolo automatico di prezzo totale e
  acconto richiesto.
- Pagamento online dell'acconto, del saldo o dell'intero importo tramite
  **Stripe Checkout**. Se le chiavi Stripe non sono configurate, l'app usa un
  flusso di pagamento "demo" che marca il pagamento come effettuato subito
  (utile in sviluppo/dimostrazione).
- Dashboard utente con le proprie prenotazioni, stato del pagamento e
  possibilità di annullare.
- Pannello amministratore con vista di tutte le prenotazioni (filtrabili per
  campo, stato e data), gestione dello stato delle prenotazioni,
  registrazione di pagamenti manuali (es. contanti in loco) e messaggistica
  diretta con l'utente che ha prenotato.

## Stack tecnico

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + SQLite (facilmente sostituibile con
  Postgres/MySQL in produzione cambiando `datasource` e `DATABASE_URL`)
- [Auth.js / NextAuth v5](https://authjs.dev) (provider Credentials)
- [Stripe](https://stripe.com) per i pagamenti online

## Avvio in locale

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Copia il file di esempio delle variabili d'ambiente:

   ```bash
   cp .env.example .env
   ```

   Genera un `AUTH_SECRET` casuale, ad esempio con `openssl rand -base64 32`.
   Le variabili `STRIPE_*` sono opzionali: se lasciate vuote, i pagamenti
   funzionano comunque tramite il flusso demo.

3. Crea il database e applica le migrazioni (crea anche i 3 campi e
   l'utente amministratore tramite il seed):

   ```bash
   npm run db:migrate
   ```

   Le credenziali dell'amministratore di default sono quelle indicate in
   `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

4. Avvia il server di sviluppo:

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
| `npm run db:migrate`   | Applica le migrazioni Prisma e il seed          |
| `npm run db:seed`      | Esegue solo il seed (campi + admin)             |
| `npm run db:studio`    | Apre Prisma Studio per ispezionare il database  |

## Configurare Stripe (opzionale)

Per abilitare i pagamenti reali con carta:

1. Crea un account Stripe e recupera `STRIPE_SECRET_KEY` e
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` dalla dashboard.
2. Configura un endpoint webhook verso `/api/webhooks/stripe` e imposta
   `STRIPE_WEBHOOK_SECRET` con il segreto generato da Stripe.
3. Riavvia l'app: da questo momento i pulsanti di pagamento reindirizzano a
   Stripe Checkout invece di usare il flusso demo.

## Note sui dati

I tre campi (Calcetto, Padel, Tennis) con prezzo orario e percentuale di
acconto sono definiti in `prisma/seed.ts` e possono essere modificati da lì
o direttamente dal database (es. con `npm run db:studio`).
