import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, X, MapPin } from 'lucide-react'
import Reveal from '../Reveal'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import type { RecentCleanup } from '../../lib/stats'

interface Props {
  cleanups: RecentCleanup[]
  onReadMore?: () => void
}

/** Social-proof story count — reads as "there are already this many wins". */
const STORY_NO = 128

/** Rotating resident/volunteer/LGU voices — browsable via the carousel. */
const STORIES = [
  {
    quote:
      'I never thought someone would actually respond. A few days later, our shoreline was completely clean.',
    name: 'Maria D.',
    role: 'Resident',
  },
  {
    quote:
      'We used to walk past this trash every morning. A week after reporting it, it was gone.',
    name: 'John R.',
    role: 'Resident',
  },
  {
    quote:
      'We organized a cleanup drive after five reports came in from the same spot. Neighbors just showed up.',
    name: 'Ka Ernesto',
    role: 'Barangay Volunteer',
  },
  {
    quote:
      'This platform shows us exactly where to send limited resources first. It changed how we prioritize.',
    name: 'Capt. Reyes',
    role: 'LGU Official',
  },
  {
    quote:
      'I reported it on my way to school. Seeing it cleaned a few days later made me feel like my voice mattered.',
    name: 'Liza M.',
    role: 'Student',
  },
]

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommunitySpotlight({ cleanups, onReadMore }: Props) {
  const withPhotos = cleanups.filter((c) => c.beforePhotos?.[0] && c.afterPhotos?.[0])
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * STORIES.length))
  const [lightbox, setLightbox] = useState(false)

  const story = STORIES[idx]
  const c = withPhotos.length ? withPhotos[idx % withPhotos.length] : undefined
  const place = c?.lgu
  const num = STORY_NO - idx
  const before = c?.beforePhotos?.[0]
  const after = c?.afterPhotos?.[0]
  const resolveDays =
    c && c.reportedAt != null ? Math.max(0, (c.when - c.reportedAt) / 86_400_000) : null

  const go = (d: number) => setIdx((i) => (i + d + STORIES.length) % STORIES.length)

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
        <figure className="bb-spotlight" key={idx}>
          {c && before && after && (
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
              <span className="bb-spotlight-badge">Success Story #{num}</span>
              {place && (
                <span className="bb-spotlight-loc">
                  <MapPin size={13} aria-hidden />
                  {place} • Zambales
                </span>
              )}
            </div>
            {c?.title && <div className="bb-spotlight-title">{c.title}</div>}

            <blockquote className="bb-spotlight-quote">
              <span className="bb-spotlight-mark" aria-hidden>
                &ldquo;
              </span>
              {story.quote}
            </blockquote>

            <figcaption className="bb-spotlight-by">
              <span className="bb-spotlight-avatar" aria-hidden>
                {story.name[0]}
              </span>
              <span className="bb-spotlight-who">
                <b>{story.name}</b>
                <span className="bb-spotlight-role">
                  {story.role}
                  {place ? ` • ${place}` : ''}
                </span>
              </span>
            </figcaption>

            {c && (
              <ul className="bb-spotlight-proof">
                {(c.confirmations ?? 0) > 0 && <li>{c.confirmations} residents confirmed</li>}
                {resolveDays != null && <li>Resolved in {resolveDays.toFixed(1)} days</li>}
                <li>Cleanup completed {fmtDate(c.when)}</li>
              </ul>
            )}
          </div>
        </figure>
      </Reveal>

      <div className="bb-spotlight-bar">
        <span className="bb-spotlight-bar-count">
          {STORY_NO} reports that became real cleanups
        </span>
        <div className="bb-spotlight-nav">
          <button className="bb-spotlight-arrow" onClick={() => go(-1)} aria-label="Previous story">
            <ChevronLeft size={18} />
          </button>
          <div className="bb-spotlight-dots">
            {STORIES.map((_, i) => (
              <button
                key={i}
                className={`bb-spotlight-dot ${i === idx ? 'is-active' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`Story ${i + 1}`}
                aria-current={i === idx}
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
