import { useEffect, useState } from 'react'

interface Props {
  before: string
  after: string
  /** Nudge the slider on mount so it reads as interactive ("oh, this moves"). */
  hint?: boolean
}

/**
 * A draggable before/after photo comparison. The "after" image sits underneath;
 * the "before" image is clipped from the right by a slider, so dragging wipes
 * between them. Clip-path keeps both images perfectly aligned at full scale.
 */
export default function BeforeAfter({ before, after, hint }: Props) {
  const [pos, setPos] = useState(hint ? 63 : 50)
  const [hinting, setHinting] = useState(Boolean(hint))

  // One-time settle: ease from the nudged position back to centre, then drop
  // the transition so dragging stays instant.
  useEffect(() => {
    if (!hint) return
    const t1 = window.setTimeout(() => setPos(50), 450)
    const t2 = window.setTimeout(() => setHinting(false), 450 + 750)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [hint])

  return (
    <div className={`bb-ba ${hinting ? 'is-hinting' : ''}`}>
      <img className="bb-ba-img" src={after} alt="After cleanup" />
      <img
        className="bb-ba-img bb-ba-before"
        src={before}
        alt="Before cleanup"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span className="bb-ba-tag bb-ba-tag-before">Before</span>
      <span className="bb-ba-tag bb-ba-tag-after">After</span>

      <span className="bb-ba-divider" style={{ left: `${pos}%` }}>
        <span className="bb-ba-knob" />
      </span>

      <input
        className="bb-ba-range"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Drag to compare before and after"
      />
    </div>
  )
}
