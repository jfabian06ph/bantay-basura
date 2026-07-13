import { useEffect, useRef, useState } from 'react'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * A number that tweens from its PREVIOUS value to the new one whenever it
 * changes — e.g. a live vote taking "33 → 34". On first mount it shows the
 * value immediately (no count-from-zero on open), and it respects
 * reduced-motion. Unlike CountUp (a one-time reveal from 0), this animates
 * every delta, so it suits live-updating counters.
 */
export default function Counter({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    if (prefersReduced) {
      fromRef.current = to
      setDisplay(to)
      return
    }
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <>{display}</>
}
