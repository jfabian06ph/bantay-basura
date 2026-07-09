import { useState } from 'react'
import { ChevronDown, Leaf } from 'lucide-react'
import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { Metric, Headline } from './primitives'
import { relativeTime, type DashboardStats } from '../../lib/stats'

interface Props {
  s: DashboardStats
  now: number
  onViewDetails?: () => void
}

const PERIODS = [
  { value: 'month', label: 'This Month' },
  { value: 'last', label: 'Last Month' },
  { value: 'quarter', label: 'Last 3 Months' },
  { value: 'all', label: 'All Time' },
]

/** A signed "vs last month" delta with a directional arrow. */
function Delta({
  value,
  unit = '',
  decimals = 0,
  goodWhen,
}: {
  value: number
  unit?: string
  decimals?: number
  goodWhen: 'up' | 'down'
}) {
  const up = value > 0
  const magnitude = Math.abs(value).toFixed(decimals)
  const good = (up && goodWhen === 'up') || (!up && goodWhen === 'down')
  return (
    <span className={`bb-dash-delta ${good ? 'bb-dash-delta-good' : 'bb-dash-delta-bad'}`}>
      {up ? '↑' : '↓'} {magnitude}
      {unit} vs last month
    </span>
  )
}

/** The "This Month" headline grid — the accountability numbers up top. */
export default function HeadlineStats({ s, now, onViewDetails }: Props) {
  const [period, setPeriod] = useState('month')

  return (
    <section className="bb-dash-section bb-dash-section-lead">
      <div className="bb-dash-period">
        <select
          className="bb-dash-period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Time period"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="bb-dash-period-chev" size={13} aria-hidden />
      </div>
      <Reveal>
        <div className="bb-dash-grid">
          <Metric big value={<CountUp value={s.reportsThisMonth} />} label="Reports submitted" />
          <Metric
            big
            value={<CountUp value={s.resolvedRate} suffix="%" />}
            label="Resolved"
            accent
            sub={
              s.resolvedRateDelta !== null ? (
                <Delta value={s.resolvedRateDelta} unit="%" goodWhen="up" />
              ) : undefined
            }
          />
          <Metric
            value={
              s.avgResponseDays !== null ? (
                <CountUp value={s.avgResponseDays} decimals={1} suffix=" days" />
              ) : (
                '—'
              )
            }
            label="Average response time"
            sub={
              s.avgResponseDelta !== null ? (
                <Delta value={s.avgResponseDelta} decimals={1} goodWhen="down" />
              ) : undefined
            }
          />
          <Headline title="Fastest LGU" stat={s.fastestLgu} icon={<Leaf size={15} />} />
          <Headline title="Most Improved" stat={s.mostImproved} icon={<Leaf size={15} />} />
          <Metric
            value={s.latestCleanup ? relativeTime(s.latestCleanup.when, now) : '—'}
            label={
              s.latestCleanup
                ? `Latest cleanup in ${s.latestCleanup.lgu}, Zambales`
                : 'Latest cleanup'
            }
            foot={
              s.latestCleanup && onViewDetails ? (
                <button className="bb-dash-link" onClick={onViewDetails}>
                  View details →
                </button>
              ) : undefined
            }
          />
        </div>
      </Reveal>
    </section>
  )
}
