import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Link2, MapPin, Download, Share2 } from 'lucide-react'
import { reportUrl, formatRef } from '../lib/ref'
import type { Report } from '../types'

interface Props {
  report: Report | null
  onClose: () => void
}

const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

/**
 * One "Share Report" sheet gathering every share affordance: a scannable QR,
 * copy-link, open-in-maps, download-QR, and the OS share sheet where available.
 */
export default function ShareSheet({ report, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!report) {
      setDataUrl(null)
      return
    }
    QRCode.toDataURL(reportUrl(report.id), {
      width: 460,
      margin: 2,
      color: { dark: '#0d1728', light: '#ffffff' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [report])

  if (!report) return null
  const url = reportUrl(report.id)
  const ref = formatRef(report.id, report.createdAt)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  function openInMaps() {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${report!.lat},${report!.lng}`,
      '_blank',
      'noopener',
    )
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bantay Basura', text: `Report ${ref}`, url })
      } catch {
        /* cancelled */
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="bb-qr-scrim" onClick={onClose}>
      <div className="bb-qr bb-share" onClick={(e) => e.stopPropagation()}>
        <button className="bb-signin-close" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </button>
        <h2 className="bb-qr-title">Share Report</h2>
        <p className="bb-qr-sub">Scan, copy, or share this report. Ref {ref}.</p>
        <div className="bb-qr-code">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${ref}`} />
          ) : (
            <div className="bb-qr-loading" />
          )}
        </div>

        <div className="bb-share-actions">
          <button className="bb-share-btn" onClick={copyLink}>
            <Link2 className="size-4" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button className="bb-share-btn" onClick={openInMaps}>
            <MapPin className="size-4" /> Open in Maps
          </button>
          {dataUrl && (
            <a className="bb-share-btn" href={dataUrl} download={`${ref}.png`}>
              <Download className="size-4" /> Download QR
            </a>
          )}
          {canNativeShare && (
            <button className="bb-share-btn" onClick={nativeShare}>
              <Share2 className="size-4" /> Share…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
