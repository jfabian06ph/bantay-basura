import { useMemo, useRef, useState } from 'react'
import { MapPin, ArrowRight, FileText, Users, Camera, CheckCircle2, Activity, type LucideIcon } from 'lucide-react'
import Reveal from '../Reveal'
import MapThumb from './MapThumb'
import { recentActivity, relativeTime, type ActivityEvent, type ActivityKind } from '../../lib/stats'
import type { Report } from '../../types'

/** Lucide icon per pulse event kind — replaces the raw emoji glyphs. */
const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  reported: FileText,
  verified: Users,
  cleanup: Camera,
  resolved: CheckCircle2,
}

function ActivityIcon({ kind, size = 16 }: { kind: ActivityKind; size?: number }) {
  const Icon = ACTIVITY_ICON[kind]
  return <Icon size={size} aria-hidden />
}

interface Props {
  reports: Report[]
  now: number
  onReport?: () => void
  onViewAll?: () => void
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
  /** Opens the report's detail panel on the map (preferred over onViewOnMap). */
  onOpenReport?: (id: string) => void
}

/**
 * "Live Community Pulse" — a flat, newest-first activity stream (GitHub/Slack
 * style). No names, no municipality grouping: each row is one event, one line
 * plus a "place • time" meta line. Fixed height with internal scroll so the
 * dashboard summarizes rather than sprawls. Hidden until there's real activity.
 */
export default function RecentlyActive({
  reports,
  now,
  onReport,
  onViewAll,
  onViewOnMap,
  onOpenReport,
}: Props) {
  const events = useMemo(() => recentActivity(reports, now, 10), [reports, now])
  const totalActivity = useMemo(() => recentActivity(reports, now, 9999).length, [reports, now])

  // Group the shown events by place, so the hover card can summarise an area
  // rather than just echo the hovered row.
  const byPlace = useMemo(() => {
    const m = new Map<string, ActivityEvent[]>()
    for (const e of events) {
      const arr = m.get(e.place) ?? []
      arr.push(e)
      m.set(e.place, arr)
    }
    return m
  }, [events])

  // Row-anchored hover preview, same pattern as Areas / Community Highlights.
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const showTimer = useRef<number | undefined>(undefined)
  const [preview, setPreview] = useState<{ e: ActivityEvent; top: number; left: number } | null>(
    null,
  )
  const showPreview = (ev: ActivityEvent | null, e?: React.MouseEvent) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (showTimer.current) window.clearTimeout(showTimer.current)
    if (!ev) {
      hideTimer.current = window.setTimeout(() => setPreview(null), 150)
      return
    }
    const wrap = wrapRef.current
    const el = e?.currentTarget as HTMLElement | undefined
    if (!wrap || !el) {
      setPreview({ e: ev, top: 0, left: 0 })
      return
    }
    const wr = wrap.getBoundingClientRect()
    const rr = el.getBoundingClientRect()
    const half = 130
    const clientX = e ? e.clientX : rr.left + rr.width / 2
    const pos = {
      e: ev,
      top: rr.top - wr.top,
      left: Math.max(half, Math.min(wr.width - half, clientX - wr.left)),
    }
    showTimer.current = window.setTimeout(() => setPreview(pos), 140)
  }
  const keepPreview = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
  }

  if (events.length === 0) {
    return (
      <section className="bb-dash-section">
        <div className="bb-dash-eyebrow bb-dash-eyebrow-live">
          <Activity className="bb-live-pulse" size={16} aria-hidden /> Live Community Pulse
        </div>
        <div className="bb-pulse-empty">
          <p className="bb-pulse-empty-lede">Nothing new in the last 24 hours.</p>
          <p>That&rsquo;s good news — fewer reports mean cleaner communities.</p>
          {onReport && (
            <button className="bb-pulse-empty-cta" onClick={onReport}>
              Report Waste
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="bb-dash-section">
      <div className="bb-dash-eyebrow bb-dash-eyebrow-live">
        <span className="bb-live-dot" /> Live Community Pulse
        <span className="bb-pulse-updated">· Updated {relativeTime(events[0].at, now)}</span>
      </div>
      <p className="bb-dash-section-lede">Recent community activity. Privacy protected.</p>
      <Reveal>
        <div className="bb-pulse-card">
          <div
            className="bb-pulse-wrap"
            ref={wrapRef}
            onMouseLeave={() => showPreview(null)}
          >
            <ul className="bb-pulse-stream">
              {events.map((e, i) => (
                <li
                  className={`bb-pulse-item is-${e.kind}`}
                  key={e.id}
                  style={{ '--i': i } as React.CSSProperties}
                  onMouseEnter={(ev) => showPreview(e, ev)}
                >
                  <span className="bb-pulse-ico" aria-hidden>
                    <ActivityIcon kind={e.kind} />
                  </span>
                  <span className="bb-pulse-main">
                    <span className="bb-pulse-label">{e.label}</span>
                    <span className="bb-pulse-meta">
                      {e.place} · {relativeTime(e.at, now)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {preview && (
              <button
                className={`bb-hotspots-preview is-anchored ${
                  onOpenReport || onViewOnMap ? 'is-clickable' : ''
                }`}
                style={{ top: preview.top, left: preview.left }}
                onMouseEnter={keepPreview}
                onMouseLeave={() => showPreview(null)}
                onClick={
                  onOpenReport
                    ? () => onOpenReport(preview.e.reportId)
                    : onViewOnMap
                      ? () => onViewOnMap(preview.e.lat, preview.e.lng, 13)
                      : undefined
                }
                aria-label={
                  onOpenReport
                    ? `Open the ${preview.e.place} report`
                    : onViewOnMap
                      ? `Open ${preview.e.place} on the map`
                      : undefined
                }
              >
                <MapThumb lat={preview.e.lat} lng={preview.e.lng} size={92} zoom={13} />
                {(() => {
                  const placeEvents = byPlace.get(preview.e.place) ?? [preview.e]
                  const latest = placeEvents[0]
                  return (
                    <span className="bb-hotspots-preview-info">
                      <span className="bb-hotspots-preview-name">
                        <MapPin size={13} /> {preview.e.place}
                      </span>
                      <span className="bb-hotspots-preview-sub">
                        {placeEvents.length} recent{' '}
                        {placeEvents.length === 1 ? 'activity' : 'activities'}
                      </span>
                      <span className="bb-hotspots-preview-stat">
                        Latest: <ActivityIcon kind={latest.kind} size={12} /> {latest.label}
                      </span>
                      {(onOpenReport || onViewOnMap) && (
                        <span className="bb-hotspots-preview-cta">
                          {onOpenReport ? 'View report' : 'Open on map'}{' '}
                          <ArrowRight size={12} />
                        </span>
                      )}
                    </span>
                  )
                })()}
              </button>
            )}
          </div>

          {onViewAll && (
            <button className="bb-pulse-all" onClick={onViewAll}>
              {totalActivity > events.length
                ? `See all ${totalActivity} activities`
                : 'See the full activity feed'}{' '}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </Reveal>
    </section>
  )
}
