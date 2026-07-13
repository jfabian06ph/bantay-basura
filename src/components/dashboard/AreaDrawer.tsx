import { useEffect, useMemo, useState } from 'react'
import { MapPin, ArrowRight, Users, Info, ChevronDown, Circle, Sparkles, Trophy, Sprout, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet'
import { CATEGORY_COLORS } from './Charts'
import CountUp from '../CountUp'
import MapThumb from './MapThumb'
import { computeAreaDetail, healthTone, relativeTime, type Hotspot, type HealthTone } from '../../lib/stats'
import type { Report } from '../../types'

/** Right drawer on desktop, full-width bottom sheet on phones. */
function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

/** Warmer, less judgmental health wording for the public panel. */
const HEALTH_FRIENDLY: Record<HealthTone, { label: string; color: string }> = {
  clean: { label: 'Performing well', color: '#1f9d57' },
  improving: { label: 'Improving', color: '#1f9d57' },
  'needs-help': { label: 'Active community', color: '#d1671b' },
  critical: { label: 'Needs attention', color: '#e31e2f' },
}

/** Human-friendly open duration — hours/minutes, not decimal days. */
function humanOpen(daysVal: number): string {
  const hours = daysVal * 24
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.round(daysVal)
  return `${d} day${d === 1 ? '' : 's'}`
}

/** A circular progress ring that fills to `pct` when the drawer opens. */
function Ring({ pct, active }: { pct: number; active: boolean }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const offset = active ? circ * (1 - pct / 100) : circ
  return (
    <div className="bb-area-ring">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="bb-area-ring-track" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="bb-area-ring-fill"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="bb-area-ring-label">
        <span className="bb-area-ring-num">
          <CountUp value={pct} suffix="%" active={active} />
        </span>
        <span className="bb-area-ring-cap">Resolved</span>
      </div>
    </div>
  )
}

/** Tiny bar sparkline of report activity over the last 30 days. */
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  return (
    <div className="bb-area-spark" aria-hidden>
      {data.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          title={`${v} report${v === 1 ? '' : 's'}`}
        />
      ))}
    </div>
  )
}

interface Props {
  area: Hotspot | null
  reports: Report[]
  now: number
  onClose: () => void
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/**
 * Detail panel for one "Areas Needing Attention" row. Keeps the dashboard
 * visible behind it (side drawer / bottom sheet) rather than a blocking modal.
 * Resident-first: a big resolution ring, a friendly community-health status, a
 * one-line summary, waste mix, activity, and participation up top; drier admin
 * metrics tuck behind a "More details" expander.
 */
export default function AreaDrawer({ area, reports, now, onClose, onViewOnMap }: Props) {
  const isMobile = useIsMobile()
  const detail = useMemo(
    () => (area ? computeAreaDetail(reports, area.name, now) : null),
    [area, reports, now],
  )

  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!area) {
      setEntered(false)
      return
    }
    const t = window.setTimeout(() => setEntered(true), 60)
    return () => window.clearTimeout(t)
  }, [area])

  const health = detail ? HEALTH_FRIENDLY[healthTone(detail.open, detail.resolutionRate)] : null
  const catTotal = detail ? detail.byCategory.reduce((s, c) => s + c.count, 0) || 1 : 1

  // One-sentence, human summary of what's happening here.
  const summary = useMemo(() => {
    if (!area || !detail) return ''
    const top = detail.byCategory[0]
    const lead = `${area.name} has ${detail.open} active ${detail.open === 1 ? 'report' : 'reports'}.`
    if (top) {
      return `${lead} Most involve ${top.label.toLowerCase()}, and residents have submitted ${detail.confirmations} confirmation${detail.confirmations === 1 ? '' : 's'}.`
    }
    return `${lead} ${detail.resolutionRate}% of all reports here have been resolved.`
  }, [area, detail])

  // Little earned badges.
  const milestones: { Icon: LucideIcon; label: string }[] = []
  if (detail) {
    if (detail.resolutionRate >= 70) milestones.push({ Icon: Sparkles, label: 'Great progress' })
    if (detail.confirmations >= 100) milestones.push({ Icon: Trophy, label: 'Highly engaged' })
    if (detail.resolved > 0) milestones.push({ Icon: Sprout, label: 'Cleanup completed' })
  }

  return (
    <Sheet open={!!area} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="bb-area-drawer border-0 bg-white p-0 gap-0 text-[#14110f] sm:max-w-[440px]"
      >
        {area && detail && (
          <>
            <div className="bb-area-head">
              <MapThumb lat={area.lat} lng={area.lng} size={52} zoom={12} />
              <div className="bb-area-head-text">
                <SheetTitle className="bb-area-title">
                  <MapPin size={16} className="bb-area-title-pin" />
                  {area.name}
                </SheetTitle>
                <SheetDescription className="bb-area-sub">
                  {detail.open} active {detail.open === 1 ? 'report' : 'reports'} · community
                  activity overview
                </SheetDescription>
              </div>
            </div>

            <div className={`bb-area-body ${entered ? 'is-in' : ''}`}>
              {/* Hero: the resolution ring leads, community health beside it */}
              <div className="bb-area-hero">
                <Ring pct={detail.resolutionRate} active={entered} />
                <div className="bb-area-hero-side">
                  {health && (
                    <div className="bb-area-healthblock">
                      <span className="bb-area-health-cap">Community Health</span>
                      <span className="bb-area-health" style={{ color: health.color }}>
                        <Circle size={9} fill="currentColor" aria-hidden /> {health.label}
                      </span>
                    </div>
                  )}
                  <div className="bb-area-chips">
                    <span className="bb-area-chip is-open">{detail.open} open</span>
                    {detail.inReview > 0 && (
                      <span className="bb-area-chip is-review">{detail.inReview} in review</span>
                    )}
                  </div>
                </div>
              </div>

              {milestones.length > 0 && (
                <div className="bb-area-milestones">
                  {milestones.map((m) => (
                    <span key={m.label} className="bb-area-milestone">
                      <m.Icon size={12} aria-hidden /> {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* One-line human summary */}
              <p className="bb-area-summary">{summary}</p>

              {/* Waste mix — proportional to share of reports here */}
              {detail.byCategory.length > 0 && (
                <div className="bb-area-block">
                  <h4 className="bb-area-block-title">Waste mix</h4>
                  <ul className="bb-area-mix">
                    {detail.byCategory.map((c, i) => {
                      const sharePct = Math.round((c.count / catTotal) * 100)
                      return (
                        <li key={c.category} style={{ '--i': i } as React.CSSProperties}>
                          <span className="bb-area-mix-name">
                            <span
                              className="bb-area-cat-dot"
                              style={{ background: CATEGORY_COLORS[c.category] }}
                            />
                            {c.label}
                          </span>
                          <span className="bb-area-mix-track">
                            <span
                              className="bb-area-mix-fill"
                              style={{
                                width: entered ? `${sharePct}%` : 0,
                                background: CATEGORY_COLORS[c.category],
                              }}
                            />
                          </span>
                          <span className="bb-area-mix-n">{sharePct}%</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Activity sparkline */}
              <div className="bb-area-block">
                <h4 className="bb-area-block-title">Activity · last 30 days</h4>
                <Sparkline data={detail.spark} />
              </div>

              {/* Participation */}
              <div className="bb-area-people">
                <span className="bb-area-people-icons" aria-hidden>
                  {Array.from({ length: Math.min(5, Math.max(1, detail.confirmations)) }).map(
                    (_, i) => (
                      <Users key={i} size={16} />
                    ),
                  )}
                </span>
                <span className="bb-area-people-text">
                  <b>
                    <CountUp value={detail.confirmations} active={entered} />
                  </b>{' '}
                  community confirmations
                  <span className="bb-area-tip" tabIndex={0} role="note">
                    <Info size={12} aria-hidden />
                    <span className="bb-area-tip-bubble">
                      Residents who independently confirmed reports. Anonymous, one vote per person.
                    </span>
                  </span>
                </span>
              </div>

              {/* Resident-facing stats, two columns */}
              <dl className="bb-area-stats bb-area-stats--grid">
                <div>
                  <dt>Reports this month</dt>
                  <dd>{detail.reportsThisMonth}</dd>
                </div>
                {detail.latestReport != null && (
                  <div>
                    <dt>Latest activity</dt>
                    <dd>{relativeTime(detail.latestReport, now)}</dd>
                  </div>
                )}
                <div>
                  <dt>Last cleanup</dt>
                  <dd>
                    {detail.lastCleanup != null ? relativeTime(detail.lastCleanup, now) : 'None yet'}
                  </dd>
                </div>
                {detail.avgOpenDays != null && (
                  <div>
                    <dt>Average open</dt>
                    <dd>{humanOpen(detail.avgOpenDays)}</dd>
                  </div>
                )}
              </dl>

              {/* Drier metrics, mainly useful to LGUs/admins — tucked away. */}
              <details className="bb-area-more">
                <summary>
                  More details <ChevronDown size={14} aria-hidden />
                </summary>
                <dl className="bb-area-stats">
                  {detail.oldestOpenDays != null && (
                    <div>
                      <dt>Oldest open report</dt>
                      <dd>{humanOpen(detail.oldestOpenDays)}</dd>
                    </div>
                  )}
                  {detail.firstReport != null && (
                    <div>
                      <dt>First report</dt>
                      <dd>{relativeTime(detail.firstReport, now)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Reports all-time</dt>
                    <dd>{detail.total}</dd>
                  </div>
                </dl>
              </details>

              {onViewOnMap && (
                <button
                  className="bb-area-action"
                  onClick={() => {
                    onViewOnMap(area.lat, area.lng, area.zoom)
                    onClose()
                  }}
                >
                  Explore reports on the map <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
