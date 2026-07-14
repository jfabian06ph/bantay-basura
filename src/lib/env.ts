/**
 * Runtime environment. Driven by `VITE_APP_ENV`, which we set per Vercel
 * environment:
 *   - Production  → "production"  (the real, public launch DB — kept pristine)
 *   - Preview     → "staging"     (branch/PR deploys friends test against)
 *   - Local dev   → "development" (falls back here when the var is unset)
 *
 * `isBeta` gates tester-only surfaces (e.g. the feedback widget) so they never
 * appear on the real production build.
 */
export const APP_ENV: string =
  (import.meta.env.VITE_APP_ENV as string | undefined) ||
  (import.meta.env.DEV ? 'development' : 'production')

export const isProduction = APP_ENV === 'production'
export const isBeta = !isProduction
