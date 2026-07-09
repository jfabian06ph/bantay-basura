import { useMemo } from 'react'
import { relativeTime } from '../../lib/stats'
import {
  CATEGORY_EMOJI,
  STATUS_COLORS,
  STATUS_LABELS,
  type Report,
} from '../../types'
import type { OpsData } from '../OperationsCenter'
import type { OpsSectionKey } from '../types'

interface Props {
  data: OpsData
  now: number
  onGo: (s: OpsSectionKey) => void
}

export default function OpsDashboard({ data, now, onGo }: Props) {
  const { reports, teams, assignments } = data

  const k = useMemo(() => {
    const pending = reports.filter((r) => r.status === 'pending').length
    const review = reports.filter((r) => r.status === 'in_review').length
    const resolved = reports.filter((r) => r.status === 'resolved').length
    const total = reports.length
    return {
      total,
      pending,
      review,
      resolved,
      rate: total ? Math.round((resolved / total) * 100) : 0,
      availableTeams: teams.filter((t) => t.status === 'available').length,
      openAssignments: assignments.filter((a) => a.status !== 'done').length,
    }
  }, [reports, teams, assignments])

  const recent = useMemo(
    () =>
      [...reports]
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 6),
    [reports],
  )

  return (
    <div className="ops-grid-page">
      <div className="ops-kpis">
        <Kpi label="Total incidents" value={k.total} />
        <Kpi label="New" value={k.pending} tone={STATUS_COLORS.pending} />
        <Kpi label="In review" value={k.review} tone={STATUS_COLORS.in_review} />
        <Kpi label="Resolved" value={k.resolved} tone={STATUS_COLORS.resolved} />
        <Kpi label="Resolution rate" value={`${k.rate}%`} />
        <Kpi label="Teams available" value={k.availableTeams} />
      </div>

      <section className="ops-card">
        <div className="ops-card-head">
          <h2>Recent incidents</h2>
          <button className="ops-link" onClick={() => onGo('incidents')}>
            View queue →
          </button>
        </div>
        <IncidentRows reports={recent} now={now} />
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone?: string
}) {
  return (
    <div className="ops-kpi">
      <div className="ops-kpi-val" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="ops-kpi-label">{label}</div>
    </div>
  )
}

export function IncidentRows({ reports, now }: { reports: Report[]; now: number }) {
  if (!reports.length) return <p className="ops-empty">No incidents.</p>
  return (
    <ul className="ops-list">
      {reports.map((r) => (
        <li key={r.id} className="ops-list-row">
          <span className="ops-list-emoji">{CATEGORY_EMOJI[r.category]}</span>
          <span className="ops-list-main">
            {r.note ? r.note.slice(0, 60) : 'Waste report'}
          </span>
          <span
            className="ops-badge"
            style={{
              background: `${STATUS_COLORS[r.status]}22`,
              color: STATUS_COLORS[r.status],
            }}
          >
            {STATUS_LABELS[r.status]}
          </span>
          <span className="ops-list-time">{relativeTime(new Date(r.createdAt).getTime(), now)}</span>
        </li>
      ))}
    </ul>
  )
}
