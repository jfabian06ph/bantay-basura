import { useMemo } from 'react'
import Footer from './Footer'
import Reveal from './Reveal'
import HeadlineStats from './dashboard/HeadlineStats'
import CommunitySection from './dashboard/CommunitySection'
import ImpactSection from './dashboard/ImpactSection'
import WasteTrend from './dashboard/WasteTrend'
import RecentCleanup from './dashboard/RecentCleanup'
import { Card } from './dashboard/primitives'
import { Sparkline } from './dashboard/Charts'
import { computeDashboard } from '../lib/stats'
import type { Report } from '../types'

interface Props {
  reports: Report[]
  now: number
  live: boolean
  onClose: () => void
  onNavigate: (view: string) => void
}

/**
 * Public accountability dashboard + community highlights. All figures are
 * derived from live reports (or seeded demo data), aggregated by LGU — no
 * personal information is ever shown. Layout only; each section owns its
 * own presentation and animations.
 */
export default function Dashboard({ reports, now, live, onClose, onNavigate }: Props) {
  const s = useMemo(() => computeDashboard(reports, now), [reports, now])

  return (
    <div className="bb-about bb-dash">
      <header className="bb-about-nav">
        <img
          className="bb-about-wordmark"
          src="/logo-wordmark.png"
          alt="Bantay Basura"
        />
        <button className="bb-about-back" onClick={onClose}>
          ✕ Close
        </button>
      </header>

      <section className="bb-about-hero" style={{ paddingBottom: 24 }}>
        <div className="bb-trust-eyebrow" style={{ color: '#8a847c' }}>
          Accountability, in the open
        </div>
        <h1 className="bb-about-title" style={{ fontSize: 'clamp(40px, 12vw, 76px)' }}>
          Public Dashboard
        </h1>
        <p className="bb-about-lede">
          The health of waste reporting across Zambales — this month, at a glance.
          {!live && ' Showing demo data until the backend is connected.'}
        </p>
      </section>

      <HeadlineStats s={s} now={now} />

      <section className="bb-dash-section">
        <div className="bb-trust-eyebrow" style={{ color: '#8a847c', marginBottom: 6 }}>
          People love seeing progress
        </div>
        <h2 className="bb-dash-h1">Community</h2>

        <CommunitySection cleanest={s.cleanestLgus} active={s.activeAreas} />
        <ImpactSection impact={s.monthlyImpact} />
        <WasteTrend trends={s.wasteTrends} />

        <Card title="Reports Over Time" hint="Last 6 months">
          <Sparkline points={s.monthlySeries} />
        </Card>

        <RecentCleanup cleanups={s.recentCleanups} now={now} />

        <Reveal>
          <p className="bb-dash-privacy">
            🔒 All figures are aggregated by area. No names, contacts, or personal
            information are ever shown — accountability without exposure.
          </p>
        </Reveal>
      </section>

      <section className="bb-about-cta">
        <button className="bb-about-cta-btn" onClick={onClose}>
          Back to the map →
        </button>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
