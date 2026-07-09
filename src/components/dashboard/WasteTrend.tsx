import { Card, Empty } from './primitives'
import { ShareBars } from './Charts'
import type { CategoryShare } from '../../lib/stats'

interface Props {
  trends: CategoryShare[]
}

/** "Waste Trends" — share of all reports by waste type, as growing bars. */
export default function WasteTrend({ trends }: Props) {
  return (
    <Card title="Waste Trends" hint="Share of all reports by type">
      {trends.length ? <ShareBars items={trends} /> : <Empty />}
    </Card>
  )
}
