import { useEffect, useState } from 'react'
import {
  X,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Users,
  Check,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Camera,
  Sprout,
  Zap,
} from 'lucide-react'
import { Card } from './primitives'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { relativeTime, type RecentCleanup as Cleanup } from '../../lib/stats'
import { CATEGORY_LABELS } from '../../types'
import { CATEGORY_ICON } from '../../lib/categoryIcons'
import CountUp from '../CountUp'
import MapThumb from './MapThumb'

interface Props {
  cleanups: Cleanup[]
  now: number
  onReport?: () => void
  onOpenReport?: (id: string) => void
}

const PREVIEW_COUNT = 3
const DAY_MS = 86_400_000

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Human turnaround from report → cleanup, e.g. "6 hours" or "0.8 days". */
function turnaround(reportedAt: number | undefined, when: number): string | null {
  if (reportedAt == null) return null
  const ms = Math.max(0, when - reportedAt)
  const hours = ms / 3_600_000
  if (hours < 1) return 'under an hour'
  if (hours < 36) {
    const h = Math.round(hours)
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  const days = ms / DAY_MS
  return `${days.toFixed(1)} days`
}

/** A tappable cleanup row — story thumbnail, place, category, and the one
 *  most interesting metric for this cleanup so no two rows read alike. */
function CleanupRow({
  c,
  now,
  onOpen,
}: {
  c: Cleanup
  now: number
  onOpen: () => void
}) {
  const before = c.beforePhotos?.[0]
  const after = c.afterPhotos?.[0]
  const hasStory = Boolean(before && after)
  const confirms = c.confirmations ?? 0
  const turn = turnaround(c.reportedAt, c.when)
  const Icon = CATEGORY_ICON[c.category]

  // Pick the standout fact: turnaround first, else crowd confirmations,
  // else a plain completion note — each cleanup gets a little personality.
  const metric = turn
    ? `Resolved in ${turn}`
    : confirms > 0
      ? `${confirms} resident${confirms === 1 ? '' : 's'} confirmed cleanup`
      : 'Community cleanup completed'

  return (
    <li>
      <button className="bb-cleanup-row" onClick={onOpen}>
        <span className="bb-dash-event-thumb bb-cleanup-thumb">
          {hasStory ? (
            // A before → after story, even at thumbnail size.
            <span className="bb-cleanup-thumb-ba">
              <img src={before} alt="" loading="lazy" />
              <img src={after} alt="" loading="lazy" />
            </span>
          ) : c.photo ? (
            <img src={c.photo} alt="" loading="lazy" />
          ) : (
            // No photo — show a mini map of the actual spot instead of an icon.
            <MapThumb lat={c.lat} lng={c.lng} size={40} />
          )}
        </span>
        <span className="bb-cleanup-row-main">
          <span className="bb-dash-event-name">{c.lgu}</span>
          <span className="bb-cleanup-row-cat">
            <Icon className="size-3.5" aria-hidden />
            {CATEGORY_LABELS[c.category]}
          </span>
          <span className="bb-cleanup-row-sub">
            <Check className="bb-cleanup-check" size={14} aria-hidden /> {metric}
          </span>
        </span>
        <span className="bb-dash-event-when">Completed {relativeTime(c.when, now)}</span>
        <span className="bb-cleanup-row-cta">
          {hasStory ? 'See story' : 'View cleanup'} <ArrowRight size={13} />
        </span>
      </button>
    </li>
  )
}

/** Time-since in words: "11 hours ago", "3 days ago". */
function longAgo(ms: number, now: number): string {
  const s = relativeTime(ms, now)
  return s
    .replace(/^(\d+)m ago$/, (_, n) => `${n} minute${n === '1' ? '' : 's'} ago`)
    .replace(/^(\d+)h ago$/, (_, n) => `${n} hour${n === '1' ? '' : 's'} ago`)
    .replace(/^(\d+)d ago$/, (_, n) => `${n} day${n === '1' ? '' : 's'} ago`)
    .replace(/^(\d+)mo ago$/, (_, n) => `${n} month${n === '1' ? '' : 's'} ago`)
}

/**
 * A cleanup rendered as a celebratory success story: hero + status pills,
 * a before → after reveal, the four-step community journey, an impact
 * breakdown, and a thank-you. Numbers count up and the journey draws in on
 * open. A resolved cleanup has, by definition, completed every step.
 */
function CleanupDetail({
  c,
  now,
  onReport,
  onOpenReport,
}: {
  c: Cleanup
  now: number
  onReport?: () => void
  onOpenReport?: (id: string) => void
}) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  const Icon = CATEGORY_ICON[c.category]
  const before = c.beforePhotos?.[0]
  const after = c.afterPhotos?.[0]
  const afterCount = c.afterPhotos?.length ?? (c.photo ? 1 : 0)
  const confirms = c.confirmations ?? 0
  const turn = turnaround(c.reportedAt, c.when)
  const sameDay =
    c.reportedAt != null &&
    new Date(c.reportedAt).toDateString() === new Date(c.when).toDateString()
  const speed = sameDay ? 'Same-day resolution' : turn ? `In ${turn}` : 'Resolved'

  const steps = [
    { Icon: FileText, label: 'Report submitted', meta: c.reportedAt ? fmtDate(c.reportedAt) : 'By a resident' },
    { Icon: ShieldCheck, label: 'Community verified', meta: confirms > 0 ? `${confirms} confirmed` : 'Confirmed' },
    { Icon: Camera, label: 'Cleanup photo shared', meta: afterCount > 0 ? 'Documented' : 'On record' },
    { Icon: Sprout, label: 'Area confirmed clean', meta: fmtDate(c.when) },
  ]

  return (
    <div className={`bb-story ${entered ? 'is-in' : ''}`}>
      <div className="bb-story-hero">
        <CheckCircle2 className="bb-story-check" aria-hidden />
        <h3 className="bb-story-title">Community Cleanup Completed</h3>
        <p className="bb-story-when">Resolved {longAgo(c.when, now)}</p>
      </div>

      <div className="bb-story-pills">
        <span className="bb-story-pill bb-story-pill--done">
          <span className="bb-story-pill-dot" /> Completed
        </span>
        <span className="bb-story-pill bb-story-pill--cat">
          <Icon className="size-3.5" aria-hidden /> {CATEGORY_LABELS[c.category]}
        </span>
        {confirms > 0 && (
          <span className="bb-story-pill bb-story-pill--verified">
            <Users size={13} aria-hidden /> Community Verified
          </span>
        )}
      </div>

      {(before || after) && (
        <>
          <hr className="bb-story-rule" />
          <div className="bb-cleanup-photos">
            {before && (
              <figure>
                <img src={before} alt="Before cleanup" loading="lazy" />
                <figcaption><Camera size={12} aria-hidden /> Before</figcaption>
              </figure>
            )}
            {after && (
              <figure>
                <img src={after} alt="After cleanup" loading="lazy" />
                <figcaption><Camera size={12} aria-hidden /> After</figcaption>
              </figure>
            )}
          </div>
        </>
      )}

      {c.note && <p className="bb-cleanup-note">{c.note}</p>}

      <hr className="bb-story-rule" />
      <ol className="bb-story-journey">
        {steps.map((s, i) => (
          <li className="bb-story-step" key={s.label} style={{ '--i': i } as React.CSSProperties}>
            <span className="bb-story-step-node" aria-hidden><s.Icon size={16} /></span>
            <span className="bb-story-step-main">
              <span className="bb-story-step-label">{s.label}</span>
              <span className="bb-story-step-meta">{s.meta}</span>
            </span>
          </li>
        ))}
      </ol>

      <hr className="bb-story-rule" />
      <p className="bb-story-impact-h">
        <Users size={16} aria-hidden /> Community Impact
      </p>
      <div className="bb-story-stats">
        <div className="bb-story-stat">
          <div className="bb-story-stat-ico" aria-hidden><Users size={20} /></div>
          <div className="bb-story-stat-num">
            <CountUp value={confirms} active={entered} />
          </div>
          <div className="bb-story-stat-lab">resident{confirms === 1 ? '' : 's'} confirmed</div>
        </div>
        <div className="bb-story-stat">
          <div className="bb-story-stat-ico" aria-hidden><Camera size={20} /></div>
          <div className="bb-story-stat-num">
            <CountUp value={afterCount} active={entered} />
          </div>
          <div className="bb-story-stat-lab">cleanup photo{afterCount === 1 ? '' : 's'} shared</div>
        </div>
        <div className="bb-story-stat">
          <div className="bb-story-stat-ico" aria-hidden><Zap size={20} /></div>
          <div className="bb-story-stat-num bb-story-stat-num--sm">{speed}</div>
          <div className="bb-story-stat-lab">resolution speed</div>
        </div>
      </div>

      <div className="bb-story-thanks">
        <div className="bb-story-thanks-emoji" aria-hidden><Sprout size={26} /></div>
        <p className="bb-story-thanks-text">
          Thank you to everyone who helped make this cleanup possible. It happened because
          residents reported, verified, and confirmed the area together.
        </p>
      </div>

      <div className="bb-story-cta">
        {onOpenReport && (
          <button
            className="bb-story-cta-btn bb-story-cta-btn--primary"
            onClick={() => onOpenReport(c.id)}
          >
            <MapPin size={15} aria-hidden /> See report on map
          </button>
        )}
        {onReport && (
          <button className="bb-story-cta-btn bb-story-cta-btn--ghost" onClick={onReport}>
            Report another issue <ArrowRight size={15} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

/** The latest resolved reports — a preview feed that opens into a full modal. */
export default function RecentCleanup({ cleanups, now, onReport, onOpenReport }: Props) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Cleanup | null>(null)

  const hasMore = cleanups.length > PREVIEW_COUNT
  const preview = cleanups.slice(0, PREVIEW_COUNT)

  const openDetail = (c: Cleanup) => {
    setDetail(c)
    setOpen(true)
  }

  return (
    <Card title="Recent Cleanups" hint="Latest resolved reports">
      {cleanups.length ? (
        <>
          <ul className="bb-dash-events">
            {preview.map((c) => (
              <CleanupRow key={c.id} c={c} now={now} onOpen={() => openDetail(c)} />
            ))}
          </ul>

          {hasMore && (
            <button
              className="bb-hotspots-more"
              onClick={() => {
                setDetail(null)
                setOpen(true)
              }}
            >
              Browse all cleanup stories
              <ArrowRight size={16} className="bb-hotspots-more-chev" aria-hidden />
            </button>
          )}
        </>
      ) : (
        <div className="bb-cleanup-empty">
          <Sprout className="bb-cleanup-sprout" size={30} aria-hidden />
          <p className="bb-cleanup-empty-line">The first community cleanup will appear here.</p>
          <p className="bb-cleanup-empty-sub">Every success story starts with one report.</p>
          {onReport && (
            <button className="bb-cleanup-empty-cta" onClick={onReport}>
              Report Waste <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setDetail(null)
        }}
      >
        <DialogContent className="max-w-[560px] w-[calc(100%-2.5rem)] gap-0 overflow-hidden border-[#eceae5] bg-white p-0 text-[#14110f]">
          <div className="bb-hotspots-modal-head">
            <div className="bb-cleanup-head-main">
              {detail && (
                <button
                  className="bb-cleanup-back"
                  onClick={() => setDetail(null)}
                  aria-label="Back to all cleanups"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <DialogTitle className="text-[#14110f]">
                  {detail ? detail.lgu : 'Recent Cleanups'}
                </DialogTitle>
                <DialogDescription className="text-[#55504a]">
                  {detail
                    ? CATEGORY_LABELS[detail.category]
                    : `${cleanups.length} resolved reports, most recent first.`}
                </DialogDescription>
              </div>
            </div>
            <button
              className="bb-hotspots-modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bb-hotspots-modal-body">
            {detail ? (
              <CleanupDetail
                c={detail}
                now={now}
                onReport={onReport}
                onOpenReport={onOpenReport}
              />
            ) : (
              <ul className="bb-dash-events bb-dash-events--modal">
                {cleanups.map((c) => (
                  <CleanupRow key={c.id} c={c} now={now} onOpen={() => setDetail(c)} />
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
