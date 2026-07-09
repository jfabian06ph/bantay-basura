import { Crosshair } from 'lucide-react'
import LocationSearch, { type Target } from './LocationSearch'
import { Button } from './ui/button'
import { STATUS_COLORS } from '../types'
import type { GeoStatus, UserLocation } from '../hooks/useUserLocation'
import type { StatusFilter } from '../PublicApp'

interface Props {
  locateStatus: GeoStatus
  userPos: UserLocation | null
  statusFilter: StatusFilter
  onStatusFilter: (f: StatusFilter) => void
  onJump: (target: Target) => void
  onLocate: () => void
  onReport: () => void
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'Review' },
  { key: 'resolved', label: 'Resolved' },
]

/** The floating map controls shown when not placing a pin: search + locate,
 * status filters (double as the legend), and the "Report Waste" call to action. */
export default function FloatingControls({
  locateStatus,
  userPos,
  statusFilter,
  onStatusFilter,
  onJump,
  onLocate,
  onReport,
}: Props) {
  return (
    <>
      <div className="bb-toolbar">
        <LocationSearch onJump={onJump} userPos={userPos} onNearMe={onLocate} />
        <button
          className={`bb-control bb-control-round ${locateStatus === 'granted' ? 'bb-locate-on' : ''} ${locateStatus === 'locating' ? 'bb-locate-busy' : ''}`}
          onClick={onLocate}
          aria-label="Find my location"
          title="Find my location"
        >
          <Crosshair className="size-5" />
        </button>
      </div>

      <div className="bb-filters-map" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const active = statusFilter === f.key
          const color = f.key === 'all' ? undefined : STATUS_COLORS[f.key]
          return (
            <button
              key={f.key}
              className={`bb-filter ${active ? 'bb-filter-on' : ''}`}
              onClick={() => onStatusFilter(f.key)}
            >
              {color && <i className="bb-filter-dot" style={{ background: color }} />}
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="bb-cta">
        <span className="bb-cta-label">See waste?</span>
        <Button size="lg" className="bb-cta-btn" onClick={onReport}>
          🚩 Report It
        </Button>
      </div>
    </>
  )
}
