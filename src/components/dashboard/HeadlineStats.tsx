import { useState, type ReactNode } from 'react'
import { ChevronDown, Trophy, Flame, Zap, MapPin } from 'lucide-react'
import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { Metric } from './primitives'
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

/** A data-backed "award" tucked under each KPI. */
function Highlight({
  icon,
  iconColor,
  label,
  place,
  stat,
  onAction,
  actionLabel,
}: {
  icon: ReactNode
  iconColor: string
  label?: string
  place: string
  stat?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <div className="bb-dash-hl">
      {label && (
        <div className="bb-dash-hl-label">
          <span className="bb-dash-hl-icon" style={{ color: iconColor }}>
            {icon}
          </span>
          {label}
        </div>
      )}
      <div className="bb-dash-hl-place">
        {!label && (
          <span className="bb-dash-hl-icon" style={{ color: iconColor }}>
            {icon}
          </span>
        )}
        <span className="bb-dash-hl-placename">{place}</span>
        {stat && <span className="bb-dash-hl-stat">{stat}</span>}
      </div>
      {onAction && (
        <button className="bb-dash-link" onClick={onAction}>
          {actionLabel ?? 'View details →'}
        </button>
      )}
    </div>
  )
}

/** The "This Month" headline grid — the accountability numbers up top. */
export default function HeadlineStats({ s, now, onViewDetails }: Props) {
  const [period, setPeriod] = useState('month')

  const leader = s.cleanestLgus[0]
  const active = s.activeAreas[0]
  const fastest = s.fastestLgu
  const fastestStat = fastest?.value.replace(' days', '-day average')

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
          <Metric
            big
            value={<CountUp value={s.reportsThisMonth} />}
            label="Reports submitted"
            foot={
              <Highlight
                icon={<Trophy size={14} />}
                iconColor="#d1a017"
                label="Community Leader"
                place={leader?.name ?? '-'}
                stat={leader ? `${leader.resolutionRate}% resolved` : undefined}
              />
            }
          />
          <Metric
            big
            value={<CountUp value={s.resolvedRate} suffix="%" />}
            label="Resolved"
            accent
            foot={
              <Highlight
                icon={<Flame size={14} />}
                iconColor="#e0662a"
                label="Most Reported Area"
                place={active?.name ?? '-'}
                stat={active ? `${active.confirmations} community confirmations` : undefined}
              />
            }
          />
          <Metric
            value={
              s.avgResponseDays !== null ? (
                <CountUp value={s.avgResponseDays} decimals={1} suffix=" days" />
              ) : (
                '-'
              )
            }
            label="Average response"
            foot={
              <Highlight
                icon={<Zap size={14} />}
                iconColor="#2563eb"
                label="Fastest Cleanup"
                place={fastest?.name ?? '-'}
                stat={fastestStat}
              />
            }
          />
          <Metric
            value={s.latestCleanup ? relativeTime(s.latestCleanup.when, now) : '-'}
            label="Latest cleanup"
            foot={
              s.latestCleanup ? (
                <Highlight
                  icon={<MapPin size={14} />}
                  iconColor="#009336"
                  place={s.latestCleanup.lgu}
                  onAction={onViewDetails}
                  actionLabel="See before & after →"
                />
              ) : undefined
            }
          />
        </div>
      </Reveal>
    </section>
  )
}
