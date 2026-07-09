import { useMemo, useState } from 'react'
import { createAssignment, updateAssignmentStatus } from '../../lib/db'
import { CATEGORY_LABELS } from '../../types'
import {
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
  type AssignmentView,
} from '../types'
import type { OpsData } from '../OperationsCenter'

const STATUS_FLOW: AssignmentStatus[] = ['assigned', 'in_progress', 'done']
const STATUS_TONE: Record<AssignmentStatus, string> = {
  assigned: '#f59e0b',
  in_progress: '#3b82f6',
  done: '#22c55e',
}

export default function AssignmentsSection({ data }: { data: OpsData }) {
  const { assignments, reports, teams, reload } = data
  const [reportId, setReportId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [busy, setBusy] = useState(false)

  const views: AssignmentView[] = useMemo(
    () =>
      assignments.map((a) => ({
        ...a,
        report: reports.find((r) => r.id === a.reportId),
        team: teams.find((t) => t.id === a.teamId),
      })),
    [assignments, reports, teams],
  )

  const unassignedReports = useMemo(
    () => reports.filter((r) => r.status !== 'resolved'),
    [reports],
  )

  async function create() {
    if (!reportId || !teamId) return
    setBusy(true)
    await createAssignment({ reportId, teamId })
    setReportId('')
    setTeamId('')
    reload()
    setBusy(false)
  }

  async function cycle(id: string, current: AssignmentStatus) {
    const next = STATUS_FLOW[(STATUS_FLOW.indexOf(current) + 1) % STATUS_FLOW.length]
    setBusy(true)
    await updateAssignmentStatus(id, next)
    reload()
    setBusy(false)
  }

  return (
    <div className="ops-grid-page">
      <section className="ops-card">
        <div className="ops-card-head">
          <h2>New assignment</h2>
        </div>
        <div className="ops-form-row">
          <select className="ops-select" value={reportId} onChange={(e) => setReportId(e.target.value)}>
            <option value="">Choose incident…</option>
            {unassignedReports.map((r) => (
              <option key={r.id} value={r.id}>
                {CATEGORY_LABELS[r.category]} — {r.note?.slice(0, 30) ?? r.id}
              </option>
            ))}
          </select>
          <select className="ops-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Choose team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="ops-btn" onClick={create} disabled={busy || !reportId || !teamId}>
            Assign
          </button>
        </div>
      </section>

      <section className="ops-card ops-table-wrap">
        <div className="ops-card-head">
          <h2>Active assignments</h2>
        </div>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Team</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Advance</th>
            </tr>
          </thead>
          <tbody>
            {views.map((a) => (
              <tr key={a.id}>
                <td>{a.report ? CATEGORY_LABELS[a.report.category] : a.reportId}</td>
                <td>{a.team?.name ?? '—'}</td>
                <td>
                  <span
                    className="ops-badge"
                    style={{ background: `${STATUS_TONE[a.status]}22`, color: STATUS_TONE[a.status] }}
                  >
                    {ASSIGNMENT_STATUS_LABELS[a.status]}
                  </span>
                </td>
                <td className="ops-cell-sub">{a.notes ?? '—'}</td>
                <td>
                  <button
                    className="ops-btn-sm"
                    onClick={() => cycle(a.id, a.status)}
                    disabled={busy || a.status === 'done'}
                  >
                    {a.status === 'done' ? 'Complete' : 'Advance →'}
                  </button>
                </td>
              </tr>
            ))}
            {!views.length && (
              <tr>
                <td colSpan={5} className="ops-empty">
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
