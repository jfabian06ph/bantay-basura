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
import { cn } from '@/lib/utils'

export interface Mismatch {
  chosen: { lat: number; lng: number }
  current: { lat: number; lng: number }
  distanceKm: number
  nearName: string
  /** 'strong' is used for very large distances (≥ 50 km) and warns harder. */
  severity: 'warn' | 'strong'
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
  const strong = mismatch?.severity === 'strong'
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
          <div
            className={cn(
              'mx-auto mb-1 grid size-12 place-items-center rounded-full',
              strong ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/15 text-primary',
            )}
          >
            <MapPin className="size-6" />
          </div>
          <DialogTitle>You're reporting far from your current location</DialogTitle>
          <DialogDescription>
            You seem to be near <b className="text-foreground">{mismatch?.nearName}</b>,
            but you're flagging a location about{' '}
            <b className={strong ? 'text-amber-500' : 'text-foreground'}>{km} km</b>{' '}
            away. To keep the map trustworthy, please flag trash from where it
            actually is.
          </DialogDescription>
        </DialogHeader>

        <p className="-mt-1 text-center text-xs leading-relaxed text-muted-foreground">
          Reporting on behalf of someone else or from a photo? That's okay. Just
          keep the pin where the issue actually is.
        </p>

        <DialogFooter>
          <Button onClick={onUseCurrent}>
            <Navigation /> Move pin to my location
          </Button>
          <Button variant="outline" onClick={onKeepChosen}>
            Keep this location
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
