import { useCallback, useEffect, useState } from 'react'

export type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'

export interface UserLocation {
  lat: number
  lng: number
  accuracy: number
}

/**
 * Gets the user's current location. Auto-requests once on mount so the map can
 * fly to them on first load. Falls back gracefully — on insecure origins
 * (e.g. plain http over LAN) or when denied, `status` reflects it and the app
 * stays on the Zambales overview.
 */
export function useUserLocation(auto = true) {
  const [position, setPosition] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus('granted')
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }, [])

  useEffect(() => {
    if (auto) request()
  }, [auto, request])

  return { position, status, request }
}
