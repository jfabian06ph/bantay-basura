/**
 * Mock data for the Impact community hub. Kept in one place so it can later be
 * swapped for live Supabase queries without touching the page components.
 */

/**
 * Founding mode. While true, the Impact page shows an honest "we're just
 * getting started — become a founding partner" experience instead of the
 * activity/partner data below (which is illustrative until real communities
 * and partners exist). Flip to false once there are real organised cleanups
 * and partners to feature.
 */
export const FOUNDING_MODE = true
import {
  Waves,
  Recycle,
  Trees,
  Users,
  Trash2,
  Camera,
  CheckCircle2,
  MapPin,
  Award,
  type LucideIcon,
} from 'lucide-react'

export interface Activity {
  id: string
  dow: string // "SAT"
  mon: string // "JUL"
  day: number // 19
  iso: string // "2026-07-19"
  icon: LucideIcon
  tone: string // accent colour
  title: string
  place: string
  area: string // municipality — powers the location filter
  time: string
  host: string
  count: number
  capacity: number
  countLabel: string
  /** Category badge shown at the top of the detail modal. */
  badge: string
  /** Human duration, e.g. "3 hours". */
  duration: string
  /** Mock proximity line, e.g. "12 min away". */
  distance: string
  /** The one event promoted to the hero spotlight + enlarged in the grid. */
  featured?: boolean
  /** Optional photo for the spotlight billboard. */
  photo?: string
  detail: {
    about: string
    meetingPoint: string
    slots: string
    bring: string[]
  }
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'coastal-cleanup',
    dow: 'SAT',
    mon: 'JUL',
    day: 19,
    iso: '2026-07-19',
    icon: Waves,
    tone: '#23c266',
    title: 'Coastal Cleanup',
    place: 'San Felipe Beach',
    area: 'San Felipe',
    time: '7:00 AM – 10:00 AM',
    host: 'LGU San Felipe',
    count: 34,
    capacity: 44,
    countLabel: 'Volunteers',
    badge: 'Coastal Cleanup',
    duration: '3 hours',
    distance: '8 min away',
    featured: true,
    photo: '/zambales-coast.jpg',
    detail: {
      about:
        'Join your neighbours for a sunrise cleanup along San Felipe Beach, clearing plastic and debris before the tide carries it back out. First-time volunteers and families are very welcome.',
      meetingPoint: 'San Felipe Beach main pavilion, near the barangay hall.',
      slots: '34 / 44 volunteers',
      bring: ['Refillable water', 'Gloves (provided if none)', 'Hat & sunblock', 'Reusable sack'],
    },
  },
  {
    id: 'recycling-workshop',
    dow: 'SUN',
    mon: 'JUL',
    day: 27,
    iso: '2026-07-27',
    icon: Recycle,
    tone: '#f5b84b',
    title: 'Recycling Workshop',
    place: 'Community Hall, Iba',
    area: 'Iba',
    time: '9:00 AM – 11:30 AM',
    host: 'Eco Volunteers',
    count: 18,
    capacity: 40,
    countLabel: 'Participants',
    badge: 'Workshop',
    duration: '2.5 hours',
    distance: '5 min away',
    detail: {
      about:
        'A hands-on afternoon learning to sort, clean, and turn everyday household plastic into something genuinely useful. Beginner-friendly, bring the kids.',
      meetingPoint: 'Iba Community Hall, function room 2.',
      slots: '18 / 40 participants',
      bring: ['Clean plastic bottles', 'Scissors', 'Notebook'],
    },
  },
  {
    id: 'tree-planting',
    dow: 'WED',
    mon: 'JUL',
    day: 16,
    iso: '2026-07-16',
    icon: Trees,
    tone: '#23c266',
    title: 'Tree Planting',
    place: 'Botolan Riverbank',
    area: 'Botolan',
    time: '6:30 AM – 9:00 AM',
    host: 'Youth for Earth',
    count: 52,
    capacity: 80,
    countLabel: 'Volunteers',
    badge: 'Reforestation',
    duration: '2.5 hours',
    distance: '15 min away',
    detail: {
      about:
        'Help bring the Botolan riverbank back to life with native bamboo and narra seedlings that hold the soil through the rainy season. Every pair of hands counts.',
      meetingPoint: 'Botolan bridge, east side.',
      slots: '52 / 80 volunteers',
      bring: ['Water', 'Trowel if you have one', 'Long sleeves'],
    },
  },
  {
    id: 'river-cleanup',
    dow: 'SUN',
    mon: 'JUL',
    day: 20,
    iso: '2026-07-20',
    icon: Waves,
    tone: '#2f7fe0',
    title: 'River Cleanup',
    place: 'Sto. Tomas River, Subic',
    area: 'Subic',
    time: '7:00 AM – 10:00 AM',
    host: 'Green Warriors',
    count: 27,
    capacity: 50,
    countLabel: 'Volunteers',
    badge: 'River Cleanup',
    duration: '3 hours',
    distance: '20 min away',
    detail: {
      about:
        'Spend a morning with neighbours clearing waste from the Sto. Tomas riverbanks before it reaches the bay. Easygoing pace, big impact.',
      meetingPoint: 'Sto. Tomas bridge, Subic side.',
      slots: '27 / 50 volunteers',
      bring: ['Boots', 'Gloves', 'Water'],
    },
  },
  {
    id: 'barangay-drive',
    dow: 'WED',
    mon: 'JUL',
    day: 23,
    iso: '2026-07-23',
    icon: Trash2,
    tone: '#e31e2f',
    title: 'Barangay Clean-up Drive',
    place: 'Brgy. Poblacion, Masinloc',
    area: 'Masinloc',
    time: '3:00 PM – 6:00 PM',
    host: 'Barangay Volunteers',
    count: 41,
    capacity: 70,
    countLabel: 'Volunteers',
    badge: 'Community Event',
    duration: '3 hours',
    distance: '12 min away',
    detail: {
      about:
        'Help clean the streets around Poblacion together with your neighbours, then sort the collected waste properly. Families and first-time volunteers are welcome.',
      meetingPoint: 'Masinloc plaza.',
      slots: '41 / 70 volunteers',
      bring: ['Broom / rake', 'Gloves', 'Water'],
    },
  },
]

/**
 * Floating markers drifted over the drone hero — each one a live activity, so
 * the video reads as a place where things are happening (not just scenery).
 * Positions are % of the hero box; delays stagger their arrival.
 */
export interface HeroMarker {
  label: string
  tone: string
  top: string
  left: string
  delay: number // ms — staggers the breathe-in
  dur: string // idle-float duration; varied per pin so they never move in sync
  sx: string // horizontal sway at mid-float
  sy: string // vertical rise at mid-float
}

export const HERO_MARKERS: HeroMarker[] = [
  // Sit toward the right, in the open upper band, clear of the bottom-left
  // headline. Delays stagger the breathe-in (~1s apart); the varied dur/sx/sy
  // desync their drift so the cluster feels organic, never like a fixed grid.
  { label: 'Coastal Cleanup', tone: '#2f7fe0', top: '15%', left: '52%', delay: 800, dur: '7.5s', sx: '3px', sy: '-6px' },
  { label: 'Tree Planting', tone: '#23c266', top: '24%', left: '80%', delay: 1800, dur: '9s', sx: '-4px', sy: '-4px' },
  { label: 'Recycling Workshop', tone: '#f5b84b', top: '33%', left: '66%', delay: 2800, dur: '6.5s', sx: '2px', sy: '-7px' },
  { label: 'River Cleanup', tone: '#2f7fe0', top: '46%', left: '87%', delay: 3800, dur: '8.2s', sx: '-3px', sy: '-5px' },
]

export interface FeedItem {
  icon: LucideIcon
  tone: string
  text: string
  when: string
}

export const FEED: FeedItem[] = [
  { icon: Users, tone: '#2f7fe0', text: 'Maria joined Coastal Cleanup', when: '2m ago' },
  { icon: Users, tone: '#2f7fe0', text: '14 volunteers signed up in San Felipe', when: '11m ago' },
  { icon: CheckCircle2, tone: '#23c266', text: 'Cleanup completed at Iba shoreline', when: '38m ago' },
  { icon: Trash2, tone: '#23c266', text: '120 kg of waste collected in Botolan', when: '1h ago' },
  { icon: Camera, tone: '#f5b84b', text: 'Brgy. Poblacion uploaded 6 cleanup photos', when: '2h ago' },
  { icon: Trees, tone: '#23c266', text: 'Youth for Earth planted 80 seedlings', when: '3h ago' },
]

/**
 * Pool of events the live feed drips in over time — each arrival slides in at
 * the top with a NEW badge, so the feed feels like it's breathing.
 */
export const INCOMING_FEED: Omit<FeedItem, 'when'>[] = [
  { icon: Users, tone: '#2f7fe0', text: 'Jerome joined River Cleanup' },
  { icon: Camera, tone: '#f5b84b', text: 'San Felipe uploaded 3 before/after photos' },
  { icon: CheckCircle2, tone: '#23c266', text: 'Cleanup completed at Masinloc plaza' },
  { icon: Users, tone: '#2f7fe0', text: 'Liza joined Tree Planting' },
  { icon: Trash2, tone: '#23c266', text: '64 kg of waste collected in Subic' },
  { icon: Trees, tone: '#23c266', text: 'Green Warriors planted 40 seedlings' },
  { icon: Users, tone: '#2f7fe0', text: '9 volunteers signed up in Botolan' },
]

export interface Group {
  rank: 1 | 2 | 3
  medal: string
  name: string
  hours: number
  /** Hours gained this week — momentum reads stronger than the running total. */
  weekly: number
}

export const GROUPS: Group[] = [
  { rank: 1, medal: '🥇', name: 'Green Warriors', hours: 482, weekly: 18 },
  { rank: 2, medal: '🥈', name: 'Youth for Earth', hours: 381, weekly: 24 },
  { rank: 3, medal: '🥉', name: 'Barangay Volunteers', hours: 290, weekly: 12 },
]

// NOTE: There is no individual "leaderboard" by design. Bantay Basura recognises
// communities, not people (see the "Communities Making Progress" board, which is
// derived from real report data via `communityRankings` in lib/stats). Volunteer
// *organisations* — not individuals — are celebrated in GROUPS above. The Impact
// hero counters are likewise real community totals (`impactTotals`), not vanity
// numbers, so there is no static IMPACT_STATS here anymore.

// No mock GALLERY: the before/after gallery shows only real resolved reports
// that have both an original and an "after" photo (see Impact.tsx). Until one
// exists, an honest empty state waits for the first documented cleanup.

export const CHALLENGE = {
  month: 'August',
  title: 'Complete a Cleanup',
  lede: 'One cleanup, from first report to final photo. It uses the tools you already have: report a spot, help clean it, show the result.',
  cta: 'Start a cleanup',
  steps: [
    { icon: MapPin, label: 'Report the spot' },
    { icon: Trash2, label: 'Help clean it up' },
    { icon: Camera, label: 'Upload the after' },
    { icon: Award, label: 'Document the result' },
  ],
}

export const SCHOOLS = [
  'San Felipe National HS',
  'Botolan Central School',
  'Masinloc Elementary',
  'Iba Academy',
  'Subic Bay Colleges',
]

export const PARTNERS = ['DENR', 'Barangay Councils', 'Local NGOs', 'Private Companies', 'Universities']

export interface ToolkitItem {
  icon: LucideIcon
  title: string
  note: string
}
