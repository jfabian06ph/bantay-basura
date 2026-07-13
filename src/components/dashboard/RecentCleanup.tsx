import { useState } from 'react'
import { X, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, Empty } from './primitives'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { relativeTime, type RecentCleanup as Cleanup } from '../../lib/stats'
import { CATEGORY_LABELS } from '../../types'
import { CATEGORY_ICON } from '../../lib/categoryIcons'
import MapThumb from './MapThumb'

interface Props {
  cleanups: Cleanup[]
  now: number
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

/** A tappable cleanup row — thumbnail, place, and when it was resolved. */
function CleanupRow({
  c,
  now,
  onOpen,
}: {
  c: Cleanup
  now: number
  onOpen: () => void
}) {
  const resolveDays =
    c.reportedAt != null ? Math.max(0, (c.when - c.reportedAt) / DAY_MS) : null
  return (
    <li>
      <button className="bb-cleanup-row" onClick={onOpen}>
        <span className="bb-dash-event-thumb">
          {c.photo ? (
            <img src={c.photo} alt="" loading="lazy" />
          ) : (
            // No photo — show a mini map of the actual spot instead of an icon.
            <MapThumb lat={c.lat} lng={c.lng} size={40} />
          )}
        </span>
        <span className="bb-cleanup-row-main">
          <span className="bb-dash-event-name">{c.lgu}</span>
          {resolveDays != null && (
            <span className="bb-cleanup-row-sub">
              Resolved in {resolveDays.toFixed(1)} days
            </span>
          )}
        </span>
        <span className="bb-dash-event-when">{relativeTime(c.when, now)}</span>
        <span className="bb-cleanup-row-cta">
          View before &amp; after <ArrowRight size={13} />
        </span>
      </button>
    </li>
  )
}

/** The detail view for one cleanup — before/after photos, note, and timeline. */
function CleanupDetail({ c }: { c: Cleanup }) {
  const before = c.beforePhotos ?? []
  const after = c.afterPhotos ?? []
  const responseDays =
    c.reportedAt != null ? Math.max(0, (c.when - c.reportedAt) / DAY_MS) : null

  return (
    <div className="bb-cleanup-detail">
      <div className="bb-cleanup-badges">
        <span className="bb-cleanup-status">
          <span className="bb-cleanup-status-dot" /> Cleanup Completed
        </span>
        <span className="bb-cleanup-cat inline-flex items-center gap-1.5">
          {(() => {
            const Icon = CATEGORY_ICON[c.category]
            return <Icon className="size-4" />
          })()}
          {CATEGORY_LABELS[c.category]}
        </span>
      </div>

      {(before.length > 0 || after.length > 0) && (
        <div className="bb-cleanup-photos">
          {before[0] && (
            <figure>
              <img src={before[0]} alt="Before cleanup" loading="lazy" />
              <figcaption>Before</figcaption>
            </figure>
          )}
          {after[0] && (
            <figure>
              <img src={after[0]} alt="After cleanup" loading="lazy" />
              <figcaption>After</figcaption>
            </figure>
          )}
        </div>
      )}

      {c.note && <p className="bb-cleanup-note">{c.note}</p>}

      <dl className="bb-cleanup-meta">
        {c.reportedAt != null && (
          <div>
            <dt>Reported</dt>
            <dd>{fmtDate(c.reportedAt)}</dd>
          </div>
        )}
        <div>
          <dt>Cleaned</dt>
          <dd>{fmtDate(c.when)}</dd>
        </div>
        {responseDays != null && (
          <div>
            <dt>Turnaround</dt>
            <dd>
              {responseDays.toFixed(1)} day{responseDays === 1 ? '' : 's'}
            </dd>
          </div>
        )}
      </dl>

      <p className="bb-cleanup-by">
        Reported by a resident · Verified by {c.confirmations ?? 0} residents
      </p>
    </div>
  )
}

/** The latest resolved reports — a preview feed that opens into a full modal. */
export default function RecentCleanup({ cleanups, now }: Props) {
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
        <Empty label="No cleanups recorded yet. Be the first to resolve a flag." />
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
                    ? `Resolved ${relativeTime(detail.when, now)}`
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
              <CleanupDetail c={detail} />
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
