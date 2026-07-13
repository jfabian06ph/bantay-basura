import { useMemo, useRef, useState } from 'react'
import { MapPin, ArrowRight } from 'lucide-react'
import Reveal from '../Reveal'
import MapThumb from './MapThumb'
import { recentActivity, relativeTime, type ActivityEvent, type ActivityKind } from '../../lib/stats'
import type { Report } from '../../types'

interface Props {
  reports: Report[]
  now: number
  onReport?: () => void
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

const PILL: Record<ActivityKind, string> = {
  reported: 'Reported',
  verified: 'Verified',
  cleanup: 'Cleanup',
  resolved: 'Resolved',
}

interface Group {
  place: string
  lat: number
  lng: number
  events: ActivityEvent[]
}

/** Collapse consecutive same-place events into one place group. */
function group(events: ActivityEvent[]): Group[] {
  const groups: Group[] = []
  for (const e of events) {
    const last = groups[groups.length - 1]
    if (last && last.place === e.place) last.events.push(e)
    else groups.push({ place: e.place, lat: e.lat, lng: e.lng, events: [e] })
  }
  return groups
}

/**
 * "Community Pulse" — a live feed of the latest community activity. No names,
 * ever: only what happened, where, and when. Consecutive events in the same
 * place are grouped. Hovering a group previews it on a mini map (continuity
 * with Areas Needing Attention). Hidden entirely until there's real activity.
 */
export default function RecentlyActive({ reports, now, onReport, onViewOnMap }: Props) {
  const events = useMemo(() => recentActivity(reports, now, 6), [reports, now])
  const groups = useMemo(() => group(events), [events])

  // Row-anchored hover preview, matching Areas Needing Attention.
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const showTimer = useRef<number | undefined>(undefined)
  const [preview, setPreview] = useState<{ g: Group; top: number; left: number } | null>(null)
  const showPreview = (g: Group | null, e?: React.MouseEvent) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (showTimer.current) window.clearTimeout(showTimer.current)
    if (!g) {
      hideTimer.current = window.setTimeout(() => setPreview(null), 150)
      return
    }
    const wrap = wrapRef.current
    const el = e?.currentTarget as HTMLElement | undefined
    if (!wrap || !el) {
      setPreview({ g, top: 0, left: 0 })
      return
    }
    const wr = wrap.getBoundingClientRect()
    const rr = el.getBoundingClientRect()
    const half = 130
    const clientX = e ? e.clientX : rr.left + rr.width / 2
    const pos = {
      g,
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
          <span className="bb-live-dot" /> Community Pulse
        </div>
        <div className="bb-pulse-empty">
          <p>No recent community activity yet.</p>
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
        <span className="bb-live-dot" /> Community Pulse
      </div>
      <p className="bb-dash-section-lede">Live community activity, no names attached.</p>
      <Reveal>
        <div className="bb-pulse-wrap" ref={wrapRef} onMouseLeave={() => showPreview(null)}>
          <ul className="bb-pulse">
            {groups.map((g, gi) => (
              <li
                className="bb-pulse-group"
                key={`${g.place}-${gi}`}
                style={{ '--i': gi } as React.CSSProperties}
                onMouseEnter={(e) => showPreview(g, e)}
              >
                <span className="bb-pulse-place">
                  <MapPin size={14} aria-hidden />
                  {g.place}
                </span>
                <ul className="bb-pulse-events">
                  {g.events.map((e) => (
                    <li className="bb-pulse-item" key={e.id}>
                      <span className="bb-pulse-emoji" aria-hidden>
                        {e.emoji}
                      </span>
                      <span className="bb-pulse-label">{e.label}</span>
                      <span className={`bb-pulse-pill is-${e.kind}`}>{PILL[e.kind]}</span>
                      <span className="bb-pulse-time">🕒 {relativeTime(e.at, now)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {preview && (
            <button
              className={`bb-hotspots-preview is-anchored ${onViewOnMap ? 'is-clickable' : ''}`}
              style={{ top: preview.top, left: preview.left }}
              onMouseEnter={keepPreview}
              onMouseLeave={() => showPreview(null)}
              onClick={onViewOnMap ? () => onViewOnMap(preview.g.lat, preview.g.lng, 13) : undefined}
              aria-label={onViewOnMap ? `Open ${preview.g.place} on the map` : undefined}
            >
              <MapThumb lat={preview.g.lat} lng={preview.g.lng} size={92} zoom={13} />
              <span className="bb-hotspots-preview-info">
                <span className="bb-hotspots-preview-name">
                  <MapPin size={13} /> {preview.g.place}
                </span>
                <span className="bb-hotspots-preview-sub">Community overview</span>
                <span className="bb-hotspots-preview-stat">
                  {preview.g.events.length} recent{' '}
                  {preview.g.events.length === 1 ? 'activity' : 'activities'}
                </span>
                {onViewOnMap && (
                  <span className="bb-hotspots-preview-cta">
                    Open on map <ArrowRight size={12} />
                  </span>
                )}
              </span>
            </button>
          )}
        </div>
      </Reveal>
    </section>
  )
}
