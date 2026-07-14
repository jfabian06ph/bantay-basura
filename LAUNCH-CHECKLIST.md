# Launch Checklist

Status of Bantay Basura toward a public launch. Code is done for everything
below unless noted — the open items are **account actions only you can do**.
See `DEPLOY.md` for the environment model and `TESTING.md` for the tester guide.

## Reference

| Thing | Value |
| --- | --- |
| Beta (share with testers) | https://bantay-basura-beta.vercel.app → **staging** DB |
| Production (real launch) | https://bantay-basura-lovat.vercel.app → **prod** DB (pristine) |
| Vercel project | `bantay-basura` (account `jfabianzarsuela-7695`) |
| Prod Supabase | `qunsuhblytgvystxtzxa` |
| Staging Supabase | `zjecmwgptvphatxzmyyp` |
| Git commits for this repo | use **jfabianzarsuela@gmail.com** (already set locally) |

---

## 1. Beta — do these now

- [ ] **Enable Vercel Analytics.** Vercel → project `bantay-basura` → **Analytics → Enable**. (Code already wired.)
- [ ] **Connect GitHub auto-deploy** (ends the manual `vercel deploy` + re-alias + cache dance).
  - Vercel → account **Settings → Connections → connect GitHub** (the `jfabian06ph` account that owns the repo).
  - Project `bantay-basura` → **Settings → Git → Connect** `jfabian06ph/bantay-basura`, production branch = `main`.
  - After this: push to `main` → auto prod deploy; branches/PRs → their own preview URLs.
- [ ] **Run the prod `province` migration.** Supabase → prod (`qunsuhblytgvystxtzxa`) → SQL Editor:
  ```sql
  alter table public.reports add column if not exists province text;
  ```
- [ ] **Create an operator auth user** (unlocks `/ops` + the Feedback section). Supabase → prod & staging → Authentication → Add user (email+password), then insert a matching `profiles` row (role `admin`). Add a `reports_delete` RLS policy if you want the Data/Admin delete to work.
- [ ] Share **https://bantay-basura-beta.vercel.app** + `TESTING.md` with friends.
- [ ] Review feedback: Ops Center → **Feedback** (once signed in) or Supabase → Table editor → `feedback`.

---

## 2. Before public launch — blockers

- [ ] **Image moderation gate** (non-negotiable for anonymous public uploads). Edge function `supabase/functions/moderate-photo` exists but is **not deployed or wired**. To finish:
  - Pick a provider (Google Vision SafeSearch recommended — ~free at our scale; ~$1.50/1k images after 1k/mo free).
  - Deploy the function to both projects; set the provider API key as a function secret.
  - Wire upload → private `report-quarantine` bucket → moderate → approve to public `report-photos` (see `bantay-basura-image-moderation` notes).
- [ ] **Custom domain** (e.g. `.org` ~$12/yr, or `.ph` ~₱1,000–1,800/yr). Add in Vercel → Domains, point DNS. Then update `og:image`/`og:url` host in `index.html`.
- [ ] **Point Production env at prod deliberately** and give out the real domain (not the beta URL).
- [ ] **Review the Privacy page** (`/privacy`) copy and confirm it matches final data practices.
- [ ] Turn off / gate anything test-only for prod (the feedback widget is already `isBeta`-gated).

---

## 3. Nice-to-have / later

- [ ] **Error monitoring** (Sentry) — needs a free account + DSN.
- [ ] **Anti-abuse on uploads** — per-device/IP rate limits, duplicate-image detection (overlaps with moderation).
- [ ] **"Report this photo"** public control + admin moderation queue.
- [ ] Ops Center Phase 2 — resident auto-linking, team mgmt, role perms, realtime.
- [ ] Data retention / backups policy (Supabase free tier).

---

## Notes / gotchas

- **PWA caching:** after a deploy, the app shows a **"New version available → Refresh"** toast (prompt mode). First load after a deploy is one version behind; the toast makes it a one-tap update.
- **Beta deploy loop (until GitHub auto-deploy is connected):** `vercel deploy --yes` → wait for build → `vercel alias set <deployment-url> bantay-basura-beta.vercel.app`.
- **Deployment protection is OFF** so testers don't hit a Vercel login wall (both prod + preview are public).
