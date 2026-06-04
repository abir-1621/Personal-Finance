# Friend Savings Tracker

A private savings tracker for a small group of friends. Admins create users, assign share counts, manage deposits, approve/reject transactions, and review monthly reports. Members can log in, change their initial password, view their assigned shares, and submit monthly deposits whose amounts are calculated server-side.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Supabase Row Level Security
- Vercel-ready with no separate backend server

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. In Supabase SQL Editor, run:

```text
supabase/migrations/0001_initial_schema.sql
```

4. Copy the environment example:

```bash
cp .env.example .env.local
```

5. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only the two `NEXT_PUBLIC_` values are safe for browser use. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

## Create The First Admin

Set these values in `.env.local`:

```bash
FIRST_ADMIN_EMAIL=admin@example.com
FIRST_ADMIN_PASSWORD=temporary-password
FIRST_ADMIN_FULL_NAME=Admin User
```

Then run:

```bash
npm run create-first-admin
```

The admin must change this password on first login.

After the first admin exists, all other users should be created from `/admin/members`.

## Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add the three Supabase environment variables in Vercel Project Settings.
4. Deploy.

The service role key is used only in server actions and scripts. It is not imported into client components.

## Business Rules Covered

- No public sign-up page.
- Admin creates all users through server-side service role access.
- Members must change their initial password.
- Admin assigns and updates member share counts.
- Members cannot edit share counts.
- Deposit amount is calculated server-side from assigned shares and current share price.
- Deposits store `share_count_snapshot`, `share_price_snapshot`, and `amount`.
- Old deposits are not recalculated when settings change.
- Admin can add, edit, approve, reject, and delete deposits.
- Audit logs record member, deposit, and settings changes.
- Optional receipt images are stored in a private Supabase Storage bucket.

## Receipt Uploads

Receipts are stored in the private `deposit-receipts` Supabase Storage bucket. The database keeps only `deposits.receipt_path`. The form optimizes large images in the browser before upload so receipt files are smaller while remaining readable.
