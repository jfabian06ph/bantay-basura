import { useEffect, useState } from 'react'

/**
 * A thin green bar pinned to the top of the viewport that fills as the reader
 * scrolls the page (GitHub-docs style). Passive scroll listener, rAF-throttled,
 * and hidden from assistive tech — it's pure ambient progress.
 */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      setPct(max > 0 ? Math.min(1, doc.scrollTop / max) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="bb-scroll-progress" aria-hidden>
      <span className="bb-scroll-progress-fill" style={{ transform: `scaleX(${pct})` }} />
    </div>
  )
}
