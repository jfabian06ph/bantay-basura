import { useState } from 'react'
import { distanceMeters } from '../lib/geo'
import { reverseGeocode } from '../lib/geocode'
import { ZAMBALES_OVERVIEW } from '../municipalities'
import { DONE_STATUSES, type LatLng, type Report } from '../types'
import type { Mismatch } from '../components/LocationMismatchModal'
import type { UserLocation } from './useUserLocation'

// A pinned spot farther than this from the reporter's GPS triggers a warning.
const MISMATCH_METERS = 2000
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
}: Params) {
  const [mode, setMode] = useState<'idle' | 'placing'>('idle')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<LatLng | null>(null)
  const [pendingDetected, setPendingDetected] = useState(false)
  const [mismatch, setMismatch] = useState<Mismatch | null>(null)
  const [duplicate, setDuplicate] = useState<Report | null>(null)
  const [celebrateMsg, setCelebrateMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ report: Report; refId: string } | null>(null)

  const placing = mode === 'placing'

  /** Community confirmation — "still here" or "cleared" — on an existing flag. */
  function confirmReport(id: string, kind: 'stillHere' | 'cleared') {
    navigator.vibrate?.(8)
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [kind]: r[kind] + 1 } : r)),
    )
  }

  function openReport() {
    const detected = Boolean(position)
    const coords =
      (position && { lat: position.lat, lng: position.lng }) ||
      getCenter() ||
      { lat: ZAMBALES_OVERVIEW.lat, lng: ZAMBALES_OVERVIEW.lng }
    setPendingCoords(coords)
    setPendingDetected(detected)
    setSheetOpen(true)
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

  async function confirmPlacement() {
    const chosen = getCenter()
    if (!chosen) return
    if (position) {
      const d = distanceMeters(position, chosen)
      if (d > MISMATCH_METERS) {
        const near = await reverseGeocode(position.lat, position.lng)
        setMismatch({
          chosen,
          current: { lat: position.lat, lng: position.lng },
          distanceKm: d / 1000,
          nearName: near?.label ?? 'your current area',
        })
        return
      }
    }
    openDetails(chosen, false)
  }

  function handleSubmit(draft: Draft) {
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

    const report: Report = {
      ...draft,
      id: `local-${tempId++}`,
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
  }

  function adjustLocation() {
    setSheetOpen(false)
    startPlacing()
  }

  function mismatchUseCurrent() {
    const cur = mismatch?.current
    setMismatch(null)
    if (cur) {
      flyTo(cur.lat, cur.lng, 16)
      openDetails(cur, true)
    }
  }

  function mismatchKeepChosen() {
    const chosen = mismatch?.chosen
    setMismatch(null)
    if (chosen) openDetails(chosen, false)
  }

  function duplicateStillHere() {
    if (duplicate) {
      confirmReport(duplicate.id, 'stillHere')
      flyTo(duplicate.lat, duplicate.lng, 16)
    }
    setDuplicate(null)
    setPendingCoords(null)
    setCelebrateMsg('Thanks for confirming — it counts toward this spot 🙌')
  }

  return {
    // state
    placing,
    sheetOpen,
    setSheetOpen,
    pendingCoords,
    pendingDetected,
    mismatch,
    duplicate,
    celebrateMsg,
    submitted,
    // actions
    confirmReport,
    openReport,
    startPlacing,
    cancelPlacing,
    confirmPlacement,
    handleSubmit,
    adjustLocation,
    mismatchUseCurrent,
    mismatchKeepChosen,
    dismissMismatch: () => setMismatch(null),
    duplicateStillHere,
    dismissDuplicate: () => setDuplicate(null),
    dismissCelebration: () => setCelebrateMsg(null),
    dismissSubmitted: () => setSubmitted(null),
  }
}
