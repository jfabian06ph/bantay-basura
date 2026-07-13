import { useEffect, useRef, useState } from 'react'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Reveal an element once it scrolls into view. Returns a ref to attach and a
 * `shown` flag that flips true (and stays true) on first intersection. Under
 * reduced-motion it starts shown, so nothing is hidden from the user.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  // Expand the trigger area 15% BELOW the viewport so content sitting at/just
  // under the fold (e.g. "Areas Needing Attention") reveals on load instead of
  // staying blank until the user scrolls. Truly far-down content still waits.
  rootMargin = '0px 0px 15% 0px',
) {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(prefersReduced)

  useEffect(() => {
    if (prefersReduced || shown) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, shown])

  return { ref, shown }
}
