import { distanceMeters } from './lib/geo'

/** Zambales municipalities for the "jump to location" control. */
export interface Place {
  name: string
  lat: number
  lng: number
  zoom: number
  /** Approximate population (2020 PSA census) — powers the community snapshot. */
  population?: number
}

export const ZAMBALES_OVERVIEW: Place = {
  name: 'Buong Zambales',
  lat: 15.1,
  lng: 120.05,
  zoom: 9,
}

export const MUNICIPALITIES: Place[] = [
  { name: 'Iba (kabisera)', lat: 15.3284, lng: 119.9783, zoom: 14, population: 57_000 },
  { name: 'Olongapo', lat: 14.8292, lng: 120.2824, zoom: 14, population: 260_000 },
  { name: 'Subic', lat: 14.8792, lng: 120.2312, zoom: 14, population: 110_000 },
  { name: 'Masinloc', lat: 15.5353, lng: 119.945, zoom: 14, population: 52_000 },
  { name: 'Botolan', lat: 15.2833, lng: 120.0167, zoom: 14, population: 62_000 },
  { name: 'Cabangan', lat: 15.1558, lng: 120.0864, zoom: 14, population: 27_000 },
  { name: 'Candelaria', lat: 15.6672, lng: 119.9181, zoom: 14, population: 29_000 },
  { name: 'Castillejos', lat: 14.9331, lng: 120.1744, zoom: 14, population: 68_000 },
  { name: 'Palauig', lat: 15.435, lng: 119.9053, zoom: 14, population: 30_000 },
  { name: 'San Antonio', lat: 14.9394, lng: 120.0833, zoom: 14, population: 34_000 },
  { name: 'San Felipe', lat: 15.0614, lng: 120.0731, zoom: 14, population: 24_000 },
  { name: 'San Marcelino', lat: 15.0403, lng: 120.1553, zoom: 14, population: 41_000 },
  { name: 'San Narciso', lat: 15.0169, lng: 120.0831, zoom: 14, population: 30_000 },
  { name: 'Santa Cruz', lat: 15.7658, lng: 119.9108, zoom: 14, population: 59_000 },
]

/** Nearest known municipality to a point, with its distance in metres. */
export function nearestMunicipality(pos: { lat: number; lng: number }): {
  place: Place
  distanceM: number
} {
  let best = MUNICIPALITIES[0]
  let bestD = Infinity
  for (const m of MUNICIPALITIES) {
    const d = distanceMeters(pos, m)
    if (d < bestD) {
      bestD = d
      best = m
    }
  }
  return { place: best, distanceM: bestD }
}
