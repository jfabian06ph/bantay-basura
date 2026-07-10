import { useRef, useState } from 'react'
import { MapPin, X, Check } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

/** Shown while the user is dragging the map to place a pin on the trash. */
export default function PlacingOverlay({ onCancel, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)
  const done = useRef(false)

  // On confirm, let the pin drop onto the target + bounce, then proceed.
  function handleConfirm() {
    if (done.current) return
    done.current = true
    setConfirming(true)
    navigator.vibrate?.(10)
    window.setTimeout(onConfirm, 430)
  }

  return (
    <>
      <div className={`bb-crosshair ${confirming ? 'is-confirming' : ''}`} aria-hidden="true">
        <span className="bb-crosshair-target" />
        <MapPin className="bb-crosshair-pin" />
        <div className="bb-crosshair-dot" />
      </div>

      <div className="bb-place-bar">
        <p className="bb-place-hint">Drag the map until the pin is over the waste.</p>
        <div className="bb-place-actions">
          <Button
            variant="secondary"
            size="sm"
            className="bb-place-cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            <X /> Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1 rounded-md"
            onClick={handleConfirm}
            disabled={confirming}
          >
            <Check /> Confirm location
          </Button>
        </div>
      </div>
    </>
  )
}
