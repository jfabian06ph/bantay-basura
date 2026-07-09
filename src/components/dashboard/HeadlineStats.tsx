import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { Metric, Headline } from './primitives'
import { relativeTime, type DashboardStats } from '../../lib/stats'

interface Props {
  s: DashboardStats
  now: number
}

/** The "This Month" headline grid — the accountability numbers up top. */
export default function HeadlineStats({ s, now }: Props) {
  return (
    <section className="bb-dash-section">
      <h2 className="bb-about-h2">This Month</h2>
      <Reveal>
        <div className="bb-dash-grid">
          <Metric big value={<CountUp value={s.reportsThisMonth} />} label="Reports" />
          <Metric big value={<CountUp value={s.resolvedRate} suffix="%" />} label="Resolved" accent />
          <Metric
            value={
              s.avgResponseDays !== null ? (
                <CountUp value={s.avgResponseDays} decimals={1} suffix=" days" />
              ) : (
                '—'
              )
            }
            label="Average Response"
          />
          <Headline title="Fastest LGU" stat={s.fastestLgu} />
          <Headline title="Most Improved" stat={s.mostImproved} />
          <Metric
            value={s.latestCleanup ? relativeTime(s.latestCleanup.when, now) : '—'}
            label="Latest Cleanup"
            sub={s.latestCleanup?.lgu}
          />
        </div>
      </Reveal>
    </section>
  )
}
