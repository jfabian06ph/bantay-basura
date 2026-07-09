import { Card, Empty } from './primitives'
import { relativeTime, type RecentCleanup as Cleanup } from '../../lib/stats'
import { CATEGORY_EMOJI } from '../../types'

interface Props {
  cleanups: Cleanup[]
  now: number
}

/** The latest resolved reports — the "cleanup events" feed. */
export default function RecentCleanup({ cleanups, now }: Props) {
  return (
    <Card title="Recent Cleanups" hint="Latest resolved reports">
      {cleanups.length ? (
        <ul className="bb-dash-events">
          {cleanups.map((c) => (
            <li key={c.id}>
              <span className="bb-dash-event-emoji">{CATEGORY_EMOJI[c.category]}</span>
              <span className="bb-dash-event-name">{c.lgu}</span>
              <span className="bb-dash-event-when">{relativeTime(c.when, now)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty label="No cleanups recorded yet — be the first to resolve a flag." />
      )}
    </Card>
  )
}
