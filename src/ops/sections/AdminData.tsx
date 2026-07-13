import { useEffect, useState } from 'react'
import { RefreshCw, Trash2, ExternalLink, ShieldCheck } from 'lucide-react'
import {
  deleteReport,
  deleteAllReports,
  loadModerationEvents,
  type ModerationEvent,
} from '../../lib/db'
import { CATEGORY_LABELS, STATUS_LABELS, type Report } from '../../types'
import { relativeTime } from '../../lib/stats'
import type { OpsData } from '../OperationsCenter'

interface Props {
  data: OpsData
}

const fmt = (iso: string) => new Date(iso).toLocaleString()

/**
 * A plain data console for the project owner: see every report as raw rows,
 * delete individual ones (or clear all test data), and watch the moderation
 * decisions stream in. Everything here is gated behind operator sign-in and
 * the authenticated-only RLS policies, so it is safe to expose delete here.
 */
export default function AdminData({ data }: Props) {
  const { reports, reload, loading } = data
  const [busy, setBusy] = useState<string | null>(null)
  const [events, setEvents] = useState<ModerationEvent[]>([])
  const now = Date.now()

  const loadEvents = () => loadModerationEvents().then(setEvents)
  useEffect(() => {
    loadEvents()
  }, [])

  async function onDelete(r: Report) {
    if (!confirm(`Delete this report in ${r.municipality ?? 'this area'}? This cannot be undone.`)) return
    setBusy(r.id)
    await deleteReport(r.id)
    setBusy(null)
    reload()
    loadEvents()
  }

  async function onClearAll() {
    if (!confirm(`Delete ALL ${reports.length} reports? This wipes the map. This cannot be undone.`)) return
    setBusy('all')
    await deleteAllReports()
    setBusy(null)
    reload()
    loadEvents()
  }

  return (
    <div className="ops-admin">
      <div className="ops-admin-bar">
        <div className="ops-admin-count">
          <b>{reports.length}</b> {reports.length === 1 ? 'report' : 'reports'}
        </div>
        <div className="ops-admin-actions">
          <button className="ops-admin-btn" onClick={reload} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'ops-spin' : ''}`} /> Refresh
          </button>
          <button
            className="ops-admin-btn ops-admin-btn-danger"
            onClick={onClearAll}
            disabled={busy === 'all' || reports.length === 0}
          >
            <Trash2 className="size-4" /> Clear all
          </button>
        </div>
      </div>

      <div className="ops-admin-tablewrap">
        <table className="ops-admin-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Category</th>
              <th>Status</th>
              <th>Votes</th>
              <th>Photos</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="ops-admin-empty">
                  No reports in the database.
                </td>
              </tr>
            )}
            {reports.map((r) => {
              const photos = r.photoUrls?.length ?? (r.photoUrl ? 1 : 0)
              return (
                <tr key={r.id}>
                  <td>
                    <div className="ops-admin-place">
                      {r.municipality ?? '-'}
                      {r.province ? <span className="ops-admin-dim">, {r.province}</span> : null}
                    </div>
                    <div className="ops-admin-coords">
                      {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                    </div>
                  </td>
                  <td>{CATEGORY_LABELS[r.category]}</td>
                  <td>{STATUS_LABELS[r.status]}</td>
                  <td>
                    <span className="ops-admin-dim">clean</span> {r.cleared} ·{' '}
                    <span className="ops-admin-dim">here</span> {r.stillHere}
                  </td>
                  <td>{photos > 0 ? photos : <span className="ops-admin-dim">none</span>}</td>
                  <td>{fmt(r.createdAt)}</td>
                  <td className="ops-admin-rowactions">
                    {(r.photoUrl ?? r.photoUrls?.[0]) && (
                      <a
                        className="ops-admin-icon"
                        href={r.photoUrl ?? r.photoUrls?.[0]}
                        target="_blank"
                        rel="noreferrer"
                        title="Open first photo"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <button
                      className="ops-admin-icon ops-admin-icon-danger"
                      onClick={() => onDelete(r)}
                      disabled={busy === r.id}
                      title="Delete report"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="ops-admin-modhead">
        <ShieldCheck className="size-4" /> Moderation log
        <span className="ops-admin-dim">latest {events.length}</span>
      </div>
      {events.length === 0 ? (
        <p className="ops-admin-empty">No photo moderation activity yet.</p>
      ) : (
        <ul className="ops-admin-modlog">
          {events.map((e) => (
            <li key={e.id}>
              <span className={`ops-admin-mod ops-admin-mod-${e.status}`}>{e.status}</span>
              <span className="ops-admin-dim">{e.kind} photo</span>
              <span className="ops-admin-modtime">{relativeTime(new Date(e.createdAt).getTime(), now)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
