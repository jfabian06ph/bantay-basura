// ============================================================
// moderate-photo — the image moderation gate for Bantay Basura.
//
// Anonymous uploads land in a PRIVATE `report-quarantine` bucket and are never
// public until this function approves them. Flow:
//   download (service role) -> validate real MIME + size -> re-encode & strip
//   EXIF -> Google Vision SafeSearch -> approve | reject | review.
// Only approved images are copied into the public `report-photos` bucket and
// attached to the report. Every decision is written to `moderation_events`.
//
// Deploy:  supabase functions deploy moderate-photo
// Secret:  supabase secrets set GOOGLE_VISION_API_KEY=...
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'

const QUARANTINE = 'report-quarantine'
const PUBLIC_BUCKET = 'report-photos'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_DIM = 2048 // downscale anything larger
const RATE_LIMIT_PER_HOUR = 40 // per device/IP

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Google Vision likelihood scale, low -> high.
const LIKELIHOOD = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']
const atLeast = (value: string, floor: string) =>
  LIKELIHOOD.indexOf(value ?? 'UNKNOWN') >= LIKELIHOOD.indexOf(floor)

interface SafeSearch {
  adult?: string
  spoof?: string
  medical?: string
  violence?: string
  racy?: string
}

/**
 * Map SafeSearch scores to a decision. Reject clearly explicit/graphic; hold
 * borderline for a human (esp. medical/violence, which may be legit civic
 * reports — medical waste, dead animals, environmental damage); else approve.
 */
function decide(s: SafeSearch): 'approved' | 'rejected' | 'review' {
  if (atLeast(s.adult ?? '', 'LIKELY') || atLeast(s.racy ?? '', 'LIKELY') || atLeast(s.violence ?? '', 'VERY_LIKELY'))
    return 'rejected'
  if (
    atLeast(s.adult ?? '', 'POSSIBLE') ||
    atLeast(s.racy ?? '', 'POSSIBLE') ||
    atLeast(s.violence ?? '', 'POSSIBLE') ||
    atLeast(s.medical ?? '', 'LIKELY')
  )
    return 'review'
  return 'approved'
}

/** Verify real content type by magic bytes (never trust the extension). */
function sniffMime(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length < 12) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return 'image/webp'
  return null
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const VISION_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!VISION_KEY) return json({ error: 'moderation not configured' }, 500)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  let body: { reportId?: string; path?: string; kind?: 'report' | 'after' }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  const { reportId, path, kind = 'report' } = body
  if (!reportId || !path) return json({ error: 'reportId and path required' }, 400)

  // Rate-limit per device/IP (hashed — no raw IP stored).
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256Hex(`bb:${ip}`)
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await supabase
    .from('moderation_events')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourAgo)
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ status: 'rejected', reason: 'rate_limited' }, 429)

  // Pull the quarantined original (service role — anon can't read this bucket).
  const dl = await supabase.storage.from(QUARANTINE).download(path)
  if (dl.error || !dl.data) return json({ error: 'file not found' }, 404)
  const raw = new Uint8Array(await dl.data.arrayBuffer())

  const record = async (status: string, scores: unknown) => {
    await supabase.from('moderation_events').insert({
      report_id: reportId,
      kind,
      status,
      scores: scores ?? null,
      ip_hash: ipHash,
    })
  }
  const dropQuarantine = () => supabase.storage.from(QUARANTINE).remove([path])

  // 1) Validate: real MIME + size.
  const mime = sniffMime(raw)
  if (!mime || raw.byteLength > MAX_BYTES) {
    await record('rejected', { reason: mime ? 'too_large' : 'bad_type' })
    await dropQuarantine()
    return json({ status: 'rejected' })
  }

  // 2) Re-encode + strip EXIF/GPS (decode then re-encode to JPEG). WebP decode
  //    isn't supported here yet — hold those for a human rather than publish raw.
  let clean: Uint8Array
  try {
    const img = (await Image.decode(raw)) as Image
    if (Math.max(img.width, img.height) > MAX_DIM) {
      const scale = MAX_DIM / Math.max(img.width, img.height)
      img.resize(Math.round(img.width * scale), Math.round(img.height * scale))
    }
    clean = await img.encodeJPEG(82)
  } catch {
    await record('review', { reason: 'decode_unsupported', mime })
    return json({ status: 'review' })
  }

  // 3) Moderate the re-encoded bytes with Google Vision SafeSearch.
  let scores: SafeSearch = {}
  try {
    const b64 = btoa(String.fromCharCode(...clean))
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: b64 }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] }],
      }),
    })
    const data = await res.json()
    scores = data?.responses?.[0]?.safeSearchAnnotation ?? {}
  } catch {
    // If moderation itself fails, never publish — hold for review.
    await record('review', { reason: 'moderation_unavailable' })
    return json({ status: 'review' })
  }

  const verdict = decide(scores)

  if (verdict === 'rejected') {
    await record('rejected', scores)
    await dropQuarantine()
    return json({ status: 'rejected' })
  }
  if (verdict === 'review') {
    await record('review', scores) // stays in quarantine for a moderator
    return json({ status: 'review' })
  }

  // 4) Approved — publish the cleaned image and attach it to the report.
  const newPath = `${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(PUBLIC_BUCKET).upload(newPath, clean, { contentType: 'image/jpeg' })
  if (up.error) {
    await record('review', { reason: 'publish_failed' })
    return json({ status: 'review' })
  }
  const publicUrl = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(newPath).data.publicUrl

  if (kind === 'after') {
    await supabase.from('reports').update({ after_image_url: publicUrl, after_uploaded_at: new Date().toISOString(), after_uploaded_by: 'volunteer' }).eq('id', reportId)
  } else {
    const { data: rep } = await supabase.from('reports').select('photo_url, photo_urls').eq('id', reportId).single()
    const urls = [...((rep?.photo_urls as string[] | null) ?? []), publicUrl]
    await supabase.from('reports').update({ photo_urls: urls, photo_url: rep?.photo_url ?? publicUrl }).eq('id', reportId)
  }

  await record('approved', scores)
  await dropQuarantine()
  return json({ status: 'approved', url: publicUrl })
})
