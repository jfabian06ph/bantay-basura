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
  municipality: string | null
  province: string | null
  barangay: string | null
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
  /** Embedded evidence photos (see report_photos). Present on loads, not inserts. */
  report_photos?: { url: string; kind: string; created_at: string }[] | null
}

/** Columns selected for a full report — shared by loads and insert-returns. */
const REPORT_COLS =
  'id, lat, lng, title, category, severity, note, municipality, province, barangay, photo_url, photo_urls, resolved_photo_urls, status, source, still_here, cleared, created_at, resolved_at, after_image_url, after_uploaded_at, after_uploaded_by'

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
    municipality: row.municipality ?? undefined,
    province: row.province ?? undefined,
    barangay: row.barangay ?? undefined,
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
    updatePhotos: (row.report_photos ?? [])
      .filter((p) => p.kind === 'still_here')
      .map((p) => ({ url: p.url, at: p.created_at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
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
    .select(`${REPORT_COLS}, report_photos(url, kind, created_at)`)
    .order('created_at', { ascending: false })
  if (error || !data) {
    console.warn('[bantay-basura] failed to load reports from Supabase:', error)
    return null
  }
  return (data as unknown as ReportRow[]).map(fromRow)
}

/**
 * Live updates. Subscribe to the report tables so the map reflects other
 * residents' actions without a refresh: new reports (INSERT), confirmations /
 * status / after-photo changes (UPDATE on reports), and approved "still here"
 * evidence (INSERT on report_photos). Returns an unsubscribe function; a no-op
 * when the backend isn't configured. Only rows the public-read RLS allows are
 * delivered.
 */
export function subscribeReportChanges(handlers: {
  onInsert: (report: Report) => void
  onUpdate: (report: Report) => void
  onStillPhoto: (reportId: string, photo: { url: string; at: string }) => void
}): () => void {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client
    .channel('report-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => handlers.onInsert(fromRow(payload.new as unknown as ReportRow)),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => handlers.onUpdate(fromRow(payload.new as unknown as ReportRow)),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'report_photos' },
      (payload) => {
        const row = payload.new as { report_id: string; url: string; kind: string; created_at: string }
        if (row.kind === 'still_here') {
          handlers.onStillPhoto(row.report_id, { url: row.url, at: row.created_at })
        }
      },
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

/** The fields a resident supplies when flagging waste (see `useReportFlow`). */
export interface ReportInput {
  lat: number
  lng: number
  title?: string
  category: Category
  severity: 1 | 2 | 3
  note?: string
  municipality?: string
  province?: string
  barangay?: string
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
      municipality: input.municipality ?? null,
      province: input.province ?? null,
      barangay: input.barangay ?? null,
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

/**
 * Verify an image's real type by magic bytes (never trust the extension). The
 * Edge Function re-checks this server-side; this is the cheap first layer.
 */
export function sniffImageType(
  bytes: Uint8Array,
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return 'image/webp'
  return null
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export interface ModerationResult {
  /** Public URLs of images that passed moderation. */
  approved: string[]
  /** Count rejected outright (explicit/unrelated) or failing local validation. */
  rejected: number
  /** Count held for a human moderator (uncertain) — not published yet. */
  review: number
}

/**
 * The image moderation gate. Each photo is uploaded to the PRIVATE quarantine
 * bucket and passed to the `moderate-photo` Edge Function, which validates,
 * re-encodes (stripping EXIF/GPS), runs SafeSearch, and only publishes approved
 * images (attaching them to the report server-side). Nothing here reaches the
 * public map until it is approved.
 */
export async function moderatePhotos(
  reportId: string,
  dataUrls: string[],
  kind: 'report' | 'after' | 'still_here' = 'report',
): Promise<ModerationResult> {
  const out: ModerationResult = { approved: [], rejected: 0, review: 0 }
  if (!supabase || !dataUrls.length) return out
  for (const src of dataUrls) {
    try {
      const blob = await (await fetch(src)).blob()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const type = sniffImageType(bytes)
      if (!type || bytes.byteLength > MAX_UPLOAD_BYTES) {
        out.rejected++
        continue
      }
      const path = `${crypto.randomUUID()}.${type.split('/')[1]}`
      const up = await supabase.storage
        .from('report-quarantine')
        .upload(path, blob, { contentType: type })
      if (up.error) {
        out.review++
        continue
      }
      const { data, error } = await supabase.functions.invoke('moderate-photo', {
        body: { reportId, path, kind },
      })
      if (error) {
        out.review++
        continue
      }
      if (data?.status === 'approved' && data.url) out.approved.push(data.url as string)
      else if (data?.status === 'rejected') out.rejected++
      else out.review++
    } catch (e) {
      console.warn('[bantay-basura] moderation call failed, holding photo:', e)
      out.review++
    }
  }
  return out
}

/** A QA feedback submission from a beta tester (in-app widget). */
export interface FeedbackInput {
  message: string
  category: string
  page: string
  appEnv: string
  userAgent: string
  viewport: string
}

/**
 * Persist a tester's feedback. Anonymous — no account required (RLS allows
 * anon INSERT into `feedback`, but not SELECT). Returns true on success.
 */
export async function insertFeedback(input: FeedbackInput): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('feedback').insert({
    message: input.message,
    category: input.category,
    page: input.page,
    app_env: input.appEnv,
    user_agent: input.userAgent,
    viewport: input.viewport,
  })
  if (error) {
    console.warn('[bantay-basura] failed to submit feedback:', error)
    return false
  }
  return true
}

/** A feedback row as shown in the Ops Center (camelCase). */
export interface FeedbackRow {
  id: string
  createdAt: string
  message: string
  category: string | null
  page: string | null
  appEnv: string | null
  userAgent: string | null
  viewport: string | null
  status: string
}

/** List feedback submissions (newest first). Requires an authenticated
 *  operator session — anon reads are blocked by RLS and return []. */
export async function listFeedback(): Promise<FeedbackRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error || !data) {
    console.warn('[bantay-basura] failed to load feedback:', error)
    return []
  }
  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    message: row.message,
    category: row.category,
    page: row.page,
    appEnv: row.app_env,
    userAgent: row.user_agent,
    viewport: row.viewport,
    status: row.status,
  }))
}

/** Update a feedback row's triage status (new | triaged | resolved). */
export async function setFeedbackStatus(id: string, status: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
  if (error) {
    console.warn('[bantay-basura] failed to update feedback status:', error)
    return false
  }
  return true
}
