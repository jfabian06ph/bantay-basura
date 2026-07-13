import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, X, MapPin } from 'lucide-react'
import Reveal from '../Reveal'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import type { RecentCleanup } from '../../lib/stats'

interface Props {
  cleanups: RecentCleanup[]
  onReadMore?: () => void
  /** Drops the visitor into the report flow — powers the empty-state CTA. */
  onReport?: () => void
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommunitySpotlight({ cleanups, onReadMore, onReport }: Props) {
  // A "story" is a fully documented cleanup — real before + after photos. We
  // never fabricate testimonials, so these are the only slides we ever show.
  const withPhotos = cleanups.filter((c) => c.beforePhotos?.[0] && c.afterPhotos?.[0])
  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  // No real cleanup has been documented yet — honestly say the first story is
  // still waiting to be written rather than inventing one.
  if (withPhotos.length === 0) {
    return (
      <section className="bb-dash-section bb-dash-section-tight">
        <div className="bb-dash-eyebrow">Real Stories</div>
        <h3 className="bb-spotlight-headline">
          <span className="bb-spotlight-line bb-spotlight-line-1">One report.</span>
          <span className="bb-spotlight-line bb-spotlight-line-2">Real change.</span>
        </h3>
        <SpotlightEmpty onReport={onReport} />
      </section>
    )
  }

  const safeIdx = idx % withPhotos.length
  const c = withPhotos[safeIdx]
  const place = c.lgu
  // The resident's own note is the story — shown verbatim, never invented.
  const quote = c.note?.trim() || null
  const before = c.beforePhotos?.[0]
  const after = c.afterPhotos?.[0]
  const resolveDays =
    c.reportedAt != null ? Math.max(0, (c.when - c.reportedAt) / 86_400_000) : null

  const go = (d: number) => setIdx((i) => (i + d + withPhotos.length) % withPhotos.length)

  return (
    <section className="bb-dash-section bb-dash-section-tight">
      <div className="bb-dash-eyebrow">Real Stories</div>
      <h3 className="bb-spotlight-headline">
        One report.
        <br />
        Real change.
      </h3>

      <Reveal>
        {/* keyed on idx so each story fades in fresh */}
        <figure className="bb-spotlight" key={safeIdx}>
          {before && after && (
            <div className="bb-spotlight-photos">
              <button className="bb-spotlight-photo is-before" onClick={() => setLightbox(true)}>
                <img src={before} alt="Before cleanup" loading="lazy" />
                <span className="bb-spotlight-tag">Before</span>
                <span className="bb-spotlight-enlarge">
                  <Maximize2 size={13} /> Enlarge
                </span>
              </button>
              <button className="bb-spotlight-photo is-after" onClick={() => setLightbox(true)}>
                <img src={after} alt="After cleanup" loading="lazy" />
                <span className="bb-spotlight-tag is-after">After</span>
                <span className="bb-spotlight-enlarge">
                  <Maximize2 size={13} /> Enlarge
                </span>
              </button>
            </div>
          )}

          <div className="bb-spotlight-body">
            <div className="bb-spotlight-head">
              <span className="bb-spotlight-badge">Success Story #{safeIdx + 1}</span>
              {place && (
                <span className="bb-spotlight-loc">
                  <MapPin size={13} aria-hidden />
                  {place} • Zambales
                </span>
              )}
            </div>
            {c.title && <div className="bb-spotlight-title">{c.title}</div>}

            {quote && (
              <blockquote className="bb-spotlight-quote">
                <span className="bb-spotlight-mark" aria-hidden>
                  &ldquo;
                </span>
                {quote}
              </blockquote>
            )}

            {/* Places, not people: an anonymous community attribution — we never
                surface individual reporters. */}
            <figcaption className="bb-spotlight-by">
              <span className="bb-spotlight-avatar" aria-hidden>
                <MapPin size={16} />
              </span>
              <span className="bb-spotlight-who">
                <b>Reported by a resident</b>
                <span className="bb-spotlight-role">
                  Verified cleanup{place ? ` • ${place}` : ''}
                </span>
              </span>
            </figcaption>

            <ul className="bb-spotlight-proof">
              {(c.confirmations ?? 0) > 0 && <li>{c.confirmations} residents confirmed</li>}
              {resolveDays != null && <li>Resolved in {resolveDays.toFixed(1)} days</li>}
              <li>Cleanup completed {fmtDate(c.when)}</li>
            </ul>
          </div>
        </figure>
      </Reveal>

      <div className="bb-spotlight-bar">
        <span className="bb-spotlight-bar-count">
          {withPhotos.length} report{withPhotos.length === 1 ? '' : 's'} that became real cleanups
        </span>
        <div className="bb-spotlight-nav">
          <button className="bb-spotlight-arrow" onClick={() => go(-1)} aria-label="Previous story">
            <ChevronLeft size={18} />
          </button>
          <div className="bb-spotlight-dots">
            {withPhotos.map((_, i) => (
              <button
                key={i}
                className={`bb-spotlight-dot ${i === safeIdx ? 'is-active' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`Story ${i + 1}`}
                aria-current={i === safeIdx}
              />
            ))}
          </div>
          <button className="bb-spotlight-arrow" onClick={() => go(1)} aria-label="Next story">
            <ChevronRight size={18} />
          </button>
        </div>
        {onReadMore ? (
          <button className="bb-dash-link bb-spotlight-bar-link" onClick={onReadMore}>
            Explore more success stories <ArrowRight size={14} />
          </button>
        ) : (
          <span />
        )}
      </div>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-[900px] w-[calc(100%-2.5rem)] gap-0 overflow-hidden border-[#eceae5] bg-white p-0 text-[#14110f]">
          <div className="bb-hotspots-modal-head">
            <div>
              <DialogTitle className="text-[#14110f]">
                Before &amp; After{place ? `: ${place}` : ''}
              </DialogTitle>
              <DialogDescription className="text-[#55504a]">
                {c?.title ?? 'Cleanup comparison'}
              </DialogDescription>
            </div>
            <button
              className="bb-hotspots-modal-close"
              onClick={() => setLightbox(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="bb-spotlight-lightbox">
            {before && (
              <figure>
                <img src={before} alt="Before cleanup" />
                <figcaption>Before</figcaption>
              </figure>
            )}
            {after && (
              <figure>
                <img src={after} alt="After cleanup" />
                <figcaption>After</figcaption>
              </figure>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/**
 * Honest empty state for the Real Stories section — shown until a real cleanup
 * exists. Invites the first report, and opens a channel for residents to share
 * a story we can feature (with permission). No fabricated testimonials.
 */
function SpotlightEmpty({ onReport }: { onReport?: () => void }) {
  return (
    <div className="bb-spotlight-empty">
      <div className="bb-spotlight-empty-main">
        <p className="bb-spotlight-empty-lede">The first success story starts with your report.</p>
        <p className="bb-spotlight-empty-sub">The first cleanup story hasn&rsquo;t happened yet.</p>
        <p className="bb-spotlight-empty-nudge">Help us write it.</p>
        {onReport && (
          <button className="bb-spotlight-empty-cta" onClick={onReport}>
            Report Waste
          </button>
        )}
      </div>

      <div className="bb-spotlight-empty-share">
        <p className="bb-spotlight-empty-share-title">
          <span aria-hidden>🌱</span> Have a story worth sharing?
        </p>
        <p className="bb-spotlight-empty-share-q">
          Did a report lead to a cleanup in your community?
        </p>
        <p className="bb-spotlight-empty-share-cta">
          Tell us about it <ArrowRight size={13} aria-hidden />{' '}
          <a href="mailto:stories@bantaybasura.org?subject=Community%20cleanup%20story">
            stories@bantaybasura.org
          </a>
        </p>
        <p className="bb-spotlight-empty-share-note">
          We&rsquo;ll feature real community cleanups, with your permission, to inspire others.
        </p>
      </div>
    </div>
  )
}
