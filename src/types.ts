/** A geographic point — used throughout the report + map flow. */
export interface LatLng {
  lat: number
  lng: number
}

export type ReportStatus = 'pending' | 'in_review' | 'resolved'

/** Who submitted a report — surfaced only as an aggregate role, never a person. */
export type ReportSource = 'resident' | 'lgu' | 'volunteer'

/** Statuses that count as "not yet cleaned". */
export const OPEN_STATUSES: ReportStatus[] = ['pending', 'in_review']
export const DONE_STATUSES: ReportStatus[] = ['resolved']

export type Category =
  | 'household'
  | 'dumping'
  | 'water'
  | 'burning'
  | 'construction'
  | 'recycling'

export interface Report {
  id: string
  lat: number
  lng: number
  /** Short human title describing the issue, e.g. "Plastic Waste". */
  title?: string
  category: Category
  /** 1 = minor, 2 = moderate, 3 = severe */
  severity: 1 | 2 | 3
  note?: string
  /** data URL or remote URL of the primary photo (kept for backward compat) */
  photoUrl?: string
  /** All photos attached to the report. photoUrl is treated as the first if this is empty. */
  photoUrls?: string[]
  /** "After" photos added when the report is resolved — powers the before/after view. */
  resolvedPhotoUrls?: string[]
  status: ReportStatus
  /** Aggregate reporter role (defaults to resident). */
  source?: ReportSource
  stillHere: number
  cleared: number
  /** ISO timestamp */
  createdAt: string
  /** ISO timestamp set when the report is marked resolved — powers response-time metrics. */
  resolvedAt?: string
}

export const CATEGORY_LABELS: Record<Category, string> = {
  household: 'Household Waste',
  dumping: 'Illegal Dumping',
  water: 'Water Pollution',
  burning: 'Open Burning',
  construction: 'Construction Debris',
  recycling: 'Recycling Needed',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  household: '🗑️',
  dumping: '🏞️',
  water: '🌊',
  burning: '🔥',
  construction: '🚧',
  recycling: '♻️',
}

export const CATEGORY_DESC: Record<Category, string> = {
  household: 'Everyday trash, bags, mixed garbage',
  dumping: 'Large or illegal dumpsite',
  water: 'Waste in rivers, creeks, shoreline',
  burning: 'Trash being burned in the open',
  construction: 'Rubble, debris, hollow blocks',
  recycling: 'Plastic, bottles, cans piling up',
}

export const CATEGORY_ORDER: Category[] = [
  'household',
  'dumping',
  'water',
  'burning',
  'construction',
  'recycling',
]

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  resolved: 'Resolved',
}

/** Marker/legend colors per status. */
export const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: '#e31e2f', // red
  in_review: '#f59e0b', // amber
  resolved: '#22c55e', // green
}

/** Ordered list for the legend. */
export const STATUS_ORDER: ReportStatus[] = ['pending', 'in_review', 'resolved']

export const SOURCE_LABELS: Record<ReportSource, string> = {
  resident: 'Residents',
  lgu: 'LGU / Officials',
  volunteer: 'Volunteers',
}

export const SOURCE_ORDER: ReportSource[] = ['resident', 'lgu', 'volunteer']
