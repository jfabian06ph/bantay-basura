import { nearestMunicipality } from '../municipalities'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OPEN_STATUSES,
  SOURCE_ORDER,
  communityConfirmed,
  displayBucket,
  type Category,
  type Report,
  type ReportSource,
  type ReportStatus,
} from '../types'

const DAY_MS = 86_400_000

/**
 * Community-aware resolution: a report counts as resolved when the crowd has
 * confirmed the cleanup OR an LGU marked it resolved — the same notion the map
 * and report panel use. (Not just the raw DB `status`, which would leave
 * community-resolved reports uncounted and the resolved rate stuck at 0%.)
 */
function isResolved(r: Report): boolean {
  return displayBucket(r) === 'resolved'
}

/** When a report was cleared, if known — falls back to createdAt. */
function resolvedTime(r: Report): number {
  return new Date(r.resolvedAt ?? r.createdAt).getTime()
}

/**
 * Attribute a report to its municipality. Prefers the real, reverse-geocoded
 * `municipality` stored at submit (nationwide); falls back to the nearest known
 * town for older reports that predate geocoding.
 */
function lguOf(r: Report): string {
  return r.municipality || nearestMunicipality({ lat: r.lat, lng: r.lng }).place.name
}

/** Default zoom when flying to a place derived from report locations. */
const PLACE_ZOOM = 13

/** Average position of a group of reports — the fly-to target for that place. */
function centroidOf(rs: Report[]): { lat: number; lng: number } {
  const n = rs.length || 1
  return {
    lat: rs.reduce((s, r) => s + r.lat, 0) / n,
    lng: rs.reduce((s, r) => s + r.lng, 0) / n,
  }
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/** Calendar-month key like "2026-6" for grouping. */
function monthKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}`
}

/** Per-LGU rollup used by the "cleanest" and "fastest" rankings. */
export interface LguStat {
  name: string
  total: number
  resolved: number
  open: number
  resolutionRate: number // 0–100
  avgResponseDays: number | null
  confirmations: number // stillHere + cleared, community engagement proxy
}

export interface HeadlineStat {
  name: string
  value: string
  sub?: string
}

export interface TrendPoint {
  label: string // short month label, e.g. "Jul"
  count: number
  bySource: Record<ReportSource, number> // stacked breakdown by reporter role
}

export interface CategoryShare {
  category: Category
  label: string
  count: number
  share: number // 0–100
}

export interface RecentCleanup {
  id: string
  lgu: string
  lat: number
  lng: number
  category: Category
  when: number // ms timestamp (resolved time)
  photo?: string // thumbnail — prefers the "after" (resolved) photo
  title?: string
  note?: string
  reportedAt?: number // createdAt ms
  beforePhotos?: string[]
  afterPhotos?: string[]
  confirmations?: number // stillHere + cleared on this report
  confirmed?: boolean // the crowd (not just an LGU) verified the cleanup
}

/** An area accumulating open (uncleared) reports — the "where to focus" list. */
export interface Hotspot {
  name: string
  lat: number
  lng: number
  zoom: number
  open: number // pending + in_review
  inReview: number
  topCategory: Category | null
  topCategoryLabel: string | null
  lastReported: number | null // ms timestamp of the most recent open report
  confirmations: number // community confirmations (stillHere + cleared) on open reports
}

export interface DashboardStats {
  // Public Dashboard — "This Month"
  reportsThisMonth: number
  resolvedRate: number // all-time, 0–100
  resolvedRateDelta: number | null // pts change vs last month (+ = better)
  avgResponseDays: number | null
  avgResponseDelta: number | null // days change vs last month (− = faster)
  fastestLgu: HeadlineStat | null
  mostImproved: HeadlineStat | null
  latestCleanup: RecentCleanup | null
  // Community
  cleanestLgus: LguStat[]
  activeAreas: LguStat[] // engagement leaderboard (confirmations)
  monthlyImpact: {
    reports: number
    resolved: number
    confirmations: number
  }
  wasteTrends: CategoryShare[]
  monthlySeries: TrendPoint[]
  recentCleanups: RecentCleanup[]
  hotspots: Hotspot[]
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Roll every report up into a per-LGU stat, keyed by LGU name. */
function rollupByLgu(reports: Report[]): Map<string, LguStat> {
  const map = new Map<string, LguStat>()
  const responseDaysByLgu = new Map<string, number[]>()

  for (const r of reports) {
    const name = lguOf(r)
    let s = map.get(name)
    if (!s) {
      s = {
        name,
        total: 0,
        resolved: 0,
        open: 0,
        resolutionRate: 0,
        avgResponseDays: null,
        confirmations: 0,
      }
      map.set(name, s)
    }
    s.total++
    s.confirmations += r.stillHere + r.cleared
    if (isResolved(r)) {
      s.resolved++
      if (r.resolvedAt) {
        const days = (resolvedTime(r) - new Date(r.createdAt).getTime()) / DAY_MS
        if (days >= 0) {
          const arr = responseDaysByLgu.get(name) ?? []
          arr.push(days)
          responseDaysByLgu.set(name, arr)
        }
      }
    } else {
      s.open++
    }
  }

  for (const s of map.values()) {
    s.resolutionRate = pct(s.resolved, s.total)
    const days = responseDaysByLgu.get(s.name)
    if (days && days.length) {
      s.avgResponseDays = days.reduce((a, b) => a + b, 0) / days.length
    }
  }
  return map
}

/**
 * Compute every public-dashboard and community metric from a list of reports.
 * `now` is passed in (rather than read from Date.now) so the caller controls
 * the "current month" boundary and renders stay stable.
 */
export function computeDashboard(reports: Report[], now: number): DashboardStats {
  const nowDate = new Date(now)
  const thisMonth = monthKey(now)
  const lastMonth = monthKey(
    new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).getTime(),
  )

  const total = reports.length
  const resolvedAll = reports.filter(isResolved)

  // ---- Public Dashboard headline numbers ----
  const reportsThisMonth = reports.filter(
    (r) => monthKey(new Date(r.createdAt).getTime()) === thisMonth,
  ).length

  const resolvedRate = pct(resolvedAll.length, total)

  // Month-over-month deltas for the "vs last month" sub-lines. Null unless
  // both months have data, so we never imply a trend we can't back up.
  const resolvedRateDelta = monthDelta(
    monthResolvedRate(reports, thisMonth),
    monthResolvedRate(reports, lastMonth),
  )
  const avgResponseDelta = monthDelta(
    monthAvgResponse(reports, thisMonth),
    monthAvgResponse(reports, lastMonth),
  )

  const responseDays = resolvedAll
    .filter((r) => r.resolvedAt)
    .map((r) => (resolvedTime(r) - new Date(r.createdAt).getTime()) / DAY_MS)
    .filter((d) => d >= 0)
  const avgResponseDays = responseDays.length
    ? responseDays.reduce((a, b) => a + b, 0) / responseDays.length
    : null

  const lgus = [...rollupByLgu(reports).values()]

  // Fastest LGU: lowest avg response time; fall back to best resolution rate.
  const withResponse = lgus.filter((l) => l.avgResponseDays !== null)
  let fastestLgu: HeadlineStat | null = null
  if (withResponse.length) {
    const best = withResponse.reduce((a, b) =>
      (a.avgResponseDays as number) <= (b.avgResponseDays as number) ? a : b,
    )
    fastestLgu = {
      name: best.name,
      value: `${(best.avgResponseDays as number).toFixed(1)} days`,
      sub: 'avg. response',
    }
  } else {
    const ranked = [...lgus].sort((a, b) => b.resolutionRate - a.resolutionRate)
    if (ranked.length && ranked[0].resolved > 0) {
      fastestLgu = {
        name: ranked[0].name,
        value: `${ranked[0].resolutionRate}%`,
        sub: 'resolution rate',
      }
    }
  }

  // Most improved: biggest gain in resolution rate, this month vs last month.
  const mostImproved = computeMostImproved(reports, thisMonth, lastMonth)

  // Latest cleanup: most recently resolved report.
  let latestCleanup: RecentCleanup | null = null
  if (resolvedAll.length) {
    const latest = resolvedAll.reduce((a, b) =>
      resolvedTime(a) >= resolvedTime(b) ? a : b,
    )
    latestCleanup = {
      id: latest.id,
      lgu: lguOf(latest),
      lat: latest.lat,
      lng: latest.lng,
      category: latest.category,
      when: resolvedTime(latest),
      confirmed: communityConfirmed(latest),
    }
  }

  // ---- Community ----
  const MIN_REPORTS = 2 // avoid ranking an LGU off a single flag
  const rankable = lgus.filter((l) => l.total >= MIN_REPORTS)

  const cleanestLgus = [...rankable]
    .sort(
      (a, b) => b.resolutionRate - a.resolutionRate || a.open - b.open,
    )
    .slice(0, 5)

  const activeAreas = [...lgus]
    .filter((l) => l.confirmations > 0)
    .sort((a, b) => b.confirmations - a.confirmations)
    .slice(0, 5)

  const monthlyImpact = {
    reports: reportsThisMonth,
    resolved: resolvedAll.filter(
      (r) => monthKey(resolvedTime(r)) === thisMonth,
    ).length,
    confirmations: reports.reduce((sum, r) => sum + r.stillHere + r.cleared, 0),
  }

  const wasteTrends = computeWasteTrends(reports, total)
  const monthlySeries = computeMonthlySeries(reports, now)
  const hotspots = computeHotspots(reports)

  const recentCleanups = [...resolvedAll]
    .sort((a, b) => resolvedTime(b) - resolvedTime(a))
    .slice(0, 12)
    .map((r) => {
      const beforePhotos = r.photoUrls ?? (r.photoUrl ? [r.photoUrl] : [])
      const afterPhotos = r.resolvedPhotoUrls ?? []
      return {
        id: r.id,
        lgu: lguOf(r),
        lat: r.lat,
        lng: r.lng,
        category: r.category,
        when: resolvedTime(r),
        photo: afterPhotos[0] ?? beforePhotos[0],
        title: r.title,
        note: r.note,
        reportedAt: new Date(r.createdAt).getTime(),
        beforePhotos,
        afterPhotos,
        confirmations: r.stillHere + r.cleared,
      }
    })

  return {
    reportsThisMonth,
    resolvedRate,
    resolvedRateDelta,
    avgResponseDays,
    avgResponseDelta,
    fastestLgu,
    mostImproved,
    latestCleanup,
    cleanestLgus,
    activeAreas,
    monthlyImpact,
    wasteTrends,
    monthlySeries,
    recentCleanups,
    hotspots,
  }
}

/**
 * Rank areas by how many open (uncleared) reports they carry — the public
 * "where should attention go?" list. Each hotspot also surfaces its most
 * common waste type and the most recent report, so the row is self-explaining.
 */
function computeHotspots(reports: Report[]): Hotspot[] {
  interface Acc {
    name: string
    sumLat: number
    sumLng: number
    n: number
    open: number
    inReview: number
    cats: Map<Category, number>
    lastReported: number
    confirmations: number
  }
  const map = new Map<string, Acc>()

  for (const r of reports) {
    if (!OPEN_STATUSES.includes(r.status)) continue
    const name = lguOf(r)
    let e = map.get(name)
    if (!e) {
      e = { name, sumLat: 0, sumLng: 0, n: 0, open: 0, inReview: 0, cats: new Map(), lastReported: 0, confirmations: 0 }
      map.set(name, e)
    }
    e.sumLat += r.lat
    e.sumLng += r.lng
    e.n++
    e.open++
    if (r.status === 'in_review') e.inReview++
    e.confirmations += r.stillHere + r.cleared
    e.cats.set(r.category, (e.cats.get(r.category) ?? 0) + 1)
    const t = new Date(r.createdAt).getTime()
    if (t > e.lastReported) e.lastReported = t
  }

  return [...map.values()]
    .map((e) => {
      let topCategory: Category | null = null
      let topN = 0
      for (const [c, n] of e.cats) {
        if (n > topN) {
          topN = n
          topCategory = c
        }
      }
      return {
        name: e.name,
        lat: e.sumLat / e.n,
        lng: e.sumLng / e.n,
        zoom: PLACE_ZOOM,
        open: e.open,
        inReview: e.inReview,
        topCategory,
        topCategoryLabel: topCategory ? CATEGORY_LABELS[topCategory] : null,
        lastReported: e.lastReported || null,
        confirmations: e.confirmations,
      }
    })
    .sort((a, b) => b.open - a.open || (b.lastReported ?? 0) - (a.lastReported ?? 0))
}

function computeMostImproved(
  reports: Report[],
  thisMonth: string,
  lastMonth: string,
): HeadlineStat | null {
  // Resolution rate per LGU, split by the month a report was created.
  const byLgu = new Map<string, { curT: number; curR: number; prevT: number; prevR: number }>()
  for (const r of reports) {
    const mk = monthKey(new Date(r.createdAt).getTime())
    if (mk !== thisMonth && mk !== lastMonth) continue
    const name = lguOf(r)
    const e = byLgu.get(name) ?? { curT: 0, curR: 0, prevT: 0, prevR: 0 }
    if (mk === thisMonth) {
      e.curT++
      if (isResolved(r)) e.curR++
    } else {
      e.prevT++
      if (isResolved(r)) e.prevR++
    }
    byLgu.set(name, e)
  }

  let best: HeadlineStat | null = null
  let bestDelta = 0
  for (const [name, e] of byLgu) {
    if (e.prevT === 0 || e.curT === 0) continue
    const delta = pct(e.curR, e.curT) - pct(e.prevR, e.prevT)
    if (delta > bestDelta) {
      bestDelta = delta
      best = { name, value: `+${delta}%`, sub: 'resolution rate' }
    }
  }
  return best
}

/** Resolution rate (0–100) among reports created in a given month, or null. */
function monthResolvedRate(reports: Report[], mk: string): number | null {
  const inMonth = reports.filter(
    (r) => monthKey(new Date(r.createdAt).getTime()) === mk,
  )
  return inMonth.length ? pct(inMonth.filter(isResolved).length, inMonth.length) : null
}

/** Avg. response time (days) for reports created & resolved in a month, or null. */
function monthAvgResponse(reports: Report[], mk: string): number | null {
  const days = reports
    .filter(
      (r) =>
        monthKey(new Date(r.createdAt).getTime()) === mk &&
        isResolved(r) &&
        r.resolvedAt,
    )
    .map((r) => (resolvedTime(r) - new Date(r.createdAt).getTime()) / DAY_MS)
    .filter((d) => d >= 0)
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null
}

/** This-month minus last-month, only when both are present. */
function monthDelta(cur: number | null, prev: number | null): number | null {
  return cur !== null && prev !== null ? cur - prev : null
}

function computeWasteTrends(reports: Report[], total: number): CategoryShare[] {
  const counts = new Map<Category, number>()
  for (const r of reports) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  // Include every waste type — even ones with no reports yet — so the legend
  // shows the full set for visibility. Reported types lead (by count); the
  // zero-count ones trail in CATEGORY_ORDER. Zero-length arcs aren't drawn (see
  // Donut), so they appear only in the legend at 0%.
  return CATEGORY_ORDER.map((category) => {
    const count = counts.get(category) ?? 0
    return {
      category,
      label: CATEGORY_LABELS[category],
      count,
      share: pct(count, total),
    }
  }).sort((a, b) => b.count - a.count)
}

function emptyBySource(): Record<ReportSource, number> {
  return SOURCE_ORDER.reduce(
    (acc, s) => ((acc[s] = 0), acc),
    {} as Record<ReportSource, number>,
  )
}

function computeMonthlySeries(reports: Report[], now: number): TrendPoint[] {
  const nowDate = new Date(now)
  const buckets: TrendPoint[] = []
  const index = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    index.set(key, buckets.length)
    buckets.push({ label: MONTH_LABELS[d.getMonth()], count: 0, bySource: emptyBySource() })
  }
  for (const r of reports) {
    const key = monthKey(new Date(r.createdAt).getTime())
    const i = index.get(key)
    if (i !== undefined) {
      buckets[i].count++
      buckets[i].bySource[r.source ?? 'resident']++
    }
  }
  return buckets
}

/** A place (LGU) with how many reports of a given status sit near it. */
export interface PlaceCount {
  name: string
  lat: number
  lng: number
  zoom: number
  count: number
}

/**
 * Group reports of one status by municipality, most reports first. Powers the
 * tappable drill-downs on the map's summary panel — each row carries the
 * centroid of its reports so we can fly the map there.
 */
export function placesForStatus(
  reports: Report[],
  status: ReportStatus,
): PlaceCount[] {
  const map = new Map<string, { name: string; sumLat: number; sumLng: number; count: number }>()
  for (const r of reports) {
    if (r.status !== status) continue
    const name = lguOf(r)
    const e = map.get(name)
    if (e) {
      e.sumLat += r.lat
      e.sumLng += r.lng
      e.count++
    } else {
      map.set(name, { name, sumLat: r.lat, sumLng: r.lng, count: 1 })
    }
  }
  return [...map.values()]
    .map((e) => ({
      name: e.name,
      lat: e.sumLat / e.count,
      lng: e.sumLng / e.count,
      zoom: PLACE_ZOOM,
      count: e.count,
    }))
    .sort((a, b) => b.count - a.count)
}

/** Every report whose nearest LGU is `placeName`. */
export function reportsInPlace(reports: Report[], placeName: string): Report[] {
  return reports.filter((r) => lguOf(r) === placeName)
}

export interface MuniSnapshot {
  name: string
  open: number
  resolvedThisMonth: number
  avgResponseDays: number | null
  /** Total community confirmations (stillHere + cleared) across this LGU. */
  confirmations: number
  /** Share of this LGU's reports that are resolved, 0–100. */
  resolutionRate: number
  /** Whether this LGU has any reports at all (rate is meaningless otherwise). */
  hasReports: boolean
  /** Most recent reports in this LGU, newest first. */
  recent: Report[]
}

/**
 * A per-municipality "community snapshot" — the third drill level on the map's
 * status panel. Everything here is derived from the live report list except
 * population, which comes from the static municipality table.
 */
export function municipalitySnapshot(
  reports: Report[],
  placeName: string,
  now: number,
): MuniSnapshot {
  const local = reportsInPlace(reports, placeName)
  const thisMonth = monthKey(now)

  const resolved = local.filter(isResolved)
  const open = local.length - resolved.length
  const resolvedThisMonth = resolved.filter(
    (r) => monthKey(resolvedTime(r)) === thisMonth,
  ).length

  const responseDays = resolved
    .filter((r) => r.resolvedAt)
    .map((r) => (resolvedTime(r) - new Date(r.createdAt).getTime()) / DAY_MS)
    .filter((d) => d >= 0)
  const avgResponseDays = responseDays.length
    ? responseDays.reduce((a, b) => a + b, 0) / responseDays.length
    : null

  const recent = [...local].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return {
    name: placeName,
    open,
    resolvedThisMonth,
    avgResponseDays,
    confirmations: local.reduce((n, r) => n + r.stillHere + r.cleared, 0),
    resolutionRate: pct(resolved.length, local.length),
    hasReports: local.length > 0,
    recent,
  }
}

export interface AreaCategoryCount {
  category: Category
  label: string
  count: number
}

/** Everything the "Areas Needing Attention" drawer shows for one area. */
export interface AreaDetail {
  name: string
  open: number
  inReview: number
  resolved: number
  total: number
  resolutionRate: number
  byCategory: AreaCategoryCount[] // among open reports, most common first
  latestReport: number | null // most recent open report (ms)
  oldestOpenDays: number | null // age of the oldest unresolved report
  avgOpenDays: number | null // average age of open reports
  confirmations: number // community confirmations (stillHere + cleared) area-wide
  watching: number // residents confirming open reports are "still here"
  lastCleanup: number | null // most recent resolved report (ms)
  firstReport: number | null // the very first report in this area (ms)
  reportsThisMonth: number // reports created in the last 30 days
  spark: number[] // report counts across the last 30 days, oldest → newest
}

/** Detailed rollup for a single area's open reports — powers the drawer. */
export function computeAreaDetail(
  reports: Report[],
  placeName: string,
  now: number,
): AreaDetail {
  const local = reportsInPlace(reports, placeName)
  const open = local.filter((r) => OPEN_STATUSES.includes(r.status))
  const resolved = local.filter(isResolved)

  const cats = new Map<Category, number>()
  for (const r of open) cats.set(r.category, (cats.get(r.category) ?? 0) + 1)
  const byCategory = [...cats.entries()]
    .map(([category, count]) => ({ category, label: CATEGORY_LABELS[category], count }))
    .sort((a, b) => b.count - a.count)

  const openTimes = open.map((r) => new Date(r.createdAt).getTime())
  const latestReport = openTimes.length ? Math.max(...openTimes) : null
  const oldest = openTimes.length ? Math.min(...openTimes) : null
  const ageDays = (t: number) => Math.max(0, (now - t) / DAY_MS)
  const lastCleanup = resolved.length
    ? Math.max(...resolved.map((r) => resolvedTime(r)))
    : null

  const allTimes = local.map((r) => new Date(r.createdAt).getTime())
  const firstReport = allTimes.length ? Math.min(...allTimes) : null
  const reportsThisMonth = allTimes.filter((t) => t >= now - 30 * DAY_MS).length
  // Activity sparkline: report counts bucketed across the last 30 days.
  const BUCKETS = 10
  const spark = Array.from({ length: BUCKETS }, () => 0)
  for (const t of allTimes) {
    const frac = (now - t) / (30 * DAY_MS)
    if (frac < 0 || frac > 1) continue
    spark[Math.min(BUCKETS - 1, Math.floor((1 - frac) * BUCKETS))]++
  }

  return {
    name: placeName,
    open: open.length,
    inReview: open.filter((r) => r.status === 'in_review').length,
    resolved: resolved.length,
    total: local.length,
    resolutionRate: pct(resolved.length, local.length),
    byCategory,
    latestReport,
    oldestOpenDays: oldest != null ? ageDays(oldest) : null,
    avgOpenDays: openTimes.length
      ? openTimes.reduce((s, t) => s + ageDays(t), 0) / openTimes.length
      : null,
    confirmations: local.reduce((n, r) => n + r.stillHere + r.cleared, 0),
    watching: open.reduce((n, r) => n + r.stillHere, 0),
    lastCleanup,
    firstReport,
    reportsThisMonth,
    spark,
  }
}

/** Friendly relative-time label, Filipino-flavored for the civic audience. */
export function relativeTime(ms: number, now: number): string {
  const diff = now - ms
  // Anything within the last minute — or a just-created report timestamped
  // slightly after our fixed "now" — reads as "just now" (never "soon").
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ============================================================
// Community recognition — places, not people.
// Bantay Basura celebrates "we solved it", so every ranking here is by
// municipality: resolution rate, responsiveness, and a civic health status.
// ============================================================

/** A municipality's civic health, from its share of resolved reports. */
export type HealthTone = 'clean' | 'improving' | 'needs-help' | 'critical'

export const HEALTH_META: Record<
  HealthTone,
  { label: string; dot: string; color: string }
> = {
  clean: { label: 'Clean Community', dot: '🟢', color: '#23c266' },
  improving: { label: 'Improving', dot: '🟡', color: '#f5b84b' },
  'needs-help': { label: 'Needs Help', dot: '🟠', color: '#f5842b' },
  critical: { label: 'Critical Area', dot: '🔴', color: '#e31e2f' },
}

/**
 * Grade a community's health. A place with no open issues is Clean; otherwise
 * the resolution rate tells the story. Rate-based on purpose — a town with
 * unresolved trash "needs help" no matter how many reports it has.
 */
export function healthTone(open: number, resolutionRate: number): HealthTone {
  if (open === 0) return 'clean'
  if (resolutionRate >= 50) return 'improving'
  if (resolutionRate >= 20) return 'needs-help'
  return 'critical'
}

export interface CommunityRank {
  name: string
  lat: number
  lng: number
  zoom: number
  total: number
  resolved: number
  open: number
  resolutionRate: number
  avgResponseDays: number | null
  confirmations: number
  health: HealthTone
  growth: GrowthTier
}

/**
 * Rank every municipality that has reports by resolution rate — the
 * "Communities Making Progress" board. The set of places is derived from the
 * reports themselves (nationwide), each flown to via its report centroid. Ties
 * break toward more resolved, then more total activity, then name for stability.
 */
export function communityRankings(reports: Report[], now: number): CommunityRank[] {
  // Distinct municipalities present in the data (real, reverse-geocoded names).
  const names = new Set(reports.map(lguOf))
  return [...names]
    .map((name) => {
      const local = reportsInPlace(reports, name)
      const snap = municipalitySnapshot(reports, name, now)
      const resolvedCount = local.filter(isResolved).length
      const c = centroidOf(local)
      return {
        name,
        lat: c.lat,
        lng: c.lng,
        zoom: PLACE_ZOOM,
        total: local.length,
        resolved: resolvedCount,
        open: snap.open,
        resolutionRate: snap.resolutionRate,
        avgResponseDays: snap.avgResponseDays,
        confirmations: snap.confirmations,
        health: healthTone(snap.open, snap.resolutionRate),
        growth: growthTier(local.length, snap.resolutionRate),
      }
    })
    .filter((c) => c.total > 0)
    .sort(
      (a, b) =>
        b.resolutionRate - a.resolutionRate ||
        b.resolved - a.resolved ||
        b.total - a.total ||
        a.name.localeCompare(b.name),
    )
}

/**
 * A community's *growth tier* — a maturity level that rises with participation.
 * Distinct from `healthTone`: health measures how well issues get resolved right
 * now; growth measures how engaged and transparent the community has become over
 * time. Every municipality "levels up" as residents report and verify — the app
 * grows alongside the community, so an early-days empty tier feels intentional.
 */
export type GrowthTier = 'seed' | 'growing' | 'transparent' | 'model'

export const GROWTH_META: Record<
  GrowthTier,
  { emoji: string; label: string; blurb: string }
> = {
  seed: { emoji: '🌱', label: 'Seed Community', blurb: 'Just getting started' },
  growing: { emoji: '🌿', label: 'Growing Community', blurb: 'Residents actively reporting' },
  transparent: { emoji: '🌳', label: 'Transparent Community', blurb: 'Reliable, verified reporting' },
  model: { emoji: '🌎', label: 'Model Community', blurb: 'High resolution, documented cleanups' },
}

/**
 * Grade a community's growth from its participation. Thresholds are deliberately
 * reachable so early communities feel momentum: 🌱 <10 reports · 🌿 10+ ·
 * 🌳 100+ (established, verified) · 🌎 100+ AND a high resolution rate.
 */
export function growthTier(total: number, resolutionRate: number): GrowthTier {
  if (total >= 100 && resolutionRate >= 70) return 'model'
  if (total >= 100) return 'transparent'
  if (total >= 10) return 'growing'
  return 'seed'
}

export interface ImpactTotals {
  reports: number
  cleaned: number
  resolutionRate: number
  /** Municipalities with at least one report. */
  communities: number
  /** Total community confirmations cast (the anonymous social proof). */
  confirmations: number
}

/** Province-wide community totals for the Impact hero — all real, no vanity. */
export function impactTotals(reports: Report[]): ImpactTotals {
  const cleaned = reports.filter(isResolved).length
  const communities = new Set(reports.map(lguOf)).size
  return {
    reports: reports.length,
    cleaned,
    resolutionRate: pct(cleaned, reports.length),
    communities,
    confirmations: reports.reduce((n, r) => n + r.stillHere + r.cleared, 0),
  }
}

const WEEK_MS = 7 * DAY_MS

/** "This week" community momentum — every figure is derived from real reports
 *  and their real timestamps, so an empty week honestly reads as zeros. Each
 *  metric also carries `*Delta` — the change versus the *previous* 7 days. */
export interface Momentum {
  reports: number // reports created in the last 7 days
  confirmations: number // community confirmations on those new reports
  photos: number // after / evidence photos added in the last 7 days
  cleaned: number // distinct places resolved in the last 7 days
  reportsDelta: number
  confirmationsDelta: number
  photosDelta: number
  cleanedDelta: number
}

/** Raw counts for one [start, end) window. */
function momentumWindow(reports: Report[], start: number, end: number) {
  let created = 0
  let confirmations = 0
  let photos = 0
  const cleanedPlaces = new Set<string>()
  const within = (ms: number) => ms >= start && ms < end
  for (const r of reports) {
    if (within(new Date(r.createdAt).getTime())) {
      created++
      confirmations += r.stillHere + r.cleared
    }
    if (r.afterUploadedAt && within(new Date(r.afterUploadedAt).getTime())) photos++
    for (const p of r.updatePhotos ?? []) {
      if (within(new Date(p.at).getTime())) photos++
    }
    if (isResolved(r) && within(resolvedTime(r))) cleanedPlaces.add(lguOf(r))
  }
  return { reports: created, confirmations, photos, cleaned: cleanedPlaces.size }
}

export function communityMomentum(reports: Report[], now: number): Momentum {
  const cur = momentumWindow(reports, now - WEEK_MS, now + 1)
  const prev = momentumWindow(reports, now - 2 * WEEK_MS, now - WEEK_MS)
  return {
    ...cur,
    reportsDelta: cur.reports - prev.reports,
    confirmationsDelta: cur.confirmations - prev.confirmations,
    photosDelta: cur.photos - prev.photos,
    cleanedDelta: cur.cleaned - prev.cleaned,
  }
}

/** Which kind of moment a Community Pulse entry captures. */
export type ActivityKind = 'reported' | 'verified' | 'cleanup' | 'resolved'

/** One entry in the "Community Pulse" feed — community activity, never a
 *  person. Each event is a real, timestamped moment in a report's life. */
export interface ActivityEvent {
  id: string
  reportId: string // the report this moment belongs to — opens its detail
  place: string
  lat: number
  lng: number
  kind: ActivityKind
  emoji: string
  label: string // what happened, e.g. "Household Waste reported"
  at: number // ms timestamp
}

/** The most recent community activity across all reports, newest first. No
 *  names — only what happened, where, and when. */
export function recentActivity(reports: Report[], now: number, limit = 6): ActivityEvent[] {
  const events: ActivityEvent[] = []
  for (const r of reports) {
    const base = { reportId: r.id, place: lguOf(r), lat: r.lat, lng: r.lng }
    events.push({
      ...base,
      id: `${r.id}-new`,
      kind: 'reported',
      emoji: CATEGORY_EMOJI[r.category],
      label: `${CATEGORY_LABELS[r.category]} reported`,
      at: new Date(r.createdAt).getTime(),
    })
    for (const [i, p] of (r.updatePhotos ?? []).entries()) {
      events.push({
        ...base,
        id: `${r.id}-photo-${i}`,
        kind: 'verified',
        emoji: '👥',
        label: 'Community verification',
        at: new Date(p.at).getTime(),
      })
    }
    if (r.afterUploadedAt) {
      events.push({
        ...base,
        id: `${r.id}-after`,
        kind: 'cleanup',
        emoji: '📸',
        label: 'Cleanup photo submitted',
        at: new Date(r.afterUploadedAt).getTime(),
      })
    }
    if (isResolved(r)) {
      events.push({
        ...base,
        id: `${r.id}-resolved`,
        kind: 'resolved',
        emoji: '✅',
        label: 'Area resolved',
        at: resolvedTime(r),
      })
    }
  }
  return events
    .filter((e) => e.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}
