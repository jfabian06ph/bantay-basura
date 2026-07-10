import { useEffect, useRef, useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Bell,
  BellRing,
  ThumbsUp,
  CheckCircle2,
  Clock,
  Gauge,
  ShieldCheck,
  Camera,
  CameraOff,
  Users,
  MapPin,
  MapPinned,
  CalendarDays,
  QrCode,
} from 'lucide-react'
import { nearestMunicipality } from '../municipalities'
import { distanceMeters, formatDistance } from '../lib/geo'
import { relativeTime } from '../lib/stats'
import { formatRef } from '../lib/ref'
import ShareSheet from './ShareSheet'
import BeforeAfter from './BeforeAfter'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Report,
} from '../types'
import type { UserLocation } from '../hooks/useUserLocation'

interface Props {
  report: Report
  now: number
  userPos: UserLocation | null
  onConfirm: (id: string, kind: 'stillHere' | 'cleared') => void
  onClose: () => void
}

const SEVERITY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Minor',
  2: 'Moderate',
  3: 'Severe',
}

const SEVERITY_TONE: Record<1 | 2 | 3, string> = {
  1: '#22c55e',
  2: '#f5b84b',
  3: '#e31e2f',
}

// Friendlier, lifecycle-flavored status wording used in the report panel
// (the map legend/filters keep the terse STATUS_LABELS).
const PANEL_STATUS: Record<Report['status'], string> = {
  pending: 'Awaiting Action',
  in_review: 'Under Review',
  resolved: 'Resolved',
}

const TRACK_KEY = 'bb-tracked'
const loadTracked = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(TRACK_KEY) || '[]')
  } catch {
    return []
  }
}

const DAY = 86_400_000
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function ReportPanel({ report, now, userPos, onConfirm, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [tracked, setTracked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const touchX = useRef<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    setTracked(loadTracked().includes(report.id))
  }, [report.id])

  // Reset the lightbox whenever a different report is opened.
  useEffect(() => {
    setLightbox(null)
  }, [report.id])

  const area = nearestMunicipality(report).place.name
  const dist = userPos ? formatDistance(distanceMeters(userPos, report)) : null
  const color = STATUS_COLORS[report.status]
  // Unify legacy single photoUrl with the newer photoUrls array.
  const photos =
    report.photoUrls && report.photoUrls.length > 0
      ? report.photoUrls
      : report.photoUrl
        ? [report.photoUrl]
        : []
  const hasPhoto = photos.length > 0
  const heading = report.title ?? CATEGORY_LABELS[report.category]
  const daysOpen = Math.max(0, Math.floor((now - new Date(report.createdAt).getTime()) / DAY))
  const resolved = report.status === 'resolved'
  const resolveDays =
    resolved && report.resolvedAt
      ? Math.max(
          0,
          Math.round((new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime()) / DAY),
        )
      : daysOpen
  // Before/after: original photos vs. the "after" photos added on resolution.
  const beforePhoto = photos[0]
  const afterPhoto = report.resolvedPhotoUrls?.[0]
  const showBeforeAfter = resolved && Boolean(beforePhoto && afterPhoto)

  // Community verification split — powers the consensus tally under the buttons.
  const votes = report.stillHere + report.cleared
  const stillPct = votes ? Math.round((report.stillHere / votes) * 100) : 50

  // Derived verification: an official touched it, or the crowd backed it.
  // The subtitle carries the credibility — who stands behind this report.
  const verification =
    report.status !== 'pending'
      ? { title: 'LGU Verified', sub: 'Reviewed by the local government', tone: '#3b82f6' }
      : report.stillHere >= 3
        ? {
            title: 'Community Verified',
            sub: `Confirmed by ${report.stillHere} nearby residents`,
            tone: '#22c55e',
          }
        : null

  // Timeline steps carry a tone: green = completed, amber = active, none = upcoming.
  const inReviewDone = report.status !== 'pending'
  const timeline = [
    { label: 'Reported', date: fmtDate(report.createdAt), done: true, tone: STATUS_COLORS.resolved },
    {
      label: 'In Review',
      date: inReviewDone ? (resolved ? 'Done' : 'In progress') : '—',
      done: inReviewDone,
      tone: resolved ? STATUS_COLORS.resolved : inReviewDone ? STATUS_COLORS.in_review : null,
    },
    {
      label: 'Resolved',
      date: report.resolvedAt ? fmtDate(report.resolvedAt) : '—',
      done: resolved,
      tone: resolved ? STATUS_COLORS.resolved : null,
    },
  ]

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  async function share() {
    const url = window.location.href
    const text = `${CATEGORY_LABELS[report.category]} reported in ${area} · Bantay Basura`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bantay Basura', text, url })
      } catch {
        /* cancelled */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard')
    } catch {
      /* ignore */
    }
  }

  function toggleTrack() {
    const list = loadTracked()
    const nowTracking = !list.includes(report.id)
    const next = nowTracking ? [...list, report.id] : list.filter((id) => id !== report.id)
    localStorage.setItem(TRACK_KEY, JSON.stringify(next))
    setTracked(nowTracking)
    showToast(
      nowTracking
        ? "Tracking. We'll notify you when this report is updated"
        : 'Stopped tracking this report',
    )
  }

  const stepLightbox = (dir: 1 | -1) =>
    setLightbox((i) => (i === null ? i : (i + dir + photos.length) % photos.length))

  // Arrow-key + Esc navigation while the lightbox is open.
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      else if (e.key === 'ArrowRight') stepLightbox(1)
      else if (e.key === 'ArrowLeft') stepLightbox(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, photos.length])

  return (
    <>
      <aside className={`bb-panel ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="bb-panel-scroll">
          <div className="bb-panel-photo-wrap">
            {hasPhoto ? (
              <button
                className="bb-panel-photo-btn"
                onClick={() => setLightbox(0)}
                aria-label="Enlarge photo"
              >
                <img className="bb-panel-photo" src={photos[0]} alt="Report" />
              </button>
            ) : (
              <div className="bb-panel-noimg">
                <CameraOff className="bb-panel-noimg-icon" strokeWidth={1.5} />
                <span className="bb-panel-noimg-label">No photo provided</span>
              </div>
            )}

            <button className="bb-panel-close" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </button>

            <div className="bb-panel-photo-scrim" />
            <div className="bb-photo-overlay">
              <span className="bb-photo-place">
                <MapPin className="size-3.5" /> {area}
                {dist && <span className="bb-photo-dist"> · {dist}</span>}
              </span>
              <span className="bb-photo-status" style={{ background: `${color}e6` }}>
                {STATUS_LABELS[report.status]}
              </span>
            </div>
            <div className="bb-photo-chip">
              <Camera className="size-3.5" />
              {hasPhoto
                ? `${photos.length} ${photos.length === 1 ? 'Photo' : 'Photos'} · ${relativeTime(new Date(report.createdAt).getTime(), now)}`
                : `Reported ${relativeTime(new Date(report.createdAt).getTime(), now)}`}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="bb-panel-thumbs">
              {photos.slice(0, 4).map((src, i) => {
                const isLast = i === 3 && photos.length > 4
                return (
                  <button
                    key={i}
                    className="bb-panel-thumb"
                    onClick={() => setLightbox(i)}
                    aria-label={isLast ? 'See more photos' : `Photo ${i + 1}`}
                  >
                    <img src={src} alt="" />
                    {isLast && <span className="bb-panel-thumb-more">+{photos.length - 4}</span>}
                  </button>
                )
              })}
            </div>
          )}

          <div className="bb-panel-body">
            {resolved && (
              <div className="bb-celebrate">
                <div className="bb-celebrate-badge">🎉 Cleanup Completed</div>
                <div className="bb-celebrate-stats">
                  <div className="bb-celebrate-stat">
                    <b>{resolveDays}</b>
                    <span>{resolveDays === 1 ? 'day' : 'days'} to resolve</span>
                  </div>
                  <div className="bb-celebrate-stat">
                    <b>{report.cleared}</b>
                    <span>confirmed cleared</span>
                  </div>
                </div>
                <p className="bb-celebrate-by">
                  Resolved by <b>{area} LGU</b>
                  {report.resolvedAt ? ` · ${fmtDate(report.resolvedAt)}` : ''}
                </p>
                {showBeforeAfter && (
                  <div className="bb-celebrate-ba">
                    <span className="bb-rsheet-k">Before → After</span>
                    <BeforeAfter before={beforePhoto} after={afterPhoto!} />
                  </div>
                )}
                <p className="bb-celebrate-thanks">
                  Salamat sa pagtulong na panatilihing malinis ang ating komunidad. 💚
                </p>
              </div>
            )}

            <div className="bb-panel-head">
              <div className="min-w-0 bb-panel-head-text">
                <h2 className="bb-rsheet-title">{heading}</h2>
                {report.title &&
                  (() => {
                    const Cat = CATEGORY_ICON[report.category]
                    return (
                      <span className="bb-cat-badge inline-flex items-center gap-1.5">
                        <Cat className="size-4" /> {CATEGORY_LABELS[report.category]}
                      </span>
                    )
                  })()}
              </div>

              <div className="bb-head-actions">
                <button className="bb-head-icon" onClick={share} aria-label="Share" title="Share">
                  <Share2 className="size-4" />
                </button>
                <button
                  className="bb-head-icon"
                  onClick={() => setShareOpen(true)}
                  aria-label="Share via QR code"
                  title="QR code & share options"
                >
                  <QrCode className="size-4" />
                </button>
                <button
                  className={`bb-head-icon ${tracked ? 'bb-head-icon-on' : ''}`}
                  onClick={toggleTrack}
                  aria-label={tracked ? 'Stop tracking' : 'Track this report'}
                  title={tracked ? 'Tracking. Tap to stop' : 'Track for updates'}
                >
                  {tracked ? <BellRing className="size-4" /> : <Bell className="size-4" />}
                </button>
              </div>
            </div>

            {verification && (
              <div
                className="bb-verif2"
                style={{ borderColor: `${verification.tone}40`, background: `${verification.tone}14` }}
              >
                <ShieldCheck className="size-5" style={{ color: verification.tone }} />
                <div className="bb-verif2-text">
                  <b style={{ color: verification.tone }}>{verification.title}</b>
                  <span>{verification.sub}</span>
                </div>
              </div>
            )}

            <div className="bb-rsheet-meta">
              <div className="bb-rsheet-cell">
                <span className="bb-rsheet-krow">
                  <Clock className="size-3.5" /> <span className="bb-rsheet-k">Reported</span>
                </span>
                <span className="bb-rsheet-v">
                  {relativeTime(new Date(report.createdAt).getTime(), now)}
                </span>
              </div>
              <div className="bb-rsheet-cell">
                <span className="bb-rsheet-krow">
                  <Gauge className="size-3.5" /> <span className="bb-rsheet-k">Severity</span>
                </span>
                <span className="bb-rsheet-v bb-sev-v">
                  <i className="bb-sev-dot" style={{ background: SEVERITY_TONE[report.severity] }} />
                  {SEVERITY_LABELS[report.severity]}
                </span>
              </div>
              <div className="bb-rsheet-cell">
                <span className="bb-rsheet-krow">
                  <span
                    className={`bb-rsheet-statusdot ${report.status === 'pending' ? 'is-live' : ''}`}
                    style={{ background: color }}
                  />
                  <span className="bb-rsheet-k">Status</span>
                </span>
                <span className="bb-rsheet-badge" style={{ background: `${color}22`, color }}>
                  {PANEL_STATUS[report.status]}
                </span>
              </div>
            </div>

            {report.note && (
              <div className="bb-rsheet-section">
                <span className="bb-rsheet-k">Description</span>
                <p className="bb-rsheet-desc">{report.note}</p>
              </div>
            )}

            {/* Community Impact — the collaborative framing */}
            <div className="bb-impact">
              <span className="bb-rsheet-k">Community Activity</span>
              <div className="bb-impact-row">
                <Users className="size-4" />
                <span>
                  <b>{report.stillHere}</b>{' '}
                  {report.stillHere === 1 ? 'resident' : 'residents'} confirmed the issue
                </span>
              </div>
              <div className="bb-impact-row">
                <MapPinned className="size-4" />
                <span>
                  {report.status === 'resolved'
                    ? 'Resolved by LGU'
                    : report.status === 'in_review'
                      ? 'LGU is responding'
                      : 'Visible to LGU responders'}
                </span>
              </div>
              <div className="bb-impact-row">
                <CalendarDays className="size-4" />
                <span>{resolved ? `Resolved in ${daysOpen} days` : `Open for ${daysOpen} days`}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="bb-rsheet-section">
              <span className="bb-rsheet-k">Timeline</span>
              <ol className="bb-timeline">
                {timeline.map((t, i) => (
                  <li key={t.label} className={`bb-tl-item ${t.done ? 'is-done' : ''}`}>
                    <span className="bb-tl-marker">
                      <span
                        className="bb-tl-dot"
                        style={
                          t.tone
                            ? { background: t.tone, boxShadow: `0 0 0 2px ${t.tone}59` }
                            : undefined
                        }
                      />
                      {i < timeline.length - 1 && <span className="bb-tl-line" />}
                    </span>
                    <span className="bb-tl-label">{t.label}</span>
                    <span className="bb-tl-date">{t.date}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bb-verify">
              <span className="bb-verify-q">Is this still here?</span>
              <div className="bb-verify-btns">
                <button
                  className="bb-verify-btn"
                  onClick={() => onConfirm(report.id, 'stillHere')}
                >
                  <ThumbsUp className="size-4" /> Yes, still here
                </button>
                <button
                  className="bb-verify-btn bb-verify-btn-ok"
                  onClick={() => onConfirm(report.id, 'cleared')}
                >
                  <CheckCircle2 className="size-4" /> Looks clean
                </button>
              </div>

              {votes > 0 && (
                <div className="bb-verify-tally">
                  <span className="bb-verify-tally-k">Community consensus</span>
                  <div className="bb-verify-bar">
                    <span className="bb-verify-seg is-still" style={{ width: `${stillPct}%` }} />
                    <span
                      className="bb-verify-seg is-cleared"
                      style={{ width: `${100 - stillPct}%` }}
                    />
                  </div>
                  <div className="bb-verify-legend">
                    <span>
                      <i className="bb-verify-dot is-still" />
                      <b>{stillPct}%</b> still here
                    </span>
                    <span>
                      <b>{100 - stillPct}%</b> cleared
                      <i className="bb-verify-dot is-cleared" />
                    </span>
                  </div>
                  <span className="bb-verify-basis">Based on {votes} community confirmations</span>
                </div>
              )}
            </div>

            <p className="bb-rsheet-id">Report ID · {formatRef(report.id, report.createdAt)}</p>
            <p className="bb-panel-privacy">🔒 Reported anonymously · identity protected</p>
          </div>
        </div>

        {toast && (
          <div className="bb-panel-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <button
          className="bb-panel-collapse"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse panel"
          title="Collapse"
        >
          <ChevronLeft className="size-4" />
        </button>
      </aside>

      {collapsed && (
        <button
          className="bb-panel-reopen"
          onClick={() => setCollapsed(false)}
          aria-label="Expand panel"
          title="Expand"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <ShareSheet report={shareOpen ? report : null} onClose={() => setShareOpen(false)} />

      {lightbox !== null && (
        <div className="bb-lightbox" onClick={() => setLightbox(null)}>
          <button className="bb-lightbox-close" aria-label="Close">
            <X className="size-5" />
          </button>

          <div className="bb-lightbox-stage" onClick={(e) => e.stopPropagation()}>
            {photos.length > 1 && (
              <button
                className="bb-lightbox-nav"
                onClick={() => stepLightbox(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            <figure
              className="bb-lightbox-figure"
              onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX.current === null || photos.length < 2) return
                const dx = e.changedTouches[0].clientX - touchX.current
                if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1)
                touchX.current = null
              }}
            >
              <img
                className="bb-lightbox-img"
                src={photos[lightbox]}
                alt={`Photo ${lightbox + 1} of ${photos.length}`}
              />
              <figcaption className="bb-lightbox-cap">
                <span className="bb-lightbox-cap-date">
                  {new Date(report.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="bb-lightbox-cap-meta">{area} · Added by a resident</span>
              </figcaption>
            </figure>

            {photos.length > 1 && (
              <button
                className="bb-lightbox-nav"
                onClick={() => stepLightbox(1)}
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {photos.length > 1 && (
            <div className="bb-lightbox-count">
              Photo {lightbox + 1} of {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
