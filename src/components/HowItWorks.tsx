import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  MapPin,
  Camera,
  Crosshair,
  Tag,
  Check,
  CheckCircle2,
  Users,
  Bell,
  Building2,
  Landmark,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  User,
  Smartphone,
  Sparkles,
  TreePine,
} from 'lucide-react'
import Footer from './Footer'
import { useReveal } from '../hooks/useReveal'
import './howitworks.css'

interface Props {
  onNavigate: (view: string) => void
}

/* ------------------------------------------------------------------ */
/* The story is told as a FUTURE state: no real report has travelled   */
/* this path yet. Every space is honest about being empty; the visitor */
/* is meant to imagine themselves filling it. Nothing is fabricated.   */
/* ------------------------------------------------------------------ */

interface Step {
  n: number
  time: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    n: 1,
    time: 'The moment it starts',
    title: 'Someone notices a problem',
    body: 'On an ordinary walk or commute, someone spots waste that shouldn’t be there: illegal dumping, an overflowing canal, sacks nobody has claimed.',
  },
  {
    n: 2,
    time: 'Under a minute',
    title: 'They report it',
    body: 'A pin drops on the map, a photo uploads, GPS is captured, a category is picked. Submitted. No account, no sign-up. The whole thing takes under a minute.',
  },
  {
    n: 3,
    time: 'Within hours',
    title: 'Neighbours confirm it',
    body: 'Nearby residents confirm the report is real. Trust comes from many people agreeing, never from names or profiles. Confirmations push genuine issues up the queue.',
  },
  {
    n: 4,
    time: 'The same day',
    title: 'Local responders are notified',
    body: 'The alert travels outward: resident → barangay → municipality → the volunteer groups who can actually act.',
  },
  {
    n: 5,
    time: 'That weekend',
    title: 'Volunteers clean it up',
    body: 'Volunteers organise, the waste is hauled away, and the cleanup is documented with before-and-after photos. Proof, not promises.',
  },
  {
    n: 6,
    time: 'Published',
    title: 'Everyone sees the result',
    body: 'The outcome publishes to the Transparency page automatically. Nothing disappears into a drawer.',
  },
]

const WHY = [
  {
    icon: Camera,
    title: 'Before & After',
    body: 'Every completed cleanup will carry photo evidence. Proof, not promises.',
  },
  {
    icon: Users,
    title: 'Community Verification',
    body: 'Residents confirm reports before anyone is dispatched, so effort goes where it counts.',
  },
  {
    icon: BarChart3,
    title: 'Public Progress',
    body: 'Everyone sees what was reported, what was resolved, and what still needs attention.',
  },
]

const PILLARS = [
  { icon: Users, label: 'Residents', sub: 'Eyes on every street' },
  { icon: HeartHandshake, label: 'Volunteer Groups', sub: 'Hands that do the work' },
  { icon: Landmark, label: 'LGUs', sub: 'Authority to resolve' },
]

/* Green stamps: every space on this page is empty on purpose. */
const STAMPS = [
  { icon: '🧹', label: 'Waiting for the first cleanup.' },
  { icon: '🏆', label: 'Waiting for the first success story.' },
  { icon: '🌱', label: 'Waiting for the first volunteer.' },
  { icon: '📸', label: 'Waiting for the first before & after.' },
]

/* A minimal line-drawn overview of the whole journey: one image to break up
   a page that is otherwise all text and UI. */
const JOURNEY = [
  { icon: User, label: 'Someone' },
  { icon: Smartphone, label: 'Reports' },
  { icon: Users, label: 'Community' },
  { icon: Sparkles, label: 'Cleanup' },
  { icon: TreePine, label: 'Restored' },
]

const FAQ = [
  {
    q: 'Why are there no cleanup stories yet?',
    a: 'Because we’re still writing the first chapter. Bantay Basura is currently in beta. Every cleanup, every before-and-after photo, and every success story you see here will come from real communities, not stock photos or fabricated data. Maybe yours will be the first.',
  },
  { q: 'Do I need an account?', a: 'No. You can browse the map and file a report without signing up.' },
  { q: 'Can anyone report?', a: 'Yes. Anyone with a phone and a photo can flag an issue.' },
  { q: 'Can I report anonymously?', a: 'Yes. Reports are anonymous by default; your identity is never shown publicly.' },
  { q: 'Who verifies reports?', a: 'Nearby residents and community moderators confirm a report before action is prioritised.' },
  { q: 'How are cleanups organised?', a: 'By LGUs, NGOs, and volunteer groups who pick up verified reports in their area.' },
  { q: 'Can schools participate?', a: 'Absolutely. Schools are some of our most active volunteer organisers.' },
]

/** One timeline beat. Reveals on scroll, filling its marker and the line to
 *  the next beat so the report's lifecycle visibly grows as you read. */
function TimelineStep({ step, last, children }: { step: Step; last: boolean; children?: React.ReactNode }) {
  const { ref, shown } = useReveal<HTMLLIElement>()
  return (
    <li ref={ref} className={`bb-hiw-step ${shown ? 'is-in' : ''}`}>
      <div className="bb-hiw-rail">
        <span className="bb-hiw-node">{step.n}</span>
        {!last && <span className="bb-hiw-line" />}
      </div>
      <div className="bb-hiw-step-body">
        <span className="bb-hiw-step-time">{step.time}</span>
        <h3 className="bb-hiw-step-title">{step.title}</h3>
        <p className="bb-hiw-step-text">{step.body}</p>
        {children && <div className="bb-hiw-visual">{children}</div>}
      </div>
    </li>
  )
}

export default function HowItWorks({ onNavigate }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const decoRef = useRef<HTMLDivElement>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [journeyHidden, setJourneyHidden] = useState(false)
  const journeyReveal = useReveal<HTMLDivElement>()
  const philoReveal = useReveal<HTMLElement>()
  const closeReveal = useReveal<HTMLElement>()

  // Parallax: the scroll container is this .bb-about element. Drift the hero's
  // decorative layer slower than the page for depth (skipped for reduced motion).
  useEffect(() => {
    const scroller = rootRef.current
    const deco = decoRef.current
    if (!scroller || !deco) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        deco.style.transform = `translate3d(0, ${scroller.scrollTop * 0.35}px, 0)`
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  // The journey overview only tucks away once it has scrolled almost to the top
  // of the view (i.e. about to slide off-screen), and reappears as soon as it
  // drops back down. Position-based, with hysteresis to avoid flicker.
  useEffect(() => {
    const scroller = rootRef.current
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let hidden = false
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = journeyReveal.ref.current
        if (!scroller || !el) return
        // Distance from the band's top edge to the top of the scroll viewport.
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
        if (top <= 16 && !hidden) {
          hidden = true
          setJourneyHidden(true)
        } else if (top >= 48 && hidden) {
          hidden = false
          setJourneyHidden(false)
        }
      })
    }
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller?.removeEventListener('scroll', onScroll)
  }, [journeyReveal.ref])

  return (
    <div className="bb-about bb-hiw" ref={rootRef}>
      {/* ---------- Hero ---------- */}
      <section className="bb-hiw-hero">
        <div className="bb-hiw-hero-deco" ref={decoRef} aria-hidden="true">
          <span className="bb-hiw-orb bb-hiw-orb-1" />
          <span className="bb-hiw-orb bb-hiw-orb-2" />
          <span className="bb-hiw-orb bb-hiw-orb-3" />
        </div>
        <div className="bb-hiw-hero-inner">
          <div className="bb-hiw-eyebrow">How it works</div>
          <h1 className="bb-hiw-hero-title">
            One report.
            <br />
            One community.
            <br />
            <span>Real change.</span>
          </h1>
          <p className="bb-hiw-hero-lede">
            No report has travelled this path yet. You could file the first. Here’s how yours
            would unfold, from a single photo to a cleaner street.
          </p>
          <button className="bb-hiw-hero-cta" onClick={() => onNavigate('map')}>
            Report Waste <ArrowRight className="size-4" />
          </button>
          <p className="bb-hiw-scrollcue">Scroll to see how your report could travel ↓</p>
        </div>
        <div className="bb-hiw-hero-fade" />
      </section>

      {/* ---------- The story timeline (a future state, honestly told) ---------- */}
      <section className="bb-hiw-section">
        <div className="bb-hiw-wrap">
          <div className="bb-hiw-eyebrow bb-hiw-eyebrow-center">Imagine this</div>
          <h2 className="bb-hiw-h2 bb-hiw-h2-center">Here’s what happens after your report</h2>
          <p className="bb-hiw-intro">
            Nothing below is staged. It’s the journey your report would take, waiting for a real
            community to walk it.
          </p>
          <div
            className={`bb-hiw-journey ${journeyReveal.shown ? 'is-in' : ''} ${
              journeyHidden ? 'is-hidden' : ''
            }`}
            ref={journeyReveal.ref}
            aria-hidden="true"
          >
            {JOURNEY.map((j, i, arr) => {
              const Icon = j.icon
              return (
                <Fragment key={j.label}>
                  <div className="bb-hiw-journey-node" style={{ transitionDelay: `${i * 0.12}s` }}>
                    <span className="bb-hiw-journey-icon">
                      <Icon className="size-6" />
                    </span>
                    <span className="bb-hiw-journey-label">{j.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className="bb-hiw-journey-link"
                      style={{ transitionDelay: `${i * 0.12 + 0.06}s` }}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>
          <ol className="bb-hiw-timeline">
            <TimelineStep step={STEPS[0]} last={false} />

            <TimelineStep step={STEPS[1]} last={false}>
              <div className="bb-hiw-phone">
                <div className="bb-hiw-phone-row">
                  <MapPin className="size-4" /> Pin dropped
                  <span className="bb-hiw-phone-ok">
                    <Check className="size-3" />
                  </span>
                </div>
                <div className="bb-hiw-phone-row">
                  <Camera className="size-4" /> Photo attached
                  <span className="bb-hiw-phone-ok">
                    <Check className="size-3" />
                  </span>
                </div>
                <div className="bb-hiw-phone-row">
                  <Crosshair className="size-4" /> GPS captured
                  <span className="bb-hiw-phone-ok">
                    <Check className="size-3" />
                  </span>
                </div>
                <div className="bb-hiw-phone-row">
                  <Tag className="size-4" /> Category picked
                  <span className="bb-hiw-phone-ok">
                    <Check className="size-3" />
                  </span>
                </div>
                <div className="bb-hiw-phone-submit">Submit report</div>
                <p className="bb-hiw-note">Average reporting time: under 60 seconds.</p>
              </div>
            </TimelineStep>

            <TimelineStep step={STEPS[2]} last={false}>
              <div className="bb-hiw-verify">
                <div className="bb-hiw-verify-head">
                  <Users className="size-4" /> Community Verification
                </div>
                <div className="bb-hiw-dots">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span
                      key={i}
                      className="bb-hiw-dot"
                      style={{ animationDelay: `${0.5 + i * 0.09}s` }}
                    />
                  ))}
                </div>
                <div className="bb-hiw-verify-text">
                  <b>8 confirmations</b>
                  <span className="bb-hiw-verified">
                    <CheckCircle2 className="size-3.5" /> Verified by the community
                  </span>
                </div>
                <p className="bb-hiw-note">
                  Anonymous. Trust comes from many people confirming the same thing, never from
                  names.
                </p>
              </div>
            </TimelineStep>

            <TimelineStep step={STEPS[3]} last={false}>
              <div className="bb-hiw-notify">
                {[
                  { icon: Users, label: 'Resident' },
                  { icon: Building2, label: 'Barangay' },
                  { icon: Landmark, label: 'Municipality' },
                  { icon: HeartHandshake, label: 'Volunteer groups' },
                ].map((r, i, arr) => {
                  const Icon = r.icon
                  return (
                    <div key={r.label} className="bb-hiw-notify-row">
                      <span className="bb-hiw-notify-icon">
                        <Icon className="size-4" />
                      </span>
                      <span className="bb-hiw-notify-label">{r.label}</span>
                      {i < arr.length - 1 && <Bell className="bb-hiw-notify-bell size-3.5" />}
                    </div>
                  )
                })}
              </div>
            </TimelineStep>

            <TimelineStep step={STEPS[4]} last={false}>
              <p className="bb-hiw-caption">
                The first documented cleanup will appear here. Maybe yours.
              </p>
            </TimelineStep>

            <TimelineStep step={STEPS[5]} last>
              <div className="bb-hiw-result">
                {['Public transparency', 'Before & After', 'Cleanup story', 'Community impact'].map(
                  (f) => (
                    <span key={f} className="bb-hiw-result-row">
                      <span className="bb-hiw-result-check">
                        <Check className="size-3" />
                      </span>
                      {f}
                    </span>
                  ),
                )}
              </div>
              <button className="bb-hiw-link" onClick={() => onNavigate('transparency')}>
                See it on the Transparency page <ArrowRight className="size-3.5" />
              </button>
            </TimelineStep>
          </ol>
        </div>
      </section>

      {/* ---------- Green stamps: empty on purpose ---------- */}
      <section className="bb-hiw-section bb-hiw-stamps-sec">
        <div className="bb-hiw-wrap">
          <div className="bb-hiw-eyebrow bb-hiw-eyebrow-center">Nothing here is fabricated</div>
          <h2 className="bb-hiw-h2 bb-hiw-h2-center">The next update could be yours</h2>
          <p className="bb-hiw-stamps-lede">
            Every space above is empty on purpose. As real reports and cleanups come in, they’ll
            fill these in, starting with someone like you.
          </p>
          <div className="bb-hiw-stamps">
            {STAMPS.map((s) => (
              <div key={s.label} className="bb-hiw-stamp">
                <span className="bb-hiw-stamp-seed">{s.icon}</span>
                <span className="bb-hiw-stamp-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Philosophy ---------- */}
      <section
        className={`bb-hiw-philo ${philoReveal.shown ? 'is-in' : ''}`}
        ref={philoReveal.ref}
      >
        <div className="bb-hiw-wrap bb-hiw-philo-grid">
          <div className="bb-hiw-philo-col is-old">
            <span className="bb-hiw-philo-k">Traditional reporting</span>
            <ul>
              <li>Report.</li>
              <li>Wait.</li>
              <li>Hope.</li>
            </ul>
          </div>
          <div className="bb-hiw-philo-col is-new">
            <span className="bb-hiw-philo-k">Bantay Basura</span>
            <ul>
              <li>Report.</li>
              <li>Verify.</li>
              <li>Coordinate.</li>
              <li>Clean.</li>
              <li>Show the result.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Why transparency ---------- */}
      <section className="bb-hiw-section">
        <div className="bb-hiw-wrap">
          <div className="bb-hiw-eyebrow bb-hiw-eyebrow-center">Why publish everything?</div>
          <h2 className="bb-hiw-h2 bb-hiw-h2-center">Trust is built in the open</h2>
          <div className="bb-hiw-why">
            {WHY.map((w) => {
              const Icon = w.icon
              return (
                <div key={w.title} className="bb-hiw-why-card">
                  <span className="bb-hiw-why-icon">
                    <Icon className="size-5" />
                  </span>
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Trust (dark) ---------- */}
      <section className="bb-hiw-trust">
        <div className="bb-hiw-wrap">
          <h2 className="bb-hiw-trust-title">
            Built for communities.
            <br />
            <span>Not algorithms.</span>
          </h2>
          <div className="bb-hiw-pillars">
            {PILLARS.map((p, i, arr) => {
              const Icon = p.icon
              return (
                <div key={p.label} className="bb-hiw-pillar-wrap">
                  <div className="bb-hiw-pillar">
                    <span className="bb-hiw-pillar-icon">
                      <Icon className="size-7" />
                    </span>
                    <b>{p.label}</b>
                    <span className="bb-hiw-pillar-sub">{p.sub}</span>
                  </div>
                  {i < arr.length - 1 && <span className="bb-hiw-pillar-link" aria-hidden="true" />}
                </div>
              )
            })}
          </div>
          <p className="bb-hiw-trust-foot">
            <ShieldCheck className="size-4" /> Technology should help neighbors work together, not
            replace them.
          </p>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bb-hiw-section">
        <div className="bb-hiw-wrap bb-hiw-wrap-narrow">
          <div className="bb-hiw-eyebrow bb-hiw-eyebrow-center">Questions</div>
          <h2 className="bb-hiw-h2 bb-hiw-h2-center">Good to know</h2>
          <div className="bb-hiw-faq">
            {FAQ.map((f, i) => {
              const open = faqOpen === i
              return (
                <div key={f.q} className={`bb-hiw-faq-item ${open ? 'is-open' : ''}`}>
                  <button
                    className="bb-hiw-faq-q"
                    onClick={() => setFaqOpen(open ? null : i)}
                    aria-expanded={open}
                  >
                    {f.q}
                    <ChevronDown className="bb-hiw-faq-chev size-5" />
                  </button>
                  <div className="bb-hiw-faq-a">
                    <p>{f.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Closing: the first story hasn't happened yet ---------- */}
      <section
        className={`bb-hiw-close ${closeReveal.shown ? 'is-in' : ''}`}
        ref={closeReveal.ref}
      >
        <h2 className="bb-hiw-close-title">
          The first story
          <br />
          hasn’t happened yet.
        </h2>
        <p className="bb-hiw-close-sub">Help us write it.</p>
        <button className="bb-hiw-close-cta" onClick={() => onNavigate('map')}>
          Report Waste <ArrowRight className="size-4" />
        </button>
      </section>

      <Footer onNavigate={onNavigate} hideCta />
    </div>
  )
}
