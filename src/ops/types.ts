import type { Report } from '../types'

export type Role = 'admin' | 'operator' | 'viewer'

export interface Operator {
  id: string
  fullName: string
  role: Role
  lgu?: string
}

export type TeamStatus = 'available' | 'deployed' | 'off_duty'

export interface Team {
  id: string
  name: string
  lgu?: string
  area?: string
  status: TeamStatus
  memberCount: number
  contact?: string
  createdAt: string
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'done'

export interface Assignment {
  id: string
  reportId: string
  teamId: string | null
  status: AssignmentStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Resident {
  id: string
  fullName: string
  contact?: string
  barangay?: string
  municipality?: string
  reportsCount: number
  createdAt: string
}

/** An assignment joined with its incident + team for display. */
export interface AssignmentView extends Assignment {
  report?: Report
  team?: Team
}

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  available: 'Available',
  deployed: 'Deployed',
  off_duty: 'Off duty',
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  done: 'Done',
}

export const OPS_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'incidents', label: 'Incident Queue', icon: 'ListChecks' },
  { key: 'map', label: 'Interactive GIS Map', icon: 'Map' },
  { key: 'assignments', label: 'Assignments', icon: 'ClipboardList' },
  { key: 'teams', label: 'Response Teams', icon: 'Users' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { key: 'residents', label: 'Residents', icon: 'Contact' },
  { key: 'feedback', label: 'Feedback', icon: 'MessageSquare' },
  { key: 'admin', label: 'Data / Admin', icon: 'Database' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
] as const

export type OpsSectionKey = (typeof OPS_SECTIONS)[number]['key']
