import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import PublicApp from './PublicApp'
import OperationsCenter from './ops/OperationsCenter'
import SignIn from './components/SignIn'
import Splash, { shouldShowSplash } from './components/Splash'
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

/** Chooses between the public civic site and the authenticated ops console. */
function Root() {
  const { operator } = useAuth()
  const [signInOpen, setSignInOpen] = useState(false)

  if (operator) return <OperationsCenter />

  return (
    <>
      <PublicApp onSignIn={() => setSignInOpen(true)} />
      {signInOpen && <SignIn onClose={() => setSignInOpen(false)} />}
    </>
  )
}

export default function App() {
  // Evaluate once, before first paint, so the map never flashes behind it.
  const [splash, setSplash] = useState(shouldShowSplash)
  return (
    <AuthProvider>
      <Root />
      {splash && <Splash onDone={() => setSplash(false)} />}
      <RotateGate />
    </AuthProvider>
  )
}
