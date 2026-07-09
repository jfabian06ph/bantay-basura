import { supabase } from '../supabase'
import { loadReports } from '../supabase'
import { MOCK_REPORTS } from '../mockData'
import { MOCK_TEAMS, MOCK_ASSIGNMENTS, MOCK_RESIDENTS } from '../ops/mock'
import type { Report, ReportStatus } from '../types'
import type {
  Assignment,
  AssignmentStatus,
  Resident,
  Team,
  TeamStatus,
} from '../ops/types'

/**
 * Data-access layer for the Operations Center. Every function talks to
 * Supabase when configured, and otherwise reads/writes an in-memory mock
 * store so the whole console is usable (including CRUD) in demo mode.
 */

// --- In-memory demo store (cloned so we can mutate without touching seeds) ---
const demo = {
  reports: [...MOCK_REPORTS],
  teams: [...MOCK_TEAMS],
  assignments: [...MOCK_ASSIGNMENTS],
  residents: [...MOCK_RESIDENTS],
}

let idSeq = 0
const newId = (p: string) => `${p}-${Date.now()}-${idSeq++}`
const nowIso = () => new Date().toISOString()

// ---- Reports ---------------------------------------------------------------
export async function listReports(): Promise<Report[]> {
  const rows = await loadReports()
  return rows ?? demo.reports
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
): Promise<void> {
  const resolvedAt = status === 'resolved' ? nowIso() : null
  if (supabase) {
    await supabase.from('reports').update({ status, resolved_at: resolvedAt }).eq('id', id)
    return
  }
  demo.reports = demo.reports.map((r) =>
    r.id === id ? { ...r, status, resolvedAt: resolvedAt ?? undefined } : r,
  )
}

// ---- Teams -----------------------------------------------------------------
function teamFromRow(r: Record<string, unknown>): Team {
  return {
    id: String(r.id),
    name: String(r.name),
    lgu: (r.lgu as string) ?? undefined,
    area: (r.area as string) ?? undefined,
    status: (r.status as TeamStatus) ?? 'available',
    memberCount: Number(r.member_count ?? 0),
    contact: (r.contact as string) ?? undefined,
    createdAt: String(r.created_at),
  }
}

export async function listTeams(): Promise<Team[]> {
  if (supabase) {
    const { data } = await supabase.from('teams').select('*').order('created_at')
    if (data) return data.map(teamFromRow)
  }
  return demo.teams
}

export async function createTeam(
  input: Omit<Team, 'id' | 'createdAt'>,
): Promise<Team> {
  if (supabase) {
    const { data } = await supabase
      .from('teams')
      .insert({
        name: input.name,
        lgu: input.lgu,
        area: input.area,
        status: input.status,
        member_count: input.memberCount,
        contact: input.contact,
      })
      .select('*')
      .single()
    if (data) return teamFromRow(data)
  }
  const team: Team = { ...input, id: newId('team'), createdAt: nowIso() }
  demo.teams = [...demo.teams, team]
  return team
}

export async function updateTeamStatus(id: string, status: TeamStatus): Promise<void> {
  if (supabase) {
    await supabase.from('teams').update({ status }).eq('id', id)
    return
  }
  demo.teams = demo.teams.map((t) => (t.id === id ? { ...t, status } : t))
}

// ---- Assignments -----------------------------------------------------------
function assignmentFromRow(r: Record<string, unknown>): Assignment {
  return {
    id: String(r.id),
    reportId: String(r.report_id),
    teamId: (r.team_id as string) ?? null,
    status: (r.status as AssignmentStatus) ?? 'assigned',
    notes: (r.notes as string) ?? undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

export async function listAssignments(): Promise<Assignment[]> {
  if (supabase) {
    const { data } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    if (data) return data.map(assignmentFromRow)
  }
  return demo.assignments
}

export async function createAssignment(input: {
  reportId: string
  teamId: string | null
  notes?: string
}): Promise<Assignment> {
  if (supabase) {
    const { data } = await supabase
      .from('assignments')
      .insert({ report_id: input.reportId, team_id: input.teamId, notes: input.notes })
      .select('*')
      .single()
    if (data) return assignmentFromRow(data)
  }
  const a: Assignment = {
    id: newId('asg'),
    reportId: input.reportId,
    teamId: input.teamId,
    status: 'assigned',
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  demo.assignments = [a, ...demo.assignments]
  return a
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus,
): Promise<void> {
  if (supabase) {
    await supabase.from('assignments').update({ status, updated_at: nowIso() }).eq('id', id)
    return
  }
  demo.assignments = demo.assignments.map((a) =>
    a.id === id ? { ...a, status, updatedAt: nowIso() } : a,
  )
}

// ---- Residents -------------------------------------------------------------
export async function listResidents(): Promise<Resident[]> {
  if (supabase) {
    const { data } = await supabase.from('residents').select('*').order('full_name')
    if (data) {
      return data.map((r) => ({
        id: String(r.id),
        fullName: String(r.full_name),
        contact: r.contact ?? undefined,
        barangay: r.barangay ?? undefined,
        municipality: r.municipality ?? undefined,
        reportsCount: Number(r.reports_count ?? 0),
        createdAt: String(r.created_at),
      }))
    }
  }
  return demo.residents
}

// ---- Settings --------------------------------------------------------------
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  if (supabase) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).single()
    return (data?.value as T) ?? null
  }
  const raw = localStorage.getItem(`bb-setting-${key}`)
  return raw ? (JSON.parse(raw) as T) : null
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  if (supabase) {
    await supabase.from('settings').upsert({ key, value, updated_at: nowIso() })
    return
  }
  localStorage.setItem(`bb-setting-${key}`, JSON.stringify(value))
}
