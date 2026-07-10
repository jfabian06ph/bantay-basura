import { useEffect } from 'react'
import { MapPin, Bell } from 'lucide-react'
import type { Report } from '../types'

interface Props {
  submitted: { report: Report; refId: string } | null
  onClose: () => void
  onTrack: (reportId: string) => void
}

// A short confetti burst — this is a pure celebration state, no red anywhere.
const CONFETTI_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899']
const CONFETTI = Array.from({ length: 16 }, (_, i) => i)

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
        <div className="bb-confetti" aria-hidden>
          {CONFETTI.map((i) => (
            <span
              key={i}
              className="bb-confetti-bit"
              style={{
                left: `${4 + (i / CONFETTI.length) * 92}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 6) * 0.07}s`,
                transform: `rotate(${(i % 5) * 24}deg)`,
              }}
            />
          ))}
        </div>

        <div className="bb-success-emoji">🎉</div>
        <h2 className="bb-success-title">Thank you!</h2>
        <p className="bb-success-body">
          Your report is now helping your community respond faster.
        </p>

        <div className="bb-success-ref">
          <span className="bb-success-ref-k">Reference ID</span>
          <span className="bb-success-ref-v">{refId}</span>
        </div>

        <div className="bb-success-actions">
          <button
            className="bb-success-track"
            onClick={() => {
              onTrack(report.id)
              onClose()
            }}
          >
            <Bell className="size-4" /> Track Report
          </button>
          <button className="bb-success-secondary" onClick={onClose}>
            <MapPin className="size-4" /> Back to the map
          </button>
        </div>
      </div>
    </div>
  )
}
