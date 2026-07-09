/**
 * Developer chrome (the 🧪 Dev panel and "Demo mode" badge) is hidden by
 * default — even in local dev — so screenshots and public builds stay clean.
 *
 * A developer opts in by visiting the app with `?dev=1` once (persisted to
 * localStorage); `?dev=0` turns it back off. It can never be enabled in a
 * production build.
 */
export function isDevMode(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.get('dev') === '1') localStorage.setItem('bb-dev', '1')
    if (p.get('dev') === '0') localStorage.removeItem('bb-dev')
    return localStorage.getItem('bb-dev') === '1'
  } catch {
    return false
  }
}
