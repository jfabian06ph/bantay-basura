import { useEffect, useState } from 'react'

/**
 * Tiny path router — enough to give the Operations Center its own `/ops` URL
 * without pulling in a routing library. `navigate()` pushes history and
 * notifies listeners; `usePath()` re-renders on back/forward and navigation.
 */
export function navigate(to: string): void {
  if (window.location.pathname === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}

/** True for `/ops` and anything nested under it. */
export function isOpsPath(path: string): boolean {
  return path === '/ops' || path.startsWith('/ops/')
}
