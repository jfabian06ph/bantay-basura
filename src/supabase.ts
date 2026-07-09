import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Category, Report, ReportStatus } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Supabase is optional during early development. When the env vars are not
 * set (no account yet), `supabase` is null and the app runs entirely on the
 * seeded mock data. Once you paste real keys into `.env.local`, the app will
 * automatically start reading/writing real reports.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isBackendConnected = Boolean(supabase)

/**
 * Shape of a row in the `reports` table (snake_case, Postgres convention).
 * Kept separate from the app-facing camelCase `Report` so the DB schema and
 * the UI model can evolve independently.
 */
interface ReportRow {
  id: string
  lat: number
  lng: number
  title: string | null
  category: Category
  severity: 1 | 2 | 3
  note: string | null
  photo_url: string | null
  photo_urls: string[] | null
  resolved_photo_urls: string[] | null
  status: ReportStatus
  still_here: number | null
  cleared: number | null
  created_at: string
  resolved_at: string | null
}

/** Map a raw DB row into the camelCase `Report` the UI works with. */
function fromRow(row: ReportRow): Report {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    title: row.title ?? undefined,
    category: row.category,
    severity: row.severity,
    note: row.note ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    photoUrls: row.photo_urls ?? undefined,
    resolvedPhotoUrls: row.resolved_photo_urls ?? undefined,
    status: row.status,
    stillHere: row.still_here ?? 0,
    cleared: row.cleared ?? 0,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  }
}

/**
 * Load every report from Supabase, newest first. Returns `null` when the
 * backend isn't configured or the query fails, so callers can fall back to
 * the seeded mock data without special-casing demo mode.
 */
export async function loadReports(): Promise<Report[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, lat, lng, title, category, severity, note, photo_url, photo_urls, resolved_photo_urls, status, still_here, cleared, created_at, resolved_at',
    )
    .order('created_at', { ascending: false })
  if (error || !data) {
    console.warn('[bantay-basura] failed to load reports from Supabase:', error)
    return null
  }
  return (data as ReportRow[]).map(fromRow)
}
