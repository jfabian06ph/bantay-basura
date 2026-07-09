import type { RefObject } from 'react'
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
