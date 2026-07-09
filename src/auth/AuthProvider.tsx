import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase, isBackendConnected } from '../supabase'
import type { Operator, Role } from '../ops/types'

interface AuthState {
  operator: Operator | null
  loading: boolean
  /** True when running without Supabase keys — sign-in is simulated. */
  isDemo: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const DEMO_OPERATOR: Operator = {
  id: 'demo-operator',
  fullName: 'Demo Operator',
  role: 'admin',
  lgu: 'Zambales',
}

/** Load the operator profile for a signed-in Supabase user. */
async function loadProfile(userId: string, email: string): Promise<Operator> {
  if (!supabase) return DEMO_OPERATOR
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, lgu')
    .eq('id', userId)
    .single()
  return {
    id: userId,
    fullName: data?.full_name ?? email,
    role: (data?.role as Role) ?? 'operator',
    lgu: data?.lgu ?? undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore an existing session on load and subscribe to changes.
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (alive && user) setOperator(await loadProfile(user.id, user.email ?? ''))
      if (alive) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const user = session?.user
      if (!alive) return
      setOperator(user ? await loadProfile(user.id, user.email ?? '') : null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<boolean> {
    setError(null)
    // Demo mode: no backend — accept any input and enter operator mode.
    if (!supabase) {
      setOperator({ ...DEMO_OPERATOR, fullName: email || DEMO_OPERATOR.fullName })
      return true
    }
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (err || !data.user) {
      setError(err?.message ?? 'Sign in failed')
      return false
    }
    setOperator(await loadProfile(data.user.id, data.user.email ?? ''))
    return true
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setOperator(null)
  }

  const value = useMemo<AuthState>(
    () => ({ operator, loading, isDemo: !isBackendConnected, error, signIn, signOut }),
    [operator, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
