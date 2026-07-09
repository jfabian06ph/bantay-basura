import { Card, Empty } from './primitives'
import { Donut } from './Charts'
import type { CategoryShare } from '../../lib/stats'

interface Props {
  trends: CategoryShare[]
}

/** "Waste Trends" — share of all reports by waste type, as a donut chart. */
export default function WasteTrend({ trends }: Props) {
  return (
    <Card title="Waste Trends" hint="Share of all reports by type">
      {trends.length ? <Donut items={trends} /> : <Empty />}
    </Card>
  )
}
