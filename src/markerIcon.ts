import L from 'leaflet'
import { pinColor, type Report } from './types'

// One consistent pin size for every report — severity is conveyed in the
// report detail, not by marker size (which read as "inconsistent" on the map).
const PIN_SIZE = 17

/**
 * A small circular map pin colored by status — clean and professional,
 * in the style of Google / Apple / ArcGIS maps.
 */
export function pinIcon(report: Report): L.DivIcon {
  const size = PIN_SIZE
  const color = pinColor(report)
  return L.divIcon({
    className: 'bb-pin',
    html: `<span class="bb-pin-dot" style="width:${size}px;height:${size}px;background:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/** A cluster bubble showing a count, colored by the dominant status group. */
export function clusterIcon(count: number, color: string): L.DivIcon {
  const size = count < 10 ? 38 : count < 50 ? 46 : 54
  return L.divIcon({
    className: 'bb-cluster',
    html: `<div class="bb-cluster-bubble" style="width:${size}px;height:${size}px;background:${color}">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Pulsing blue "you are here" dot. */
export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'bb-user-marker',
    html: `<div class="bb-user-dot"><div class="bb-user-pulse"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}
