import {
  ArrowRight,
  Users,
  Eye,
  HeartHandshake,
  Flag,
} from 'lucide-react'
import Footer from './Footer'
import BeforeAfter from './BeforeAfter'
import CountUp from './CountUp'
import { useReveal } from '../hooks/useReveal'
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
    title: 'I-report',
    body: 'Kumuha ng larawan, piliin ang uri at gaano kalala. Isang tap lang, nakalagay na sa mapa.',
  },
  {
    n: '03',
    title: 'Linisin',
    body: 'Makikita ng lahat, at ng LGU, kung saan ang problema. Kapag nalinis na, i-tap ang “Nalinis na”.',
  },
]

const BELIEFS = [
  { icon: Users, title: 'Community first', body: 'Communities solve problems together.' },
  { icon: Eye, title: 'Transparency always', body: 'Every report and cleanup remains public.' },
  { icon: HeartHandshake, title: 'Everyone can help', body: 'Residents, volunteers and schools all play a role.' },
  { icon: Flag, title: 'Every report matters', body: 'One report can start real change.' },
]

const WEEK = 7 * 86_400_000

/** Minimal, editorial About page — the emotional heart of the product. */
export default function About({ activeCount, reports, now, onNavigate }: Props) {
  const inReview = reports.filter((r) => r.status === 'in_review').length
  const pending = reports.filter((r) => r.status === 'pending').length
  const resolvedWeek = reports.filter(
    (r) => r.status === 'resolved' && r.resolvedAt && now - new Date(r.resolvedAt).getTime() <= WEEK,
  ).length
  const live = useReveal<HTMLElement>()

  return (
    <div className="bb-about">
      <div className="bb-page">
        {/* ---------- Hero (unchanged) ---------- */}
        <section className="bb-about-hero">
          <div className="bb-about-manifesto-label">Our manifesto</div>
          <h1 className="bb-about-title">
            Tingnan.
            <br />
            I-report.
            <br />
            <span className="bb-about-accent">Linisin.</span>
          </h1>
          <p className="bb-about-lede">
            Not every problem can be solved alone. But every solution begins with someone choosing
            not to <strong>look away</strong>.
          </p>
        </section>

        {/* ---------- My story (trimmed) ---------- */}
        <section className="bb-about-block">
          <p className="bb-about-para">
            I love traveling. Every trip reminds me how differently communities care for their
            surroundings. Some places are clean and well maintained. Others have waste that has
            become so familiar, <em>people barely notice it anymore</em>.
          </p>
          <p className="bb-about-para">
            This isn&rsquo;t about criticizing a town or a city. It&rsquo;s a reminder that keeping
            our communities clean is <strong>everyone&rsquo;s responsibility</strong>.
          </p>
          <p className="bb-about-para">
            As a software developer, I wanted to use my skills for something beyond commercial
            projects, something that could genuinely help communities.
          </p>
          <p className="bb-about-para">
            That simple observation became <strong>Bantay Basura</strong>: a community-powered
            platform that helps residents report waste hotspots, make cleanups visible, and encourage
            collective action toward cleaner neighborhoods.
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
            Communities rarely ignore waste because they don&rsquo;t care. More often, they simply
            can&rsquo;t see the full picture.
          </p>
          <p className="bb-about-manifesto-line">
            Visibility creates accountability. Accountability creates action.
          </p>
        </section>
      </div>

      {/* ---------- Full-width before/after (rhythm break) ---------- */}
      <section className="bb-about-ba">
        <div className="bb-about-ba-inner">
          <BeforeAfter before="/zambales-town.jpg" after="/zambales-coast.jpg" hint />
          <p className="bb-about-ba-cap">
            <strong>Visibility creates action.</strong> Before and after one community cleanup.
          </p>
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
          <h2 className="bb-about-h2">How it starts</h2>
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
        <section className="bb-about-live" ref={live.ref}>
          <div className="bb-about-live-hero">
            <div className="bb-about-stat-num">
              <CountUp value={activeCount} active={live.shown} />
            </div>
            <div className="bb-about-stat-label">active reports</div>
          </div>
          <div className="bb-about-live-row">
            <div className="bb-about-live-stat">
              <b>
                <CountUp value={pending} active={live.shown} />
              </b>
              <span>Open</span>
            </div>
            <div className="bb-about-live-stat">
              <b>
                <CountUp value={inReview} active={live.shown} />
              </b>
              <span>Under review</span>
            </div>
            <div className="bb-about-live-stat">
              <b>
                <CountUp value={resolvedWeek} active={live.shown} />
              </b>
              <span>Resolved this week</span>
            </div>
          </div>
        </section>

        {/* ---------- Open project ---------- */}
        <section className="bb-about-open">
          <h2 className="bb-about-h2">Open movement</h2>
          <p className="bb-about-open-lead">
            Built in the Philippines. Open to local governments, volunteers, schools, organizations,
            and anyone who wants to build cleaner communities together.
          </p>
          <div className="bb-about-open-chips">
            <span>Community-led</span>
            <span>Open Data</span>
            <span>Volunteer-powered</span>
          </div>
        </section>

        {/* ---------- Honest note: built by one person ---------- */}
        <section className="bb-about-maker">
          <h2 className="bb-about-h2">Built by one developer</h2>
          <p className="bb-about-para">
            Bantay Basura began as a personal project after noticing the same pattern while
            traveling, communities that cared, but lacked a simple way to make problems visible.
          </p>
          <p className="bb-about-para">
            It isn&rsquo;t backed by a company. It&rsquo;s built one feature at a time, with the hope
            that open technology can help neighborhoods work together.
          </p>
        </section>
      </div>

      {/* ---------- Closing challenge ---------- */}
      <section className="bb-about-close">
        <div className="bb-page">
          <h2 className="bb-about-close-title">
            Mas malinis na komunidad hindi nagsisimula sa gobyerno.
            <br />
            <span>Nagsisimula ito sa isang taong may malasakit.</span>
          </h2>
          <p className="bb-about-close-line">
            Change begins the moment someone chooses not to look away.
          </p>
          <div className="bb-about-close-btns">
            <button className="bb-about-close-primary" onClick={() => onNavigate('map')}>
              Report your first issue <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
