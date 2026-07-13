interface Props {
  lat: number
  lng: number
  /** Square size in px. */
  size?: number
  /** Web-Mercator zoom (higher = closer). */
  zoom?: number
}

/**
 * A tiny static map snapshot centered on a point, built from the same keyless
 * CARTO raster tiles the live map uses. Renders just the tiles needed to fill
 * the square (at most 2x2), positioned so the point sits dead-center, with a
 * pin dot on top. No API key, no interactivity — a lightweight location thumb.
 */
export default function MapThumb({ lat, lng, size = 40, zoom = 15 }: Props) {
  const scale = 2 ** zoom
  const worldX = ((lng + 180) / 360) * scale * 256
  const latRad = (lat * Math.PI) / 180
  const worldY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale * 256

  // Top-left of the square window, in world pixels, centered on the point.
  const left = worldX - size / 2
  const top = worldY - size / 2

  const tiles: { tx: number; ty: number; x: number; y: number }[] = []
  for (let tx = Math.floor(left / 256); tx <= Math.floor((left + size) / 256); tx++) {
    for (let ty = Math.floor(top / 256); ty <= Math.floor((top + size) / 256); ty++) {
      tiles.push({ tx, ty, x: tx * 256 - left, y: ty * 256 - top })
    }
  }

  return (
    <span className="bb-map-thumb" style={{ width: size, height: size }}>
      {tiles.map((t) => (
        <img
          key={`${t.tx}-${t.ty}`}
          src={`https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${t.tx}/${t.ty}.png`}
          alt=""
          loading="lazy"
          style={{ position: 'absolute', left: t.x, top: t.y, width: 256, height: 256 }}
        />
      ))}
      <span className="bb-map-thumb-pin" />
    </span>
  )
}
