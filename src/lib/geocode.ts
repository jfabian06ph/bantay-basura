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
