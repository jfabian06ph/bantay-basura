/** Haversine distance between two lat/lng points, in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Human-friendly distance label ("≈ 5 m away"). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `≈ ${Math.round(meters)} m away`
  return `≈ ${(meters / 1000).toFixed(1)} km away`
}

/**
 * How far a pinned report is from the reporter's GPS, bucketed into how loudly
 * we should warn. This keeps someone standing across the street from being
 * nagged, while still catching a pin dropped in the wrong city.
 *
 *   < 500 m   → 'none'   (say nothing)
 *   500 m-5 km → 'banner' (gentle inline note, non-blocking)
 *   5-50 km   → 'dialog' (blocking confirmation)
 *   ≥ 50 km   → 'strong' (blocking confirmation, stronger tone)
 */
export const LOCATION_WARN_METERS = {
  banner: 500,
  dialog: 5_000,
  strong: 50_000,
} as const

export type LocationTier = 'none' | 'banner' | 'dialog' | 'strong'

export function locationTier(meters: number): LocationTier {
  if (meters >= LOCATION_WARN_METERS.strong) return 'strong'
  if (meters >= LOCATION_WARN_METERS.dialog) return 'dialog'
  if (meters >= LOCATION_WARN_METERS.banner) return 'banner'
  return 'none'
}
