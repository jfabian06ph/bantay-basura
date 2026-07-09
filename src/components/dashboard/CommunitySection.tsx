import { Trophy } from 'lucide-react'
import { Card, Empty } from './primitives'
import type { LguStat } from '../../lib/stats'

interface Props {
  cleanest: LguStat[]
  active: LguStat[]
}

/** Rank badge — a trophy for #1, the number otherwise. */
function Rank({ i }: { i: number }) {
  return (
    <span className="bb-dash-rank-n">
      {i === 0 ? <Trophy size={13} aria-label="Leader" /> : i + 1}
    </span>
  )
}

/** Side-by-side leaderboards: cleanest areas and most active areas. */
export default function CommunitySection({ cleanest, active }: Props) {
  return (
    <div className="bb-dash-cols">
      <Card title="Top Cleanest Areas" hint="By resolution rate">
        {cleanest.length ? (
          <ol className="bb-dash-rank">
            {cleanest.map((l, i) => (
              <li key={l.name}>
                <Rank i={i} />
                <span className="bb-dash-rank-name">{l.name}</span>
                <span className="bb-dash-rank-val">{l.resolutionRate}%</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty />
        )}
      </Card>

      <Card title="Most Active Areas" hint="Community confirmations" delay={80}>
        {active.length ? (
          <ol className="bb-dash-rank">
            {active.map((l, i) => (
              <li key={l.name}>
                <Rank i={i} />
                <span className="bb-dash-rank-name">{l.name}</span>
                <span className="bb-dash-rank-val">{l.confirmations}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty />
        )}
      </Card>
    </div>
  )
}
