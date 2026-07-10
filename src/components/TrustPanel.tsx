import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, MapPin, PartyPopper } from 'lucide-react'
import {
  municipalitySnapshot,
  placesForStatus,
  relativeTime,
  type PlaceCount,
} from '../lib/stats'
import { STATUS_COLORS, STATUS_LABELS, type Report, type ReportStatus } from '../types'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import CountUp from './CountUp'

interface Props {
  reports: Report[]
  stats: { pending: number; review: number; done: number }
  /** Human label for the current map area (e.g. "Zambales", "Iba"). */
  contextLabel: string
  now: number
  open: boolean
  onClose: () => void
  onReopen: () => void
  onFlyTo: (lat: number, lng: number, zoom: number) => void
  onOpenReport: (r: Report) => void
}

const STATUS_CARDS: { status: ReportStatus; label: string }[] = [
  { status: 'pending', label: 'Needs Attention' },
  { status: 'in_review', label: 'Under Review' },
  { status: 'resolved', label: 'Cleaned' },
]

/**
 * The map's live status card. Three drill levels, each sliding in over the
 * last: headline counts → affected areas → a per-municipality snapshot whose
 * recent reports fly the map and open the incident. Owns its own drill state.
 */
export default function TrustPanel({
  reports,
  stats,
  contextLabel,
  now,
  open,
  onClose,
  onReopen,
  onFlyTo,
  onOpenReport,
}: Props) {
  const [drill, setDrill] = useState<ReportStatus | null>(null)
  const [area, setArea] = useState<PlaceCount | null>(null)
  const [dir, setDir] = useState<1 | -1>(1)
  // Fade the list edge only when it actually overflows (scrollbar is hidden).
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)

  const drillPlaces = useMemo(
    () => (drill ? placesForStatus(reports, drill) : []),
    [drill, reports],
  )
  const drillTotal = drillPlaces.reduce((n, p) => n + p.count, 0)

  const snapshot = useMemo(
    () => (area ? municipalitySnapshot(reports, area.name, now) : null),
    [area, reports, now],
  )

  const updatedLabel = useMemo(() => {
    if (!reports.length) return null
    const latest = Math.max(...reports.map((r) => new Date(r.createdAt).getTime()))
    return relativeTime(latest, now)
  }, [reports, now])

  // --- navigation (tracks direction so views slide the right way) ---
  const go = (fn: () => void, direction: 1 | -1) => {
    setDir(direction)
    fn()
  }
  const home = () => go(() => { setArea(null); setDrill(null) }, -1)
  const toStatus = (s: ReportStatus) => go(() => { setArea(null); setDrill(s) }, 1)
  const toArea = (p: PlaceCount) => go(() => setArea(p), 1)
  const backToAreas = () => go(() => setArea(null), -1)
  const back = () => (area ? backToAreas() : home())

  function openReport(r: Report) {
    onFlyTo(r.lat, r.lng, 17)
    onOpenReport(r)
  }

  const level = area ? 3 : drill ? 2 : 1
  const viewKey = area ? `area-${area.name}` : drill ? `drill-${drill}` : 'home'

  useEffect(() => {
    const el = listRef.current
    setScrollable(!!el && el.scrollHeight > el.clientHeight + 1)
  }, [viewKey, drillPlaces, snapshot])

  return (
    <>
      {!open && (
        <button
          className="bb-trust-reopen"
          onClick={onReopen}
          aria-label="Show live community status"
          title="Live community status"
        >
          <span className="bb-trust-live-dot" />
        </button>
      )}

      <section className={`bb-trust ${open ? 'bb-trust-open' : 'bb-trust-closed'}`}>
        {level > 1 ? (
          <button className="bb-trust-back" onClick={back}>
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : (
          <button className="bb-trust-toggle" onClick={onClose} aria-label="Hide" title="Hide">
            <X className="size-4" />
          </button>
        )}

        <div key={viewKey} className={`bb-status-view ${dir === 1 ? 'is-fwd' : 'is-back'}`}>
          {/* ---------- Level 1: Live headline status ---------- */}
          {level === 1 && (
            <>
              <div className="bb-trust-eyebrow bb-live">
                <span className="bb-live-dot" /> Live Community Status
              </div>
              <h2 className="bb-trust-title bb-ctx-title">{contextLabel}</h2>
              <p className="bb-trust-sub">
                Showing this map area
                {updatedLabel ? ` · updated ${updatedLabel}` : ''}
              </p>
              <div className="bb-stats">
                {STATUS_CARDS.map(({ status, label }) => {
                  const value =
                    status === 'pending'
                      ? stats.pending
                      : status === 'in_review'
                        ? stats.review
                        : stats.done
                  return (
                    <button
                      key={status}
                      className="bb-stat bb-stat-meaning"
                      style={{ '--stat-color': STATUS_COLORS[status] } as React.CSSProperties}
                      onClick={() => toStatus(status)}
                    >
                      <span className="bb-stat-strip" />
                      <strong className="bb-stat-meaning-v">
                        <CountUp value={value} duration={1200} />
                      </strong>
                      <small className="bb-stat-meaning-label">{label}</small>
                      <span className="bb-stat-hint">Tap to explore ›</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ---------- Level 2: Affected areas ---------- */}
          {level === 2 && drill && (
            <>
              <div className="bb-trust-eyebrow" style={{ color: STATUS_COLORS[drill] }}>
                {STATUS_LABELS[drill]}
              </div>
              <h2 className="bb-trust-title">Affected Areas</h2>
              <p className="bb-trust-sub">
                {drillPlaces.length} {drillPlaces.length === 1 ? 'municipality' : 'municipalities'}
                {' · '}
                {drillTotal} {drillTotal === 1 ? 'report' : 'reports'}
              </p>
              <div ref={listRef} className={`bb-drill-list ${scrollable ? 'is-scrollable' : ''}`}>
                {drillPlaces.length === 0 ? (
                  <div className="bb-drill-empty">
                    <PartyPopper className="size-7" />
                    <strong>Nothing here</strong>
                    <span>No {STATUS_LABELS[drill].toLowerCase()} reports right now. Great job!</span>
                  </div>
                ) : (
                  drillPlaces.map((p) => (
                    <button key={p.name} className="bb-drill-row" onClick={() => toArea(p)}>
                      <span className="bb-drill-dot" style={{ background: STATUS_COLORS[drill] }} />
                      <span className="bb-drill-name">{p.name}</span>
                      <span className="bb-count-badge">{p.count}</span>
                      <ChevronRight className="bb-drill-arrow size-4" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* ---------- Level 3: Municipality snapshot ---------- */}
          {level === 3 && area && snapshot && (
            <>
              <div className="bb-snap-head">
                <div>
                  <div className="bb-trust-eyebrow">Community Snapshot</div>
                  <h2 className="bb-trust-title">{area.name}</h2>
                </div>
                {snapshot.hasReports &&
                  (() => {
                    const rate = snapshot.resolutionRate
                    const tone =
                      rate >= 60 ? 'var(--green)' : rate >= 30 ? 'var(--amber)' : 'var(--text-dim)'
                    const bg =
                      rate >= 60
                        ? 'rgba(35,194,102,0.16)'
                        : rate >= 30
                          ? 'rgba(245,184,75,0.16)'
                          : 'rgba(255,255,255,0.07)'
                    return (
                      <div className="bb-snap-score" style={{ color: tone, background: bg }}>
                        <span className="bb-snap-score-v">{rate}%</span>
                        <span className="bb-snap-score-k">Resolved</span>
                      </div>
                    )
                  })()}
              </div>

              {(() => {
                const state =
                  snapshot.open > 0
                    ? {
                        tone: 'var(--amber)',
                        text: `Needs attention · ${snapshot.open} active ${snapshot.open === 1 ? 'report' : 'reports'} awaiting cleanup`,
                      }
                    : snapshot.hasReports
                      ? { tone: 'var(--green)', text: 'Healthy community · all reports resolved' }
                      : { tone: 'var(--green)', text: 'Nothing flagged here yet' }
                return (
                  <p className="bb-snap-state">
                    <span className="bb-snap-state-dot" style={{ background: state.tone }} />
                    {state.text}
                  </p>
                )
              })()}

              <div className="bb-snap-grid">
                <div className="bb-snap-cell">
                  <span className="bb-snap-v">{snapshot.open}</span>
                  <span className="bb-snap-k">Open Reports</span>
                </div>
                <div className="bb-snap-cell">
                  <span className="bb-snap-v">{snapshot.confirmations}</span>
                  <span className="bb-snap-k">Community Verified</span>
                </div>
                <div className="bb-snap-cell">
                  <span className="bb-snap-v" style={{ color: STATUS_COLORS.resolved }}>
                    {snapshot.resolvedThisMonth}
                  </span>
                  <span className="bb-snap-k">Resolved this month</span>
                </div>
                <div className="bb-snap-cell">
                  <span className="bb-snap-v">
                    {snapshot.avgResponseDays === null
                      ? '—'
                      : `${snapshot.avgResponseDays.toFixed(1)}d`}
                  </span>
                  <span className="bb-snap-k">Avg. response</span>
                </div>
              </div>

              <button
                className="bb-snap-mapbtn"
                onClick={() => onFlyTo(area.lat, area.lng, area.zoom)}
              >
                <MapPin className="size-4" /> View on map
              </button>

              <div className="bb-trust-eyebrow bb-snap-recent-k">Recent Reports</div>
              <div ref={listRef} className={`bb-drill-list ${scrollable ? 'is-scrollable' : ''}`}>
                {snapshot.recent.slice(0, 6).map((r) => {
                  const Icon = CATEGORY_ICON[r.category]
                  return (
                  <button key={r.id} className="bb-drill-row" onClick={() => openReport(r)}>
                    <span className="bb-snap-emoji">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="bb-drill-name">
                      {r.title ?? STATUS_LABELS[r.status]}
                    </span>
                    <span className="bb-snap-rstatus">
                      <i
                        className="bb-snap-rstatus-dot"
                        style={{ background: STATUS_COLORS[r.status] }}
                      />
                      {STATUS_LABELS[r.status]}
                    </span>
                    <ChevronRight className="bb-drill-arrow size-4" />
                  </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
