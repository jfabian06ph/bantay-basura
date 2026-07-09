/**
 * A stable, official-looking public reference for a report, derived
 * deterministically from its id + creation year (e.g. BB-2026-000132).
 * Used for display; freshly-submitted reports get a sequential ref instead.
 */
/** A stable, shareable URL for a report — opens straight to its panel. */
export function reportUrl(id: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}?r=${encodeURIComponent(id)}`
}

export function formatRef(id: string, createdAtIso: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  const n = h % 1_000_000
  const year = new Date(createdAtIso).getFullYear()
  return `BB-${year}-${String(n).padStart(6, '0')}`
}
