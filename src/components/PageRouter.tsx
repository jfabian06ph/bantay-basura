import About from './About'
import Dashboard from './Dashboard'
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
}: Props) {
  // Child pages type their nav callback as (string) => void; bridge to View.
  const navigate = (v: string) => onNavigate(v as View)

  if (view === 'about') {
    return <About onClose={onClose} activeCount={activeCount} onNavigate={navigate} />
  }

  if (view === 'transparency') {
    return (
      <Dashboard
        reports={reports}
        now={now}
        live={live}
        onClose={onClose}
        onNavigate={navigate}
      />
    )
  }

  if (view === 'map') return null

  return (
    <InfoPage {...PAGES[view as InfoView]} onClose={onClose} onNavigate={navigate} />
  )
}
