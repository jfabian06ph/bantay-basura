import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import PublicApp from './PublicApp'
import OperationsCenter from './ops/OperationsCenter'
import SignIn from './components/SignIn'
import Splash, { shouldShowSplash } from './components/Splash'
import './App.css'

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
    </AuthProvider>
  )
}
