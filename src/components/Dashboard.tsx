import { useMemo } from 'react'
import { BarChart3, Check } from 'lucide-react'
import Footer from './Footer'
import Reveal from './Reveal'
import HeadlineStats from './dashboard/HeadlineStats'
import HotspotsSection from './dashboard/HotspotsSection'
import CommunitySection from './dashboard/CommunitySection'
import CommunitySpotlight from './dashboard/CommunitySpotlight'
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
  onClose,
  onNavigate,
  onViewOnMap,
}: Props) {
  const s = useMemo(() => computeDashboard(reports, now), [reports, now])
  const empty = reports.length === 0

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
            <span className="bb-live-dot" />{' '}
            {empty ? (
              <b>Waiting for the first report</b>
            ) : (
              <>
                <b>Live data</b>
                <span className="bb-dash-live-sep">·</span> Updated {updated}
              </>
            )}
          </div>
        </div>
        <div
          className="bb-dash-hero-img"
          style={{ backgroundImage: 'url(/zambales-town.jpg)' }}
        />
      </section>

      <div className="bb-page bb-page-wide">
        {empty ? (
          <section className="bb-dash-empty">
            <div className="bb-dash-empty-card">
              <span className="bb-dash-empty-icon">
                <BarChart3 className="size-7" strokeWidth={1.5} />
              </span>
              <h2 className="bb-dash-empty-title">Nothing to show yet.</h2>
              <p className="bb-dash-empty-lede">
                No reports have come in for this area. As residents flag waste,
                this page fills with the numbers that keep everyone accountable:
              </p>
              <ul className="bb-dash-empty-list">
                <li><Check className="size-4" /> How many reports were submitted</li>
                <li><Check className="size-4" /> Average cleanup time</li>
                <li><Check className="size-4" /> Resolution rate</li>
                <li><Check className="size-4" /> Community verification</li>
              </ul>
              <p className="bb-dash-empty-foot">
                Every report helps build a more transparent community.
              </p>
              <button className="bb-dash-empty-btn" onClick={onClose}>
                Report the first issue
              </button>
            </div>
          </section>
        ) : (
          <>
            <HeadlineStats s={s} now={now} onViewDetails={onClose} />

            <HotspotsSection
              hotspots={s.hotspots}
              reports={reports}
              now={now}
              onViewOnMap={onViewOnMap}
            />

            <section className="bb-dash-section">
              <div className="bb-dash-eyebrow">Community Highlights</div>

              <CommunitySection cleanest={s.cleanestLgus} active={s.activeAreas} />
            </section>

            <section className="bb-dash-section bb-dash-section-tight">
              <div className="bb-dash-eyebrow">Waste Profile</div>

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
                  information are ever shown. Accountability without exposure.
                </p>
              </Reveal>
            </section>

            <CommunitySpotlight
              cleanups={s.recentCleanups}
              onReadMore={() => onNavigate('reports')}
            />
          </>
        )}
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  )
}
