import { useMemo, useState } from 'react'
import type { OpsData } from '../OperationsCenter'

export default function Residents({ data }: { data: OpsData }) {
  const { residents } = data
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return residents
    return residents.filter(
      (r) =>
        r.fullName.toLowerCase().includes(term) ||
        r.barangay?.toLowerCase().includes(term) ||
        r.municipality?.toLowerCase().includes(term),
    )
  }, [residents, q])

  return (
    <div className="ops-grid-page">
      <div className="ops-filters">
        <input
          className="ops-input ops-search"
          placeholder="Search residents, barangay, LGU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <section className="ops-card ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Barangay</th>
              <th>LGU</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="ops-cell-title">{r.fullName}</td>
                <td>{r.contact ?? '—'}</td>
                <td>{r.barangay ?? '—'}</td>
                <td>{r.municipality ?? '—'}</td>
                <td>{r.reportsCount}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="ops-empty">
                  No residents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
