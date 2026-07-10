import { Trophy } from 'lucide-react'
import { Card, Empty } from './primitives'
import type { LguStat } from '../../lib/stats'

interface Props {
  cleanest: LguStat[]
  active: LguStat[]
}

const TROPHY_COLORS = ['#d1a017', '#9aa0a6', '#b4703a'] // gold, silver, bronze

/** Rank badge — a trophy for the top three, a number otherwise. */
function Rank({ i }: { i: number }) {
  if (i < TROPHY_COLORS.length) {
    return (
      <span className="bb-dash-rank-medal" aria-label={`Rank ${i + 1}`}>
        <Trophy size={16} style={{ color: TROPHY_COLORS[i] }} />
      </span>
    )
  }
  return <span className="bb-dash-rank-n">{i + 1}</span>
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
