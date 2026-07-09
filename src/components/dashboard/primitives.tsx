import Reveal from '../Reveal'
import type { HeadlineStat } from '../../lib/stats'

/** A single headline number with a label (and optional sub-line). */
export function Metric({
  value,
  label,
  sub,
  big,
  accent,
}: {
  value: React.ReactNode
  label: string
  sub?: string
  big?: boolean
  accent?: boolean
}) {
  return (
    <div className={`bb-dash-metric ${big ? 'bb-dash-metric-big' : ''}`}>
      <div className={`bb-dash-metric-val ${accent ? 'bb-dash-accent' : ''}`}>{value}</div>
      <div className="bb-dash-metric-label">{label}</div>
      {sub && <div className="bb-dash-metric-sub">{sub}</div>}
    </div>
  )
}

/** A named headline (e.g. "Fastest LGU") resolving to a place + value. */
export function Headline({ title, stat }: { title: string; stat: HeadlineStat | null }) {
  return (
    <div className="bb-dash-metric">
      <div className="bb-dash-metric-label" style={{ marginBottom: 4 }}>
        {title}
      </div>
      {stat ? (
        <>
          <div className="bb-dash-metric-name">{stat.name}</div>
          <div className="bb-dash-metric-sub">
            {stat.value}
            {stat.sub ? ` · ${stat.sub}` : ''}
          </div>
        </>
      ) : (
        <div className="bb-dash-metric-name bb-dash-dim">—</div>
      )}
    </div>
  )
}

/** A titled card that fades + lifts into view. */
export function Card({
  title,
  hint,
  delay,
  children,
}: {
  title: string
  hint?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <Reveal className="bb-dash-card" delay={delay}>
      <div className="bb-dash-card-head">
        <h3 className="bb-dash-card-title">{title}</h3>
        {hint && <span className="bb-dash-card-hint">{hint}</span>}
      </div>
      {children}
    </Reveal>
  )
}

export function Empty({ label = 'Not enough data yet.' }: { label?: string }) {
  return <p className="bb-dash-empty">{label}</p>
}
