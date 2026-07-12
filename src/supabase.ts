import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Category, Report, ReportSource, ReportStatus } from './types'

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
  source: ReportSource | null
  still_here: number | null
  cleared: number | null
  created_at: string
  resolved_at: string | null
  after_image_url: string | null
  after_uploaded_at: string | null
  after_uploaded_by: ReportSource | null
}

/** Columns selected for a full report — shared by loads and insert-returns. */
const REPORT_COLS =
  'id, lat, lng, title, category, severity, note, photo_url, photo_urls, resolved_photo_urls, status, source, still_here, cleared, created_at, resolved_at, after_image_url, after_uploaded_at, after_uploaded_by'

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
    source: row.source ?? undefined,
    stillHere: row.still_here ?? 0,
    cleared: row.cleared ?? 0,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    afterImageUrl: row.after_image_url ?? undefined,
    afterUploadedAt: row.after_uploaded_at ?? undefined,
    afterUploadedBy: row.after_uploaded_by ?? undefined,
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
    .select(REPORT_COLS)
    .order('created_at', { ascending: false })
  if (error || !data) {
    console.warn('[bantay-basura] failed to load reports from Supabase:', error)
    return null
  }
  return (data as unknown as ReportRow[]).map(fromRow)
}

/** The fields a resident supplies when flagging waste (see `useReportFlow`). */
export interface ReportInput {
  lat: number
  lng: number
  title?: string
  category: Category
  severity: 1 | 2 | 3
  note?: string
  photoUrl?: string
  photoUrls?: string[]
  source?: ReportSource
}

/**
 * Insert a resident's report and return it with its real DB id. A new report
 * always starts `pending` with one "still here" vote (the reporter's own
 * sighting). Returns `null` on failure so the caller keeps its optimistic row.
 */
export async function insertReport(input: ReportInput): Promise<Report | null> {
  if (!supabase) return null
  const photos = input.photoUrls?.length
    ? input.photoUrls
    : input.photoUrl
      ? [input.photoUrl]
      : []
  const { data, error } = await supabase
    .from('reports')
    .insert({
      lat: input.lat,
      lng: input.lng,
      title: input.title ?? null,
      category: input.category,
      severity: input.severity,
      note: input.note ?? null,
      photo_url: photos[0] ?? null,
      photo_urls: photos.length ? photos : null,
      status: 'pending',
      source: input.source ?? 'resident',
      still_here: 1,
      cleared: 0,
    })
    .select(REPORT_COLS)
    .single()
  if (error || !data) {
    console.warn('[bantay-basura] failed to insert report:', error)
    return null
  }
  return fromRow(data as unknown as ReportRow)
}

/**
 * Cast a community confirmation ("still here" / "looks clean") on a report.
 * Goes through the `confirm_report` RPC so the counter increment is atomic and
 * anonymous — the reports table's UPDATE policy is operators-only.
 */
export async function voteReport(
  id: string,
  kind: 'stillHere' | 'cleared',
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('confirm_report', { rid: id, kind })
  if (error) console.warn('[bantay-basura] failed to record confirmation:', error)
}

/** Attach the "after" photo that completes a cleanup (via SECURITY DEFINER RPC). */
export async function setAfterPhoto(
  id: string,
  url: string,
  byRole: ReportSource,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('set_after_photo', {
    rid: id,
    url,
    by_role: byRole,
  })
  if (error) console.warn('[bantay-basura] failed to save after photo:', error)
}

/**
 * Upload data-URL photos to the public `report-photos` bucket and return their
 * public URLs. Any entry that isn't a data URL (already hosted) is passed
 * through untouched, and any upload that fails falls back to its data URL so a
 * flaky network never blocks a report from being filed.
 */
export async function uploadReportPhotos(dataUrls: string[]): Promise<string[]> {
  if (!supabase || !dataUrls.length) return dataUrls
  const out: string[] = []
  for (const src of dataUrls) {
    if (!src.startsWith('data:')) {
      out.push(src)
      continue
    }
    try {
      const blob = await (await fetch(src)).blob()
      const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0]
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('report-photos')
        .upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (error) {
        console.warn('[bantay-basura] photo upload failed, keeping inline:', error)
        out.push(src)
        continue
      }
      const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
      out.push(data.publicUrl)
    } catch (e) {
      console.warn('[bantay-basura] photo upload threw, keeping inline:', e)
      out.push(src)
    }
  }
  return out
}
