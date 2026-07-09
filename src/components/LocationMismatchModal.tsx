import { MapPin, Navigation } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'

export interface Mismatch {
  chosen: { lat: number; lng: number }
  current: { lat: number; lng: number }
  distanceKm: number
  nearName: string
}

interface Props {
  mismatch: Mismatch | null
  onUseCurrent: () => void
  onKeepChosen: () => void
  onCancel: () => void
}

export default function LocationMismatchModal({
  mismatch,
  onUseCurrent,
  onKeepChosen,
  onCancel,
}: Props) {
  const open = mismatch !== null
  const km =
    mismatch && mismatch.distanceKm >= 10
      ? Math.round(mismatch.distanceKm)
      : mismatch
        ? mismatch.distanceKm.toFixed(1)
        : '0'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-1 grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
            <MapPin className="size-6" />
          </div>
          <DialogTitle>Is this really the spot?</DialogTitle>
          <DialogDescription>
            You seem to be near <b className="text-foreground">{mismatch?.nearName}</b>,
            but you're flagging a location about{' '}
            <b className="text-foreground">{km} km</b> away. To keep the map
            trustworthy, please flag trash from where it actually is.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onUseCurrent}>
            <Navigation /> Use my current location
          </Button>
          <Button variant="outline" onClick={onKeepChosen}>
            No, it's really here
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
