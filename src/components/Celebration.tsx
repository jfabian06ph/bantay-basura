import { useEffect } from 'react'
import { CircleCheck } from 'lucide-react'

interface Props {
  message: string
  onDone: () => void
}

/** A subtle success toast that slides up from the bottom and auto-dismisses. */
export default function Celebration({ message, onDone }: Props) {
  useEffect(() => {
    navigator.vibrate?.(10)
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] left-1/2 z-[3000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 px-2"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-card px-4 py-3 text-sm font-bold text-white shadow-xl duration-300 animate-in fade-in slide-in-from-bottom-4">
        <CircleCheck className="size-5 shrink-0 text-[var(--green)]" />
        <span>{message}</span>
      </div>
    </div>
  )
}
