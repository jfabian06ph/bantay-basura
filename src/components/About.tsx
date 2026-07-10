import {
  ArrowRight,
  Users,
  Eye,
  HeartHandshake,
  Flag,
} from 'lucide-react'
import Footer from './Footer'
import BeforeAfter from './BeforeAfter'
import type { Report } from '../types'

interface Props {
  onClose: () => void
  activeCount: number
  reports: Report[]
  now: number
  onNavigate: (view: string) => void
}

const STEPS = [
  {
    n: '01',
    title: 'Tingnan',
    body: 'May nakita kang nakakalat na basura? Buksan ang app, awtomatikong makukuha ang lokasyon mo.',
  },
  {
    n: '02',
    title: 'I-flag',
    body: 'Kumuha ng larawan, piliin ang uri at gaano kalala. Isang tap lang, nakalagay na sa mapa.',
  },
  {
    n: '03',
    title: 'Linisin',
    body: 'Makikita ng lahat, at ng LGU, kung saan ang problema. Kapag nalinis na, i-tap ang “Nalinis na”.',
  },
]

const BELIEFS = [
  { icon: Users, title: 'Community first', body: 'The people who live somewhere know it best.' },
  { icon: Eye, title: 'Transparency always', body: 'Everything reported and resolved stays in the open.' },
  { icon: HeartHandshake, title: 'Everyone can help', body: 'Residents, volunteers, schools, LGUs — all of us.' },
  { icon: Flag, title: 'Every report matters', body: 'One flag can start a whole cleanup.' },
]

const WEEK = 7 * 86_400_000

/** Minimal, editorial About page — the emotional heart of the product. */
export default function About({ activeCount, reports, now, onNavigate }: Props) {
  const inReview = reports.filter((r) => r.status === 'in_review').length
  const pending = reports.filter((r) => r.status === 'pending').length
  const resolvedWeek = reports.filter(
    (r) => r.status === 'resolved' && r.resolvedAt && now - new Date(r.resolvedAt).getTime() <= WEEK,
  ).length

  return (
    <div className="bb-about">
      <div className="bb-page">
        {/* ---------- Hero (unchanged) ---------- */}
        <section className="bb-about-hero">
          <h1 className="bb-about-title">
            Tingnan.
            <br />
            I-report.
            <br />
            <span className="bb-about-accent">Linisin.</span>
          </h1>
          <p className="bb-about-lede">
            Hindi lahat ng problema ay kailangang lutasin mag-isa. Minsan, kailangan lang muna itong{' '}
            <strong>makita</strong>.
          </p>
        </section>

        {/* ---------- My story (trimmed) ---------- */}
        <section className="bb-about-block">
          <p className="bb-about-para">
            Mahilig akong mag-travel. Sa bawat biyahe, napapansin ko kung gaano kaiba ang kuwento ng
            bawat lugar — may mga komunidad na malinis at maayos, at may mga lugar na may basurang{' '}
            <em>tila matagal nang hindi napapansin</em>.
          </p>
          <p className="bb-about-para">
            Hindi ito tungkol sa paghusga sa isang bayan. Ipinapaalala lang nito na ang kalinisan ay{' '}
            <strong>responsibilidad nating lahat</strong>.
          </p>
          <p className="bb-about-para">
            Bilang software developer, gusto kong gamitin ang aking kakayahan para sa mga proyektong
            may tunay na pakinabang sa komunidad. Mula sa simpleng obserbasyong iyon isinilang ang{' '}
            <strong>Bantay Basura</strong>.
          </p>
        </section>

        {/* ---------- Manifesto break ---------- */}
        <section className="bb-about-manifesto">
          <h2>
            We don&rsquo;t lack people who care.
            <br />
            <span>We lack visibility.</span>
          </h2>
          <p>
            The waste we walk past every day is rarely a mystery — someone always noticed it first.
            What&rsquo;s missing is a way to make it visible, shared, and impossible to ignore. That
            is the whole idea behind Bantay Basura.
          </p>
        </section>
      </div>

      {/* ---------- Full-width before/after (rhythm break) ---------- */}
      <section className="bb-about-ba">
        <div className="bb-about-ba-inner">
          <BeforeAfter before="/zambales-town.jpg" after="/zambales-coast.jpg" />
          <p className="bb-about-ba-cap">A real roadside, before and after the community stepped in.</p>
        </div>
      </section>

      <div className="bb-page">
        {/* ---------- What we believe ---------- */}
        <section className="bb-about-beliefs">
          <h2 className="bb-about-h2">What we believe</h2>
          <div className="bb-about-beliefs-grid">
            {BELIEFS.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="bb-about-belief">
                  <Icon className="bb-about-belief-icon size-5" />
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ---------- Paano ito gumagana (unchanged) ---------- */}
        <section className="bb-about-steps">
          <h2 className="bb-about-h2">Paano ito gumagana</h2>
          {STEPS.map((s) => (
            <div className="bb-about-step" key={s.n}>
              <span className="bb-about-step-n">{s.n}</span>
              <div>
                <h3 className="bb-about-step-title">{s.title}</h3>
                <p className="bb-about-step-body">{s.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---------- Live numbers (expanded) ---------- */}
        <section className="bb-about-live">
          <div className="bb-about-live-hero">
            <div className="bb-about-stat-num">{activeCount}</div>
            <div className="bb-about-stat-label">active reports</div>
          </div>
          <div className="bb-about-live-row">
            <div className="bb-about-live-stat">
              <b>{inReview}</b>
              <span>In review</span>
            </div>
            <div className="bb-about-live-stat">
              <b>{pending}</b>
              <span>Awaiting action</span>
            </div>
            <div className="bb-about-live-stat">
              <b>{resolvedWeek}</b>
              <span>Resolved this week</span>
            </div>
          </div>
        </section>

        {/* ---------- Open project ---------- */}
        <section className="bb-about-open">
          <h2 className="bb-about-h2">Open project</h2>
          <p className="bb-about-open-lead">
            Built in the Philippines. Open to LGUs. Open to volunteers. Open to contributors.
          </p>
          <div className="bb-about-open-chips">
            <span>Community-led</span>
            <span>Open Data</span>
            <span>Volunteer-powered</span>
          </div>
        </section>
      </div>

      {/* ---------- Closing challenge ---------- */}
      <section className="bb-about-close">
        <div className="bb-page">
          <h2 className="bb-about-close-title">
            Mas malinis na komunidad hindi nagsisimula sa gobyerno.
            <br />
            <span>Nagsisimula ito sa taong unang nag-report.</span>
          </h2>
          <p className="bb-about-close-line">
            Change doesn&rsquo;t begin with a cleanup. It begins when someone decides to report what
            everyone else walks past.
          </p>
          <div className="bb-about-close-btns">
            <button className="bb-about-close-primary" onClick={() => onNavigate('map')}>
              Report your first issue <ArrowRight className="size-4" />
            </button>
            <button className="bb-about-close-secondary" onClick={() => onNavigate('map')}>
              Explore the live map
            </button>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
