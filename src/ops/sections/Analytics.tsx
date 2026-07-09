import { useMemo } from 'react'
import { computeDashboard } from '../../lib/stats'
import type { OpsData } from '../OperationsCenter'

/** Operational analytics — reuses the public stats engine, ops-themed. */
export default function Analytics({ data, now }: { data: OpsData; now: number }) {
  const s = useMemo(() => computeDashboard(data.reports, now), [data.reports, now])
  const maxMonth = Math.max(1, ...s.monthlySeries.map((m) => m.count))

  return (
    <div className="ops-grid-page">
      <div className="ops-kpis">
        <div className="ops-kpi"><div className="ops-kpi-val">{s.reportsThisMonth}</div><div className="ops-kpi-label">Reports this month</div></div>
        <div className="ops-kpi"><div className="ops-kpi-val">{s.resolvedRate}%</div><div className="ops-kpi-label">Resolution rate</div></div>
        <div className="ops-kpi"><div className="ops-kpi-val">{s.avgResponseDays !== null ? `${s.avgResponseDays.toFixed(1)}d` : '—'}</div><div className="ops-kpi-label">Avg response</div></div>
        <div className="ops-kpi"><div className="ops-kpi-val">{s.monthlyImpact.confirmations}</div><div className="ops-kpi-label">Confirmations</div></div>
      </div>

      <section className="ops-card">
        <div className="ops-card-head"><h2>Waste by type</h2></div>
        <div className="ops-bars">
          {s.wasteTrends.map((c) => (
            <div className="ops-bar-row" key={c.category}>
              <span className="ops-bar-label">{c.label}</span>
              <span className="ops-bar-track">
                <span className="ops-bar-fill" style={{ width: `${c.share}%` }} />
              </span>
              <span className="ops-bar-val">{c.count}</span>
            </div>
          ))}
          {!s.wasteTrends.length && <p className="ops-empty">No data.</p>}
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head"><h2>Reports over time</h2></div>
        <div className="ops-spark">
          {s.monthlySeries.map((m, i) => (
            <div className="ops-spark-col" key={i}>
              <span className="ops-spark-bar" style={{ height: `${Math.round((m.count / maxMonth) * 100)}%` }} />
              <span className="ops-spark-n">{m.count}</span>
              <span className="ops-spark-label">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-card">
        <div className="ops-card-head"><h2>Cleanest areas</h2></div>
        <ul className="ops-list">
          {s.cleanestLgus.map((l, i) => (
            <li key={l.name} className="ops-list-row">
              <span className="ops-list-emoji">{i + 1}</span>
              <span className="ops-list-main">{l.name}</span>
              <span className="ops-list-time">{l.resolutionRate}% resolved</span>
            </li>
          ))}
          {!s.cleanestLgus.length && <p className="ops-empty">Not enough data.</p>}
        </ul>
      </section>
    </div>
  )
}
