import type { Assignment, Resident, Team } from './types'

/** Seeded ops data for demo mode (no Supabase keys). Report IDs match mockData. */
export const MOCK_TEAMS: Team[] = [
  { id: 'team-1', name: 'Iba Sanitation Unit', lgu: 'Iba', area: 'Poblacion', status: 'available', memberCount: 6, contact: '0917-000-0001', createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'team-2', name: 'Olongapo Coastal Cleanup', lgu: 'Olongapo', area: 'Baybayin', status: 'deployed', memberCount: 8, contact: '0917-000-0002', createdAt: '2026-06-03T00:00:00.000Z' },
  { id: 'team-3', name: 'Subic River Watch', lgu: 'Subic', area: 'Creekside', status: 'available', memberCount: 5, contact: '0917-000-0003', createdAt: '2026-06-05T00:00:00.000Z' },
  { id: 'team-4', name: 'Masinloc Volunteers', lgu: 'Masinloc', area: 'Farmlands', status: 'off_duty', memberCount: 4, contact: '0917-000-0004', createdAt: '2026-06-08T00:00:00.000Z' },
]

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'asg-1', reportId: 'seed-2', teamId: 'team-2', status: 'in_progress', notes: 'Coastal plastic collection underway.', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  { id: 'asg-2', reportId: 'seed-3', teamId: 'team-3', status: 'assigned', notes: 'Scheduled for weekend.', createdAt: '2026-07-03T00:00:00.000Z', updatedAt: '2026-07-03T00:00:00.000Z' },
  { id: 'asg-3', reportId: 'seed-7', teamId: 'team-1', status: 'done', notes: 'River cleared after storm.', createdAt: '2026-06-21T00:00:00.000Z', updatedAt: '2026-06-22T00:00:00.000Z' },
]

export const MOCK_RESIDENTS: Resident[] = [
  { id: 'res-1', fullName: 'Maria Santos', contact: '0918-111-2222', barangay: 'Poblacion', municipality: 'Iba', reportsCount: 4, createdAt: '2026-06-10T00:00:00.000Z' },
  { id: 'res-2', fullName: 'Jose Dela Cruz', contact: '0918-333-4444', barangay: 'Baretto', municipality: 'Olongapo', reportsCount: 2, createdAt: '2026-06-12T00:00:00.000Z' },
  { id: 'res-3', fullName: 'Ana Reyes', contact: '0918-555-6666', barangay: 'Matain', municipality: 'Subic', reportsCount: 3, createdAt: '2026-06-15T00:00:00.000Z' },
  { id: 'res-4', fullName: 'Pedro Ramos', contact: '0918-777-8888', barangay: 'San Salvador', municipality: 'Masinloc', reportsCount: 1, createdAt: '2026-06-18T00:00:00.000Z' },
]
