import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import PublicApp from './PublicApp'
import OperationsCenter from './ops/OperationsCenter'
import SignIn from './components/SignIn'
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
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
