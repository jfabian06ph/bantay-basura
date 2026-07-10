import { useEffect, useState } from 'react'
import { getSetting, saveSetting } from '../../lib/db'
import { useAuth } from '../../auth/AuthProvider'

interface OrgSettings {
  orgName: string
  responseTargetDays: number
  autoAssign: boolean
}

const DEFAULTS: OrgSettings = {
  orgName: 'Zambales Environmental Office',
  responseTargetDays: 2,
  autoAssign: false,
}

export default function SettingsSection() {
  const { operator, isDemo } = useAuth()
  const [s, setS] = useState<OrgSettings>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSetting<OrgSettings>('org').then((v) => v && setS({ ...DEFAULTS, ...v }))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await saveSetting('org', s)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="ops-grid-page">
      <section className="ops-card ops-settings">
        <div className="ops-card-head"><h2>Profile</h2></div>
        <div className="ops-kv"><span>Name</span><strong>{operator?.fullName}</strong></div>
        <div className="ops-kv"><span>Role</span><strong>{operator?.role}</strong></div>
        <div className="ops-kv"><span>LGU</span><strong>{operator?.lgu ?? '—'}</strong></div>
      </section>

      <section className="ops-card ops-settings">
        <div className="ops-card-head"><h2>Organization</h2></div>
        <form className="ops-settings-form" onSubmit={save}>
          <label className="bb-field">
            <span>Organization name</span>
            <input value={s.orgName} onChange={(e) => setS({ ...s, orgName: e.target.value })} />
          </label>
          <label className="bb-field">
            <span>Response target (days)</span>
            <input
              type="number"
              min={1}
              value={s.responseTargetDays}
              onChange={(e) => setS({ ...s, responseTargetDays: Number(e.target.value) })}
            />
          </label>
          <label className="ops-toggle">
            <input
              type="checkbox"
              checked={s.autoAssign}
              onChange={(e) => setS({ ...s, autoAssign: e.target.checked })}
            />
            <span>Auto-assign new incidents to the nearest available team</span>
          </label>
          <button className="ops-btn" type="submit">
            {saved ? 'Saved ✓' : 'Save settings'}
          </button>
          {isDemo && <p className="ops-cell-sub">Demo mode. Settings are stored locally in this browser.</p>}
        </form>
      </section>
    </div>
  )
}
