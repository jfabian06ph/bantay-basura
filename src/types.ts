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
  /**
   * The report's real administrative location, reverse-geocoded at submit time
   * so the app works anywhere in the Philippines (not just Zambales). Grouping
   * and attribution prefer these; a missing municipality falls back to the
   * nearest known town. `province` disambiguates same-named municipalities.
   */
  municipality?: string
  province?: string
  barangay?: string
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
  /**
   * The "after" photo that completes the cleanup story. A resolved report with
   * no afterImageUrl is "awaiting after photo" — the finish line of the journey.
   * (DB: after_image_url / after_uploaded_at / after_uploaded_by)
   */
  afterImageUrl?: string
  afterUploadedAt?: string
  afterUploadedBy?: ReportSource
  /**
   * Evidence snapshots added over the report's life — currently the photos
   * residents attach when confirming a report is "still here". Each carries its
   * own timestamp so they can sit on the activity timeline. (DB: report_photos
   * rows with kind 'still_here'.)
   */
  updatePhotos?: ReportPhoto[]
}

/** One dated evidence photo attached to a report after it was created. */
export interface ReportPhoto {
  url: string
  /** ISO timestamp the photo was added. */
  at: string
}

/**
 * The report lifecycle as a four-step journey, shared by the map panel and the
 * Impact "Complete a Cleanup" challenge. "Awaiting after photo" is a derived
 * sub-state of `resolved` (resolved && no afterImageUrl) — not a new status —
 * so the existing status machinery (legend, filters, colors) stays untouched.
 */
export type CleanupStage = 'reported' | 'in_review' | 'cleaned' | 'documented'

/** Any "after" photo — the uploaded one, or a legacy resolved photo. */
function hasAfterPhoto(r: Report): boolean {
  return Boolean(r.afterImageUrl || r.resolvedPhotoUrls?.length)
}

export function cleanupStage(r: Report): CleanupStage {
  if (r.status === 'resolved') return hasAfterPhoto(r) ? 'documented' : 'cleaned'
  if (r.status === 'in_review') return 'in_review'
  return 'reported'
}

/** True when a resolved report still needs its "after" photo. */
export function awaitingAfterPhoto(r: Report): boolean {
  return r.status === 'resolved' && !hasAfterPhoto(r)
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
  in_review: '#f97316', // orange (one consistent orange — never yellow/amber)
  resolved: '#22c55e', // green
}

/** Ordered list for the legend. */
export const STATUS_ORDER: ReportStatus[] = ['pending', 'in_review', 'resolved']

/**
 * Community confirmations needed before a spot is treated as consensus-clean.
 * One tap is never enough — a small net majority is required so an accident or
 * a lone actor can't hide a real problem.
 */
export const CLEAN_THRESHOLD = 3

/** True when the crowd (not the LGU) has verified a spot as cleaned. */
export function communityConfirmed(r: Report): boolean {
  return r.cleared >= CLEAN_THRESHOLD && r.cleared > r.stillHere
}

/** How many more "clean now" confirmations until community consensus. */
export function confirmationsNeeded(r: Report): number {
  if (communityConfirmed(r)) return 0
  // Must both hit the threshold AND out-number the "still here" votes.
  return Math.max(CLEAN_THRESHOLD - r.cleared, r.stillHere - r.cleared + 1, 1)
}

/**
 * The pin's displayed color — the EXACT badge color for the report's derived
 * status, so a pin can never be a different color than the details:
 * 🔴 Pending → 🟠 Verified → 🔵 Cleanup Submitted → 🟢 Resolved. The DB `status`
 * and Ops stay separate.
 */
export function pinColor(r: Report): string {
  return displayStatus(r).color
}

export type DisplayStatusKey =
  | 'pending'
  | 'in_review'
  | 'cleanup'
  | 'resolved'
  | 'published'

export interface DisplayStatus {
  key: DisplayStatusKey
  label: string
  color: string
}

// One standardized status palette: red / orange / blue / green (no yellow).
const CLEANUP_COLOR = '#3b82f6' // blue — a cleanup was submitted, awaiting validation

/**
 * The status shown in the report panel, DERIVED from the report's real state so
 * the badge can never contradict the timeline: a report with a submitted
 * after-photo reads as "Cleanup Submitted", not "Pending". Display-only — the DB
 * `status` (pending/in_review/resolved) still drives filters, stats, and ops.
 *
 *   Pending           new report, awaiting confirmations               (red)
 *   Verified          community confirmed it's a real issue, or LGU     (orange)
 *                     acknowledged — confirmed, but not fixed
 *   Cleanup Submitted an after-photo was submitted, awaiting validation (blue)
 *   Resolved          community confirms the cleanup, or LGU resolves   (green)
 *   Evidence Available  resolved AND cleanup photo is public — a         (green)
 *                     resolved enhancement, not a separate state
 */
export function displayStatus(r: Report): DisplayStatus {
  if (r.status === 'resolved') {
    return hasAfterPhoto(r)
      ? { key: 'published', label: 'Evidence Available', color: STATUS_COLORS.resolved }
      : { key: 'resolved', label: 'Resolved', color: STATUS_COLORS.resolved }
  }
  // Crowd has confirmed the spot is clean, even before an LGU marks it resolved.
  if (communityConfirmed(r)) {
    return { key: 'resolved', label: 'Resolved', color: STATUS_COLORS.resolved }
  }
  // A cleanup photo was submitted, but the cleanup isn't validated yet.
  if (hasAfterPhoto(r)) {
    return { key: 'cleanup', label: 'Cleanup Submitted', color: CLEANUP_COLOR }
  }
  // Verified real — an LGU acknowledged it, or enough residents confirmed it.
  if (r.status === 'in_review' || r.stillHere >= CLEAN_THRESHOLD) {
    return { key: 'in_review', label: 'Verified', color: STATUS_COLORS.in_review }
  }
  return { key: 'pending', label: 'Pending', color: STATUS_COLORS.pending }
}

/**
 * Collapse the five display states into the three filter/stat buckets so the
 * public map's pins, badge, "Cleaned" filter, counts, and timeline all agree
 * (a community-confirmed cleanup reads as resolved everywhere). The DB `status`
 * and the Ops Center remain the authoritative record, separate from this.
 */
export function displayBucket(r: Report): ReportStatus {
  const key = displayStatus(r).key
  if (key === 'resolved' || key === 'published') return 'resolved'
  if (key === 'in_review' || key === 'cleanup') return 'in_review'
  return 'pending'
}

export const SOURCE_LABELS: Record<ReportSource, string> = {
  resident: 'Residents',
  lgu: 'LGU / Officials',
  volunteer: 'Volunteers',
}

export const SOURCE_ORDER: ReportSource[] = ['resident', 'lgu', 'volunteer']
