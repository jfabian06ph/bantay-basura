/**
 * Static content for the app's navigation and editorial pages.
 *
 * `View` is the single source of truth for every routable surface. The
 * map, About, and Transparency (Dashboard) views render bespoke components;
 * the rest are data-driven `InfoPage`s described by `PAGES`. As those pages
 * grow they can each move into their own file under `content/` — this module
 * stays the index that ties them together.
 */

export type View =
  | 'map'
  | 'reports'
  | 'transparency'
  | 'how'
  | 'partners'
  | 'about'
  | 'resources'

export interface NavItem {
  key: View
  label: string
}

// Ordered to match the visitor's mental journey: see the map, see that the
// platform works (Transparency), see community impact, then learn the how/who.
// "Partners" is intentionally omitted until real partner organizations exist;
// the route + page content remain so it can be restored by re-adding it here.
export const NAV: NavItem[] = [
  { key: 'map', label: 'Map' },
  { key: 'transparency', label: 'Transparency' },
  { key: 'reports', label: 'Impact' },
  { key: 'how', label: 'How It Works' },
  { key: 'about', label: 'About' },
]

export interface PageContent {
  eyebrow: string
  title: string
  intro: string
  points: { title: string; body: string }[]
}

/** Views that render as a generic editorial `InfoPage`. */
export type InfoView = Exclude<View, 'map' | 'about' | 'transparency' | 'resources'>

export const PAGES: Record<InfoView, PageContent> = {
  reports: {
    eyebrow: 'Every flag, in one list',
    title: 'Community Reports',
    intro:
      'A searchable, filterable feed of every waste report, beyond the map pins.',
    points: [
      { title: 'Filter & sort', body: 'By status, area, waste type, severity, and recency.' },
      { title: 'Hotspots', body: 'See which barangays and roads accumulate the most flags.' },
      { title: 'Track a report', body: 'Follow a single flag from reported to resolved.' },
    ],
  },
  how: {
    eyebrow: 'Report • Verify • Act',
    title: 'How It Works',
    intro:
      'Three simple steps turn a single sighting into shared, trackable action.',
    points: [
      { title: '1 · Report', body: 'Flag waste at its exact location with a photo and details.' },
      { title: '2 · Verify', body: 'Neighbors confirm “still here” or “cleared” to keep it honest.' },
      { title: '3 · Act', body: 'LGUs and volunteers see hotspots and prioritize clean-ups.' },
    ],
  },
  partners: {
    eyebrow: 'Cleaner communities, together',
    title: 'Partners',
    intro:
      'The LGUs, barangays, schools, and volunteer groups making clean-ups happen, and how to join.',
    points: [
      { title: 'Local governments', body: 'Claim your area, acknowledge reports, and post clean-up updates.' },
      { title: 'Volunteer groups', body: 'Adopt hotspots and organize community clean-up drives.' },
      { title: 'Become a partner', body: 'Bring Bantay Basura to your town. Reach out to collaborate.' },
    ],
  },
}
