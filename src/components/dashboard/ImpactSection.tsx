import CountUp from '../CountUp'
import { Card, Metric } from './primitives'
import { useReveal } from '../../hooks/useReveal'
import type { DashboardStats } from '../../lib/stats'

interface Props {
  impact: DashboardStats['monthlyImpact']
}

/** This month's tangible impact — counters animate up when scrolled into view. */
export default function ImpactSection({ impact }: Props) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <Card title="Monthly Impact">
      <div className="bb-dash-impact" ref={ref}>
        <Metric value={<CountUp value={impact.reports} active={shown} />} label="New reports" />
        <Metric
          value={<CountUp value={impact.resolved} active={shown} />}
          label="Cleaned up"
          accent
        />
        <Metric
          value={<CountUp value={impact.confirmations} active={shown} />}
          label="Confirmations"
        />
      </div>
    </Card>
  )
}
