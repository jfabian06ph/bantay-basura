# Deploy & Environments

Bantay Basura runs two isolated environments so friends can test without
polluting the real launch database.

| Environment | Vercel                    | Supabase project        | `VITE_APP_ENV` | Feedback widget |
| ----------- | ------------------------- | ----------------------- | -------------- | --------------- |
| Production  | `main` branch             | **prod** (kept pristine) | `production`   | hidden          |
| Staging     | Preview (branches / PRs)  | **staging** (disposable) | `staging`      | shown           |
| Local dev   | —                         | your `.env.local`        | `development`  | shown           |

The **production** Supabase is the one we already created (`qunsuhblytgvystxtzxa`)
— it stays empty until real launch. Friends test against a separate **staging**
project whose data can be wiped anytime.

---

## 1. Create the staging Supabase project

1. supabase.com → **New project** (same org). Name it e.g. `bantay-basura-staging`,
   region **ap-southeast-1 (Singapore)**, free tier.
2. In the SQL editor, run, in order:
   - `supabase/schema.sql`
   - `supabase/feedback.sql`
3. Storage → create a **public** bucket `report-photos` (matches prod).
4. If prod has Edge Functions under `supabase/functions`, deploy them here too.
5. Copy the project **URL** and **anon key** (Settings → API) for step 3.

> The nationwide reverse-geocoding needs a `province` column. `schema.sql`
> already includes it on fresh projects.

## 2. Connect the repo to Vercel

1. vercel.com → **Add New… → Project** → import `jfabian06ph/bantay-basura`.
2. Framework preset: **Vite**. Build `npm run build`, output `dist` (auto-detected).
3. Don't deploy yet — set env vars first (step 3), then deploy.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Add each variable and tick the environments it applies to:

| Variable                 | Production value        | Preview value            |
| ------------------------ | ----------------------- | ------------------------ |
| `VITE_SUPABASE_URL`      | prod project URL        | staging project URL      |
| `VITE_SUPABASE_ANON_KEY` | prod anon key           | staging anon key         |
| `VITE_APP_ENV`           | `production`            | `staging`                |

(Add the same two Supabase vars once with different values per environment, and
`VITE_APP_ENV` likewise. Leave "Development" unchecked — that's your local `.env.local`.)

Then **Deploy**. `main` → production URL; every other branch/PR → a Preview URL
you share with testers.

## 4. QA feedback

Testers use the floating **Feedback** button (bottom-left, staging only). Each
submission lands in the Supabase `feedback` table with the page, app env, device
and viewport auto-captured. Review it in the staging Supabase dashboard
(Table editor → `feedback`) or, when signed in, the Ops Center.

Statuses: `new → triaged → resolved`.
