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
  Globe,
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
import { isAuthored, lastVoteKind, recentlyVoted, recordVote } from '../lib/votes'
import Counter from './Counter'
import ShareSheet from './ShareSheet'
import BeforeAfter from './BeforeAfter'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  displayStatus,
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
  onUploadStill: (id: string, dataUrl: string) => void
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
  onUploadStill,
  onClose,
}: Props) {
  const [tracked, setTracked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const touchX = useRef<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const afterFileRef = useRef<HTMLInputElement>(null)
  const stillFileRef = useRef<HTMLInputElement>(null)
  const verifyRef = useRef<HTMLDivElement>(null)
  const [verifyFlash, setVerifyFlash] = useState(false)
  // Confirmation acknowledgement — the little "received / N more needed" beat.
  const [ack, setAck] = useState<null | 'still' | 'cleared'>(null)
  const ackTimer = useRef<number | undefined>(undefined)
  // After a confirmation, invite an optional photo. "Looks clean" asks for a
  // cleanup shot; "Still here" asks for fresh evidence the waste is still there.
  const [photoPromptKind, setPhotoPromptKind] = useState<'after' | 'still' | null>(null)
  // Whether this device has already confirmed this report within the cooldown.
  const [voted, setVoted] = useState(false)
  // Whether this device authored the report — a permanent self-verify block.
  const [owned, setOwned] = useState(false)
  // Which way this device voted, so the locked state can echo it back.
  const [votedKind, setVotedKind] = useState<'stillHere' | 'cleared' | null>(null)

  function handleConfirm(kind: 'stillHere' | 'cleared') {
    if (voted) return
    onConfirm(report.id, kind)
    recordVote(report.id, kind)
    setVoted(true)
    setVotedKind(kind)
    setAck(kind === 'cleared' ? 'cleared' : 'still')
    setPhotoPromptKind(kind === 'cleared' ? 'after' : 'still')
    window.clearTimeout(ackTimer.current)
    ackTimer.current = window.setTimeout(() => setAck(null), 3600)
  }
  useEffect(() => () => window.clearTimeout(ackTimer.current), [])
  // Fresh prompt state whenever a different report is opened.
  useEffect(() => {
    setPhotoPromptKind(null)
    setAck(null)
    const mine = isAuthored(report.id)
    setOwned(mine)
    setVoted(mine || recentlyVoted(report.id))
    setVotedKind(lastVoteKind(report.id))
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

  const area = report.municipality ?? nearestMunicipality(report).place.name
  const dist = userPos ? formatDistance(distanceMeters(userPos, report)) : null
  // Derived, timeline-consistent status for the panel badges.
  const status = displayStatus(report)
  const color = status.color
  // Reads as resolved to the public (community consensus OR an LGU resolution),
  // even when the DB status is still pending.
  const resolvedForDisplay = status.key === 'resolved' || status.key === 'published'
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
  // Only ever compare REAL, approved photos — a moderated public URL, never a
  // pending local data-URL. Otherwise we'd be faking a before/after.
  const isApproved = (u?: string) => Boolean(u && !u.startsWith('data:'))
  const canCompare = isApproved(beforePhoto) && isApproved(afterPhoto)
  const showBeforeAfter = resolved && canCompare
  // A cleanup photo submitted while the report is NOT yet resolved (awaiting
  // confirmation). Once it reads resolved — LGU or community — a celebrate card
  // owns the photo instead, so this only covers the genuinely-pending case.
  const showPendingAfter = Boolean(afterPhoto) && !resolvedForDisplay

  // "Still here" evidence snapshots, oldest first (as stored).
  const updatePhotos = report.updatePhotos ?? []
  // The lightbox gallery: original report photos first, then the update photos.
  // Hero + thumbnails still key off `photos` (originals only); the timeline
  // opens update photos at their offset index.
  const galleryPhotos: { url: string; date: string; meta: string }[] = [
    ...photos.map((url) => ({
      url,
      date: report.createdAt,
      meta: `${area} · Added by a resident`,
    })),
    ...updatePhotos.map((p) => ({
      url: p.url,
      date: p.at,
      meta: `${area} · "Still here" update`,
    })),
  ]

  // Community verification split — powers the consensus tally under the buttons.
  const votes = report.stillHere + report.cleared
  const stillPct = votes ? Math.round((report.stillHere / votes) * 100) : 50
  // Most recent signal on the report — makes the activity block feel alive.
  const lastUpdatedMs = Math.max(
    new Date(report.createdAt).getTime(),
    report.resolvedAt ? new Date(report.resolvedAt).getTime() : 0,
    report.afterUploadedAt ? new Date(report.afterUploadedAt).getTime() : 0,
  )

  // Derived verification: an official touched it, or the crowd backed it. Once
  // the report reads resolved, "Verified" is implied — the Resolved badge +
  // celebrate card carry it, so this trust callout drops away.
  const verification = resolvedForDisplay
    ? null
    : report.status !== 'pending'
      ? { title: 'LGU Verified', sub: 'Reviewed by the local government', tone: '#3b82f6' }
      : report.stillHere >= 3
        ? {
            title: 'Community Verified',
            sub: `${report.stillHere} nearby ${
              report.stillHere === 1 ? 'resident' : 'residents'
            } independently confirmed this report.`,
            tone: '#22c55e',
          }
        : null

  // Four-step lifecycle: Reported → Community Verification → Cleanup Evidence
  // → Resolved. The uploaded cleanup photo is the *evidence* that leads toward
  // resolution, so it sits before "Resolved" — not as a final milestone after.
  const hasCleanupEvidence = Boolean(afterPhoto)
  const timelineStage = resolvedForDisplay ? 3 : hasCleanupEvidence ? 2 : 1
  // Fully documented = actually resolved in the DB AND backed by a cleanup photo.
  const fullyDocumented = resolved && hasCleanupEvidence
  // Anyone can still add cleanup evidence to a report that reads resolved but
  // has no cleanup photo yet — so the "Looks clean" voter who dismissed the
  // one-time prompt (or any neighbor) can come back and contribute it.
  const needsCleanupPhoto = resolvedForDisplay && !hasCleanupEvidence
  const green = STATUS_COLORS.resolved
  const timeline = [
    { label: 'Reported', icon: '📍', date: fmtDate(report.createdAt) },
    {
      label: 'Community Verification',
      icon: '👥',
      date: timelineStage > 1 ? 'Done' : 'In progress',
    },
    {
      label: 'Cleanup Evidence',
      icon: '📷',
      date: report.afterUploadedAt
        ? fmtDate(report.afterUploadedAt)
        : needsCleanupPhoto
          ? 'Your turn'
          : 'Pending',
    },
    {
      label: 'Resolved',
      icon: '✅',
      date: report.resolvedAt
        ? fmtDate(report.resolvedAt)
        : resolvedForDisplay
          ? 'Done'
          : 'Pending',
    },
  ].map((s, i) => ({
    ...s,
    done: i <= timelineStage,
    current: i === timelineStage,
    tone:
      i < timelineStage
        ? green
        : i === timelineStage
          ? resolvedForDisplay
            ? green
            : STATUS_COLORS.in_review
          : null,
  }))

  // Community Activity Timeline — turns a static record into a living story.
  // Built from the report's known timestamps + community signals.
  const activity: {
    icon: ReactNode
    text: ReactNode
    date: string
    /** A maximizable snapshot; index points into the lightbox gallery. */
    thumb?: { url: string; index: number }
  }[] = [
    {
      icon: <MapPin className="size-3.5" />,
      text: <>Report submitted</>,
      date: relativeTime(new Date(report.createdAt).getTime(), now),
    },
  ]
  if (votes > 0)
    activity.push({
      icon: <Users className="size-3.5" />,
      text: (
        <>
          <b>
            <Counter value={votes} />
          </b>{' '}
          {votes === 1 ? 'resident' : 'residents'} confirmed the issue
        </>
      ),
      date: '',
    })
  // "Still here" evidence snapshots — each as its own dated, maximizable entry.
  // The lightbox gallery is [original photos, ...update photos], so an update
  // photo's index is offset by the original photo count.
  updatePhotos.forEach((p, i) =>
    activity.push({
      icon: <Camera className="size-3.5" />,
      text: <>Still-here photo submitted</>,
      date: relativeTime(new Date(p.at).getTime(), now),
      thumb: { url: p.url, index: photos.length + i },
    }),
  )
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
      date: relativeTime(new Date(report.resolvedAt).getTime(), now),
    })
  if (report.afterUploadedAt)
    activity.push({
      icon: <Camera className="size-3.5" />,
      text: <>Cleanup evidence submitted</>,
      date: relativeTime(new Date(report.afterUploadedAt).getTime(), now),
    })

  function handleAfterFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadAfter(report.id, reader.result)
        setPhotoPromptKind(null)
        showToast('Photo added. Thank you for helping verify! 🙌')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleStillFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadStill(report.id, reader.result)
        setPhotoPromptKind(null)
        showToast('Photo added. Thank you for helping verify! 🙌')
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
    setLightbox((i) =>
      i === null ? i : (i + dir + galleryPhotos.length) % galleryPhotos.length,
    )

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
  }, [lightbox, galleryPhotos.length])

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
                <span className="bb-panel-noimg-label">No photo was provided</span>
              </div>
            )}

            <button className="bb-panel-close" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </button>

            <div className="bb-panel-photo-scrim" />
            <div className="bb-photo-overlay">
              <span className="bb-photo-place">
                <span className="bb-photo-place-head">
                  <MapPin className="size-3.5 bb-photo-place-icon" />
                  <span className="bb-photo-place-name">{area}</span>
                </span>
                {/* Distance belongs with the place (geography); the report time
                    lives in the Status card + Activity feed. */}
                <span className="bb-photo-dist">
                  {dist ?? `Reported ${relativeTime(new Date(report.createdAt).getTime(), now)}`}
                </span>
              </span>
              <div className="bb-photo-badges">
                <span className="bb-photo-status" style={{ background: `${color}e6` }}>
                  {status.label}
                </span>
                {hasPhoto && (
                  <span className="bb-photo-reported">
                    <Camera className="size-3.5" />
                    {`${photos.length} ${photos.length === 1 ? 'Photo' : 'Photos'}`}
                  </span>
                )}
              </div>
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
              <div className="bb-celebrate" style={{ order: 1 }}>
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
                {showBeforeAfter ? (
                  <div className="bb-celebrate-ba">
                    <span className="bb-rsheet-k">Before → After</span>
                    <BeforeAfter before={beforePhoto} after={afterPhoto!} />
                  </div>
                ) : (
                  afterPhoto && (
                    <div className="bb-celebrate-ba">
                      <span className="bb-rsheet-k">Cleanup evidence</span>
                      <img className="bb-after-pending-img" src={afterPhoto} alt="Cleanup evidence" />
                    </div>
                  )
                )}
                <p className="bb-celebrate-thanks">
                  Salamat sa pagtulong na panatilihing malinis ang ating komunidad. 💚
                </p>
              </div>
            )}

            {/* Community-resolved (crowd consensus, not an LGU action yet) —
                celebrate the residents' effort. */}
            {resolvedForDisplay && !resolved && (
              <div className="bb-celebrate" style={{ order: 1 }}>
                <div className="bb-celebrate-badge">🎉 Community Resolved</div>
                <p className="bb-celebrate-by">
                  {report.cleared > 0
                    ? `${report.cleared} nearby ${report.cleared === 1 ? 'resident' : 'residents'} confirmed this location is now clean.`
                    : 'Nearby residents confirmed this location is now clean.'}
                  {afterPhoto ? ' A community member also shared a cleanup photo.' : ''}
                </p>
                {afterPhoto &&
                  (canCompare ? (
                    <div className="bb-celebrate-ba">
                      <span className="bb-rsheet-k">Before → After</span>
                      <BeforeAfter before={beforePhoto} after={afterPhoto} />
                    </div>
                  ) : (
                    <div className="bb-celebrate-ba">
                      <span className="bb-rsheet-k">Cleanup evidence</span>
                      <img className="bb-after-pending-img" src={afterPhoto} alt="Cleanup evidence" />
                    </div>
                  ))}
                <p className="bb-celebrate-thanks">
                  Thank you to everyone who helped verify it. 💚
                </p>
              </div>
            )}

            {showPendingAfter && (
              <div className="bb-after-pending" style={{ order: 1 }}>
                <span className="bb-rsheet-k">Cleanup Evidence Submitted</span>
                {canCompare ? (
                  <BeforeAfter before={beforePhoto} after={afterPhoto!} />
                ) : (
                  <img className="bb-after-pending-img" src={afterPhoto!} alt="Cleanup evidence" />
                )}
                <p className="bb-after-pending-note">
                  A community member submitted a cleanup photo. It&rsquo;s awaiting
                  confirmation from the community before this report is marked as
                  resolved.
                </p>
              </div>
            )}

            <div className="bb-panel-head" style={{ order: 2 }}>
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
                style={{ order: 4, borderColor: `${verification.tone}40`, background: `${verification.tone}14` }}
              >
                <ShieldCheck className="size-5" style={{ color: verification.tone }} />
                <div className="bb-verif2-text">
                  <b style={{ color: verification.tone }}>{verification.title}</b>
                  <span>{verification.sub}</span>
                </div>
              </div>
            )}

            <div className="bb-rsheet-meta" style={{ order: 5 }}>
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
                  {status.label}
                </span>
              </div>
            </div>

            {report.note && (
              <div className="bb-rsheet-section" style={{ order: 3 }}>
                <span className="bb-rsheet-k">Description</span>
                <p className="bb-rsheet-desc">{report.note}</p>
              </div>
            )}

            {/* Community Impact — the collaborative framing */}
            <div className="bb-impact" style={{ order: 7 }}>
              <span className="bb-rsheet-k">Community Activity</span>
              <div className="bb-impact-row">
                <Users className="size-4" />
                <span>
                  <b><Counter value={votes} /></b> community{' '}
                  {votes === 1 ? 'confirmation' : 'confirmations'}
                </span>
              </div>
              <div className="bb-impact-row">
                <Globe className="size-4" />
                <span>Publicly visible</span>
              </div>
              <div className="bb-impact-row">
                <Clock className="size-4" />
                <span>Last updated {relativeTime(lastUpdatedMs, now)}</span>
              </div>
              <div className="bb-impact-row">
                <CalendarDays className="size-4" />
                <span>
                  {resolved
                    ? `Resolved in ${daysOpen} ${daysOpen === 1 ? 'day' : 'days'}`
                    : daysOpen === 0
                      ? 'Reported today'
                      : daysOpen === 1
                        ? 'Reported yesterday'
                        : `Reported ${daysOpen} days ago`}
                </span>
              </div>
            </div>

            {/* Cleanup progress — every report is a mini "Complete a Cleanup" */}
            <div className="bb-rsheet-section" style={{ order: 8 }}>
              <span className="bb-rsheet-krow">
                <span className="bb-rsheet-k">Cleanup progress</span>
                <span className={`bb-cl-badge ${resolvedForDisplay ? 'is-earned' : ''}`}>
                  <Award className="size-3.5" />{' '}
                  {fullyDocumented ? 'Documented' : resolvedForDisplay ? 'Resolved' : 'In progress'}
                </span>
              </span>
              <ol className="bb-timeline">
                {timeline.map((t, i) => (
                  <li
                    key={t.label}
                    className={`bb-tl-item ${t.done ? 'is-done' : ''} ${t.current ? 'is-current' : ''}`}
                  >
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

              {needsCleanupPhoto && (
                <div className="bb-after-cta">
                  <div className="bb-after-cta-head">
                    <Sparkles className="size-4" /> Add cleanup evidence
                  </div>
                  <p className="bb-after-cta-body">
                    This spot reads as cleaned. Help complete the story: add a cleanup photo
                    so the whole community can see it through. It&rsquo;s reviewed before it
                    appears publicly.
                  </p>
                  <button
                    className="bb-after-upload"
                    onClick={() => afterFileRef.current?.click()}
                  >
                    <Upload className="size-4" /> Upload cleanup photo
                  </button>
                </div>
              )}

              {fullyDocumented && (
                <div className="bb-after-done">
                  <Award className="size-4" /> Cleanup fully documented by the community. Thank you!
                </div>
              )}
            </div>

            <div
              ref={verifyRef}
              className={`bb-verify ${verifyFlash ? 'bb-verify-flash' : ''}`}
              style={{ order: 6 }}
            >
              {!resolvedForDisplay && (
                <>
                  <span className="bb-verify-q">Is this still here?</span>
                  {voted ? (
                    <div className="bb-verify-locked" role="status">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {owned ? (
                    <span>
                      You reported this, so you count as the first resident confirming it.
                      Others can now verify it.
                    </span>
                  ) : (
                    <span>
                      {votedKind
                        ? `You voted “${votedKind === 'cleared' ? 'Looks clean' : 'Still here'}”.`
                        : 'You’ve weighed in on this report.'}
                      <small className="bb-ack-sub">You can vote again tomorrow.</small>
                    </span>
                  )}
                </div>
              ) : (
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
              )}

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
                          <b>Community consensus reached.</b> The community agrees this spot is clean 🎉
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
                        Your confirmation has been recorded.
                        <small className="bb-ack-sub">
                          You can update your confirmation again tomorrow.
                        </small>
                      </span>
                    </>
                  )}
                </div>
              )}

              {photoPromptKind && (
                <div className="bb-photo-prompt">
                  <div className="bb-photo-prompt-head">
                    <Camera className="size-4 shrink-0" />{' '}
                    {photoPromptKind === 'after'
                      ? 'Add a cleanup photo'
                      : 'Help others verify this report'}
                  </div>
                  <p className="bb-photo-prompt-body">
                    {photoPromptKind === 'after'
                      ? 'Upload a recent photo showing the area has been cleaned. Your photo will be reviewed before it becomes public.'
                      : 'Upload a recent photo showing that the waste is still here. Your photo will be reviewed before it becomes public.'}
                  </p>
                  <div className="bb-photo-prompt-actions">
                    <button
                      className="bb-photo-prompt-upload"
                      onClick={() =>
                        (photoPromptKind === 'after' ? afterFileRef : stillFileRef).current?.click()
                      }
                    >
                      <Upload className="size-4" /> Add photo
                    </button>
                    <button
                      className="bb-photo-prompt-skip"
                      onClick={() => setPhotoPromptKind(null)}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}
                </>
              )}

              {votes > 0 && (
                <div className="bb-verify-tally">
                  <span className="bb-verify-tally-k">Community Check</span>
                  <div className="bb-votes">
                    <div className="bb-vote-row is-clean">
                      <ThumbsUp className="size-[18px] shrink-0" />
                      <span>
                        <b><Counter value={report.cleared} /></b> say it&rsquo;s clean
                      </span>
                    </div>
                    <div className="bb-vote-row is-still">
                      <ThumbsDown className="size-[18px] shrink-0" />
                      <span>
                        <b><Counter value={report.stillHere} /></b> say it&rsquo;s still here
                      </span>
                    </div>
                  </div>

                  <div className="bb-consensus">
                    <span className="bb-verify-tally-k">Community Consensus</span>
                    <div className="bb-consensus-verdict">
                      <b>{100 - stillPct}%</b> of residents say it&rsquo;s clean
                    </div>
                    <div className="bb-verify-bar">
                      <span className="bb-verify-seg is-still" style={{ width: `${stillPct}%` }} />
                      <span
                        className="bb-verify-seg is-cleared"
                        style={{ width: `${100 - stillPct}%` }}
                      />
                    </div>
                    <span className="bb-verify-basis">
                      Based on {votes} community {votes === 1 ? 'confirmation' : 'confirmations'}
                    </span>
                  </div>
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
            {/* Hidden picker for a "still here" evidence snapshot. */}
            <input
              ref={stillFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleStillFile}
            />

            {/* Community Activity — the report as a living story */}
            <div className="bb-rsheet-section" style={{ order: 9 }}>
              <span className="bb-rsheet-k">Activity</span>
              <ol className="bb-activity">
                {activity.map((a, i) => (
                  <li key={i} className="bb-activity-item">
                    <span className="bb-activity-marker">
                      <span className="bb-activity-dot">{a.icon}</span>
                      {i < activity.length - 1 && <span className="bb-activity-line" />}
                    </span>
                    <span className="bb-activity-body">
                      {a.date && <span className="bb-activity-time">{a.date}</span>}
                      <span className="bb-activity-text">{a.text}</span>
                      {a.thumb && (
                        <button
                          type="button"
                          className="bb-activity-thumb"
                          onClick={() => setLightbox(a.thumb!.index)}
                          aria-label="View photo"
                        >
                          <img src={a.thumb.url} alt="Still here evidence" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bb-panel-footer" style={{ order: 10 }}>
              <p className="bb-rsheet-id">
                Reference ID · {formatRef(report.id, report.createdAt)}
              </p>
              <p className="bb-panel-privacy">
                🔒 Reported anonymously · identity protected
              </p>
            </div>
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
            {galleryPhotos.length > 1 && (
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
                if (touchX.current === null || galleryPhotos.length < 2) return
                const dx = e.changedTouches[0].clientX - touchX.current
                if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1)
                touchX.current = null
              }}
            >
              <img
                className="bb-lightbox-img"
                src={galleryPhotos[lightbox]?.url}
                alt={`Photo ${lightbox + 1} of ${galleryPhotos.length}`}
              />
              <figcaption className="bb-lightbox-cap">
                <span className="bb-lightbox-cap-date">
                  {new Date(galleryPhotos[lightbox]?.date ?? report.createdAt).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </span>
                <span className="bb-lightbox-cap-meta">
                  {galleryPhotos[lightbox]?.meta ?? `${area} · Added by a resident`}
                </span>
              </figcaption>
            </figure>

            {galleryPhotos.length > 1 && (
              <button
                className="bb-lightbox-nav"
                onClick={() => stepLightbox(1)}
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {galleryPhotos.length > 1 && (
            <div className="bb-lightbox-count">
              Photo {lightbox + 1} of {galleryPhotos.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
