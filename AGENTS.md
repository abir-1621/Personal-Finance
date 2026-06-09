# Friends & Fund Project Guide

Use this file as the first stop for future coding sessions. It summarizes the project shape so you can avoid reading the whole repository unless a task needs deeper context.

## Purpose

Friends & Fund is a private savings and deposit tracker for trusted friend groups. Admins manage members, assigned shares, deposits, approval status, settings, reports, and audit logs. Members can sign in, change their initial password, view their share assignment, and submit monthly deposits with receipt images.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS for styling
- Supabase Auth, PostgreSQL, Row Level Security, and private Storage
- Server actions in `app/actions/*`
- No separate backend service

## Common Commands

```bash
npm run dev
npm run lint
npm run build
npm run create-first-admin
```

Run `npm run lint` and `npm run build` after meaningful code changes.

## Project Structure

```text
app/
  (protected)/            Authenticated dashboard, member, admin, deposit, and report routes
  actions/                Server actions for auth, deposits, members, and settings
  change-password/        Forced initial password-change flow
  login/                  Public login page
  globals.css             Tailwind layers and shared component classes
  icon.svg                App favicon/logo mark
components/
  brand-logo.tsx          Reusable Friends & Fund logo mark and wordmark
  app-layout.tsx          Authenticated shell with sidebar, navbar, and mobile nav
  *.tsx                   Forms, tables, badges, cards, dialogs, and headers
lib/
  auth.ts                 Current-user and route-guard helpers
  data.ts                 Supabase data access helpers
  receipts.ts             Receipt upload/optimization helpers
  supabase/               Server and admin Supabase clients
  types.ts                Shared Role, Profile, Deposit, Setting, and AuditLog types
supabase/migrations/
  0001_initial_schema.sql Profiles, settings, deposits, audit logs, RLS policies
  0002_deposit_receipts.sql Private receipt bucket and storage policies
scripts/
  create-first-admin.mjs  Bootstrap first admin from environment variables
public/
  friends-fund-logo.svg   Standalone logo asset
```

## Important Routes

- `/login` public login page
- `/change-password` required first-login password update
- `/dashboard` member/admin dashboard
- `/deposits/add` submit a deposit
- `/deposits/history` view deposit history
- `/admin` admin overview
- `/admin/members` create and manage members
- `/admin/deposits` review, edit, approve, reject, and delete deposits
- `/admin/monthly-report` monthly reporting
- `/admin/settings` share price and currency settings
- `/admin/audit-logs` admin audit log view

## Data Model

- `profiles`: user profile, role (`ADMIN` or `MEMBER`), assigned shares, active flag, initial password flag
- `settings`: current share price and currency; defaults are `5000` and `NOK`
- `deposits`: member deposit records with month, date, share snapshots, calculated amount, status, note, and optional receipt path
- `audit_logs`: admin-visible change history
- Storage bucket `deposit-receipts`: private image receipts, limited to JPEG, PNG, and WebP

## Business Rules

- There is no public signup. Admins create users.
- Members must change their initial password before entering the app.
- Members cannot edit their assigned share count.
- Each member can have only one deposit record per month.
- Deposit amount is calculated server-side from assigned shares and current settings.
- Deposits store share count and share price snapshots; old deposits are not recalculated when settings change.
- Members submit pending deposits and can edit their own pending deposit before approval, mainly to add or replace a receipt.
- Approved deposits are locked from later edits, status changes, or deletion.
- Admins approve, reject, edit, or delete deposits while they are not approved.
- Admin dashboard can generate/copy a WhatsApp reminder for members who have not submitted this month's deposit; it opens WhatsApp with prefilled text, but the admin still chooses the group and sends manually.
- Receipt files are private and controlled by Supabase Storage policies.
- Audit logs record member, deposit, and settings changes.

## Branding

- Visible product name: `Friends & Fund`
- Logo component: `components/brand-logo.tsx`
- Favicon: `app/icon.svg`
- Exportable logo asset: `public/friends-fund-logo.svg`
- Palette in use: teal savings base, blue trust accent, gold fund/coin accent
- Authenticated shell uses a desktop sidebar edge toggle and a client route-progress bar during internal navigation.

## Files Usually Worth Opening First

- For auth or route-access work: `lib/auth.ts`, `middleware.ts`, `app/(protected)/layout.tsx`
- For data behavior: `lib/data.ts`, relevant `app/actions/*`, `lib/types.ts`
- For deposit workflows: `components/deposit-form.tsx`, `app/actions/deposits.ts`, deposit routes under `app/(protected)/deposits` and `app/(protected)/admin/deposits`
- For member workflows: `components/member-form.tsx`, `app/actions/members.ts`, `app/(protected)/admin/members/page.tsx`
- For UI shell or branding: `components/app-layout.tsx`, `components/sidebar.tsx`, `components/navbar.tsx`, `components/brand-logo.tsx`
- For schema/RLS changes: the focused migration file under `supabase/migrations`

## Files To Skip Unless Needed

- `node_modules/`
- `.next/`
- `.codex-screenshots/`
- `.next-dev.log`
- `Personal Finance/` appears unrelated to this app and was already untracked; do not modify it unless the user explicitly asks.

## Working Notes

- Preserve existing user changes in the worktree.
- Prefer existing helpers and local component patterns over new abstractions.
- Keep admin-only behavior on the server side or protected by Supabase RLS.
- Use `rg` for focused searches instead of reading broad directories.
- Use `apply_patch` for manual file edits.
