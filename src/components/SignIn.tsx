import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '../auth/AuthProvider'

interface Props {
  onClose: () => void
  /** Called instead of onClose after a successful sign-in (defaults to onClose). */
  onSuccess?: () => void
}

/** Operator sign-in. On success the app switches to the Operations Center. */
export default function SignIn({ onClose, onSuccess }: Props) {
  const { signIn, isDemo, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await signIn(email, password)
    setBusy(false)
    if (ok) (onSuccess ?? onClose)()
  }

  return (
    <div className="bb-signin-scrim" onClick={onClose}>
      <div className="bb-signin" onClick={(e) => e.stopPropagation()}>
        <button className="bb-signin-close" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </button>

        <img className="bb-signin-logo" src="/logo-mark.svg" alt="" />
        <h2 className="bb-signin-title">Operations Center</h2>
        <p className="bb-signin-sub">
          Secure access for LGU officers and authorized responders.
        </p>

        <form className="bb-signin-form" onSubmit={submit}>
          <label className="bb-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@lgu.gov.ph"
              required={!isDemo}
            />
          </label>
          <label className="bb-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required={!isDemo}
            />
          </label>

          {error && <p className="bb-signin-error">{error}</p>}

          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {isDemo && (
          <p className="bb-signin-demo">
            Demo mode. No backend connected. Enter anything (or leave blank) to
            explore the Operations Center.
          </p>
        )}
      </div>
    </div>
  )
}
