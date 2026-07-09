import { useState } from 'react'
import { createTeam, updateTeamStatus } from '../../lib/db'
import {
  TEAM_STATUS_LABELS,
  type TeamStatus,
} from '../types'
import type { OpsData } from '../OperationsCenter'

const STATUS_TONE: Record<TeamStatus, string> = {
  available: '#22c55e',
  deployed: '#3b82f6',
  off_duty: '#8a8f99',
}
const STATUS_CYCLE: TeamStatus[] = ['available', 'deployed', 'off_duty']

export default function ResponseTeams({ data }: { data: OpsData }) {
  const { teams, reload } = data
  const [name, setName] = useState('')
  const [lgu, setLgu] = useState('')
  const [members, setMembers] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    await createTeam({
      name: name.trim(),
      lgu: lgu.trim() || undefined,
      area: undefined,
      status: 'available',
      memberCount: Number(members) || 0,
      contact: undefined,
    })
    setName('')
    setLgu('')
    setMembers('')
    reload()
    setBusy(false)
  }

  async function cycle(id: string, current: TeamStatus) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    setBusy(true)
    await updateTeamStatus(id, next)
    reload()
    setBusy(false)
  }

  return (
    <div className="ops-grid-page">
      <section className="ops-card">
        <div className="ops-card-head">
          <h2>Add response team</h2>
        </div>
        <div className="ops-form-row">
          <input className="ops-input" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="ops-input" placeholder="LGU" value={lgu} onChange={(e) => setLgu(e.target.value)} />
          <input className="ops-input" placeholder="Members" type="number" value={members} onChange={(e) => setMembers(e.target.value)} />
          <button className="ops-btn" onClick={add} disabled={busy || !name.trim()}>
            Add team
          </button>
        </div>
      </section>

      <div className="ops-team-grid">
        {teams.map((t) => (
          <div key={t.id} className="ops-card ops-team">
            <div className="ops-team-head">
              <h3>{t.name}</h3>
              <span
                className="ops-badge"
                style={{ background: `${STATUS_TONE[t.status]}22`, color: STATUS_TONE[t.status] }}
              >
                {TEAM_STATUS_LABELS[t.status]}
              </span>
            </div>
            <div className="ops-team-meta">
              {t.lgu && <span>📍 {t.lgu}</span>}
              <span>👥 {t.memberCount} members</span>
              {t.contact && <span>☎ {t.contact}</span>}
            </div>
            <button className="ops-btn-sm" onClick={() => cycle(t.id, t.status)} disabled={busy}>
              Set {TEAM_STATUS_LABELS[STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length]]}
            </button>
          </div>
        ))}
        {!teams.length && <p className="ops-empty">No teams yet.</p>}
      </div>
    </div>
  )
}
