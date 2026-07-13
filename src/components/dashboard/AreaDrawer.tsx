import { useEffect, useMemo, useState } from 'react'
import { MapPin, ArrowRight, Users, Info } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet'
import { CATEGORY_COLORS } from './Charts'
import CountUp from '../CountUp'
import MapThumb from './MapThumb'
import {
  computeAreaDetail,
  healthTone,
  relativeTime,
  HEALTH_META,
  type Hotspot,
} from '../../lib/stats'
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
        <span key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function days(n: number): string {
  const r = Math.round(n)
  return `${r} day${r === 1 ? '' : 's'}`
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
 * Reads as a human "activity overview", not a spreadsheet: a health status,
 * a progress ring, a waste-mix, an activity sparkline, and observable metrics.
 */
export default function AreaDrawer({ area, reports, now, onClose, onViewOnMap }: Props) {
  const isMobile = useIsMobile()
  const detail = useMemo(
    () => (area ? computeAreaDetail(reports, area.name, now) : null),
    [area, reports, now],
  )

  // Drive the count-up / ring-fill / stagger once the drawer is actually open.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (!area) {
      setEntered(false)
      return
    }
    const t = window.setTimeout(() => setEntered(true), 60)
    return () => window.clearTimeout(t)
  }, [area])

  const health = detail ? healthTone(detail.open, detail.resolutionRate) : null
  const catMax = detail ? Math.max(1, ...detail.byCategory.map((c) => c.count)) : 1

  return (
    <Sheet open={!!area} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="bb-area-drawer border-[#eceae5] bg-white p-0 gap-0 text-[#14110f] sm:max-w-[440px]"
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
              {/* Health + resolution ring, side by side */}
              <div className="bb-area-hero">
                <Ring pct={detail.resolutionRate} active={entered} />
                <div className="bb-area-hero-side">
                  {health && (
                    <span
                      className="bb-area-health"
                      style={{ color: HEALTH_META[health].color }}
                    >
                      {HEALTH_META[health].dot} {HEALTH_META[health].label}
                    </span>
                  )}
                  <div className="bb-area-chips">
                    <span className="bb-area-chip is-open">{detail.open} open</span>
                    {detail.inReview > 0 && (
                      <span className="bb-area-chip is-review">{detail.inReview} in review</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Waste mix — proportional bars, staggered in */}
              {detail.byCategory.length > 0 && (
                <div className="bb-area-block">
                  <h4 className="bb-area-block-title">Waste mix</h4>
                  <ul className="bb-area-mix">
                    {detail.byCategory.map((c, i) => (
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
                              width: entered ? `${(c.count / catMax) * 100}%` : 0,
                              background: CATEGORY_COLORS[c.category],
                            }}
                          />
                        </span>
                        <span className="bb-area-mix-n">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Activity sparkline */}
              <div className="bb-area-block">
                <h4 className="bb-area-block-title">Activity · last 30 days</h4>
                <Sparkline data={detail.spark} />
              </div>

              {/* Humanized confirmations */}
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

              {/* Observable metrics only (no "residents watching") */}
              <dl className="bb-area-stats">
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
                {detail.avgOpenDays != null && (
                  <div>
                    <dt>Average time open</dt>
                    <dd>{detail.avgOpenDays.toFixed(1)} days</dd>
                  </div>
                )}
                {detail.oldestOpenDays != null && (
                  <div>
                    <dt>Oldest open report</dt>
                    <dd>{days(detail.oldestOpenDays)}</dd>
                  </div>
                )}
                <div>
                  <dt>Last cleanup</dt>
                  <dd>
                    {detail.lastCleanup != null ? relativeTime(detail.lastCleanup, now) : 'None yet'}
                  </dd>
                </div>
                {detail.firstReport != null && (
                  <div>
                    <dt>First report</dt>
                    <dd>{relativeTime(detail.firstReport, now)}</dd>
                  </div>
                )}
              </dl>

              {onViewOnMap && (
                <button
                  className="bb-area-action"
                  onClick={() => {
                    onViewOnMap(area.lat, area.lng, area.zoom)
                    onClose()
                  }}
                >
                  {detail.open > 0
                    ? `View ${detail.open} active ${detail.open === 1 ? 'report' : 'reports'}`
                    : 'Explore reports on map'}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
