import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Bell,
  BellRing,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Clock,
  Gauge,
  ShieldCheck,
  Camera,
  Users,
  MapPin,
  MapPinned,
  CalendarDays,
  QrCode,
  Upload,
  Award,
  Sparkles,
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
  cleanupStage,
  awaitingAfterPhoto,
  communityConfirmed,
  confirmationsNeeded,
  type Report,
} from '../types'
import type { UserLocation } from '../hooks/useUserLocation'

interface Props {
  report: Report
  now: number
  userPos: UserLocation | null
  onConfirm: (id: string, kind: 'stillHere' | 'cleared') => void
  onUploadAfter: (id: string, dataUrl: string) => void
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

export default function ReportPanel({
  report,
  now,
  userPos,
  onConfirm,
  onUploadAfter,
  onClose,
}: Props) {
  const [tracked, setTracked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const touchX = useRef<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const afterFileRef = useRef<HTMLInputElement>(null)
  const verifyRef = useRef<HTMLDivElement>(null)
  const [verifyFlash, setVerifyFlash] = useState(false)
  // Confirmation acknowledgement — the little "received / N more needed" beat.
  const [ack, setAck] = useState<null | 'still' | 'cleared'>(null)
  const ackTimer = useRef<number | undefined>(undefined)
  // After "Looks clean", invite an optional photo — one upload feeds the
  // cleanup evidence, transparency, and the monthly challenge.
  const [photoPrompt, setPhotoPrompt] = useState(false)

  function handleConfirm(kind: 'stillHere' | 'cleared') {
    onConfirm(report.id, kind)
    setAck(kind === 'cleared' ? 'cleared' : 'still')
    if (kind === 'cleared') setPhotoPrompt(true)
    window.clearTimeout(ackTimer.current)
    ackTimer.current = window.setTimeout(() => setAck(null), 3600)
  }
  useEffect(() => () => window.clearTimeout(ackTimer.current), [])
  // Fresh prompt state whenever a different report is opened.
  useEffect(() => {
    setPhotoPrompt(false)
    setAck(null)
  }, [report.id])

  // The floating "Verify this report" CTA (shown while a report is open) asks
  // us to reveal + spotlight the verify controls.
  useEffect(() => {
    const focus = () => {
      requestAnimationFrame(() => {
        verifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setVerifyFlash(true)
        window.setTimeout(() => setVerifyFlash(false), 1400)
      })
    }
    window.addEventListener('bb-focus-verify', focus)
    return () => window.removeEventListener('bb-focus-verify', focus)
  }, [])

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
  // Before/after: original photos vs. the "after" photo. The uploaded
  // afterImageUrl is canonical; fall back to legacy resolvedPhotoUrls.
  const beforePhoto = photos[0]
  const afterPhoto = report.afterImageUrl ?? report.resolvedPhotoUrls?.[0]
  const showBeforeAfter = resolved && Boolean(beforePhoto && afterPhoto)
  const awaitingAfter = awaitingAfterPhoto(report)

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
            title: 'Verified by nearby residents',
            sub: `Confirmed by ${report.stillHere} residents`,
            tone: '#22c55e',
          }
        : null

  // Four-step cleanup journey (report → review → clean → document). The active
  // stage is derived; steps at or before it read as done.
  const inReviewDone = report.status !== 'pending'
  const stage = cleanupStage(report)
  const stageIndex = { reported: 0, in_review: 1, cleaned: 2, documented: 3 }[stage]
  const green = STATUS_COLORS.resolved
  const timeline = [
    { label: 'Reported', icon: '📍', date: fmtDate(report.createdAt) },
    { label: 'Verified', icon: '👥', date: inReviewDone ? (resolved ? 'Done' : 'In progress') : '—' },
    { label: 'Cleaned', icon: '🧹', date: report.resolvedAt ? fmtDate(report.resolvedAt) : '—' },
    {
      label: 'Evidence Published',
      icon: '📸',
      date: report.afterUploadedAt
        ? fmtDate(report.afterUploadedAt)
        : awaitingAfter
          ? 'Your turn'
          : '—',
    },
  ].map((s, i) => ({
    ...s,
    done: i <= stageIndex,
    tone: i < stageIndex ? green : i === stageIndex ? (resolved ? green : STATUS_COLORS.in_review) : null,
  }))

  // Community Activity Timeline — turns a static record into a living story.
  // Built from the report's known timestamps + community signals.
  const activity: { icon: ReactNode; text: ReactNode; date: string }[] = [
    {
      icon: <MapPin className="size-3.5" />,
      text: <>Reported by a <b>resident</b></>,
      date: fmtDate(report.createdAt),
    },
  ]
  if (report.stillHere > 0)
    activity.push({
      icon: <Users className="size-3.5" />,
      text: (
        <>
          <b>{report.stillHere}</b> {report.stillHere === 1 ? 'resident' : 'residents'} confirmed
        </>
      ),
      date: '',
    })
  if (report.status !== 'pending')
    activity.push({
      icon: <ShieldCheck className="size-3.5" />,
      text: <>Barangay {resolved ? 'reviewed the report' : 'is reviewing the report'}</>,
      date: '',
    })
  if (report.resolvedAt)
    activity.push({
      icon: <CheckCircle2 className="size-3.5" />,
      text: <>Cleanup completed by <b>{area} LGU</b></>,
      date: fmtDate(report.resolvedAt),
    })
  if (report.afterUploadedAt)
    activity.push({
      icon: <Camera className="size-3.5" />,
      text: <>After photo uploaded</>,
      date: fmtDate(report.afterUploadedAt),
    })

  function handleAfterFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadAfter(report.id, reader.result)
        setPhotoPrompt(false)
        showToast('Photo added — thank you for helping verify! 🙌')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

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
      <aside className="bb-panel">
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
                <MapPin className="bb-panel-noimg-icon" strokeWidth={1.5} />
                <span className="bb-panel-noimg-title">Community report</span>
                <span className="bb-panel-noimg-label">No photo submitted</span>
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
                  {STATUS_LABELS[report.status]}
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

            {/* Cleanup progress — every report is a mini "Complete a Cleanup" */}
            <div className="bb-rsheet-section">
              <span className="bb-rsheet-krow">
                <span className="bb-rsheet-k">Cleanup progress</span>
                <span className={`bb-cl-badge ${stage === 'documented' ? 'is-earned' : ''}`}>
                  <Award className="size-3.5" /> {stage === 'documented' ? 'Badge earned' : 'Earn your badge'}
                </span>
              </span>
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
                    <span className="bb-tl-label">
                      <span className="bb-tl-emoji" aria-hidden>{t.icon}</span>
                      {t.label}
                    </span>
                    <span className="bb-tl-date">{t.date}</span>
                  </li>
                ))}
              </ol>

              {awaitingAfter && (
                <div className="bb-after-cta">
                  <div className="bb-after-cta-head">
                    <Sparkles className="size-4" /> Awaiting after photo
                  </div>
                  <p className="bb-after-cta-body">
                    This spot has been cleaned. Help complete the story — add an “after” photo
                    and earn your badge.
                  </p>
                  <button
                    className="bb-after-upload"
                    onClick={() => afterFileRef.current?.click()}
                  >
                    <Upload className="size-4" /> Upload after photo
                  </button>
                </div>
              )}

              {stage === 'documented' && (
                <div className="bb-after-done">
                  <Award className="size-4" /> Cleanup fully documented — badge unlocked. Thank you!
                </div>
              )}
            </div>

            <div ref={verifyRef} className={`bb-verify ${verifyFlash ? 'bb-verify-flash' : ''}`}>
              <span className="bb-verify-q">Is this still here?</span>
              <div className="bb-verify-btns">
                <button
                  className="bb-verify-btn"
                  onClick={() => handleConfirm('stillHere')}
                >
                  <ThumbsUp className="size-4" /> Still here
                </button>
                <button
                  className="bb-verify-btn bb-verify-btn-ok"
                  onClick={() => handleConfirm('cleared')}
                >
                  <CheckCircle2 className="size-4" /> Looks clean
                </button>
              </div>

              {ack && (
                <div
                  className={`bb-ack ${ack === 'cleared' ? 'is-clean' : 'is-still'}`}
                  role="status"
                  aria-live="polite"
                >
                  {ack === 'cleared' ? (
                    communityConfirmed(report) ? (
                      <>
                        <Sparkles className="size-4 shrink-0" />
                        <span>
                          <b>Community consensus reached</b> — this spot is verified clean 🎉
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>
                          Confirmation received ·{' '}
                          <b>
                            {confirmationsNeeded(report)} more{' '}
                            {confirmationsNeeded(report) === 1 ? 'confirmation' : 'confirmations'}
                          </b>{' '}
                          needed
                        </span>
                      </>
                    )
                  ) : (
                    <>
                      <ThumbsUp className="size-4 shrink-0" />
                      <span>
                        Thanks — you marked this <b>still here</b>
                      </span>
                    </>
                  )}
                </div>
              )}

              {photoPrompt && (
                <div className="bb-photo-prompt">
                  <div className="bb-photo-prompt-head">
                    <Camera className="size-4 shrink-0" /> Can you add a photo?
                  </div>
                  <p className="bb-photo-prompt-body">
                    Optional — a quick snap helps everyone verify the cleanup.
                  </p>
                  <div className="bb-photo-prompt-actions">
                    <button
                      className="bb-photo-prompt-upload"
                      onClick={() => afterFileRef.current?.click()}
                    >
                      <Upload className="size-4" /> Add photo
                    </button>
                    <button
                      className="bb-photo-prompt-skip"
                      onClick={() => setPhotoPrompt(false)}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}

              {votes > 0 && (
                <div className="bb-verify-tally">
                  <div className="bb-votes">
                    <div className="bb-vote-row is-clean">
                      <ThumbsUp className="size-[18px] shrink-0" />
                      <span>
                        <b>{report.cleared}</b>{' '}
                        {report.cleared === 1 ? 'resident says' : 'residents say'}{' '}
                        <em>&ldquo;It&rsquo;s clean&rdquo;</em>
                      </span>
                    </div>
                    <div className="bb-vote-row is-still">
                      <ThumbsDown className="size-[18px] shrink-0" />
                      <span>
                        <b>{report.stillHere}</b>{' '}
                        {report.stillHere === 1 ? 'resident says' : 'residents say'}{' '}
                        <em>&ldquo;It&rsquo;s still here&rdquo;</em>
                      </span>
                    </div>
                  </div>

                  <div className="bb-consensus">
                    <span className="bb-verify-tally-k">Community consensus</span>
                    <div className="bb-consensus-verdict">
                      <b>{100 - stillPct}%</b> Cleaned
                    </div>
                    <div className="bb-verify-bar">
                      <span className="bb-verify-seg is-still" style={{ width: `${stillPct}%` }} />
                      <span
                        className="bb-verify-seg is-cleared"
                        style={{ width: `${100 - stillPct}%` }}
                      />
                    </div>
                  </div>

                  <span className="bb-verify-basis">Based on {votes} community confirmations</span>
                </div>
              )}
            </div>

            {/* Shared hidden picker for after/verification photos (awaiting-after
                CTA + the "Looks clean" prompt both trigger it). */}
            <input
              ref={afterFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAfterFile}
            />

            {/* Community Activity — the report as a living story */}
            <div className="bb-rsheet-section">
              <span className="bb-rsheet-k">Activity</span>
              <ol className="bb-activity">
                {activity.map((a, i) => (
                  <li key={i} className="bb-activity-item">
                    <span className="bb-activity-marker">
                      <span className="bb-activity-dot">{a.icon}</span>
                      {i < activity.length - 1 && <span className="bb-activity-line" />}
                    </span>
                    <span className="bb-activity-text">{a.text}</span>
                    {a.date && <span className="bb-activity-date">{a.date}</span>}
                  </li>
                ))}
              </ol>
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
      </aside>

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
