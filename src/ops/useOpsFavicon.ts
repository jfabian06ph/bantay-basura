import { useEffect } from 'react'

/**
 * While the Operations Center is open, badge the existing Bantay Basura logo
 * favicon with a small green check (the "official / LGU" cue) so an ops tab is
 * distinguishable from a public one at a glance. Also swaps the tab title.
 * Everything is restored when the console unmounts.
 */
export function useOpsFavicon() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Operations Center · Bantay Basura'

    let opsLink: HTMLLinkElement | null = null
    let removed: HTMLLinkElement[] = []
    let cancelled = false

    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, size, size)

      // Badge: white ring + green disc + white check, bottom-right.
      const bx = 47
      const by = 47
      ctx.beginPath()
      ctx.arc(bx, by, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(bx, by, 13, 0, Math.PI * 2)
      ctx.fillStyle = '#16a34a'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(bx - 6, by)
      ctx.lineTo(bx - 1.5, by + 5)
      ctx.lineTo(bx + 6.5, by - 5.5)
      ctx.stroke()

      let url: string
      try {
        url = canvas.toDataURL('image/png')
      } catch {
        return
      }

      removed = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"))
      removed.forEach((l) => l.remove())
      opsLink = document.createElement('link')
      opsLink.rel = 'icon'
      opsLink.type = 'image/png'
      opsLink.href = url
      document.head.appendChild(opsLink)
    }
    img.src = '/logo-mark-192.png'

    return () => {
      cancelled = true
      document.title = prevTitle
      opsLink?.remove()
      removed.forEach((l) => document.head.appendChild(l))
    }
  }, [])
}
