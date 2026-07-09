import { useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import MapView from '../../components/MapView'
import type { OpsData } from '../OperationsCenter'

const NOW = Date.now()

/** Full-bleed operational map reusing the public MapView (clusters + pins). */
export default function GisMap({ data }: { data: OpsData }) {
  const mapRef = useRef<LeafletMap | null>(null)
  return (
    <div className="ops-map">
      <MapView
        reports={data.reports}
        onConfirm={() => {}}
        now={NOW}
        userPos={null}
        flyTarget={null}
        mapRef={mapRef}
        placing={false}
      />
    </div>
  )
}
