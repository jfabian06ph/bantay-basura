import { useEffect, useRef, useState } from 'react'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Ease-out cubic — quick start, gentle settle (the Apple/Linear feel). */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Animate a number from 0 up to `value` when `active` becomes true.
 * Respects reduced-motion by snapping straight to the final value.
 */
export function useCountUp(value: number, active = true, duration = 900): number {
  const [display, setDisplay] = useState(active && !prefersReduced ? 0 : value)
  const frame = useRef<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!active) return
    if (prefersReduced) {
      setDisplay(value)
      return
    }
    // Only run the count-up once; later value changes snap.
    if (started.current) {
      setDisplay(value)
      return
    }
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplay(value * easeOut(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      // Mark complete only when the run finishes — not at kick-off. This keeps
      // the guard correct under React StrictMode, whose mount→cleanup→remount
      // would otherwise flip `started` before any frame paints and snap to end.
      else started.current = true
    }
    frame.current = requestAnimationFrame(tick)

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [value, active, duration])

  return display
}
