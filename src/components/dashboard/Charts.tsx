import { useReveal } from '../../hooks/useReveal'
import { CATEGORY_EMOJI, type Category } from '../../types'
import type { CategoryShare, TrendPoint } from '../../lib/stats'

/**
 * Horizontal share bars (e.g. waste by type). Each fill grows from zero the
 * first time the chart scrolls into view, staggered for a cascading feel.
 */
export function ShareBars({ items }: { items: CategoryShare[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div className="bb-dash-bars" ref={ref}>
      {items.map((c, i) => (
        <div className="bb-dash-bar-row" key={c.category}>
          <span className="bb-dash-bar-label">
            {CATEGORY_EMOJI[c.category as Category]} {c.label}
          </span>
          <span className="bb-dash-bar-track">
            <span
              className="bb-dash-bar-fill"
              style={{
                width: shown ? `${c.share}%` : 0,
                transitionDelay: `${i * 80}ms`,
              }}
            />
          </span>
          <span className="bb-dash-bar-val">{c.count}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Vertical bars over time. Bars grow from the baseline when revealed.
 */
export function Sparkline({ points }: { points: TrendPoint[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const max = Math.max(1, ...points.map((p) => p.count))
  return (
    <div className="bb-dash-spark" ref={ref}>
      {points.map((m, i) => (
        <div className="bb-dash-spark-col" key={i}>
          <span
            className="bb-dash-spark-bar"
            style={{
              height: shown ? `${Math.round((m.count / max) * 100)}%` : 0,
              transitionDelay: `${i * 60}ms`,
            }}
            title={`${m.count} report${m.count === 1 ? '' : 's'}`}
          />
          <span className="bb-dash-spark-n">{m.count}</span>
          <span className="bb-dash-spark-label">{m.label}</span>
        </div>
      ))}
    </div>
  )
}
