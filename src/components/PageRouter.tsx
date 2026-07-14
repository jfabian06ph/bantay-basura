import About from './About'
import Dashboard from './Dashboard'
import Impact from './Impact'
import HowItWorks from './HowItWorks'
import Resources from './Resources'
import Privacy from './Privacy'
import InfoPage from './InfoPage'
import { PAGES, type InfoView, type View } from '../content/pages'
import type { Report } from '../types'

interface Props {
  view: View
  onNavigate: (view: View) => void
  onClose: () => void
  activeCount: number
  reports: Report[]
  now: number
  live: boolean
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
  onOpenReport?: (id: string) => void
}

/**
 * Renders the full-screen overlay page for the current view. The map view
 * renders nothing here (it's the base layer); every other view maps to a
 * dedicated component or a data-driven `InfoPage`.
 */
export default function PageRouter({
  view,
  onNavigate,
  onClose,
  activeCount,
  reports,
  now,
  live,
  onViewOnMap,
  onOpenReport,
}: Props) {
  // Child pages type their nav callback as (string) => void; bridge to View.
  const navigate = (v: string) => onNavigate(v as View)

  if (view === 'about') {
    return (
      <About
        onClose={onClose}
        activeCount={activeCount}
        reports={reports}
        now={now}
        onNavigate={navigate}
      />
    )
  }

  if (view === 'transparency') {
    return (
      <Dashboard
        reports={reports}
        now={now}
        live={live}
        onClose={onClose}
        onNavigate={navigate}
        onViewOnMap={onViewOnMap}
        onOpenReport={onOpenReport}
      />
    )
  }

  // "Impact" in the nav — the community hub (how people can help).
  if (view === 'reports') {
    return (
      <Impact
        onNavigate={navigate}
        reports={reports}
        now={now}
        onViewOnMap={onViewOnMap}
      />
    )
  }

  // "How It Works" — the scroll-told story of a single report.
  if (view === 'how') {
    return <HowItWorks onNavigate={navigate} />
  }

  // "Resources" — the community tool library (linked from the footer).
  if (view === 'resources') {
    return <Resources onNavigate={navigate} />
  }

  if (view === 'privacy') {
    return <Privacy onNavigate={navigate} />
  }

  if (view === 'map') return null

  return (
    <InfoPage {...PAGES[view as InfoView]} onClose={onClose} onNavigate={navigate} />
  )
}
