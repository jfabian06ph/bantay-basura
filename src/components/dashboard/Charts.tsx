import { useState } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { SOURCE_LABELS, SOURCE_ORDER, type Category, type ReportSource } from '../../types'
import { CATEGORY_ICON } from '../../lib/categoryIcons'
import type { CategoryShare, TrendPoint } from '../../lib/stats'

/** Reporter-role colors for the stacked "Reports Over Time" bars. */
export const SOURCE_COLORS: Record<ReportSource, string> = {
  resident: '#2f9e54',
  lgu: '#237878',
  volunteer: '#9ccf6b',
}

/** Green-forward palette for waste types — deliberately no loud red. */
export const CATEGORY_COLORS: Record<Category, string> = {
  household: '#00792c',
  dumping: '#4f9440',
  water: '#237878',
  recycling: '#8ab84e',
  burning: '#d98a24',
  construction: '#8a7350',
  hazardous: '#7c3aed',
  bulky: '#4d7fb3',
  dead_animal: '#7a8290',
}

/**
 * Interactive donut of waste share by type. Segments draw on in a staggered
 * sweep when revealed; hovering a segment or legend row focuses it and updates
 * the center label. Arc lengths use raw counts so the ring always closes.
 */
export function Donut({ items }: { items: CategoryShare[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const total = items.reduce((sum, c) => sum + c.count, 0) || 1

  let acc = 0
  const segs = items.map((c) => {
    const start = (acc / total) * 100
    acc += c.count
    const len = (c.count / total) * 100
    return { c, start, len }
  })

  const focus = active !== null ? items[active] : null

  return (
    <div className="bb-dash-waste" ref={ref}>
      <div className="bb-dash-donut" onMouseLeave={() => setActive(null)}>
        <svg viewBox="0 0 36 36" className="bb-dash-donut-svg">
          {segs.map(({ c, start, len }, i) =>
            len <= 0 ? null : (
            <circle
              key={c.category}
              className="bb-dash-donut-seg"
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              pathLength={100}
              stroke={CATEGORY_COLORS[c.category]}
              strokeWidth={active === i ? 5 : 3.6}
              strokeLinecap="round"
              strokeDasharray={shown ? `${len} ${100 - len}` : '0 100'}
              strokeDashoffset={-start}
              transform="rotate(-90 18 18)"
              style={{
                transitionDelay: `${i * 110}ms`,
                opacity: active === null || active === i ? 1 : 0.3,
              }}
              onMouseEnter={() => setActive(i)}
            />
          ))}
        </svg>
        <div className="bb-dash-donut-center">
          <span className="bb-dash-donut-center-num">
            {focus ? `${focus.share}%` : total}
          </span>
          <span className="bb-dash-donut-center-label">
            {focus ? focus.label : total === 1 ? 'report' : 'reports'}
          </span>
        </div>
      </div>
      <ul
        className={`bb-dash-donut-legend ${shown ? 'is-in' : ''}`}
        onMouseLeave={() => setActive(null)}
      >
        {items.map((c, i) => (
          <li
            key={c.category}
            className={active === i ? 'is-active' : ''}
            style={{ '--i': i } as React.CSSProperties}
            onMouseEnter={() => setActive(i)}
          >
            <span
              className="bb-dash-legend-dot"
              style={{ background: CATEGORY_COLORS[c.category] }}
            />
            <span className="bb-dash-legend-name">{c.label}</span>
            <span className="bb-dash-legend-val">{c.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Horizontal share bars (e.g. waste by type). Each fill grows from zero the
 * first time the chart scrolls into view, staggered for a cascading feel.
 */
export function ShareBars({ items }: { items: CategoryShare[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div className="bb-dash-bars" ref={ref}>
      {items.map((c, i) => {
        const Icon = CATEGORY_ICON[c.category as Category]
        return (
        <div className="bb-dash-bar-row" key={c.category}>
          <span className="bb-dash-bar-label inline-flex items-center gap-1.5">
            <Icon className="size-4" /> {c.label}
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
        )
      })}
    </div>
  )
}

/**
 * Stacked vertical bars over time, segmented by reporter role (Residents /
 * LGU / Volunteers). Bars grow from the baseline when revealed; hovering a
 * column shows a tooltip breaking the month down by role. A legend sits below.
 */
export function StackedBars({ points }: { points: TrendPoint[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.count))

  return (
    <>
      <div className="bb-dash-spark" ref={ref}>
        {points.map((m, i) => (
          <div
            className={`bb-dash-spark-col ${
              active !== null && active !== i ? 'is-dim' : ''
            }`}
            key={i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div
              className="bb-dash-spark-stack"
              style={{
                height: shown ? `${(m.count / max) * 100}%` : 0,
                transitionDelay: `${i * 60}ms`,
              }}
            >
              {active === i && m.count > 0 && (
                <div className="bb-dash-spark-tip">
                  <div className="bb-dash-spark-tip-total">
                    {m.count} report{m.count === 1 ? '' : 's'} · {m.label}
                  </div>
                  {SOURCE_ORDER.filter((s) => m.bySource[s] > 0).map((s) => (
                    <div className="bb-dash-spark-tip-row" key={s}>
                      <span className="dot" style={{ background: SOURCE_COLORS[s] }} />
                      {SOURCE_LABELS[s]}
                      <b>{m.bySource[s]}</b>
                    </div>
                  ))}
                </div>
              )}
              {SOURCE_ORDER.map((s) => {
                const frac = m.count ? (m.bySource[s] / m.count) * 100 : 0
                return frac > 0 ? (
                  <span
                    key={s}
                    className="bb-dash-spark-seg"
                    style={{ height: `${frac}%`, background: SOURCE_COLORS[s] }}
                  />
                ) : null
              })}
            </div>
            <span className="bb-dash-spark-n">{m.count}</span>
            <span className="bb-dash-spark-label">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="bb-dash-spark-legend">
        {SOURCE_ORDER.map((s) => (
          <span key={s}>
            <i style={{ background: SOURCE_COLORS[s] }} />
            {SOURCE_LABELS[s]}
          </span>
        ))}
      </div>
    </>
  )
}
