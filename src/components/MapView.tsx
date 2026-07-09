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
import { Plus, Minus, Layers, Maximize } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { Report } from '../types'
import {
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  STATUS_LABELS,
  STATUS_COLORS,
  DONE_STATUSES,
} from '../types'
import { pinIcon, clusterIcon, userLocationIcon } from '../markerIcon'
import type { UserLocation } from '../hooks/useUserLocation'
import { distanceMeters, formatDistance } from '../lib/geo'

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
  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={pinIcon(report)}
      eventHandlers={onSelect ? { click: () => onSelect(report) } : undefined}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1} className="bb-tip">
        {CATEGORY_EMOJI[report.category]} {CATEGORY_LABELS[report.category]}
      </Tooltip>
      {!onSelect && (
        <Popup>
          <div className="bb-popup">
            {report.photoUrl && (
              <img className="bb-popup-photo" src={report.photoUrl} alt="report" />
            )}
            <div className="bb-popup-title">
              {CATEGORY_EMOJI[report.category]} {CATEGORY_LABELS[report.category]}
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

/** Floating zoom buttons + basemap switcher, Apple/Google-Maps style. */
function MapControls({
  mapRef,
  basemap,
  onBasemap,
}: {
  mapRef: React.RefObject<LeafletMap | null>
  basemap: BasemapKey
  onBasemap: (key: BasemapKey) => void
}) {
  const [layersOpen, setLayersOpen] = useState(false)
  return (
    <div className="bb-map-ctrls">
      <div className="bb-layers">
        <button
          className="bb-control bb-control-round bb-layers-btn"
          onClick={() => setLayersOpen((o) => !o)}
          aria-label="Change map style"
          title="Change map style"
        >
          <Layers className="size-5" />
        </button>
        {layersOpen && (
          <div className="bb-layers-menu" role="menu">
            {BASEMAP_ORDER.map((key) => (
              <button
                key={key}
                role="menuitemradio"
                aria-checked={basemap === key}
                className={`bb-layers-opt ${basemap === key ? 'bb-layers-active' : ''}`}
                onClick={() => {
                  onBasemap(key)
                  setLayersOpen(false)
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
        onClick={() => mapRef.current?.flyTo(ZAMBALES_CENTER, 9, { duration: 0.9 })}
        aria-label="Re-center map"
        title="Re-center to full view"
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
}: Props) {
  const [basemap, setBasemap] = useState<BasemapKey>('streets')
  const tiles = BASEMAPS[basemap]

  return (
    <>
      <MapContainer
        ref={mapRef}
        center={ZAMBALES_CENTER}
        zoom={9}
        className="bb-map"
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
        <MapControls mapRef={mapRef} basemap={basemap} onBasemap={setBasemap} />
      )}
    </>
  )
}
