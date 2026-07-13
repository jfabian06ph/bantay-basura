import { useRef, useState } from 'react'
import { distanceMeters, locationTier } from '../lib/geo'
import { reverseGeocode, reverseLocality } from '../lib/geocode'
import { markAuthored } from '../lib/votes'
import { ZAMBALES_OVERVIEW } from '../municipalities'
import { DONE_STATUSES, type LatLng, type Report } from '../types'
import {
  insertReport,
  isBackendConnected,
  moderatePhotos,
  voteReport,
} from '../supabase'
import type { Mismatch } from '../components/LocationMismatchModal'
import type { UserLocation } from './useUserLocation'

/** Local (not-yet-persisted) reports carry a `local-` id prefix. */
const isLocalId = (id: string) => id.startsWith('local-')

// A new report this close to an existing same-type report is a duplicate.
const DUPLICATE_METERS = 60

let tempId = 0

/** Human-friendly public reference like BB-2026-000152. */
function nextRef(): string {
  let n = 152
  try {
    const cur = parseInt(localStorage.getItem('bb-ref-seq') || '151', 10)
    n = (Number.isNaN(cur) ? 151 : cur) + 1
    localStorage.setItem('bb-ref-seq', String(n))
  } catch {
    /* ignore */
  }
  return `BB-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`
}

type Draft = Omit<Report, 'id' | 'status' | 'stillHere' | 'cleared' | 'createdAt'>

interface Params {
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
  position: UserLocation | null
  flyTo: (lat: number, lng: number, zoom: number) => void
  /** Current map center, or null before the map is ready. */
  getCenter: () => LatLng | null
  /** Prompt for the user's GPS location (used by "Snap to my location"). */
  request: () => void
}

/**
 * Owns the entire "flag some waste" flow — placing on the map, the mismatch
 * and duplicate guards, submission, and the celebration toast. Keeping this
 * out of `App` lets the map surface stay a thin composition of presentational
 * pieces.
 */
export function useReportFlow({
  reports,
  setReports,
  position,
  flyTo,
  getCenter,
  request,
}: Params) {
  const [mode, setMode] = useState<'idle' | 'placing'>('idle')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<LatLng | null>(null)
  const [pendingDetected, setPendingDetected] = useState(false)
  const [mismatch, setMismatch] = useState<Mismatch | null>(null)
  const [duplicate, setDuplicate] = useState<Report | null>(null)
  const [celebrateMsg, setCelebrateMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ report: Report; refId: string } | null>(null)
  // Once the reporter has acknowledged a location warning for THIS draft, we
  // stop re-prompting as they nudge the pin around. Reset per new report.
  const [locationAck, setLocationAck] = useState(false)
  // When the mismatch dialog is raised from the wizard's "Next" (rather than
  // the placing overlay), this resolves once the reporter decides.
  const nextResolver = useRef<((proceed: boolean) => void) | null>(null)

  const placing = mode === 'placing'

  function resolveNext(proceed: boolean) {
    const resolve = nextResolver.current
    nextResolver.current = null
    resolve?.(proceed)
  }

  /** Community confirmation — "still here" or "cleared" — on an existing flag. */
  function confirmReport(id: string, kind: 'stillHere' | 'cleared') {
    navigator.vibrate?.(8)
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [kind]: r[kind] + 1 } : r)),
    )
    // Persist the confirmation once the backend is live. Local-only reports
    // (not yet round-tripped to the DB) stay optimistic until they reconcile.
    if (isBackendConnected && !isLocalId(id)) void voteReport(id, kind)
  }

  /** Attach the "after" photo to a resolved report — completes the cleanup. */
  async function uploadAfterPhoto(id: string, dataUrl: string) {
    navigator.vibrate?.(12)
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              afterImageUrl: dataUrl,
              afterUploadedAt: new Date().toISOString(),
              afterUploadedBy: 'volunteer',
            }
          : r,
      ),
    )
    if (isBackendConnected && !isLocalId(id)) {
      // After photos go through the same moderation gate. The Edge Function sets
      // after_image_url on approval; here we mirror the outcome locally.
      const mod = await moderatePhotos(id, [dataUrl], 'after')
      if (mod.approved[0]) {
        const url = mod.approved[0]
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, afterImageUrl: url } : r)),
        )
      } else {
        // Rejected or held — pull the optimistic after photo back down.
        setReports((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, afterImageUrl: undefined, afterUploadedAt: undefined, afterUploadedBy: undefined }
              : r,
          ),
        )
        setCelebrateMsg(
          mod.rejected > 0
            ? "That photo couldn't be added. It may contain sensitive or unrelated content."
            : 'Your photo is being checked before it appears publicly.',
        )
      }
    }
  }

  /**
   * Attach a fresh "still here" snapshot — evidence the waste is still around.
   * Lands on the activity timeline as a dated photo. Same moderation gate as
   * every other upload; nothing shows publicly until it's approved.
   */
  async function uploadStillPhoto(id: string, dataUrl: string) {
    navigator.vibrate?.(12)
    const at = new Date().toISOString()
    // Optimistic: show it immediately in the reporter's own view.
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, updatePhotos: [...(r.updatePhotos ?? []), { url: dataUrl, at }] }
          : r,
      ),
    )
    if (isBackendConnected && !isLocalId(id)) {
      const mod = await moderatePhotos(id, [dataUrl], 'still_here')
      if (mod.approved[0]) {
        const url = mod.approved[0]
        setReports((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r
            const mapped = (r.updatePhotos ?? []).map((p) =>
              p.url === dataUrl ? { url, at } : p,
            )
            // Realtime may have already streamed the approved url — keep unique.
            const seen = new Set<string>()
            const deduped = mapped.filter((p) => !seen.has(p.url) && seen.add(p.url))
            return { ...r, updatePhotos: deduped }
          }),
        )
      } else {
        // Rejected or held — pull the optimistic snapshot back down.
        setReports((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, updatePhotos: (r.updatePhotos ?? []).filter((p) => p.url !== dataUrl) }
              : r,
          ),
        )
        setCelebrateMsg(
          mod.rejected > 0
            ? "That photo couldn't be added. It may contain sensitive or unrelated content."
            : 'Your photo is being checked before it appears publicly.',
        )
      }
    }
  }

  function openReport() {
    // Pin starts where the map is centred (what you're looking at), not your
    // GPS — search/drag deliberately set the report spot. "Snap to my location"
    // resets it. Fall back to GPS, then the province, before the map is ready.
    const center = getCenter()
    const coords =
      center ||
      (position && { lat: position.lat, lng: position.lng }) ||
      { lat: ZAMBALES_OVERVIEW.lat, lng: ZAMBALES_OVERVIEW.lng }
    setPendingCoords(coords)
    setPendingDetected(!center && Boolean(position))
    setLocationAck(false)
    setSheetOpen(true)
  }

  /** "Snap to my location" — reset the pin to the user's GPS and fly there. */
  function useMyLocation() {
    if (position) {
      const c = { lat: position.lat, lng: position.lng }
      setPendingCoords(c)
      setPendingDetected(true)
      flyTo(c.lat, c.lng, 16)
    } else {
      request()
    }
  }

  function startPlacing() {
    setMode('placing')
    if (pendingCoords) flyTo(pendingCoords.lat, pendingCoords.lng, 16)
    else if (position) flyTo(position.lat, position.lng, 16)
  }

  function cancelPlacing() {
    setMode('idle')
  }

  function openDetails(coords: LatLng, detected: boolean) {
    setPendingCoords(coords)
    setPendingDetected(detected)
    setMode('idle')
    setSheetOpen(true)
  }

  /** Build the mismatch payload for a pin the given distance from GPS. */
  async function buildMismatch(chosen: LatLng, meters: number): Promise<Mismatch> {
    const near = await reverseGeocode(position!.lat, position!.lng)
    return {
      chosen,
      current: { lat: position!.lat, lng: position!.lng },
      distanceKm: meters / 1000,
      nearName: near?.label ?? 'your current area',
      severity: locationTier(meters) === 'strong' ? 'strong' : 'warn',
    }
  }

  async function confirmPlacement() {
    const chosen = getCenter()
    if (!chosen) return
    if (position) {
      const d = distanceMeters(position, chosen)
      const tier = locationTier(d)
      if (tier === 'dialog' || tier === 'strong') {
        setMismatch(await buildMismatch(chosen, d))
        return
      }
    }
    openDetails(chosen, false)
  }

  /**
   * Gate for the wizard's "Next" on the location step. Resolves `true` when the
   * reporter may advance, or raises the mismatch dialog and resolves once they
   * decide. Small differences (and already-acknowledged drafts) pass silently.
   */
  function guardLocationNext(chosen: LatLng): Promise<boolean> {
    if (!position || locationAck) return Promise.resolve(true)
    const d = distanceMeters(position, chosen)
    const tier = locationTier(d)
    if (tier !== 'dialog' && tier !== 'strong') return Promise.resolve(true)
    return buildMismatch(chosen, d).then((m) => {
      setMismatch(m)
      return new Promise<boolean>((resolve) => {
        nextResolver.current = resolve
      })
    })
  }

  async function handleSubmit(draft: Draft) {
    // Block near-duplicates of the same waste type — nudge to confirm instead.
    const dup = reports.find(
      (r) =>
        !DONE_STATUSES.includes(r.status) &&
        r.category === draft.category &&
        distanceMeters(r, draft) <= DUPLICATE_METERS,
    )
    if (dup) {
      setSheetOpen(false)
      setDuplicate(dup)
      return
    }

    // Optimistic: show the pin, celebration, and reference immediately.
    const localId = `local-${tempId++}`
    const report: Report = {
      ...draft,
      id: localId,
      status: 'pending',
      stillHere: 1,
      cleared: 0,
      createdAt: new Date().toISOString(),
    }
    setReports((prev) => [report, ...prev])
    setSheetOpen(false)
    setPendingCoords(null)
    flyTo(report.lat, report.lng, 16)
    setSubmitted({ report, refId: nextRef() })
    // The reporter already counts as resident #1 (stillHere: 1), so they can
    // never verify their own report (permanent, not the 24h cooldown).
    markAuthored(localId)
    // This visitor has now contributed — retire the first-visit welcome.
    try {
      localStorage.setItem('bb-has-reported', '1')
    } catch {
      /* ignore */
    }

    // Attribute the report to its REAL municipality/province (nationwide),
    // reverse-geocoded from the pinned spot. Applied to the optimistic pin so
    // the panel shows the true place, and persisted below.
    const locality = await reverseLocality(draft.lat, draft.lng)
    if (locality.municipality || locality.province || locality.barangay) {
      setReports((prev) =>
        prev.map((r) => (r.id === localId ? { ...r, ...locality } : r)),
      )
    }

    // Persist once the backend is live. The report is created WITHOUT photos —
    // nothing reaches the public map until moderation approves it. Approved
    // photos are attached to the report server-side by the Edge Function.
    if (!isBackendConnected) return
    const saved = await insertReport({
      ...draft,
      ...locality,
      photoUrls: [],
      photoUrl: undefined,
    })
    if (saved) {
      // Carry the authorship flag onto the real id (the panel keys off it).
      markAuthored(saved.id)
      // Reconcile the temp id, but keep the reporter's own photos in their local
      // view while moderation runs (others won't see them until approved).
      setReports((prev) =>
        prev.map((r) =>
          r.id === localId
            ? { ...saved, photoUrl: report.photoUrl, photoUrls: report.photoUrls }
            : r,
        ),
      )
      setSubmitted((s) =>
        s && s.report.id === localId ? { report: saved, refId: s.refId } : s,
      )

      const photos = draft.photoUrls ?? (draft.photoUrl ? [draft.photoUrl] : [])
      if (photos.length) {
        const mod = await moderatePhotos(saved.id, photos, 'report')
        // Reflect the outcome locally: only approved photos remain.
        setReports((prev) =>
          prev.map((r) =>
            r.id === saved.id
              ? { ...r, photoUrls: mod.approved, photoUrl: mod.approved[0] }
              : r,
          ),
        )
        if (mod.rejected > 0) {
          setCelebrateMsg(
            "A photo couldn't be added. It may contain sensitive or unrelated content.",
          )
        } else if (mod.review > 0) {
          setCelebrateMsg('Your photo is being checked and will appear once approved.')
        }
      }
    }
  }

  function adjustLocation() {
    setSheetOpen(false)
    startPlacing()
  }

  // "Move pin to my location" — snap the pin to GPS.
  function mismatchUseCurrent() {
    const cur = mismatch?.current
    setMismatch(null)
    setLocationAck(true)
    if (!cur) {
      resolveNext(true)
      return
    }
    if (nextResolver.current) {
      // Wizard flow: update the pin in place, then let "Next" advance.
      setPendingCoords(cur)
      setPendingDetected(true)
      flyTo(cur.lat, cur.lng, 16)
      resolveNext(true)
      return
    }
    // Placing-overlay flow: jump straight to the details step.
    flyTo(cur.lat, cur.lng, 16)
    openDetails(cur, true)
  }

  // "Keep this location" — proceed with the pin the reporter chose.
  function mismatchKeepChosen() {
    const chosen = mismatch?.chosen
    setMismatch(null)
    setLocationAck(true)
    if (nextResolver.current) {
      resolveNext(true)
      return
    }
    if (chosen) openDetails(chosen, false)
  }

  // "Cancel" — dismiss without advancing, but don't nag again this draft.
  function dismissMismatch() {
    setMismatch(null)
    setLocationAck(true)
    resolveNext(false)
  }

  function duplicateStillHere() {
    if (duplicate) {
      confirmReport(duplicate.id, 'stillHere')
      flyTo(duplicate.lat, duplicate.lng, 16)
    }
    setDuplicate(null)
    setPendingCoords(null)
    setCelebrateMsg('Thanks for confirming, it counts toward this spot 🙌')
  }

  return {
    // state
    placing,
    sheetOpen,
    setSheetOpen,
    pendingCoords,
    pendingDetected,
    locationAck,
    mismatch,
    duplicate,
    celebrateMsg,
    submitted,
    // actions
    confirmReport,
    uploadAfterPhoto,
    uploadStillPhoto,
    openReport,
    useMyLocation,
    startPlacing,
    cancelPlacing,
    confirmPlacement,
    guardLocationNext,
    handleSubmit,
    adjustLocation,
    mismatchUseCurrent,
    mismatchKeepChosen,
    dismissMismatch,
    duplicateStillHere,
    dismissDuplicate: () => setDuplicate(null),
    dismissCelebration: () => setCelebrateMsg(null),
    dismissSubmitted: () => setSubmitted(null),
  }
}
