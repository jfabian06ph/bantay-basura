# Bantay Basura

```
Brand
──────────────
Bantay Basura

Product
──────────────
Community-Powered Environmental Reporting

Mission
──────────────
Making waste visible. Together.
```

**Bantay Basura** is a community-powered environmental reporting platform designed to help
citizens, volunteers, and local governments work together to identify, verify, and resolve
waste issues through transparent public reporting.

Every report has a life: **Reported → Community Verified → Visible to LGU → In Review →
Resolved → Community Confirms Resolution.** The platform doesn't just collect complaints —
it tells the whole story of a problem from sighting to cleanup, so citizens can see the
outcome of their contribution.

## Why it exists

Most reporting apps stop at "Submit → Done." Bantay Basura closes the loop: neighbors
confirm whether waste is *still there* or *cleared*, LGUs can see hotspots and act, and the
community sees the results — building the trust that keeps people participating.

## Features

- 🗺️ **Live map** of waste reports across Zambales, clustered and colored by status.
- 🚩 **Guided reporting** — pin the exact location, pick a category, add photos, submit.
- ✅ **Community verification** — "Still here" / "Looks clean" votes with a consensus tally.
- 📊 **Live Community Status** — a contextual panel that reflects the current map area
  (nationwide → province → municipality) with a per-area community snapshot.
- 🏛️ **Transparency dashboard** — resolution rates, response times, and area leaderboards.
- 🎉 **Resolved celebration** — before/after photo comparison when an issue is cleaned up.
- 📱 **PWA** — installable, offline-friendly, works from a shared link (no app store needed).
- 🔒 **Anonymous by default** — only the waste location and details are public.

## Tech stack

- **React + TypeScript + Vite** (PWA via `vite-plugin-pwa`)
- **Leaflet + OpenStreetMap** (CARTO tiles) with `supercluster` clustering
- **Tailwind v4 + shadcn/ui** components, themed to the brand
- **Supabase** (Postgres + Auth) — optional; the app runs on seeded mock data without it
- **Oxlint** for linting

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
```

### Supabase (optional)

The app runs in **demo mode** on seeded mock data out of the box. To connect a real backend:

```bash
cp .env.example .env.local
# paste your Supabase project URL + anon key
```

Schema lives in [`supabase/schema.sql`](supabase/schema.sql).

## Design

The visual language — navy foundation, semantic red/green, glass panels, soft geometry — is
documented in [`DESIGN.md`](DESIGN.md). When someone sees a screenshot, they should think
*"That's Bantay Basura,"* not "another dashboard."

## Project structure

```
src/
├── components/     # UI: map, report panel, status panel, dashboard, sheets
├── ops/            # LGU Operations Center (authenticated portal)
├── lib/            # stats, geo, geocoding, refs
├── content/        # static page/nav content
├── types.ts        # Report model + category/status constants
├── mockData.ts     # seeded Zambales reports (demo mode)
└── municipalities.ts
```

---

*Making waste visible. Together.*
