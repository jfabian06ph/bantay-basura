import { useState } from 'react'

interface Props {
  before: string
  after: string
}

/**
 * A draggable before/after photo comparison. The "after" image sits underneath;
 * the "before" image is clipped from the right by a slider, so dragging wipes
 * between them. Clip-path keeps both images perfectly aligned at full scale.
 */
export default function BeforeAfter({ before, after }: Props) {
  const [pos, setPos] = useState(50)

  return (
    <div className="bb-ba">
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
