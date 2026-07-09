import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  ClipboardList,
  Users,
  BarChart3,
  Contact,
  Settings as SettingsIcon,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { OPS_SECTIONS, type OpsSectionKey } from './types'
import {
  listReports,
  listTeams,
  listAssignments,
  listResidents,
} from '../lib/db'
import type { Report } from '../types'
import type { Assignment, Resident, Team } from './types'
import OpsDashboard from './sections/OpsDashboard'
import IncidentQueue from './sections/IncidentQueue'
import GisMap from './sections/GisMap'
import AssignmentsSection from './sections/Assignments'
import ResponseTeams from './sections/ResponseTeams'
import Analytics from './sections/Analytics'
import Residents from './sections/Residents'
import SettingsSection from './sections/Settings'
import './ops.css'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ListChecks,
  Map: MapIcon,
  ClipboardList,
  Users,
  BarChart3,
  Contact,
  Settings: SettingsIcon,
}

export interface OpsData {
  reports: Report[]
  teams: Team[]
  assignments: Assignment[]
  residents: Resident[]
  loading: boolean
  reload: () => void
}

const NOW = Date.now()

export default function OperationsCenter() {
  const { operator, isDemo, signOut } = useAuth()
  const [section, setSection] = useState<OpsSectionKey>('dashboard')

  const [reports, setReports] = useState<Report[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    let alive = true
    setLoading(true)
    Promise.all([listReports(), listTeams(), listAssignments(), listResidents()]).then(
      ([r, t, a, res]) => {
        if (!alive) return
        setReports(r)
        setTeams(t)
        setAssignments(a)
        setResidents(res)
        setLoading(false)
      },
    )
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => reload(), [reload])

  const data: OpsData = useMemo(
    () => ({ reports, teams, assignments, residents, loading, reload }),
    [reports, teams, assignments, residents, loading, reload],
  )

  const active = OPS_SECTIONS.find((s) => s.key === section)

  return (
    <div className="ops">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <img src="/logo-mark-512.png" alt="" />
          <div>
            <div className="ops-brand-name">Bantay Basura</div>
            <div className="ops-brand-sub">Operations Center</div>
          </div>
        </div>

        <nav className="ops-nav">
          {OPS_SECTIONS.map((s) => {
            const Icon = ICONS[s.icon]
            return (
              <button
                key={s.key}
                className={`ops-nav-item ${section === s.key ? 'ops-nav-active' : ''}`}
                onClick={() => setSection(s.key)}
              >
                {Icon && <Icon className="size-[18px]" />}
                <span>{s.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="ops-sidebar-foot">
          <button className="ops-signout" onClick={signOut}>
            <LogOut className="size-[18px]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar">
          <div>
            <h1 className="ops-title">{active?.label}</h1>
            {isDemo && <span className="ops-demo">Demo data</span>}
          </div>
          <div className="ops-user">
            <div className="ops-user-meta">
              <div className="ops-user-name">{operator?.fullName}</div>
              <div className="ops-user-role">{operator?.role}</div>
            </div>
            <div className="ops-avatar">
              {(operator?.fullName ?? '?').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="ops-content">
          {section === 'dashboard' && <OpsDashboard data={data} now={NOW} onGo={setSection} />}
          {section === 'incidents' && <IncidentQueue data={data} />}
          {section === 'map' && <GisMap data={data} />}
          {section === 'assignments' && <AssignmentsSection data={data} />}
          {section === 'teams' && <ResponseTeams data={data} />}
          {section === 'analytics' && <Analytics data={data} now={NOW} />}
          {section === 'residents' && <Residents data={data} />}
          {section === 'settings' && <SettingsSection />}
        </main>
      </div>
    </div>
  )
}
