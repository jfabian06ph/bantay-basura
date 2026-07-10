import { useMemo, useState } from 'react'
import { nearestMunicipality } from '../../municipalities'
import { updateReportStatus, createAssignment } from '../../lib/db'
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  type Report,
  type ReportStatus,
} from '../../types'
import { CATEGORY_ICON } from '../../lib/categoryIcons'
import type { OpsData } from '../OperationsCenter'

interface Props {
  data: OpsData
}

type Filter = 'all' | ReportStatus

export default function IncidentQueue({ data }: Props) {
  const { reports, teams, reload } = data
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const rows = useMemo(() => {
    const list = filter === 'all' ? reports : reports.filter((r) => r.status === filter)
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [reports, filter])

  async function setStatus(r: Report, status: ReportStatus) {
    setBusy(r.id)
    await updateReportStatus(r.id, status)
    reload()
    setBusy(null)
  }

  async function assign(r: Report, teamId: string) {
    if (!teamId) return
    setBusy(r.id)
    await createAssignment({ reportId: r.id, teamId })
    await updateReportStatus(r.id, 'in_review')
    reload()
    setBusy(null)
  }

  const counts: Record<Filter, number> = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    in_review: reports.filter((r) => r.status === 'in_review').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  return (
    <div>
      <div className="ops-filters">
        {(['all', ...STATUS_ORDER] as Filter[]).map((f) => (
          <button
            key={f}
            className={`ops-chip ${filter === f ? 'ops-chip-on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
            <span className="ops-chip-n">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="ops-card ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Area</th>
              <th>Status</th>
              <th>Assign team</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const area = nearestMunicipality(r).place.name
              const Icon = CATEGORY_ICON[r.category]
              return (
                <tr key={r.id} className={busy === r.id ? 'ops-row-busy' : ''}>
                  <td>
                    <div className="ops-cell-title inline-flex items-center gap-1.5">
                      <Icon className="size-4" /> {CATEGORY_LABELS[r.category]}
                    </div>
                    {r.note && <div className="ops-cell-sub">{r.note.slice(0, 70)}</div>}
                  </td>
                  <td>{area}</td>
                  <td>
                    <span
                      className="ops-badge"
                      style={{
                        background: `${STATUS_COLORS[r.status]}22`,
                        color: STATUS_COLORS[r.status],
                      }}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td>
                    <select
                      className="ops-select"
                      value=""
                      onChange={(e) => assign(r, e.target.value)}
                      disabled={r.status === 'resolved'}
                    >
                      <option value="">Assign…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="ops-actions">
                      {r.status !== 'in_review' && r.status !== 'resolved' && (
                        <button className="ops-btn-sm" onClick={() => setStatus(r, 'in_review')}>
                          Review
                        </button>
                      )}
                      {r.status !== 'resolved' && (
                        <button
                          className="ops-btn-sm ops-btn-ok"
                          onClick={() => setStatus(r, 'resolved')}
                        >
                          Resolve
                        </button>
                      )}
                      {r.status === 'resolved' && (
                        <button className="ops-btn-sm" onClick={() => setStatus(r, 'pending')}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="ops-empty">
                  No incidents match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
