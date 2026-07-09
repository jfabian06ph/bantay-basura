import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import MapView, { type FlyTarget, type MapViewport } from './MapView'
import FloatingControls from './FloatingControls'
import TrustPanel from './TrustPanel'
import PlacingOverlay from './PlacingOverlay'
import ReportPanel from './ReportPanel'
import type { Target } from './LocationSearch'
import type { GeoStatus, UserLocation } from '../hooks/useUserLocation'
import type { Report } from '../types'
import type { StatusFilter } from '../PublicApp'

interface CloudSprite {
  tx: string
  ty: string
  size: number
  op: number
  s0: number
  delay: number
}

/** Clouds that emanate from the center and rush outward past the "camera" as
 * the map zooms — a fly-forward-through-clouds moment that veils briefly then
 * clears as the map settles. Motion (not a static wash) keeps the map readable. */
function makeClouds(): CloudSprite[] {
  return Array.from({ length: 9 }, (_, i) => {
    // Spread launch angles around the circle, with a little jitter.
    const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.7
    const dist = 42 + Math.random() * 38 // how far it flies outward (vmin)
    return {
      tx: `${(Math.cos(angle) * dist).toFixed(1)}vmin`,
      ty: `${(Math.sin(angle) * dist).toFixed(1)}vmin`,
      size: 260 + Math.floor(Math.random() * 320), // 260–580px
      op: 0.45 + Math.random() * 0.3,
      s0: 0.3 + Math.random() * 0.25, // starting scale (small, near center)
      delay: Math.round(Math.random() * 14) / 100,
    }
  })
}

/**
 * A soft "flying through clouds" moment whenever a fly-to is triggered (search,
 * locate, jump-to-address): several drifting cloud puffs. Skips the very first
 * fly (initial auto-locate) so it doesn't play on load.
 */
function FlyClouds({ nonce }: { nonce?: number }) {
  const prev = useRef<number | null>(null)
  const [run, setRun] = useState<{ id: number; clouds: CloudSprite[] } | null>(null)

  useEffect(() => {
    if (nonce == null) return
    if (prev.current === null) {
      prev.current = nonce // first observed fly (initial locate) — don't animate
      return
    }
    if (nonce === prev.current) return
    prev.current = nonce
    setRun((r) => ({ id: (r?.id ?? 0) + 1, clouds: makeClouds() }))
  }, [nonce])

  if (!run) return null
  return (
    <div key={run.id} className="bb-fly-clouds" aria-hidden>
      {run.clouds.map((c, i) => (
        <span
          key={i}
          className="bb-cloud-sprite"
          style={{
            width: `${c.size}px`,
            animationDelay: `${c.delay}s`,
            ['--tx' as string]: c.tx,
            ['--ty' as string]: c.ty,
            ['--op' as string]: c.op,
            ['--s0' as string]: c.s0,
          }}
        />
      ))}
    </div>
  )
}

interface Props {
  reports: Report[]
  /** Reports actually drawn on the map (after the legend filter). */
  mapReports: Report[]
  now: number
  userPos: UserLocation | null
  flyTarget: FlyTarget | null
  mapRef: RefObject<LeafletMap | null>
  placing: boolean
  live: boolean
  devMode: boolean
  stats: { pending: number; review: number; done: number }
  /** Human label for the current map area, shown on the status card. */
  contextLabel: string
  onViewport: (v: MapViewport) => void
  locateStatus: GeoStatus
  statusFilter: StatusFilter
  onStatusFilter: (f: StatusFilter) => void
  trustOpen: boolean
  selectedReport: Report | null
  onConfirmReport: (id: string, kind: 'stillHere' | 'cleared') => void
  onSelectReport: (r: Report) => void
  onCloseReport: () => void
  onJump: (target: Target) => void
  onLocate: () => void
  onReport: () => void
  onCancelPlacing: () => void
  onConfirmPlacement: () => void
  onTrustClose: () => void
  onTrustReopen: () => void
  onFlyTo: (lat: number, lng: number, zoom: number) => void
}

/**
 * The map surface and everything floating over it. Composes the Leaflet map
 * with the placing overlay (while pinning) or the floating controls + trust
 * panel (while browsing).
 */
export default function MapCanvas({
  reports,
  mapReports,
  now,
  userPos,
  flyTarget,
  mapRef,
  placing,
  live,
  devMode,
  stats,
  contextLabel,
  onViewport,
  locateStatus,
  statusFilter,
  onStatusFilter,
  trustOpen,
  selectedReport,
  onConfirmReport,
  onSelectReport,
  onCloseReport,
  onJump,
  onLocate,
  onReport,
  onCancelPlacing,
  onConfirmPlacement,
  onTrustClose,
  onTrustReopen,
  onFlyTo,
}: Props) {
  return (
    <div className="bb-map-wrap">
      <MapView
        reports={mapReports}
        onConfirm={onConfirmReport}
        now={now}
        userPos={userPos}
        flyTarget={flyTarget}
        mapRef={mapRef}
        placing={placing}
        onSelect={onSelectReport}
        onViewport={onViewport}
      />

      <FlyClouds nonce={flyTarget?.nonce} />

      {placing ? (
        <PlacingOverlay onCancel={onCancelPlacing} onConfirm={onConfirmPlacement} />
      ) : (
        <>
          <FloatingControls
            locateStatus={locateStatus}
            userPos={userPos}
            statusFilter={statusFilter}
            onStatusFilter={onStatusFilter}
            onJump={onJump}
            onLocate={onLocate}
            onReport={onReport}
          />
          <TrustPanel
            reports={reports}
            stats={stats}
            contextLabel={contextLabel}
            now={now}
            open={trustOpen}
            onClose={onTrustClose}
            onReopen={onTrustReopen}
            onFlyTo={onFlyTo}
            onOpenReport={onSelectReport}
          />
        </>
      )}

      {selectedReport && (
        <ReportPanel
          key={selectedReport.id}
          report={selectedReport}
          now={now}
          userPos={userPos}
          onConfirm={onConfirmReport}
          onClose={onCloseReport}
        />
      )}

      {devMode && !live && <div className="bb-demo-badge">Demo mode — mock data</div>}
    </div>
  )
}
