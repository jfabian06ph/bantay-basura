import L from 'leaflet'
import { pinColor, STATUS_COLORS, type Report } from './types'

// One consistent pin size for every report — severity is conveyed in the
// report detail, not by marker size (which read as "inconsistent" on the map).
const PIN_SIZE = 17

/**
 * A small circular map pin colored by status — clean and professional,
 * in the style of Google / Apple / ArcGIS maps.
 */
export function pinIcon(report: Report, selected = false): L.DivIcon {
  // The selected pin is larger with a pulsing halo (see .bb-pin.is-selected) so
  // it's unmistakable which marker the open report panel belongs to.
  const size = selected ? 26 : PIN_SIZE
  const color = pinColor(report)
  return L.divIcon({
    className: `bb-pin${selected ? ' is-selected' : ''}`,
    html: `<span class="bb-pin-dot" style="width:${size}px;height:${size}px;background:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/**
 * A cluster bubble: a donut ring showing the real status MIX of the reports
 * inside (red pending / orange verified+cleanup / green resolved), with the
 * count in a dark center. A single colour would misleadingly read as "all
 * urgent" when a cluster is actually a healthy mix.
 */
export function clusterIcon(
  count: number,
  seg: { open: number; review: number; done: number },
): L.DivIcon {
  const size = count < 10 ? 40 : count < 50 ? 48 : 56
  const total = seg.open + seg.review + seg.done || 1
  const p1 = (seg.open / total) * 100
  const p2 = p1 + (seg.review / total) * 100
  const ring =
    `conic-gradient(${STATUS_COLORS.pending} 0 ${p1}%,` +
    ` ${STATUS_COLORS.in_review} ${p1}% ${p2}%,` +
    ` ${STATUS_COLORS.resolved} ${p2}% 100%)`
  return L.divIcon({
    className: 'bb-cluster',
    html: `<div class="bb-cluster-bubble" style="width:${size}px;height:${size}px;background:${ring}"><span class="bb-cluster-inner">${count}</span></div>`,
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
