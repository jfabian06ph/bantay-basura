import { useReveal } from '../../hooks/useReveal'
import { communityConfirmed, CATEGORY_LABELS, type Report } from '../../types'
import MapThumb from './MapThumb'

interface Props {
  report: Report
  place: string
  onOpenReport?: (id: string) => void
}

const STEPS = [
  { emoji: '📝', label: 'Report submitted' },
  { emoji: '🛡️', label: 'Community verified' },
  { emoji: '📸', label: 'Cleanup evidence' },
  { emoji: '🌱', label: 'Cleanup completed' },
]

/** Clock time like "10:14 AM". */
function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "2 hours 14 minutes", "46 minutes", "1 day 3 hours". */
function humanDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000))
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  const remMin = mins % 60
  if (hours < 24) {
    return remMin
      ? `${hours} hour${hours === 1 ? '' : 's'} ${remMin} minute${remMin === 1 ? '' : 's'}`
      : `${hours} hour${hours === 1 ? '' : 's'}`
  }
  const days = Math.floor(hours / 24)
  const remH = hours % 24
  return remH ? `${days} day${days === 1 ? '' : 's'} ${remH} hr` : `${days} day${days === 1 ? '' : 's'}`
}

/**
 * Analyse a report into a monotonic four-step journey. Only the *leading run*
 * of completed steps counts, so the story can never claim a later step is done
 * while an earlier one isn't (e.g. "Resolved" green while evidence is missing).
 */
function analyse(r: Report) {
  const created = new Date(r.createdAt).getTime()
  const afterAt = r.afterUploadedAt ? new Date(r.afterUploadedAt).getTime() : null
  const resolved = r.resolvedAt ? new Date(r.resolvedAt).getTime() : null
  const hasAfter = Boolean(r.afterImageUrl || r.resolvedPhotoUrls?.length)
  const isResolved = r.status === 'resolved' || communityConfirmed(r)
  const verified = r.status === 'in_review' || r.stillHere >= 3 || isResolved
  const conf = r.stillHere + r.cleared

  const raw = [
    { at: created, meta: clock(created), done: true },
    { at: null as number | null, meta: verified ? `${conf} confirmed` : null, done: verified },
    { at: afterAt, meta: afterAt ? clock(afterAt) : null, done: hasAfter },
    { at: resolved, meta: resolved ? clock(resolved) : null, done: isResolved },
  ]

  let completed = 0
  while (completed < raw.length && raw[completed].done) completed++

  return { raw, completed, created, resolved }
}

/**
 * A GitHub-Actions-style horizontal journey (vertical on mobile) of one
 * cleanup: report → verify → evidence → resolved. Progress is monotonic and
 * honest — unfinished journeys show what's still pending rather than pretending
 * to be complete. Clicking opens the underlying report.
 */
export default function CleanupTimeline({ report, place, onOpenReport }: Props) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const { raw, completed, created, resolved } = analyse(report)

  const finished = completed === STEPS.length
  const footer = finished
    ? resolved
      ? `Completed in ${humanDuration(resolved - created)}.`
      : 'This cleanup is complete.'
    : `Currently waiting for ${STEPS[completed].label.toLowerCase()}.`

  const clickable = Boolean(onOpenReport)

  return (
    <div
      className={`bb-dash-card bb-journey-card ${clickable ? 'is-clickable' : ''}`}
      ref={ref}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpenReport!(report.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenReport!(report.id)
              }
            }
          : undefined
      }
    >
      <div className="bb-journey-head">
        <MapThumb lat={report.lat} lng={report.lng} size={46} zoom={13} />
        <div className="bb-journey-head-text">
          <div className="bb-journey-place">📍 {place}</div>
          <div className="bb-journey-cat">{CATEGORY_LABELS[report.category]}</div>
        </div>
        <span className="bb-journey-progress">{completed}/4</span>
      </div>

      <ol className={`bb-journey ${shown ? 'is-in' : ''}`}>
        {STEPS.map((step, i) => {
          const state = i < completed ? 'done' : i === completed ? 'current' : 'upcoming'
          const info = raw[i]
          return (
            <li key={step.label} className={`bb-journey-step is-${state}`} style={{ '--i': i } as React.CSSProperties}>
              <span className="bb-journey-node" aria-hidden>
                {step.emoji}
              </span>
              <span className="bb-journey-label">{step.label}</span>
              <span className="bb-journey-when">
                {state === 'done' ? info.meta : state === 'current' ? 'In progress' : 'Pending'}
              </span>
            </li>
          )
        })}
      </ol>

      <p className={`bb-journey-footer ${finished ? 'is-done' : ''}`}>{footer}</p>
    </div>
  )
}
