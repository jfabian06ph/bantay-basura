import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Trophy, Flame, MapPin, Info, Sparkles, ArrowRight } from 'lucide-react'
import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { Metric } from './primitives'
import { relativeTime, type DashboardStats } from '../../lib/stats'

interface Props {
  s: DashboardStats
  now: number
  onOpenReport?: (id: string) => void
}

/** A small ⓘ affordance with an on-hover/focus tooltip. */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="bb-tip" tabIndex={0} role="note" aria-label={text}>
      <Info size={13} aria-hidden />
      <span className="bb-tip-bubble">{text}</span>
    </span>
  )
}

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
          {actionLabel ?? 'View details'} <ArrowRight size={13} aria-hidden />
        </button>
      )}
    </div>
  )
}

/** The "This Month" headline grid — the accountability numbers up top. */
export default function HeadlineStats({ s, now, onOpenReport }: Props) {
  const leader = s.cleanestLgus[0]
  const active = s.activeAreas[0]

  // #16 — a tiny green spark rewards a rising resolved rate.
  const prevResolved = useRef(s.resolvedRate)
  const [spark, setSpark] = useState(false)
  useEffect(() => {
    if (s.resolvedRate > prevResolved.current) {
      setSpark(true)
      const t = window.setTimeout(() => setSpark(false), 1400)
      prevResolved.current = s.resolvedRate
      return () => window.clearTimeout(t)
    }
    prevResolved.current = s.resolvedRate
  }, [s.resolvedRate])

  return (
    <section className="bb-dash-section bb-dash-section-lead">
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
            value={
              <>
                <CountUp value={s.resolvedRate} suffix="%" />
                {spark && (
                  <span className="bb-spark" aria-hidden>
                    <Sparkles size={16} />
                  </span>
                )}
              </>
            }
            label={
              <>
                Resolved{' '}
                <InfoTip text="Confirmed clean by the community, or verified cleanup evidence." />
              </>
            }
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
            value={s.latestCleanup ? relativeTime(s.latestCleanup.when, now) : '-'}
            label={
              <>
                Latest cleanup
                {s.latestCleanup && (
                  <span className="bb-dash-confirmed">
                    {' · '}
                    <Sparkles size={12} aria-hidden />{' '}
                    {s.latestCleanup.confirmed ? 'Community confirmed' : 'Verified cleanup'}
                  </span>
                )}
              </>
            }
            foot={
              s.latestCleanup ? (
                <Highlight
                  icon={<MapPin size={14} />}
                  iconColor="#009336"
                  place={s.latestCleanup.lgu}
                  onAction={
                    onOpenReport && s.latestCleanup
                      ? () => onOpenReport(s.latestCleanup!.id)
                      : undefined
                  }
                  actionLabel="See before & after"
                />
              ) : undefined
            }
          />
        </div>
      </Reveal>
    </section>
  )
}
