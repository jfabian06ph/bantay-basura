import { useState } from 'react'
import { Button } from './ui/button'
import type { LatLng } from '../types'
import type { UserLocation } from '../hooks/useUserLocation'

interface Props {
  mock: LatLng | null
  realPosition: UserLocation | null
  onSimulate: () => void
  onClear: () => void
}

/** Localhost-only tools to simulate a GPS fix (never shown to real users). */
export default function DevPanel({ mock, realPosition, onSimulate, onClear }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed right-4 top-[92px] z-[1500] flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-lg ${mock ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-white/15 bg-card text-muted-foreground'}`}
      >
        🧪 Dev {mock ? '· sim' : ''}
      </button>
      {open && (
        <div className="w-64 rounded-2xl border border-white/12 bg-card p-4 text-sm shadow-xl">
          <p className="mb-1 font-extrabold">Developer mode</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Simulate a GPS fix to test locate, fly-to-you and the anti-spam
            check on localhost.
          </p>
          <p className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs">
            {mock
              ? `Simulated: ${mock.lat.toFixed(4)}, ${mock.lng.toFixed(4)}`
              : realPosition
                ? 'Using real GPS'
                : 'No location (blocked or unavailable)'}
          </p>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={onSimulate}>
              Set my location = map center
            </Button>
            <Button size="sm" variant="outline" disabled={!mock} onClick={onClear}>
              Clear (use real GPS)
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
