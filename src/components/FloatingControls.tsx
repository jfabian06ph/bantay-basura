import { Crosshair, ShieldCheck } from 'lucide-react'
import LocationSearch, { type Target } from './LocationSearch'
import { Button } from './ui/button'
import type { GeoStatus, UserLocation } from '../hooks/useUserLocation'
import { displayStatus, type Report } from '../types'

interface Props {
  locateStatus: GeoStatus
  userPos: UserLocation | null
  /** The report currently open — makes the bottom CTA contextual. */
  selectedReport: Report | null
  onJump: (target: Target) => void
  onLocate: () => void
  onReport: () => void
  /** Focus the verify action inside the open report panel. */
  onVerify: () => void
}

/** The floating map controls shown when not placing a pin: a premium top row
 * (search + locate only — status filters now live in the layers menu on the
 * right), and a contextual call to action that adapts to the open report. */
export default function FloatingControls({
  locateStatus,
  userPos,
  selectedReport,
  onJump,
  onLocate,
  onReport,
  onVerify,
}: Props) {
  const key = selectedReport ? displayStatus(selectedReport).key : null
  const canVerify = key !== null && key !== 'resolved' && key !== 'published'
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

      {selectedReport ? (
        // Verifying a resolved report is moot — hide the CTA once it reads
        // resolved (community or LGU).
        canVerify && (
          <div className="bb-cta bb-cta-verify">
            <Button size="lg" className="bb-cta-btn bb-cta-btn-verify" onClick={onVerify}>
              <ShieldCheck className="size-4" /> Verify this report
            </Button>
          </div>
        )
      ) : (
        <div className="bb-cta">
          <span className="bb-cta-label">See something that needs cleaning?</span>
          <Button size="lg" className="bb-cta-btn" onClick={onReport}>
            Report Waste
          </Button>
        </div>
      )}
    </>
  )
}
