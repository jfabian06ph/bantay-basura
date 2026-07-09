import { nearestMunicipality } from '../municipalities'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DONE_STATUSES,
  type Category,
  type Report,
  type ReportStatus,
} from '../types'

const DAY_MS = 86_400_000

function isResolved(r: Report): boolean {
  return DONE_STATUSES.includes(r.status)
}

/** When a report was cleared, if known — falls back to createdAt. */
function resolvedTime(r: Report): number {
  return new Date(r.resolvedAt ?? r.createdAt).getTime()
}

/** Attribute a report to its nearest known LGU. */
function lguOf(r: Report): string {
  return nearestMunicipality({ lat: r.lat, lng: r.lng }).place.name
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
  category: Category
  when: number // ms timestamp
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
      category: latest.category,
      when: resolvedTime(latest),
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

  const recentCleanups = [...resolvedAll]
    .sort((a, b) => resolvedTime(b) - resolvedTime(a))
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      lgu: lguOf(r),
      category: r.category,
      when: resolvedTime(r),
    }))

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
  }
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
  return CATEGORY_ORDER.map((category) => {
    const count = counts.get(category) ?? 0
    return {
      category,
      label: CATEGORY_LABELS[category],
      count,
      share: pct(count, total),
    }
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

function computeMonthlySeries(reports: Report[], now: number): TrendPoint[] {
  const nowDate = new Date(now)
  const buckets: TrendPoint[] = []
  const index = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    index.set(key, buckets.length)
    buckets.push({ label: MONTH_LABELS[d.getMonth()], count: 0 })
  }
  for (const r of reports) {
    const key = monthKey(new Date(r.createdAt).getTime())
    const i = index.get(key)
    if (i !== undefined) buckets[i].count++
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
 * Group reports of one status by their nearest LGU, most reports first.
 * Powers the tappable drill-downs on the map's summary panel — each row
 * carries the coordinates needed to fly the map there.
 */
export function placesForStatus(
  reports: Report[],
  status: ReportStatus,
): PlaceCount[] {
  const map = new Map<string, PlaceCount>()
  for (const r of reports) {
    if (r.status !== status) continue
    const place = nearestMunicipality({ lat: r.lat, lng: r.lng }).place
    const e = map.get(place.name)
    if (e) {
      e.count++
    } else {
      map.set(place.name, {
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        zoom: place.zoom,
        count: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
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

/** Friendly relative-time label, Filipino-flavored for the civic audience. */
export function relativeTime(ms: number, now: number): string {
  const diff = now - ms
  if (diff < 0) return 'soon'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
