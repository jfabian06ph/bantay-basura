import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import PublicApp from './PublicApp'
import OperationsCenter from './ops/OperationsCenter'
import SignIn from './components/SignIn'
import Splash, { shouldShowSplash } from './components/Splash'
import { usePath, navigate, isOpsPath } from './router'
import './App.css'

/**
 * Portrait-only on phones. The manifest already locks orientation for the
 * installed PWA; this covers the browser case — a full-screen prompt shown
 * only on small screens in landscape (via CSS), so the app is effectively
 * portrait-only everywhere.
 */
function RotateGate() {
  return (
    <div className="bb-rotate-gate" role="alertdialog" aria-label="Please rotate your device">
      <RotateCcw className="bb-rotate-icon" />
      <p className="bb-rotate-title">Rotate to portrait</p>
      <p className="bb-rotate-sub">Bantay Basura works best held upright.</p>
    </div>
  )
}

/**
 * Routes between the public civic site and the authenticated ops console.
 * `/ops` is the console's own URL: signed in → the console; signed out → the
 * operator sign-in (cancel returns to the public site). Everything else is the
 * public site, whose "LGU Operations" button navigates to `/ops`.
 */
function Root({ ready }: { ready: boolean }) {
  const { operator } = useAuth()
  const path = usePath()

  if (isOpsPath(path)) {
    if (operator) return <OperationsCenter />
    // Signed out at /ops → sign-in page. On success the operator state flips and
    // this same route renders the console; cancel drops back to the public site.
    return <SignIn onClose={() => navigate('/')} onSuccess={() => {}} />
  }

  return <PublicApp onSignIn={() => navigate('/ops')} ready={ready} />
}

export default function App() {
  // Evaluate once, before first paint, so the map never flashes behind it.
  // The civic intro is for the public site — skip it when landing on /ops.
  const [splash, setSplash] = useState(
    () => !isOpsPath(window.location.pathname) && shouldShowSplash(),
  )
  // The map surface is "revealed" once the splash is gone — the cue to play the
  // map overlays' entrance animations (they'd otherwise run hidden behind it).
  return (
    <AuthProvider>
      <Root ready={!splash} />
      {splash && <Splash onDone={() => setSplash(false)} />}
      <RotateGate />
    </AuthProvider>
  )
}
