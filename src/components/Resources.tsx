import { ArrowRight, Wrench } from 'lucide-react'
import Footer from './Footer'
import './resources.css'

interface Props {
  onNavigate: (view: string) => void
}

/* A free library of civic tools. Honest about what exists today (one ready
   checklist) versus what's planned, in the same "empty on purpose" spirit as
   the rest of the site. Nothing here is fabricated. */
const RESOURCES = [
  { ready: true, label: 'Community Cleanup Checklist' },
  { ready: false, label: 'Event Poster Templates' },
  { ready: false, label: 'Volunteer Forms' },
  { ready: false, label: 'Safety Guide' },
  { ready: false, label: 'Before & After Documentation Guide' },
  { ready: false, label: 'Barangay Partnership Kit' },
  { ready: false, label: 'Open Data Documentation' },
]

const CONTRIBUTE = ['Guides', 'Templates', 'Translations', 'Educational materials', 'Cleanup best practices']

export default function Resources({ onNavigate }: Props) {
  return (
    <div className="bb-about bb-resources">
      <div className="bb-page">
        <section className="bb-res-hero">
          <div className="bb-res-eyebrow">Resources</div>
          <h1 className="bb-res-title">Community Resources</h1>
          <p className="bb-res-lede">
            We’re building a free library of tools to help volunteers, schools, barangays, NGOs,
            and local organizations organize cleaner communities.
          </p>
        </section>

        <section className="bb-res-block">
          <h2 className="bb-res-h2">Planned resources include</h2>
          <ul className="bb-res-list">
            {RESOURCES.map((r) => (
              <li key={r.label} className={`bb-res-item ${r.ready ? 'is-ready' : ''}`}>
                <span className="bb-res-item-ico" aria-hidden>
                  {r.ready ? '✅' : '🚧'}
                </span>
                <span className="bb-res-item-label">{r.label}</span>
                <span className="bb-res-item-tag">{r.ready ? 'Available' : 'Planned'}</span>
              </li>
            ))}
          </ul>

          <div className="bb-res-idea">
            <p className="bb-res-idea-q">Have an idea for a resource?</p>
            <p className="bb-res-idea-sub">We’d love to hear it.</p>
            <a
              className="bb-res-idea-cta"
              href="mailto:hello@bantaybasura.ph?subject=Resource%20idea"
            >
              Contact us <ArrowRight className="size-4" />
            </a>
          </div>
        </section>

        <section className="bb-res-contribute">
          <span className="bb-res-contribute-ico">
            <Wrench className="size-5" />
          </span>
          <h2 className="bb-res-h2">Contribute</h2>
          <p className="bb-res-contribute-lede">
            Bantay Basura is built by volunteers and powered by communities. Help improve it by
            contributing:
          </p>
          <ul className="bb-res-tags">
            {CONTRIBUTE.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  )
}
