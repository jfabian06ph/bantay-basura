import { useEffect } from 'react'
import { MapPin, Bell } from 'lucide-react'
import { Button } from './ui/button'
import type { Report } from '../types'

interface Props {
  submitted: { report: Report; refId: string } | null
  onClose: () => void
  onTrack: (reportId: string) => void
}

/**
 * The emotional beat after a successful report — a warm thank-you with a
 * public reference ID and a way to keep following the report.
 */
export default function SubmitSuccess({ submitted, onClose, onTrack }: Props) {
  useEffect(() => {
    if (submitted) navigator.vibrate?.([10, 40, 20])
  }, [submitted])

  if (!submitted) return null
  const { refId, report } = submitted

  return (
    <div className="bb-success-scrim" onClick={onClose}>
      <div className="bb-success" onClick={(e) => e.stopPropagation()}>
        <div className="bb-success-emoji">🎉</div>
        <h2 className="bb-success-title">Thank you.</h2>
        <p className="bb-success-body">
          Your report has been added to the community map. Together, we're
          helping keep our communities cleaner.
        </p>

        <div className="bb-success-ref">
          <span className="bb-success-ref-k">Reference ID</span>
          <span className="bb-success-ref-v">{refId}</span>
        </div>

        <div className="bb-success-actions">
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={() => {
              onTrack(report.id)
              onClose()
            }}
          >
            <Bell className="size-4" /> Track Report
          </Button>
          <button className="bb-success-secondary" onClick={onClose}>
            <MapPin className="size-4" /> Back to the map
          </button>
        </div>
      </div>
    </div>
  )
}
