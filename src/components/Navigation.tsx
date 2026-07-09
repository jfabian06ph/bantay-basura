import { useState } from 'react'
import { Menu, Shield } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { NAV, type View } from '../content/pages'

interface Props {
  view: View
  onNavigate: (view: View) => void
  onSignIn: () => void
}

/** Top brand bar + primary navigation (with a burger menu on small screens). */
export default function Navigation({ view, onNavigate, onSignIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bb-header">
      <div className="bb-brand">
        <div className="bb-brand-mark">
          <img src="/logo-mark-512.png" alt="Bantay Basura" />
        </div>
        <div className="bb-brand-text">
          <h1 className="bb-title">Bantay Basura</h1>
          <div className="bb-tagrow">
            <span className="bb-subtitle">Making waste visible. Together.</span>
            <span className="bb-volunteer">🌱 Community Powered</span>
          </div>
        </div>
      </div>

      <nav className="bb-nav" aria-label="Primary">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`bb-nav-link ${view === n.key ? 'bb-nav-active' : ''}`}
            onClick={() => onNavigate(n.key)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <div className="bb-nav-end">
        <button className="bb-lgu-btn" onClick={onSignIn}>
          <Shield className="size-4" /> LGU Operations
        </button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="bb-nav-burger" aria-label="Open menu">
              <Menu className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  onNavigate(n.key)
                  setMenuOpen(false)
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-white/5 ${view === n.key ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}
              >
                {n.label}
              </button>
            ))}
            <div className="my-1 h-px bg-white/10" />
            <button
              onClick={() => {
                onSignIn()
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-muted-foreground hover:bg-white/5"
            >
              <Shield className="size-4" /> LGU Operations
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
