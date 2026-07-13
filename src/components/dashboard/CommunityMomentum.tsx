import { useMemo } from 'react'
import { FileText, Users, Camera, CheckCircle2 } from 'lucide-react'
import Reveal from '../Reveal'
import CountUp from '../CountUp'
import { useReveal } from '../../hooks/useReveal'
import { communityMomentum } from '../../lib/stats'
import type { Report } from '../../types'

interface Props {
  reports: Report[]
  now: number
}

/**
 * "This week" momentum — a GitHub-contribution-stats-style strip of four real,
 * timestamp-backed counts. With no activity this week it honestly shows zeros.
 */
export default function CommunityMomentum({ reports, now }: Props) {
  const m = useMemo(() => communityMomentum(reports, now), [reports, now])
  const { ref, shown } = useReveal<HTMLDivElement>()

  const cells = [
    { icon: FileText, tone: '#2f9e54', value: m.reports, label: 'Reports', sub: 'this week' },
    { icon: Users, tone: '#237878', value: m.confirmations, label: 'Community confirmations', sub: 'this week' },
    { icon: Camera, tone: '#3b82f6', value: m.photos, label: 'Cleanup photos', sub: 'shared' },
    { icon: CheckCircle2, tone: '#009336', value: m.cleaned, label: 'Places', sub: 'cleaned' },
  ]

  return (
    <section className="bb-dash-section">
      <div className="bb-dash-eyebrow">Community Momentum</div>
      <p className="bb-dash-section-lede">What the community accomplished this week.</p>
      <Reveal>
        <div className="bb-momentum" ref={ref}>
          {cells.map((c, i) => {
            const Icon = c.icon
            return (
              <div
                className="bb-momentum-cell"
                key={c.label}
                style={{ '--i': i, '--tone': c.tone } as React.CSSProperties}
              >
                <span className="bb-momentum-icon">
                  <Icon size={18} />
                </span>
                <span className="bb-momentum-val">
                  <CountUp value={c.value} active={shown} />
                </span>
                <span className="bb-momentum-label">{c.label}</span>
                <span className="bb-momentum-sub">{c.sub}</span>
              </div>
            )
          })}
        </div>
      </Reveal>
    </section>
  )
}
