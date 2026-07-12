import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Mail,
  MapPin,
  Clock,
  Timer,
  Footprints,
  Check,
  Users,
  X,
  Download,
  GraduationCap,
  Building2,
  FileText,
  ClipboardList,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import Footer from './Footer'
import Reveal from './Reveal'
import CountUp from './CountUp'
import BeforeAfter from './BeforeAfter'
import { useReveal } from '../hooks/useReveal'
import {
  ACTIVITIES,
  FEED,
  HERO_MARKERS,
  INCOMING_FEED,
  GROUPS,
  GALLERY,
  CHALLENGE,
  SCHOOLS,
  PARTNERS,
  type Activity,
  type FeedItem,
} from '../lib/impactData'
import {
  communityRankings,
  impactTotals,
  HEALTH_META,
  GROWTH_META,
  type CommunityRank,
  type ImpactTotals,
} from '../lib/stats'
import type { Report } from '../types'
import './impact.css'

interface Props {
  onNavigate: (view: string) => void
  /** Live reports — powers the community rankings + real impact totals. */
  reports: Report[]
  now: number
  /** Fly the map to a community and switch to the map view. */
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/** Monday-first weeks for any month, with a set of event days flagged. */
function useMonthGrid(year: number, month: number, eventDays: Set<number>) {
  return useMemo(() => {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return weeks.map((w) => w.map((d) => ({ day: d, event: d != null && eventDays.has(d) })))
  }, [year, month, eventDays])
}

/** Gold / silver / bronze trophy tints, keyed by leaderboard rank. */
const GROUP_TROPHY_TONE: Record<number, string> = {
  1: '#e0a92a',
  2: '#9aa4b2',
  3: '#c07d43',
}

/** Map a "what to bring" item to a friendly emoji. */
const BRING_EMOJI: [RegExp, string][] = [
  [/glove/i, '🧤'],
  [/water|hydrat|refill/i, '💧'],
  [/broom|rake/i, '🧹'],
  [/boot/i, '🥾'],
  [/hat|sun/i, '🧴'],
  [/sack|bag/i, '🛍️'],
  [/bottle/i, '♻️'],
  [/scissor/i, '✂️'],
  [/notebook/i, '📓'],
  [/trowel/i, '🪴'],
  [/sleeve|long/i, '👕'],
  [/vest/i, '🦺'],
]
function bringIcon(item: string): string {
  for (const [re, e] of BRING_EMOJI) if (re.test(item)) return e
  return '✅'
}

/** Palette for the stacked social-proof avatars. */
const AVATAR_TONES = ['#23c266', '#2f7fe0', '#f5b84b', '#e0619a', '#9b6ce0', '#26b6a8', '#e0844a', '#4aa3e0', '#7cc043']

/** 1 → "1st", 42 → "42nd", etc. */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const TOOLKIT = [
  { icon: FileText, title: 'Event Poster', note: 'Printable A4 announcement', time: '15 min' },
  { icon: ClipboardList, title: 'Cleanup Checklist', note: 'Everything to prepare', time: '10 min' },
  { icon: Users, title: 'Volunteer Form', note: 'Sign-up sheet template', time: '5 min' },
  { icon: ShieldCheck, title: 'Safety Guide', note: 'Keep everyone safe', time: '30 min' },
]

/** Today's day-of-month, but only when we're actually in July 2026 (the month
 *  the mock calendar shows) — otherwise nothing is "today" on this grid. */
function useTodayInJuly() {
  return useMemo(() => {
    const now = new Date()
    return now.getFullYear() === 2026 && now.getMonth() === 6 ? now.getDate() : null
  }, [])
}

export default function Impact({ onNavigate, reports, now, onViewOnMap }: Props) {
  const [selected, setSelected] = useState<Activity | null>(null)
  const [registered, setRegistered] = useState(false)
  const activitiesRef = useRef<HTMLDivElement>(null)

  // Places, not people: rank communities by resolution rate from real reports.
  const communities = useMemo(() => communityRankings(reports, now), [reports, now])
  const totals = useMemo(() => impactTotals(reports), [reports])

  const byDay = useMemo(() => {
    const m = new Map<number, Activity>()
    for (const a of ACTIVITIES) if (!m.has(a.day)) m.set(a.day, a)
    return m
  }, [])
  // Calendar month navigation. Offset 0 = July 2026 (the launch month that
  // actually has events); forward months are empty and invite submissions.
  const CAL_YEAR = 2026
  const CAL_BASE_MONTH = 6 // July
  const [monthOffset, setMonthOffset] = useState(0)
  const calMonth = CAL_BASE_MONTH + monthOffset
  const isBaseMonth = monthOffset === 0
  const eventDays = useMemo(
    () => (isBaseMonth ? new Set(byDay.keys()) : new Set<number>()),
    [isBaseMonth, byDay],
  )
  const grid = useMonthGrid(CAL_YEAR, calMonth, eventDays)
  const monthLabel = new Date(CAL_YEAR, calMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const today = useTodayInJuly()

  // The one promoted event — powers the hero spotlight and the enlarged grid card.
  const featured = useMemo(() => ACTIVITIES.find((a) => a.featured) ?? ACTIVITIES[0], [])

  // Challenge steps stagger in when the section scrolls into view.
  const challengeReveal = useReveal<HTMLOListElement>()

  // Location filter for the activities grid.
  const areas = useMemo(() => Array.from(new Set(ACTIVITIES.map((a) => a.area))), [])
  const [areaFilter, setAreaFilter] = useState<string>('All')
  const shownActivities = useMemo(
    () => (areaFilter === 'All' ? ACTIVITIES : ACTIVITIES.filter((a) => a.area === areaFilter)),
    [areaFilter],
  )

  // Live feed: new actions drip in at the top with a NEW badge, then settle.
  type LiveFeedItem = FeedItem & { key: number; isNew?: boolean }
  const [feed, setFeed] = useState<LiveFeedItem[]>(() => FEED.map((f, i) => ({ ...f, key: i })))
  useEffect(() => {
    let key = FEED.length
    let idx = 0
    const timers: number[] = []
    const iv = window.setInterval(() => {
      const src = INCOMING_FEED[idx % INCOMING_FEED.length]
      idx++
      const k = key++
      setFeed((prev) => [{ ...src, when: 'just now', key: k, isNew: true }, ...prev].slice(0, 6))
      // Let the NEW badge linger a couple seconds, then quietly retire it.
      timers.push(
        window.setTimeout(() => {
          setFeed((prev) => prev.map((f) => (f.key === k ? { ...f, isNew: false } : f)))
        }, 2200),
      )
    }, 8000)
    return () => {
      window.clearInterval(iv)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const open = (a: Activity) => {
    setRegistered(false)
    setSelected(a)
  }

  // Instagram-style horizontal gallery. Native scroll-snap + arrow controls,
  // plus drag-to-scroll that yields to each card's before/after slider (we bail
  // if the drag started on one so the reveal knob keeps working).
  const galleryRef = useRef<HTMLDivElement>(null)
  const galleryDrag = useRef({ down: false, startX: 0, scroll: 0 })
  const scrollGallery = (dir: 1 | -1) => {
    const el = galleryRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  const onGalleryDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bb-ba')) return
    const el = galleryRef.current
    if (!el) return
    galleryDrag.current = { down: true, startX: e.clientX, scroll: el.scrollLeft }
    el.classList.add('is-grabbing')
  }
  const onGalleryMove = (e: React.PointerEvent) => {
    const el = galleryRef.current
    if (!el || !galleryDrag.current.down) return
    el.scrollLeft = galleryDrag.current.scroll - (e.clientX - galleryDrag.current.startX)
  }
  const endGalleryDrag = () => {
    galleryDrag.current.down = false
    galleryRef.current?.classList.remove('is-grabbing')
  }

  return (
    <div className="bb-about bb-impact-page">
      {/* ---------- Hero ---------- */}
      <section className="bb-imp-hero">
        {/* Boomerang clip: plays forward then reverses, so the loop never
            hard-cuts back to frame one — it just breathes in and out. */}
        <video
          className="bb-imp-hero-video"
          src="/impact-hero-loop.mp4"
          poster="/impact-hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="bb-imp-hero-scrim" />
        {/* Live activity pins drifting over the drone footage — the video reads
            as a place where things are happening, not just scenery. */}
        <div className="bb-imp-hero-markers" aria-hidden="true">
          {HERO_MARKERS.map((m) => (
            <span
              key={m.label}
              className="bb-imp-marker"
              style={
                {
                  '--my': m.top,
                  '--mx': m.left,
                  '--tone': m.tone,
                  '--delay': `${m.delay}ms`,
                  '--dur': m.dur,
                  '--sx': m.sx,
                  '--sy': m.sy,
                } as React.CSSProperties
              }
            >
              <span className="bb-imp-marker-dot" />
              <span className="bb-imp-marker-label">{m.label}</span>
            </span>
          ))}
        </div>
        <div className="bb-imp-hero-inner">
          <div className="bb-imp-hero-eyebrow">Impact</div>
          <h1 className="bb-imp-hero-title">
            <span className="bb-imp-hl bb-imp-hl-1">
              Communities don&rsquo;t become cleaner by reports alone.
            </span>
            <span className="bb-imp-hl bb-imp-hl-2">
              They become cleaner when people decide to act.
            </span>
          </h1>
          <button
            className="bb-imp-hero-cta"
            onClick={() => activitiesRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Find an activity <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      <div className="bb-page bb-page-wide">
        {/* ---------- Event Spotlight — one big story, straight after the hero ---------- */}
        <section className="bb-imp-section bb-imp-spot-section">
          <article
            className="bb-imp-spotlight"
            style={{ '--tone': featured.tone } as React.CSSProperties}
          >
            <div className="bb-imp-spot-media">
              {featured.photo && <img src={featured.photo} alt={featured.title} />}
              <span className="bb-imp-spot-badge">⭐ Featured Event</span>
            </div>
            <div className="bb-imp-spot-body">
              {/* Read straight from the activity's own fields so the spotlight
                  never contradicts its grid card. */}
              <div className="bb-imp-spot-when">
                {featured.dow} · {featured.mon} {featured.day} ·{' '}
                {featured.time.split('–')[0].trim()}
              </div>
              <h2 className="bb-imp-spot-title">{featured.title}</h2>
              <p className="bb-imp-spot-sub">
                Join {featured.count} volunteers already signed up.
              </p>
              <ul className="bb-imp-spot-meta">
                <li>
                  <MapPin className="size-4" /> {featured.place}
                </li>
                <li>
                  <Users className="size-4" /> Hosted by {featured.host}
                </li>
              </ul>
              <button className="bb-imp-spot-cta" onClick={() => open(featured)}>
                Join this cleanup <ArrowRight className="size-4" />
              </button>
            </div>
          </article>
        </section>

        {/* ---------- Activities, led by a location filter ---------- */}
        <section className="bb-imp-section bb-imp-tight" ref={activitiesRef}>
          <div className="bb-imp-filterbar">
            <span className="bb-imp-filter-orb" aria-hidden="true">
              <SlidersHorizontal className="size-4" />
            </span>
            <div className="bb-imp-fchips" role="group" aria-label="Filter activities by location">
              <button
                className={`bb-imp-fchip ${areaFilter === 'All' ? 'is-active' : ''}`}
                onClick={() => setAreaFilter('All')}
              >
                All areas
              </button>
              {areas.map((a) => (
                <button
                  key={a}
                  className={`bb-imp-fchip ${areaFilter === a ? 'is-active' : ''}`}
                  onClick={() => setAreaFilter(a)}
                >
                  <MapPin className="size-3.5" /> {a}
                </button>
              ))}
            </div>
          </div>
          <div className="bb-imp-cards">
            {shownActivities.map((a, i) => {
              const Icon = a.icon
              const left = Math.max(0, a.capacity - a.count)
              const urgent = left <= 15
              return (
                <Reveal key={a.id} delay={i * 60}>
                  <article
                    className={`bb-imp-card ${a.featured ? 'is-featured' : ''} ${urgent ? 'is-urgent' : ''}`}
                  >
                    {a.featured && <span className="bb-imp-card-ribbon">⭐ Featured This Week</span>}
                    <div className="bb-imp-card-date" style={{ '--tone': a.tone } as React.CSSProperties}>
                      <span>{a.dow}</span>
                      <strong>{a.day}</strong>
                      <span>{a.mon}</span>
                    </div>
                    <div className="bb-imp-card-body">
                      <div
                        className="bb-imp-card-icon"
                        style={{ color: a.tone, background: `${a.tone}1f` }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <h3 className="bb-imp-card-title">{a.title}</h3>
                      <p className="bb-imp-card-place">
                        <MapPin className="size-3.5" /> {a.place}
                      </p>
                      <p className="bb-imp-card-time">
                        <Clock className="size-3.5" /> {a.time}
                      </p>
                      <div className="bb-imp-card-stats">
                        <span className="bb-imp-card-count">
                          <Users className="size-3.5" /> {a.count} {a.countLabel}
                        </span>
                        <span className={`bb-imp-card-left ${urgent ? 'is-urgent' : ''}`}>
                          {left} slots left
                        </span>
                      </div>
                      <div className="bb-imp-card-foot">
                        <span className="bb-imp-card-host">Hosted by {a.host}</span>
                        <button className="bb-imp-join" onClick={() => open(a)}>
                          Join <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ---------- Community Calendar (supporting; month-navigable) ---------- */}
        <section className="bb-imp-section bb-imp-tight">
          <div className="bb-imp-cal-header">
            <div className="bb-imp-eyebrow">Community Calendar</div>
            <div className="bb-imp-cal-nav">
              <button
                className="bb-imp-cal-navbtn"
                onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                disabled={monthOffset === 0}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="bb-imp-cal-month">{monthLabel}</span>
              <button
                className="bb-imp-cal-navbtn"
                onClick={() => setMonthOffset((o) => Math.min(5, o + 1))}
                disabled={monthOffset >= 5}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="bb-imp-cal">
            <div className="bb-imp-cal-head">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="bb-imp-cal-grid">
              {grid.flat().map((c, i) => {
                const act = isBaseMonth && c.day != null ? byDay.get(c.day) : undefined
                const isToday = isBaseMonth && c.day != null && c.day === today
                return (
                  <button
                    key={i}
                    className={`bb-imp-cal-cell ${c.day == null ? 'is-empty' : ''} ${act ? 'has-event' : ''} ${isToday ? 'is-today' : ''}`}
                    disabled={!act}
                    onClick={() => act && open(act)}
                    style={act ? ({ '--tone': act.tone } as React.CSSProperties) : undefined}
                  >
                    {c.day && <span className="bb-imp-cal-num">{c.day}</span>}
                    {act && <span className="bb-imp-cal-evt">{act.title}</span>}
                  </button>
                )
              })}
            </div>
          </div>
          {/* Grayed invitation — open space for organizers to claim a date. */}
          <a
            className="bb-imp-cal-cta"
            href="mailto:hello@bantaybasura.ph?subject=Community%20activity%20submission"
          >
            <Mail className="size-4" />
            <span>
              Have an activity to add? <b>Email us</b> and we&rsquo;ll put it on the calendar.
            </span>
          </a>
        </section>

        {/* ---------- Live Community Feed ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-eyebrow bb-imp-live">
            <span className="bb-live-dot" /> Live Community Feed
          </div>
          <h2 className="bb-imp-h2">Latest community actions</h2>
          <ul className="bb-imp-feed">
            {feed.map((f) => {
              const Icon = f.icon
              return (
                <li key={f.key} className={`bb-imp-feed-row ${f.isNew ? 'is-new' : ''}`}>
                  <span className="bb-imp-feed-icon" style={{ color: f.tone, background: `${f.tone}1f` }}>
                    <Icon className="size-4" />
                  </span>
                  <span className="bb-imp-feed-text">{f.text}</span>
                  {f.isNew && <span className="bb-imp-feed-new">NEW</span>}
                  <span className="bb-imp-feed-when">{f.when}</span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ---------- Impact Stats ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-eyebrow">Impact Since Launch</div>
          {totals.reports === 0 ? <ImpactEmpty /> : <ImpactStats totals={totals} />}
        </section>

        {/* ---------- Monthly Challenge (actionable → sits high) ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-challenge">
            <div className="bb-imp-challenge-head">
              <div className="bb-imp-eyebrow bb-imp-eyebrow-light">{CHALLENGE.month} Challenge</div>
              <h2 className="bb-imp-challenge-title">{CHALLENGE.title}</h2>
              <p className="bb-imp-challenge-lede">{CHALLENGE.lede}</p>
            </div>
            <ol
              className={`bb-imp-steps ${challengeReveal.shown ? 'is-in' : ''}`}
              ref={challengeReveal.ref}
            >
              {CHALLENGE.steps.map((s, i) => {
                const Icon = s.icon
                return (
                  <li key={i} className="bb-imp-step">
                    <span className="bb-imp-step-n">{i + 1}</span>
                    <Icon className="size-5" />
                    <span>{s.label}</span>
                  </li>
                )
              })}
            </ol>
            {/* No new module — this just drops you into the existing report flow
                on the map, where a cleanup actually begins. */}
            <button className="bb-imp-challenge-cta" onClick={() => onNavigate('map')}>
              {CHALLENGE.cta} <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        {/* ---------- Before & After Gallery (drag / swipe like Instagram) ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-eyebrow">Before &amp; After</div>
          <h2 className="bb-imp-h2">The difference a morning makes</h2>
          <div className="bb-imp-gallery-wrap">
            <button
              className="bb-imp-gal-arrow bb-imp-gal-prev"
              onClick={() => scrollGallery(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div
              className="bb-imp-gallery"
              ref={galleryRef}
              onPointerDown={onGalleryDown}
              onPointerMove={onGalleryMove}
              onPointerUp={endGalleryDrag}
              onPointerLeave={endGalleryDrag}
            >
              {GALLERY.map((g, i) => (
                <figure className="bb-imp-ba-card" key={i}>
                  <BeforeAfter before={g.before} after={g.after} />
                  <figcaption>{g.place}</figcaption>
                </figure>
              ))}
            </div>
            <button
              className="bb-imp-gal-arrow bb-imp-gal-next"
              onClick={() => scrollGallery(1)}
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </section>

        {/* ---------- Communities + Heroes: we celebrate places & teams, never
             individuals. Left = real municipal progress; right = volunteer orgs. */}
        <section className="bb-imp-section">
          <div className="bb-imp-two">
            <div className="bb-imp-panel">
              <div className="bb-imp-eyebrow">Communities Making Progress</div>
              <p className="bb-imp-panel-sub">Ranked by share of reports resolved.</p>
              <CommunityBoard rows={communities} onViewOnMap={onViewOnMap} />
            </div>
            <div className="bb-imp-panel">
              <div className="bb-imp-eyebrow">Community Heroes</div>
              <p className="bb-imp-panel-sub">The organisations doing the work.</p>
              <ul className="bb-imp-groups">
                {GROUPS.map((g) => (
                  <li key={g.name} className={`bb-imp-group bb-imp-group-${g.rank}`}>
                    <span className="bb-imp-medal" style={{ color: GROUP_TROPHY_TONE[g.rank] }}>
                      <Trophy className="size-5" />
                    </span>
                    <span className="bb-imp-group-name">{g.name}</span>
                    <span className="bb-imp-group-metric">
                      <span className="bb-imp-group-week">🔥 +{g.weekly} hrs this week</span>
                      <span className="bb-imp-group-total">{g.hours} hrs total</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- Ecosystem: schools + partners, one section ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-eyebrow">Our Ecosystem</div>
          <h2 className="bb-imp-h2">The people behind the movement</h2>
          <div className="bb-imp-two">
            <div className="bb-imp-panel">
              <div className="bb-imp-eyebrow">
                <GraduationCap className="size-4" /> Participating Schools
              </div>
              <ul className="bb-imp-chiplist">
                {SCHOOLS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="bb-imp-panel">
              <div className="bb-imp-eyebrow">
                <Building2 className="size-4" /> Supported By
              </div>
              <ul className="bb-imp-chiplist">
                {PARTNERS.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- Organizer Toolkit ---------- */}
        <section className="bb-imp-section">
          <div className="bb-imp-eyebrow">Organizer Toolkit</div>
          <h2 className="bb-imp-h2">Want to organize your own cleanup?</h2>
          <div className="bb-imp-toolkit">
            {TOOLKIT.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.title} className="bb-imp-tool">
                  <span className="bb-imp-tool-time">
                    <Clock className="size-3.5" /> {t.time}
                  </span>
                  <Icon className="size-6" />
                  <span className="bb-imp-tool-title">{t.title}</span>
                  <span className="bb-imp-tool-note">{t.note}</span>
                  <span className="bb-imp-tool-dl">
                    <Download className="size-4" /> Download
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* ---------- Join CTA band ---------- */}
      <section className="bb-imp-cta-band">
        <h2>Ready to make a difference?</h2>
        <p>Your community needs you. Find an activity near you and be part of the change.</p>
        <button
          className="bb-imp-cta-btn"
          onClick={() => activitiesRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          Join your community <ArrowRight className="size-4" />
        </button>
      </section>

      <Footer onNavigate={onNavigate} />

      {/* ---------- Activity detail modal ---------- */}
      {selected && (
        <div className="bb-imp-modal" role="dialog" aria-label={selected.title}>
          <button className="bb-imp-modal-scrim" aria-label="Close" onClick={() => setSelected(null)} />
          <div className="bb-imp-modal-card" style={{ '--tone': selected.tone } as React.CSSProperties}>
            <button className="bb-imp-modal-x" onClick={() => setSelected(null)} aria-label="Close">
              <X className="size-4" />
            </button>

            <span className="bb-imp-modal-badge">
              <span className="bb-imp-modal-badge-dot" />
              {selected.featured ? 'Featured Community Event' : selected.badge}
            </span>

            <h3 className="bb-imp-modal-title">{selected.title}</h3>

            <ul className="bb-imp-modal-facts">
              <li>
                <MapPin className="size-4" /> {selected.place}
              </li>
              <li>
                <Clock className="size-4" /> {selected.dow}, {selected.mon} {selected.day} ·{' '}
                {selected.time}
              </li>
              <li>
                <Timer className="size-4" /> {selected.duration}
              </li>
              <li>
                <Footprints className="size-4" /> {selected.distance}
              </li>
            </ul>

            <p className="bb-imp-modal-about">{selected.detail.about}</p>

            {(() => {
              const left = Math.max(0, selected.capacity - selected.count)
              const pct = Math.round((selected.count / selected.capacity) * 100)
              return (
                <div className="bb-imp-modal-slots">
                  <div className="bb-imp-slots-top">
                    <span className="bb-imp-slots-pct">{pct}% full</span>
                    <span className={`bb-imp-slots-left ${left <= 15 ? 'is-urgent' : ''}`}>
                      {left} spots left
                    </span>
                  </div>
                  <div className="bb-imp-slots-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="bb-imp-slots-count">
                    {selected.count} / {selected.capacity} {selected.countLabel.toLowerCase()}
                  </div>
                </div>
              )
            })()}

            <div className="bb-imp-modal-grid">
              <div>
                <span className="bb-imp-modal-k">Meeting point</span>
                <span className="bb-imp-modal-v">{selected.detail.meetingPoint}</span>
                <button
                  className="bb-imp-modal-maplink"
                  onClick={() => {
                    setSelected(null)
                    onNavigate('map')
                  }}
                >
                  <MapPin className="size-3.5" /> View on map <ArrowRight className="size-3.5" />
                </button>
              </div>
              <div>
                <span className="bb-imp-modal-k">Hosted by</span>
                <span className="bb-imp-modal-org">
                  <span className="bb-imp-org-check">
                    <Check className="size-3" />
                  </span>
                  {selected.host}
                </span>
                <span className="bb-imp-modal-verified">Verified organizer</span>
              </div>
            </div>

            <div className="bb-imp-modal-bring">
              <span className="bb-imp-modal-k">Bring if you can</span>
              <div className="bb-imp-bring-chips">
                {selected.detail.bring.map((b) => (
                  <span key={b}>
                    <span className="bb-imp-bring-emoji">{bringIcon(b)}</span> {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="bb-imp-modal-social">
              <div className="bb-imp-avatars">
                {Array.from({ length: Math.min(selected.count, 9) }).map((_, i) => (
                  <span
                    key={i}
                    className="bb-imp-avatar"
                    style={{ background: AVATAR_TONES[i % AVATAR_TONES.length], zIndex: 9 - i }}
                  />
                ))}
              </div>
              <div className="bb-imp-social-text">
                <span className="bb-imp-social-count">{selected.count} volunteers joined</span>
                <span className="bb-imp-social-nudge">Be the {ordinal(selected.count + 1)}.</span>
              </div>
            </div>

            <p className="bb-imp-modal-welcome">
              🙌 Families &amp; first-time volunteers welcome — no experience needed.
            </p>

            <button
              className={`bb-imp-register ${registered ? 'is-done' : ''}`}
              onClick={() => setRegistered(true)}
            >
              {registered ? "You're in! See you there 🎉" : 'Count me in'}
            </button>

            <p className="bb-imp-modal-note">
              After this cleanup, before &amp; after photos and results are shared publicly on the{' '}
              <button
                className="bb-imp-modal-link"
                onClick={() => {
                  setSelected(null)
                  onNavigate('transparency')
                }}
              >
                Transparency page
              </button>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Teaching empty state — what this page will celebrate once cleanups happen. */
function ImpactEmpty() {
  const promises = [
    { emoji: '📷', text: 'Before & after photos' },
    { emoji: '🧹', text: 'Community cleanups' },
    { emoji: '🏘', text: 'Cleaner barangays' },
    { emoji: '🌱', text: 'Environmental milestones' },
  ]
  return (
    <div className="bb-imp-empty">
      <p className="bb-imp-empty-lede">Every cleanup story starts with one report.</p>
      <p className="bb-imp-empty-sub">
        Once issues are reported and resolved, this page will celebrate:
      </p>
      <ul className="bb-imp-empty-grid">
        {promises.map((p) => (
          <li key={p.text}>
            <span className="bb-imp-empty-emoji" aria-hidden>{p.emoji}</span>
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Animated since-launch counters — real community totals, no vanity metrics. */
function ImpactStats({ totals }: { totals: ImpactTotals }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const stats = [
    { icon: FileText, value: totals.reports, label: 'Reports Filed' },
    { icon: Check, value: totals.cleaned, label: 'Issues Cleaned' },
    { icon: ShieldCheck, value: totals.resolutionRate, suffix: '%', label: 'Resolved' },
    { icon: Building2, value: totals.communities, label: 'Communities Active' },
  ]
  return (
    <div className="bb-imp-stats" ref={ref}>
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div key={s.label} className="bb-imp-stat">
            <Icon className="bb-imp-stat-icon size-5" />
            <span className="bb-imp-stat-v">
              <CountUp value={s.value} suffix={s.suffix} active={shown} />
            </span>
            <span className="bb-imp-stat-k">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * "Communities Making Progress" — municipalities ranked by resolution rate,
 * each with a civic health status. Places, not people. Tapping a row flies the
 * map there. Until real reports arrive, an honest empty state invites the first.
 */
function CommunityBoard({
  rows,
  onViewOnMap,
}: {
  rows: CommunityRank[]
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="bb-imp-board-empty">
        <span className="bb-imp-board-empty-dot">🌱</span>
        <p>
          No community data yet. As residents report and neighbours confirm
          cleanups, the communities making the most progress will rise here.
        </p>
      </div>
    )
  }
  return (
    <ul className="bb-imp-board">
      {rows.map((c, i) => {
        const health = HEALTH_META[c.health]
        const growth = GROWTH_META[c.growth]
        return (
          <li
            key={c.name}
            className={`bb-imp-board-row ${onViewOnMap ? 'is-tappable' : ''}`}
            onClick={onViewOnMap ? () => onViewOnMap(c.lat, c.lng, c.zoom) : undefined}
          >
            <span className="bb-imp-board-rank">{i + 1}</span>
            <span
              className="bb-imp-board-level"
              title={`${growth.label} · ${growth.blurb}`}
              aria-label={growth.label}
            >
              {growth.emoji}
            </span>
            <span className="bb-imp-board-place">
              <span className="bb-imp-board-name">{c.name}</span>
              <span className="bb-imp-board-health" style={{ color: health.color }}>
                {health.dot} {health.label}
              </span>
            </span>
            <span className="bb-imp-board-rate">
              <b>{c.resolutionRate}%</b>
              <span className="bb-imp-board-rate-k">resolved</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
