import { useMemo, useRef, useState } from 'react'
import { MapPin, ArrowRight, Sparkles, Flame, Rocket, BarChart3, FileText, Users, Sprout, type LucideIcon } from 'lucide-react'
import Reveal from '../Reveal'
import MapThumb from './MapThumb'
import { communityRankings, type CommunityRank } from '../../lib/stats'
import type { Report } from '../../types'

interface Props {
  reports: Report[]
  now: number
  /** Name of the most-improved community this month, for the "Improving" badge. */
  mostImproved?: string
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

type BadgeTone = 'clean' | 'active' | 'improving'
const BADGE: Record<BadgeTone, { label: string; Icon: LucideIcon }> = {
  clean: { label: 'Cleanest', Icon: Sparkles },
  active: { label: 'Most Active', Icon: Flame },
  improving: { label: 'Improving', Icon: Rocket },
}

/** Gold / silver / bronze rank medallion, then a plain outlined number. */
function Medal({ i }: { i: number }) {
  const tone = ['gold', 'silver', 'bronze'][i]
  return (
    <span className={`bb-lead-medal ${tone ? `is-${tone}` : ''}`}>{i + 1}</span>
  )
}

export default function CommunitySection({ reports, now, mostImproved, onViewOnMap }: Props) {
  const ranks = useMemo(() => communityRankings(reports, now), [reports, now])

  // Which communities earn a badge.
  const cleanest = ranks[0]?.name
  const mostActive = useMemo(
    () => [...ranks].sort((a, b) => b.confirmations - a.confirmations)[0]?.name,
    [ranks],
  )
  const badgeFor = (c: CommunityRank): BadgeTone | null => {
    if (c.name === cleanest) return 'clean'
    if (c.name === mostActive) return 'active'
    if (c.name === mostImproved) return 'improving'
    return null
  }

  const top = ranks.slice(0, 5)
  const maxConf = Math.max(1, ...top.map((c) => c.confirmations))
  // Communities to watch: places outside the top, so newcomers get a spotlight.
  const watch = ranks.slice(5, 8)

  // Row-anchored hover preview (same pattern as Areas / Community Pulse).
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const showTimer = useRef<number | undefined>(undefined)
  const [preview, setPreview] = useState<{ c: CommunityRank; top: number; left: number } | null>(
    null,
  )
  const showPreview = (c: CommunityRank | null, e?: React.MouseEvent) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (showTimer.current) window.clearTimeout(showTimer.current)
    if (!c) {
      hideTimer.current = window.setTimeout(() => setPreview(null), 150)
      return
    }
    const wrap = wrapRef.current
    const el = e?.currentTarget as HTMLElement | undefined
    if (!wrap || !el) {
      setPreview({ c, top: 0, left: 0 })
      return
    }
    const wr = wrap.getBoundingClientRect()
    const rr = el.getBoundingClientRect()
    const half = 130
    const clientX = e ? e.clientX : rr.left + rr.width / 2
    const pos = {
      c,
      top: rr.top - wr.top,
      left: Math.max(half, Math.min(wr.width - half, clientX - wr.left)),
    }
    showTimer.current = window.setTimeout(() => setPreview(pos), 140)
  }
  const keepPreview = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
  }

  if (top.length === 0) return null

  return (
    <section className="bb-dash-section">
      <div className="bb-dash-eyebrow">Community Highlights</div>
      <p className="bb-dash-section-lede">Communities making the most progress, celebrated together.</p>

      <Reveal>
        <div className="bb-lead-wrap" ref={wrapRef} onMouseLeave={() => showPreview(null)}>
          <ul className="bb-lead">
            {top.map((c, i) => {
              const badge = badgeFor(c)
              return (
                <li
                  className="bb-lead-row"
                  key={c.name}
                  style={{ '--i': i } as React.CSSProperties}
                  onMouseEnter={(e) => showPreview(c, e)}
                  onClick={onViewOnMap ? () => onViewOnMap(c.lat, c.lng, c.zoom) : undefined}
                  role={onViewOnMap ? 'button' : undefined}
                  tabIndex={onViewOnMap ? 0 : undefined}
                >
                  <Medal i={i} />
                  <div className="bb-lead-main">
                    <div className="bb-lead-namerow">
                      <span className="bb-lead-name">
                        <MapPin size={14} aria-hidden /> {c.name}
                      </span>
                      {badge && (
                        <span className={`bb-lead-badge is-${badge}`}>
                          {(() => {
                            const BadgeIcon = BADGE[badge].Icon
                            return <BadgeIcon size={12} aria-hidden />
                          })()}
                          {BADGE[badge].label}
                        </span>
                      )}
                    </div>
                    <div className="bb-lead-metrics">
                      <span className="bb-lead-bar">
                        <span
                          className="bb-lead-bar-fill"
                          style={{ width: `${(c.confirmations / maxConf) * 100}%` }}
                        />
                      </span>
                      <span className="bb-lead-sub">
                        {c.resolutionRate}% resolved · {c.confirmations} confirmations
                      </span>
                    </div>
                  </div>
                  {onViewOnMap && (
                    <span className="bb-lead-cta">
                      View area <ArrowRight size={14} />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          {preview && (
            <button
              className={`bb-hotspots-preview is-anchored ${onViewOnMap ? 'is-clickable' : ''}`}
              style={{ top: preview.top, left: preview.left }}
              onMouseEnter={keepPreview}
              onMouseLeave={() => showPreview(null)}
              onClick={
                onViewOnMap ? () => onViewOnMap(preview.c.lat, preview.c.lng, preview.c.zoom) : undefined
              }
              aria-label={onViewOnMap ? `Open ${preview.c.name} on the map` : undefined}
            >
              <MapThumb lat={preview.c.lat} lng={preview.c.lng} size={92} zoom={13} />
              <span className="bb-hotspots-preview-info">
                <span className="bb-hotspots-preview-name">
                  <MapPin size={13} /> {preview.c.name}
                </span>
                <span className="bb-hotspots-preview-sub">Community overview</span>
                <span className="bb-pulse-summary">
                  <span><BarChart3 size={12} aria-hidden /> {preview.c.resolutionRate}% resolved</span>
                  <span><FileText size={12} aria-hidden /> {preview.c.total} reports</span>
                  <span><Users size={12} aria-hidden /> {preview.c.confirmations} confirmations</span>
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

      {watch.length > 0 && (
        <div className="bb-watch">
          <div className="bb-watch-title"><Sprout size={15} aria-hidden /> Communities to Watch</div>
          <ul className="bb-watch-list">
            {watch.map((c) => (
              <li key={c.name}>
                <span className="bb-watch-name">
                  <MapPin size={13} aria-hidden /> {c.name}
                </span>
                <span className="bb-watch-note">
                  {c.total} {c.total === 1 ? 'report' : 'reports'} · just getting started
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
