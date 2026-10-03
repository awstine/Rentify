# Rentify

Property management web app: landlords list properties and rooms with QR-code discovery, tenants join via QR + OTP, and manage their leases, invoices, reservations, payments, and maintenance on a tenant portal.

## Stack

- **Frontend:** React 19 · TypeScript · Vite · Tailwind CSS · TanStack Router/React Router
- **Backend:** Supabase (Postgres, RLS, custom OTP auth flow), nightly maintenance-reminder edge function
- **Tooling:** Oxlint, TypeScript (`tsc -b`)

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

## Scripts

| Command          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Start the Vite dev server                    |
| `npm run build`  | Type-check (tsc) + production build (`dist/`)|
| `npm run lint`   | Run Oxlint                                   |
| `npm run preview`| Preview the production build                 |

## Notes

- `src/lib/supabase.ts` falls back to a free-tier Supabase project URL; supply
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` (never committed).
- `supabase/migrations/zz_dev_only_rls_policies.sql` is **dev-only** — do not
  run it against a production database.
- The initial commit corresponds to the reverted explore/browse feature — discovery
  is QR-code-only.

