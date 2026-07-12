import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import Supercluster from 'supercluster'
import { Plus, Minus, Layers, Maximize, Trash2, SlidersHorizontal, Sprout } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { Report } from '../types'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, DONE_STATUSES } from '../types'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import { pinIcon, clusterIcon, userLocationIcon } from '../markerIcon'
import type { UserLocation } from '../hooks/useUserLocation'
import { distanceMeters, formatDistance } from '../lib/geo'
import type { StatusFilter } from '../PublicApp'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All reports' },
  { key: 'pending', label: 'Needs attention' },
  { key: 'in_review', label: 'Under review' },
  { key: 'resolved', label: 'Cleaned' },
]

const ZAMBALES_CENTER: [number, number] = [15.1, 120.05]

const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/** Selectable basemaps, à la Apple/Google map-type switcher. */
type BasemapKey = 'streets' | 'satellite' | 'light'

interface Basemap {
  label: string
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
}

const BASEMAPS: Record<BasemapKey, Basemap> = {
  streets: {
    label: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTR,
    subdomains: 'abcd',
    maxZoom: 20,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
  },
  light: {
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTR,
    subdomains: 'abcd',
    maxZoom: 20,
  },
}

const BASEMAP_ORDER: BasemapKey[] = ['streets', 'satellite', 'light']

const CLUSTER_COLORS = { open: '#e31e2f', review: '#f59e0b', done: '#22c55e' }

function groupOf(status: Report['status']): 'open' | 'review' | 'done' {
  if (DONE_STATUSES.includes(status)) return 'done'
  if (status === 'pending') return 'open'
  return 'review' // assigned, in_progress
}

function timeAgo(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  const hours = Math.floor(diff / 3_600_000)
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const mins = Math.max(1, Math.floor(diff / 60_000))
  return `${mins} min${mins > 1 ? 's' : ''} ago`
}

export interface FlyTarget {
  lat: number
  lng: number
  zoom: number
  nonce: number
}

/** The current visible map area — lets overlays react to pan/zoom. */
export interface MapViewport {
  north: number
  south: number
  east: number
  west: number
  zoom: number
  lat: number
  lng: number
}

/** Reports the current viewport to the parent on load and after every move/zoom. */
function ViewportWatcher({ onChange }: { onChange?: (v: MapViewport) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!onChange) return
    const emit = () => {
      const b = map.getBounds()
      const c = map.getCenter()
      onChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
        zoom: map.getZoom(),
        lat: c.lat,
        lng: c.lng,
      })
    }
    emit()
    map.on('moveend zoomend', emit)
    return () => {
      map.off('moveend zoomend', emit)
    }
  }, [map, onChange])
  return null
}

function ResizeFixer() {
  const map = useMap()
  useEffect(() => {
    const fix = () => map.invalidateSize()
    const raf = requestAnimationFrame(fix)
    const t = setTimeout(fix, 250)
    window.addEventListener('resize', fix)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      window.removeEventListener('resize', fix)
    }
  }, [map])
  return null
}

function TapToPlace({ enabled }: { enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) e.target.panTo(e.latlng, { animate: true })
    },
  })
  return null
}

/** Tapping empty map area (not a marker, not an overlay) dismisses the open
 * report — the expected "tap outside to close" gesture. */
function TapToDismiss({ onDismiss }: { onDismiss?: () => void }) {
  useMapEvents({
    click() {
      onDismiss?.()
    },
  })
  return null
}

function MapController({ target }: { target: FlyTarget | null }) {
  const map = useMap()
  const lastNonce = useRef(-1)
  useEffect(() => {
    if (target && target.nonce !== lastNonce.current) {
      lastNonce.current = target.nonce
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.4 })
    }
  }, [target, map])
  return null
}

/** One report as a circular pin. Tapping opens the bottom sheet (onSelect)
 * when provided; otherwise falls back to an inline Leaflet popup. */
function ReportPin({
  report,
  now,
  userPos,
  onConfirm,
  onSelect,
}: {
  report: Report
  now: number
  userPos: UserLocation | null
  onConfirm: (id: string, kind: 'stillHere' | 'cleared') => void
  onSelect?: (r: Report) => void
}) {
  const dist = userPos ? formatDistance(distanceMeters(userPos, report)) : null
  const color = STATUS_COLORS[report.status]
  const Cat = CATEGORY_ICON[report.category]
  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={pinIcon(report)}
      eventHandlers={onSelect ? { click: () => onSelect(report) } : undefined}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1} className="bb-tip">
        <div className="bb-pin-tip">
          <div className="bb-pin-tip-title">
            <Cat className="size-3.5" /> {report.title ?? CATEGORY_LABELS[report.category]}
          </div>
          <div className="bb-pin-tip-sub">
            {report.stillHere > 0
              ? `Verified by ${report.stillHere} ${report.stillHere === 1 ? 'resident' : 'residents'}`
              : CATEGORY_LABELS[report.category]}
          </div>
        </div>
      </Tooltip>
      {!onSelect && (
        <Popup>
          <div className="bb-popup">
            {report.photoUrl && (
              <img className="bb-popup-photo" src={report.photoUrl} alt="report" />
            )}
            <div className="bb-popup-title inline-flex items-center gap-1.5">
              <Cat className="size-4" /> {CATEGORY_LABELS[report.category]}
            </div>
            <div className="bb-status" style={{ background: `${color}22`, color }}>
              {STATUS_LABELS[report.status]}
            </div>
            {report.note && <p className="bb-popup-note">{report.note}</p>}
            <div className="bb-popup-meta">
              {timeAgo(report.createdAt, now)}
              {dist && <span className="bb-popup-dist"> · {dist}</span>}
            </div>
            <div className="bb-confirm-row">
              <button
                className="bb-confirm bb-confirm-still"
                onClick={() => onConfirm(report.id, 'stillHere')}
              >
                Still here 👎 <b>{report.stillHere}</b>
              </button>
              <button
                className="bb-confirm bb-confirm-cleared"
                onClick={() => onConfirm(report.id, 'cleared')}
              >
                Cleared ✅ <b>{report.cleared}</b>
              </button>
            </div>
          </div>
        </Popup>
      )}
    </Marker>
  )
}

interface ClusterProps {
  reports: Report[]
  now: number
  userPos: UserLocation | null
  onConfirm: (id: string, kind: 'stillHere' | 'cleared') => void
  onSelect?: (r: Report) => void
}

/** Clusters reports with supercluster; renders bubbles zoomed-out, pins zoomed-in. */
function ClusterLayer({ reports, now, userPos, onConfirm, onSelect }: ClusterProps) {
  const map = useMap()
  const [view, setView] = useState<{ bbox: [number, number, number, number]; zoom: number } | null>(null)

  const update = useCallback(() => {
    const b = map.getBounds()
    setView({
      bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom: Math.round(map.getZoom()),
    })
  }, [map])

  useEffect(() => {
    update()
  }, [update])

  useMapEvents({ moveend: update, zoomend: update, resize: update })

  const index = useMemo(() => {
    const idx = new Supercluster<any, any>({
      radius: 60,
      maxZoom: 17,
      map: (p) => ({ open: p.open, review: p.review, done: p.done }),
      reduce: (acc, p) => {
        acc.open += p.open
        acc.review += p.review
        acc.done += p.done
      },
    })
    idx.load(
      reports.map((r) => {
        const g = groupOf(r.status)
        return {
          type: 'Feature' as const,
          properties: {
            cluster: false,
            report: r,
            open: g === 'open' ? 1 : 0,
            review: g === 'review' ? 1 : 0,
            done: g === 'done' ? 1 : 0,
          },
          geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
        }
      }),
    )
    return idx
  }, [reports])

  const clusters = useMemo(
    () => (view ? index.getClusters(view.bbox, view.zoom) : []),
    [index, view],
  )

  return (
    <>
      {clusters.map((f) => {
        const [lng, lat] = f.geometry.coordinates
        const props = f.properties as Record<string, any>

        if (props.cluster) {
          const { open, review, done, point_count, cluster_id } = props
          const group =
            open >= review && open >= done
              ? 'open'
              : review >= done
                ? 'review'
                : 'done'
          const color = CLUSTER_COLORS[group as keyof typeof CLUSTER_COLORS]
          return (
            <Marker
              key={`cluster-${cluster_id}`}
              position={[lat, lng]}
              icon={clusterIcon(point_count, color)}
              eventHandlers={{
                click: () => {
                  const z = Math.min(
                    index.getClusterExpansionZoom(cluster_id),
                    18,
                  )
                  map.flyTo([lat, lng], z, { duration: 0.8 })
                },
              }}
            />
          )
        }

        const report = props.report as Report
        return (
          <ReportPin
            key={report.id}
            report={report}
            now={now}
            userPos={userPos}
            onConfirm={onConfirm}
            onSelect={onSelect}
          />
        )
      })}
    </>
  )
}

/** Floating zoom buttons + basemap/status switcher, Apple/Google-Maps style. */
function MapControls({
  mapRef,
  basemap,
  onBasemap,
  userPos,
  statusFilter,
  onStatusFilter,
}: {
  mapRef: React.RefObject<LeafletMap | null>
  basemap: BasemapKey
  onBasemap: (key: BasemapKey) => void
  userPos: UserLocation | null
  statusFilter: StatusFilter
  onStatusFilter?: (f: StatusFilter) => void
}) {
  // Only one menu open at a time (dedicated filter button + layers button).
  const [menu, setMenu] = useState<'filter' | 'layers' | null>(null)
  const filtered = statusFilter !== 'all'

  // Re-center on the current (real or spoofed) location; otherwise show the
  // whole coverage area. Prevents the "jumps back to the overview" surprise.
  const recenter = () => {
    if (userPos) mapRef.current?.flyTo([userPos.lat, userPos.lng], 16, { duration: 0.9 })
    else mapRef.current?.flyTo(ZAMBALES_CENTER, 9, { duration: 0.9 })
  }
  return (
    <div className="bb-map-ctrls">
      {/* Dedicated filter button (status) — sits above the map-style layers. */}
      {onStatusFilter && (
        <div className="bb-layers">
          <button
            className={`bb-control bb-control-round bb-layers-btn ${filtered ? 'bb-layers-btn-active' : ''}`}
            onClick={() => setMenu((m) => (m === 'filter' ? null : 'filter'))}
            aria-label="Filter reports"
            aria-expanded={menu === 'filter'}
            title="Filter reports"
          >
            <SlidersHorizontal className="size-5" />
            {filtered && <span className="bb-layers-badge" />}
          </button>
          {menu === 'filter' && (
            <div className="bb-layers-menu bb-filter-menu" role="menu">
              <div className="bb-layers-group-k">Filter Reports</div>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="menuitemradio"
                  aria-checked={statusFilter === f.key}
                  className={`bb-layers-opt bb-layers-opt-status ${statusFilter === f.key ? 'bb-layers-active' : ''}`}
                  onClick={() => {
                    onStatusFilter(f.key)
                    setMenu(null)
                  }}
                >
                  <span
                    className="bb-layers-dot"
                    style={{ background: f.key === 'all' ? '#64748b' : STATUS_COLORS[f.key] }}
                  />
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map-style (basemap) layers. */}
      <div className="bb-layers">
        <button
          className="bb-control bb-control-round bb-layers-btn"
          onClick={() => setMenu((m) => (m === 'layers' ? null : 'layers'))}
          aria-label="Map style"
          aria-expanded={menu === 'layers'}
          title="Map style"
        >
          <Layers className="size-5" />
        </button>
        {menu === 'layers' && (
          <div className="bb-layers-menu" role="menu">
            <div className="bb-layers-group-k">Map style</div>
            {BASEMAP_ORDER.map((key) => (
              <button
                key={key}
                role="menuitemradio"
                aria-checked={basemap === key}
                className={`bb-layers-opt ${basemap === key ? 'bb-layers-active' : ''}`}
                onClick={() => {
                  onBasemap(key)
                  setMenu(null)
                }}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="bb-control bb-control-round"
        onClick={recenter}
        aria-label="Re-center map"
        title={userPos ? 'Re-center on my location' : 'Re-center to full view'}
      >
        <Maximize className="size-5" />
      </button>

      <div className="bb-zoom">
        <button
          className="bb-zoom-btn"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus className="size-5" />
        </button>
        <span className="bb-zoom-sep" />
        <button
          className="bb-zoom-btn"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus className="size-5" />
        </button>
      </div>
    </div>
  )
}

interface Props {
  reports: Report[]
  onConfirm: (id: string, kind: 'stillHere' | 'cleared') => void
  now: number
  userPos: UserLocation | null
  flyTarget: FlyTarget | null
  mapRef: React.RefObject<LeafletMap | null>
  placing: boolean
  /** When set, tapping a pin selects it (bottom sheet) instead of a popup. */
  onSelect?: (r: Report) => void
  /** Called on load + after each pan/zoom with the visible map area. */
  onViewport?: (v: MapViewport) => void
  /** Filter controls — omitted by the internal ops map, which shows all reports. */
  statusFilter?: StatusFilter
  onStatusFilter?: (f: StatusFilter) => void
  onReport?: () => void
  /** True until this visitor has filed their first report — warms the empty state. */
  firstTime?: boolean
  /** Zoomed into a community with no reports nearby — cues the "no issues yet" toast. */
  quietVicinity?: boolean
  /** True while the report sheet/flow is open — hides the empty-state card. */
  composing?: boolean
  /** Tapping empty map area — used to dismiss the open report panel. */
  onMapClick?: () => void
}

export default function MapView({
  reports,
  onConfirm,
  now,
  userPos,
  flyTarget,
  mapRef,
  placing,
  onSelect,
  onViewport,
  statusFilter = 'all',
  onStatusFilter,
  onReport,
  firstTime = false,
  quietVicinity = false,
  composing = false,
  onMapClick,
}: Props) {
  const [basemap, setBasemap] = useState<BasemapKey>('streets')
  const tiles = BASEMAPS[basemap]
  const empty = reports.length === 0

  // The "victories" banner is a celebratory beat, not a permanent chrome —
  // show it when the Cleaned filter turns on, then fade it away after a moment.
  const [showVictories, setShowVictories] = useState(false)
  const [victoriesLeaving, setVictoriesLeaving] = useState(false)
  useEffect(() => {
    if (statusFilter !== 'resolved' || reports.length === 0) {
      setShowVictories(false)
      setVictoriesLeaving(false)
      return
    }
    setShowVictories(true)
    setVictoriesLeaving(false)
    const fade = setTimeout(() => setVictoriesLeaving(true), 4100)
    const hide = setTimeout(() => setShowVictories(false), 4500)
    return () => {
      clearTimeout(fade)
      clearTimeout(hide)
    }
  }, [statusFilter, reports.length])

  // Quiet-vicinity toast: when the visitor zooms into a community with nothing
  // reported nearby, gently affirm it. Always greets first-time visitors; for
  // returning ones it shows once per session so it never nags. Fades on its own.
  const [showQuiet, setShowQuiet] = useState(false)
  const [quietLeaving, setQuietLeaving] = useState(false)
  const quietShown = useRef(false)
  useEffect(() => {
    if (!quietVicinity) {
      setQuietLeaving(true)
      const t = setTimeout(() => {
        setShowQuiet(false)
        setQuietLeaving(false)
      }, 400)
      return () => clearTimeout(t)
    }
    // Returning visitors see it just once a session; first-timers on each entry.
    if (!firstTime && quietShown.current) return
    quietShown.current = true
    setShowQuiet(true)
    setQuietLeaving(false)
    const fade = setTimeout(() => setQuietLeaving(true), 6600)
    const hide = setTimeout(() => setShowQuiet(false), 7000)
    return () => {
      clearTimeout(fade)
      clearTimeout(hide)
    }
  }, [quietVicinity, firstTime])

  // A tiny "Showing N reports" toast whenever the filter changes — the little
  // confirmation that makes a filter tap feel responsive. Skipped on first
  // render and when the Cleaned filter shows its own victories banner.
  const [filterToast, setFilterToast] = useState<string | null>(null)
  const firstFilter = useRef(true)
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false
      return
    }
    if (statusFilter === 'resolved') return
    // No "Showing 0 reports" — the empty-state card already says it better.
    if (reports.length === 0) return
    setFilterToast(`Showing ${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`)
    const t = setTimeout(() => setFilterToast(null), 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  return (
    <>
      <MapContainer
        ref={mapRef}
        center={ZAMBALES_CENTER}
        zoom={9}
        className={`bb-map ${placing ? 'bb-map-placing' : ''}`}
        zoomControl={false}
      >
        <TileLayer
          key={basemap}
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains ?? 'abc'}
          maxZoom={tiles.maxZoom}
        />

        <ResizeFixer />
        <MapController target={flyTarget} />
        <ViewportWatcher onChange={onViewport} />
        <TapToPlace enabled={placing} />
        {!placing && <TapToDismiss onDismiss={onMapClick} />}

        {userPos && (
          <Marker
            position={[userPos.lat, userPos.lng]}
            icon={userLocationIcon()}
            interactive={false}
            zIndexOffset={1000}
          />
        )}

        <ClusterLayer
          reports={reports}
          now={now}
          userPos={userPos}
          onConfirm={onConfirm}
          onSelect={onSelect}
        />
      </MapContainer>

      {!placing && (
        <MapControls
          mapRef={mapRef}
          basemap={basemap}
          onBasemap={setBasemap}
          userPos={userPos}
          statusFilter={statusFilter}
          onStatusFilter={onStatusFilter}
        />
      )}

      {!placing && filterToast && (
        <div className="bb-map-toast" role="status">
          {filterToast}
        </div>
      )}

      {!placing && showVictories && (
        <div className={`bb-victories ${victoriesLeaving ? 'is-leaving' : ''}`} role="status">
          <span className="bb-victories-emoji" aria-hidden>🎉</span>
          <span className="bb-victories-text">
            <b>{reports.length}</b> {reports.length === 1 ? 'cleanup' : 'cleanups'} completed here.
            These aren&rsquo;t problems, they&rsquo;re victories.
          </span>
        </div>
      )}

      {!placing && showQuiet && (
        <div className={`bb-quiet ${quietLeaving ? 'is-leaving' : ''}`} role="status">
          <span className="bb-quiet-emoji" aria-hidden>🌱</span>
          <span className="bb-quiet-text">
            <b>This community has no reported issues yet.</b>
            <span className="bb-quiet-sub">Help keep it that way, or report what you see.</span>
          </span>
        </div>
      )}

      {!placing && !composing && empty && (
        <div className="bb-map-empty" role="status">
          {statusFilter === 'all' && firstTime ? (
            // First-visit welcome: no reports anywhere yet, and this visitor
            // hasn't contributed — invite them to log the very first sighting.
            <div className="bb-map-empty-card bb-map-empty-welcome">
              <span className="bb-map-empty-icon bb-map-empty-icon-welcome">
                <Sprout className="size-7" strokeWidth={1.5} />
              </span>
              <strong className="bb-map-empty-title">Help build a better community</strong>
              <p className="bb-map-empty-sub">
                No waste has been logged here yet. Be the first. Your observation
                puts it on the map for neighbours and your LGU to act on.
              </p>
              {onReport && (
                <button className="bb-map-empty-btn" onClick={onReport}>
                  Log your first observation
                </button>
              )}
              <p className="bb-map-empty-note">
                Takes 20 seconds · No account needed · Anonymous
              </p>
            </div>
          ) : (
            <div className="bb-map-empty-card">
              <span className="bb-map-empty-icon">
                <Trash2 className="size-7" strokeWidth={1.5} />
              </span>
              <strong className="bb-map-empty-title">
                {statusFilter === 'all'
                  ? 'No reports in this area yet'
                  : `No ${STATUS_LABELS[statusFilter].toLowerCase()} reports here`}
              </strong>
              <p className="bb-map-empty-sub">
                {statusFilter === 'all'
                  ? 'Be the first to help your community.'
                  : 'Try another filter, or add a new report.'}
              </p>
              {onReport && (
                <button className="bb-map-empty-btn" onClick={onReport}>
                  Report Waste
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
