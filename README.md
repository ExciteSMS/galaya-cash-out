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

Run [supabase/full_schema.sql](supabase/full_schema.sql) in the Supabase SQL editor of a fresh project to create the full schema. After adding a migration, regenerate it with `scripts/build-schema.sh`.

## Edge functions

```sh
supabase link --project-ref <your-project-ref>
supabase functions deploy
```

Set function secrets (e.g. Lipila / SMS keys) with `supabase secrets set`.

## Security notes

- **Lipila callback:** register `<SUPABASE_URL>/functions/v1/lipila-callback?token=<callback_secret>` with Lipila. The full URL is shown in Admin > Settings. Callbacks without the token are rejected.
- **Login protection:** sign-in goes through the `auth-guard` edge function. Accounts lock for 15 minutes after 10 failed PINs. Admins can switch on an SMS code after N failed PINs (Admin > Settings > Login Security). Forgot-PIN always uses an SMS code.
- **Device binding:** one bound device per account until an admin releases it (Admin > Devices).
