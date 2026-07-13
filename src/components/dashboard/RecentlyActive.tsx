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

/** Generic per-kind icon + noun for the popup's municipality summary. */
const KIND_EMOJI: Record<ActivityKind, string> = {
  reported: '📝',
  verified: '👥',
  cleanup: '📸',
  resolved: '✅',
}
function kindNoun(kind: ActivityKind, n: number): string {
  const plural = n === 1 ? '' : 's'
  switch (kind) {
    case 'reported':
      return `new report${plural}`
    case 'verified':
      return `community confirmation${plural}`
    case 'cleanup':
      return `cleanup photo${plural}`
    case 'resolved':
      return n === 1 ? 'area resolved' : 'areas resolved'
  }
}

interface Group {
  place: string
  lat: number
  lng: number
  events: ActivityEvent[]
}

/** Count a group's events by kind, in display order. */
function summarize(g: Group): { kind: ActivityKind; n: number }[] {
  const order: ActivityKind[] = ['reported', 'verified', 'cleanup', 'resolved']
  const counts = new Map<ActivityKind, number>()
  for (const e of g.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1)
  return order.filter((k) => counts.has(k)).map((k) => ({ kind: k, n: counts.get(k)! }))
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
          <span className="bb-live-dot" /> Live Community Pulse
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
                    <li className={`bb-pulse-item is-${e.kind}`} key={e.id}>
                      <span className="bb-pulse-ico" aria-hidden>
                        {e.emoji}
                      </span>
                      <span className="bb-pulse-main">
                        <span className="bb-pulse-label">{e.label}</span>
                        <span className="bb-pulse-when">{relativeTime(e.at, now)}</span>
                      </span>
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
                <span className="bb-hotspots-preview-sub">Recent activity</span>
                <span className="bb-pulse-summary">
                  {summarize(preview.g).map((s) => (
                    <span key={s.kind}>
                      {KIND_EMOJI[s.kind]} {s.n} {kindNoun(s.kind, s.n)}
                    </span>
                  ))}
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
