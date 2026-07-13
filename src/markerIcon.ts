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

/** One reports-by-status tally inside a cluster (matches the 4 status badges). */
export interface ClusterSeg {
  pending: number
  verified: number
  cleanup: number
  resolved: number
}

/** The four status colours, in lifecycle order — shared by the ring + tooltip. */
export const CLUSTER_STATUS = [
  { key: 'pending', label: 'Pending', color: STATUS_COLORS.pending },
  { key: 'verified', label: 'Verified', color: STATUS_COLORS.in_review },
  { key: 'cleanup', label: 'Cleanup Submitted', color: '#3b82f6' },
  { key: 'resolved', label: 'Resolved', color: STATUS_COLORS.resolved },
] as const

/**
 * A cluster bubble — a clean, minimal deep-navy map marker with the count. It
 * reads as "a place with N reports" and stays out of the way, leaving the
 * colored status pins as the primary visual language. (The per-status mix is
 * surfaced in the hover tooltip instead — see the cluster Tooltip in MapView.)
 */
export function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 40 : count < 50 ? 48 : 56
  return L.divIcon({
    className: 'bb-cluster',
    html: `<div class="bb-cluster-bubble" style="width:${size}px;height:${size}px">${count}</div>`,
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
