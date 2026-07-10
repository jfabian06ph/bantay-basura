import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Eye,
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
} from 'lucide-react'
import Footer from './Footer'
import BeforeAfter from './BeforeAfter'
import { useReveal } from '../hooks/useReveal'
import './howitworks.css'

interface Props {
  onNavigate: (view: string) => void
}

/* ------------------------------------------------------------------ */
/* The story: one report, told beat by beat as the visitor scrolls.    */
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
    time: 'June 21, 7:42 AM',
    title: 'Someone notices a problem',
    body: 'On her way to work, a resident spots illegal dumping by the roadside — overflowing sacks nobody has claimed.',
  },
  {
    n: 2,
    time: '7:43 AM',
    title: 'She reports it',
    body: 'A pin drops on the map, a photo uploads, GPS is captured, a category is picked. Submitted — the whole thing takes under a minute.',
  },
  {
    n: 3,
    time: 'By noon',
    title: 'The community verifies it',
    body: 'Neighbours confirm the report is real. Multiple confirmations filter out noise and push genuine issues up the queue.',
  },
  {
    n: 4,
    time: 'That afternoon',
    title: 'The right people are notified',
    body: 'The alert travels outward — resident to barangay to municipality to the volunteer groups who can act.',
  },
  {
    n: 5,
    time: 'That weekend',
    title: 'The cleanup happens',
    body: 'Volunteers organise, the waste is hauled away, and a tired roadside becomes clean again.',
  },
  {
    n: 6,
    time: 'Monday',
    title: 'Everyone sees the result',
    body: 'Before-and-after photos and the outcome publish to the Transparency page — automatically. Nothing disappears into a drawer.',
  },
]

const WHY = [
  {
    icon: Camera,
    title: 'Before & After',
    body: 'Every completed cleanup carries photo evidence — proof, not promises.',
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

const FAQ = [
  { q: 'Can anyone report?', a: 'Yes. Anyone with a phone and a photo can flag an issue — no account required.' },
  { q: 'Can I report anonymously?', a: 'Yes. Reports are anonymous by default; your identity is never shown publicly.' },
  { q: 'Who verifies reports?', a: 'Nearby residents and community moderators confirm a report before action is prioritised.' },
  { q: 'How are cleanups organised?', a: 'By LGUs, NGOs, and volunteer groups who pick up verified reports in their area.' },
  { q: 'Can schools participate?', a: 'Absolutely — schools are some of our most active volunteer organisers.' },
]

/** One timeline beat. Reveals on scroll, filling its marker and the line to
 *  the next beat so the report's lifecycle visibly grows as you read. */
function TimelineStep({ step, last, children }: { step: Step; last: boolean; children: React.ReactNode }) {
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
        <div className="bb-hiw-visual">{children}</div>
      </div>
    </li>
  )
}

export default function HowItWorks({ onNavigate }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const decoRef = useRef<HTMLDivElement>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

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
            <span>One cleaner neighbourhood.</span>
          </h1>
          <p className="bb-hiw-hero-lede">From one photo to a real cleanup — here&rsquo;s the whole journey.</p>
          <button className="bb-hiw-hero-cta" onClick={() => onNavigate('map')}>
            Report your first issue <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="bb-hiw-hero-fade" />
      </section>

      {/* ---------- The story timeline ---------- */}
      <section className="bb-hiw-section">
        <div className="bb-hiw-wrap">
          <div className="bb-hiw-eyebrow bb-hiw-eyebrow-center">Follow one report</div>
          <h2 className="bb-hiw-h2 bb-hiw-h2-center">How a single sighting becomes a cleaner street</h2>
          <ol className="bb-hiw-timeline">
            <TimelineStep step={STEPS[0]} last={false}>
              <figure className="bb-hiw-photo">
                <img src="/zambales-town.jpg" alt="A roadside that needs attention" />
                <figcaption>
                  <Eye className="size-3.5" /> Spotted on the morning commute
                </figcaption>
              </figure>
            </TimelineStep>

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
                  <Tag className="size-4" /> Category: Illegal dumping
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
                <div className="bb-hiw-avatars">
                  {['#23c266', '#2f7fe0', '#f5b84b', '#e0619a', '#9b6ce0', '#26b6a8', '#e0844a'].map(
                    (t, i) => (
                      <span key={i} className="bb-hiw-av" style={{ background: t, zIndex: 7 - i }} />
                    ),
                  )}
                </div>
                <div className="bb-hiw-verify-text">
                  <b>7 residents confirmed</b>
                  <span className="bb-hiw-verified">
                    <CheckCircle2 className="size-3.5" /> Verified
                  </span>
                </div>
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
              <div className="bb-hiw-cleanup">
                <BeforeAfter before="/zambales-town.jpg" after="/zambales-coast.jpg" />
                <div className="bb-hiw-cleanup-stats">
                  <div>
                    <b>34</b>
                    <span>volunteers</span>
                  </div>
                  <div>
                    <b>120 kg</b>
                    <span>waste removed</span>
                  </div>
                  <div>
                    <b className="bb-hiw-done">
                      <CheckCircle2 className="size-4" /> Done
                    </b>
                    <span>cleanup completed</span>
                  </div>
                </div>
              </div>
            </TimelineStep>

            <TimelineStep step={STEPS[5]} last>
              <div className="bb-hiw-flow">
                {['Report', 'Cleanup', 'Public record', 'Impact'].map((f, i, arr) => (
                  <span key={f} className="bb-hiw-flow-item">
                    {f}
                    {i < arr.length - 1 && <ArrowRight className="size-3.5" />}
                  </span>
                ))}
              </div>
              <button className="bb-hiw-link" onClick={() => onNavigate('transparency')}>
                See it on the Transparency page <ArrowRight className="size-3.5" />
              </button>
            </TimelineStep>
          </ol>
        </div>
      </section>

      {/* ---------- Philosophy ---------- */}
      <section className="bb-hiw-philo">
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
                      <Icon className="size-6" />
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
            <ShieldCheck className="size-4" /> Three groups, one shared, public record.
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

      {/* ---------- Closing CTA ---------- */}
      <section className="bb-hiw-close">
        <h2 className="bb-hiw-close-title">
          One report.
          <br />
          One cleaner community.
        </h2>
        <button className="bb-hiw-close-cta" onClick={() => onNavigate('map')}>
          Start reporting <ArrowRight className="size-4" />
        </button>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
