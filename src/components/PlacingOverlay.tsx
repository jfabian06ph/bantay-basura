import { MapPin, X, Check } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

/** Shown while the user is dragging the map to place a pin on the trash. */
export default function PlacingOverlay({ onCancel, onConfirm }: Props) {
  return (
    <>
      <div className="bb-crosshair" aria-hidden="true">
        <MapPin className="bb-crosshair-pin" />
        <div className="bb-crosshair-dot" />
      </div>

      <div className="bb-place-bar">
        <p className="bb-place-hint">
          Tap the map, or drag it, so the pin sits on the trash
        </p>
        <div className="bb-place-actions">
          <Button variant="secondary" onClick={onCancel}>
            <X /> Cancel
          </Button>
          <Button size="lg" className="flex-1 rounded-md" onClick={onConfirm}>
            <Check /> Confirm location
          </Button>
        </div>
      </div>
    </>
  )
}
