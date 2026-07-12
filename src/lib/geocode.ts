// Free geocoding via OpenStreetMap Nominatim (no API key, PH-restricted).
// Usage policy: keep volume low + debounce. The browser sends a Referer, which
// Nominatim accepts; the User-Agent header can't be set from the browser.

export interface GeoResult {
  /** short primary label, e.g. "Botolan" */
  label: string
  /** the rest, e.g. "Zambales, Central Luzon" */
  sub: string
  lat: number
  lng: number
  zoom: number
}

function zoomForType(type: string): number {
  if (type === 'country') return 6
  if (['state', 'region'].includes(type)) return 8
  if (['province', 'county', 'state_district'].includes(type)) return 10
  if (['city', 'municipality', 'town'].includes(type)) return 13
  if (['village', 'suburb', 'neighbourhood', 'quarter', 'hamlet', 'barangay'].includes(type))
    return 15
  if (['road', 'residential', 'house', 'building', 'address'].includes(type)) return 17
  return 14
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeoResult[]> {
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?format=jsonv2&countrycodes=ph&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data: Array<Record<string, unknown>> = await res.json()
  return data.map((r) => {
    const display = String(r.display_name ?? '')
    const parts = display.split(',').map((p) => p.trim())
    const type = String(r.addresstype ?? r.type ?? '')
    return {
      label: (r.name as string) || parts[0] || display,
      sub: parts.slice(1, 3).join(', '),
      lat: parseFloat(String(r.lat)),
      lng: parseFloat(String(r.lon)),
      zoom: zoomForType(type),
    }
  })
}

/** Geocode a free-text place (e.g. "Botolan, Zambales, Philippines") to one point. */
export async function geocodeText(
  query: string,
  zoom: number,
): Promise<GeoResult | null> {
  const results = await searchPlaces(query)
  if (!results.length) return null
  return { ...results[0], zoom }
}

export interface ReverseResult {
  /** most specific area, e.g. "Anabu II-A" */
  label: string
  /** city + province, e.g. "Imus, Cavite" */
  sub: string
}

/**
 * Name the area currently centered in the map, at a granularity that matches
 * the zoom: street/barangay isn't useful as a headline, so we favor
 * city/municipality when zoomed in and province/region when zoomed out.
 * Returns null on failure so callers can fall back to a generic label.
 */
export async function reverseArea(
  lat: number,
  lng: number,
  mapZoom: number,
  signal?: AbortSignal,
): Promise<string | null> {
  // Nominatim reverse `zoom`: ~10 = city, 8 = county, 5 = state, 3 = country.
  // When the map is zoomed way out the viewport spans the whole country, so
  // naming the single province under the center point would be misleading —
  // fall back to the country instead.
  const z = mapZoom >= 13 ? 12 : mapZoom >= 11 ? 10 : mapZoom >= 8 ? 8 : 4
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=jsonv2&addressdetails=1&zoom=${z}&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const d: { address?: Record<string, string> } = await res.json()
  const a = d.address ?? {}
  if (mapZoom >= 11) {
    return (
      a.city || a.town || a.municipality || a.village || a.suburb ||
      a.county || a.province || a.state || null
    )
  }
  if (mapZoom >= 8) {
    return a.province || a.state || a.region || a.country || null
  }
  // Country-scale view.
  return a.country || null
}

export interface Locality {
  /** Barangay / village, if resolvable. */
  barangay?: string
  /** City or municipality — the primary unit reports are grouped by. */
  municipality?: string
  /** Province (or state) — disambiguates same-named municipalities. */
  province?: string
}

/**
 * Resolve a coordinate to its administrative locality (barangay, municipality,
 * province) for storing on a report. This is what makes the app nationwide:
 * every report is attributed to its real municipality instead of the nearest
 * Zambales town. Returns an empty object on failure so submission never blocks.
 */
export async function reverseLocality(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Locality> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=jsonv2&addressdetails=1&zoom=14&lat=${lat}&lon=${lng}`
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return {}
    const d: { address?: Record<string, string> } = await res.json()
    const a = d.address ?? {}
    return {
      barangay: a.village || a.suburb || a.neighbourhood || a.quarter || a.hamlet || undefined,
      municipality: a.city || a.town || a.municipality || a.county || undefined,
      province: a.province || a.state || a.region || undefined,
    }
  } catch {
    return {}
  }
}

/** Turn a coordinate into a human place name (barangay/area, city, province). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseResult | null> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=jsonv2&addressdetails=1&zoom=16&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const d: { name?: string; address?: Record<string, string> } = await res.json()
  const a = d.address ?? {}
  const primary =
    a.village ||
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.hamlet ||
    a.road ||
    a.town ||
    a.city ||
    a.municipality ||
    d.name ||
    'Selected location'
  const city = a.city || a.town || a.municipality || a.county || ''
  const province = a.province || a.state || ''
  const sub = [city, province].filter((p) => p && p !== primary).join(', ')
  return { label: primary, sub }
}
