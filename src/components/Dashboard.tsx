import { useMemo } from 'react'
import Footer from './Footer'
import Reveal from './Reveal'
import HeadlineStats from './dashboard/HeadlineStats'
import HotspotsSection from './dashboard/HotspotsSection'
import CommunitySection from './dashboard/CommunitySection'
import WasteTrend from './dashboard/WasteTrend'
import RecentCleanup from './dashboard/RecentCleanup'
import { Card } from './dashboard/primitives'
import { StackedBars } from './dashboard/Charts'
import { computeDashboard, relativeTime } from '../lib/stats'
import type { Report } from '../types'

interface Props {
  reports: Report[]
  now: number
  live: boolean
  onClose: () => void
  onNavigate: (view: string) => void
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/**
 * Public accountability page ("Transparency"). All figures are derived from
 * live reports (or seeded demo data), aggregated by LGU — no personal
 * information is ever shown. Renders below the persistent site header.
 */
export default function Dashboard({
  reports,
  now,
  live,
  onClose,
  onNavigate,
  onViewOnMap,
}: Props) {
  const s = useMemo(() => computeDashboard(reports, now), [reports, now])

  const updated = useMemo(() => {
    if (!reports.length) return 'just now'
    const latest = Math.max(...reports.map((r) => new Date(r.createdAt).getTime()))
    return relativeTime(latest, now)
  }, [reports, now])

  return (
    <div className="bb-about bb-dash">
      {/* Split hero: story on the left, Zambales on the right */}
      <section className="bb-dash-hero">
        <div className="bb-dash-hero-copy">
          <div className="bb-dash-hero-eyebrow">Accountability, in the open</div>
          <h1 className="bb-dash-hero-title">
            Public
            <br />
            Transparency
          </h1>
          <p className="bb-dash-hero-lede">
            Real data from real communities.
            <br />
            We believe in openness, accountability, and working together for
            cleaner, healthier places.
          </p>
          <div className="bb-dash-live">
            <span className="bb-live-dot" /> <b>Live data</b>
            <span className="bb-dash-live-sep">·</span> Updated {updated}
          </div>
        </div>
        <div
          className="bb-dash-hero-img"
          style={{ backgroundImage: 'url(/zambales-town.jpg)' }}
        />
      </section>

      <div className="bb-page bb-page-wide">
        <HeadlineStats s={s} now={now} onViewDetails={onClose} />

        <HotspotsSection hotspots={s.hotspots} now={now} onViewOnMap={onViewOnMap} />

        <section className="bb-dash-section">
          <div className="bb-dash-eyebrow">Community Highlights</div>
          <p className="bb-dash-section-lede">
            We celebrate the barangays and communities leading the way in keeping
            their areas clean.
          </p>

          <CommunitySection cleanest={s.cleanestLgus} active={s.activeAreas} />
        </section>

        <section className="bb-dash-section bb-dash-section-tight">
          <div className="bb-dash-eyebrow">Waste Profile</div>
          <p className="bb-dash-section-lede">
            How reports break down by waste type, how volume has trended over the
            last six months, and which areas were most recently cleaned up.
          </p>

          <div className="bb-dash-grid3">
            <WasteTrend trends={s.wasteTrends} />
            <Card title="Reports Over Time" hint="Last 6 months">
              <StackedBars points={s.monthlySeries} />
            </Card>
            <RecentCleanup cleanups={s.recentCleanups} now={now} />
          </div>

          <Reveal>
            <p className="bb-dash-privacy">
              🔒 All figures are aggregated by area. No names, contacts, or personal
              information are ever shown — accountability without exposure.
            </p>
          </Reveal>
        </section>
      </div>

      {/* Full-bleed coastal CTA */}
      <section
        className="bb-dash-cta"
        style={{ backgroundImage: 'url(/zambales-coast.jpg)' }}
      >
        <div className="bb-dash-cta-inner">
          <h2 className="bb-dash-cta-title">Cleaner communities begin with one report.</h2>
          <p className="bb-dash-cta-lede">
            Thank you to every resident, volunteer, and LGU working together.
          </p>
          <button className="bb-dash-cta-btn" onClick={onClose}>
            Back to the map →
          </button>
        </div>
      </section>

      {!live && (
        <p className="bb-dash-demo-note">Showing demo data until the backend is connected.</p>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
