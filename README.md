# Galaya Cash Out

Mobile-money POS and admin app (React + Vite + Supabase).

## Setup

```sh
npm install
cp .env.example .env   # or edit .env
npm run dev
```

Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Database

Run [supabase/full_schema.sql](supabase/full_schema.sql) in the Supabase SQL editor of a fresh project to create the full schema.

## Edge functions

```sh
supabase link --project-ref <your-project-ref>
supabase functions deploy
```

Set function secrets (e.g. Lipila / SMS keys) with `supabase secrets set`.
