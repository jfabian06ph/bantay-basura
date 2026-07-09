import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { FlyTarget, MapViewport } from './components/MapView'
import { nearestMunicipality } from './municipalities'
import { reverseArea } from './lib/geocode'
import Navigation from './components/Navigation'
import MapCanvas from './components/MapCanvas'
import MapDialogs from './components/MapDialogs'
import SubmitSuccess from './components/SubmitSuccess'
import PageRouter from './components/PageRouter'
import DevPanel from './components/DevPanel'
import { MOCK_REPORTS } from './mockData'
import { isBackendConnected, loadReports } from './supabase'
import { useUserLocation } from './hooks/useUserLocation'
import { useReportFlow } from './hooks/useReportFlow'
import type { LatLng, Report, ReportStatus } from './types'
import type { View } from './content/pages'
import { isDevMode } from './lib/devMode'
import './App.css'

export type StatusFilter = 'all' | ReportStatus

// A fixed "now" captured at load — avoids Date churn on every render.
const NOW = new Date().getTime()

// Rough bounding box of Zambales — lets the status card name the province.
const ZAMBALES_BBOX = { s: 14.6, n: 15.95, w: 119.75, e: 120.55 }
const inZambales = (lat: number, lng: number) =>
  lat >= ZAMBALES_BBOX.s && lat <= ZAMBALES_BBOX.n && lng >= ZAMBALES_BBOX.w && lng <= ZAMBALES_BBOX.e

/**
 * A human label for the current map area, so the status card explains why its
 * numbers change as you pan/zoom. Zoomed into a town → the town; across the
 * province → "Zambales"; anywhere else → the honest "Current Map Area".
 */
function labelForView(v: MapViewport | null): string {
  if (!v) return 'Current Map Area'
  if (v.zoom >= 12) {
    const { place, distanceM } = nearestMunicipality({ lat: v.lat, lng: v.lng })
    if (distanceM < 12_000) return place.name
  }
  if (v.zoom >= 8 && inZambales(v.lat, v.lng)) return 'Zambales'
  return 'Current Map Area'
}

interface Props {
  onSignIn: () => void
}

/** The public-facing civic site: map, transparency, community, info pages. */
export default function PublicApp({ onSignIn }: Props) {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS)
  const [view, setView] = useState<View>('map')
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null)
  const [devMock, setDevMock] = useState<LatLng | null>(null)
  const [trustOpen, setTrustOpen] = useState(true)
  // Default to unresolved issues — that's what most visitors are looking for.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapView, setMapView] = useState<MapViewport | null>(null)
  const [areaLabel, setAreaLabel] = useState<string | null>(null)
  const flyNonce = useRef(0)
  const mapRef = useRef<LeafletMap | null>(null)

  // Dev/demo chrome is hidden unless a developer opts in (?dev=1).
  const devMode = isDevMode()

  useEffect(() => {
    if (!isBackendConnected) return
    let alive = true
    loadReports().then((rows) => {
      if (alive && rows && rows.length) setReports(rows)
    })
    return () => {
      alive = false
    }
  }, [])

  const { position: realPosition, status, request } = useUserLocation()

  const position = useMemo(
    () => (devMock ? { lat: devMock.lat, lng: devMock.lng, accuracy: 25 } : realPosition),
    [devMock, realPosition],
  )

  function flyTo(lat: number, lng: number, zoom: number) {
    setFlyTarget({ lat, lng, zoom, nonce: flyNonce.current++ })
  }

  const flewToUser = useRef(false)
  useEffect(() => {
    if (position && !flewToUser.current) {
      flewToUser.current = true
      flyTo(position.lat, position.lng, 15)
    }
  }, [position])

  // Reports inside the current map viewport — powers the contextual status card.
  const viewReports = useMemo(() => {
    if (!mapView) return reports
    const { north, south, east, west } = mapView
    return reports.filter(
      (r) => r.lat <= north && r.lat >= south && r.lng <= east && r.lng >= west,
    )
  }, [reports, mapView])

  // Name the current map area anywhere in PH via reverse geocoding (debounced,
  // so we stay light on Nominatim). Falls back to the Zambales heuristic while
  // the lookup is in flight or if it fails.
  useEffect(() => {
    if (!mapView) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      reverseArea(mapView.lat, mapView.lng, mapView.zoom, ctrl.signal)
        .then((name) => name && setAreaLabel(name))
        .catch(() => {})
    }, 700)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [mapView])

  const contextLabel = useMemo(
    () => areaLabel ?? labelForView(mapView),
    [areaLabel, mapView],
  )

  const stats = useMemo(() => {
    let pending = 0
    let review = 0
    let done = 0
    for (const r of viewReports) {
      if (r.status === 'resolved') done++
      else if (r.status === 'in_review') review++
      else pending++
    }
    return { pending, review, done, active: pending + review }
  }, [viewReports])

  // Reports drawn on the map respect the legend filter; stats stay full.
  const mapReports = useMemo(
    () => (statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)),
    [reports, statusFilter],
  )

  // Derive from the live list so confirm-count updates flow into the sheet.
  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  )

  // Deep link: opening ?r=<id> (e.g. from a QR code) selects that report.
  const openedFromUrl = useRef(false)
  useEffect(() => {
    if (openedFromUrl.current) return
    const rid = new URLSearchParams(window.location.search).get('r')
    if (rid && reports.some((r) => r.id === rid)) {
      setSelectedId(rid)
      openedFromUrl.current = true
    }
  }, [reports])

  const getCenter = (): LatLng | null => {
    const m = mapRef.current
    if (!m) return null
    const c = m.getCenter()
    return { lat: c.lat, lng: c.lng }
  }

  const flow = useReportFlow({ reports, setReports, position, flyTo, getCenter })

  function handleLocate() {
    if (position) flyTo(position.lat, position.lng, 16)
    else request()
  }

  function simulateLocation() {
    const c = getCenter()
    if (!c) return
    setDevMock(c)
    flyTo(c.lat, c.lng, 16)
  }

  return (
    <div className="bb-app">
      <Navigation view={view} onNavigate={setView} onSignIn={onSignIn} />

      <div className="bb-app-body">
      <MapCanvas
        reports={viewReports}
        mapReports={mapReports}
        now={NOW}
        userPos={position}
        flyTarget={flyTarget}
        mapRef={mapRef}
        placing={flow.placing}
        live={isBackendConnected}
        devMode={devMode}
        stats={stats}
        contextLabel={contextLabel}
        onViewport={setMapView}
        locateStatus={status}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        trustOpen={trustOpen}
        selectedReport={selectedReport}
        onConfirmReport={flow.confirmReport}
        onSelectReport={(r) => setSelectedId(r.id)}
        onCloseReport={() => setSelectedId(null)}
        onJump={(t) => flyTo(t.lat, t.lng, t.zoom)}
        onLocate={handleLocate}
        onReport={flow.openReport}
        onCancelPlacing={flow.cancelPlacing}
        onConfirmPlacement={flow.confirmPlacement}
        onTrustClose={() => setTrustOpen(false)}
        onTrustReopen={() => setTrustOpen(true)}
        onFlyTo={flyTo}
      />

      <MapDialogs
        sheetOpen={flow.sheetOpen}
        onSheetOpenChange={flow.setSheetOpen}
        onSubmit={flow.handleSubmit}
        pendingCoords={flow.pendingCoords}
        pendingDetected={flow.pendingDetected}
        onAdjustLocation={flow.adjustLocation}
        mismatch={flow.mismatch}
        onMismatchUseCurrent={flow.mismatchUseCurrent}
        onMismatchKeepChosen={flow.mismatchKeepChosen}
        onMismatchCancel={flow.dismissMismatch}
        duplicate={flow.duplicate}
        onDuplicateStillHere={flow.duplicateStillHere}
        onDuplicateClose={flow.dismissDuplicate}
        celebrateMsg={flow.celebrateMsg}
        onCelebrationDone={flow.dismissCelebration}
      />

      <SubmitSuccess
        submitted={flow.submitted}
        onClose={flow.dismissSubmitted}
        onTrack={(id) => {
          try {
            const list: string[] = JSON.parse(localStorage.getItem('bb-tracked') || '[]')
            if (!list.includes(id)) {
              localStorage.setItem('bb-tracked', JSON.stringify([...list, id]))
            }
          } catch {
            /* ignore */
          }
        }}
      />

      <PageRouter
        view={view}
        onNavigate={setView}
        onClose={() => setView('map')}
        activeCount={stats.active}
        reports={reports}
        now={NOW}
        live={isBackendConnected}
      />
      </div>

      {devMode && (
        <DevPanel
          mock={devMock}
          realPosition={realPosition}
          onSimulate={simulateLocation}
          onClear={() => setDevMock(null)}
        />
      )}
    </div>
  )
}
