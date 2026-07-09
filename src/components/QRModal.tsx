import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X } from 'lucide-react'
import { reportUrl, formatRef } from '../lib/ref'
import type { Report } from '../types'

interface Props {
  report: Report | null
  onClose: () => void
}

/**
 * A printable QR code for a report. LGUs can post "Scan to view" signage at a
 * site; scanning opens this exact report (via the ?r= deep link).
 */
export default function QRModal({ report, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!report) return
    QRCode.toDataURL(reportUrl(report.id), {
      width: 460,
      margin: 2,
      color: { dark: '#0d1728', light: '#ffffff' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [report])

  if (!report) return null
  const ref = formatRef(report.id, report.createdAt)

  return (
    <div className="bb-qr-scrim" onClick={onClose}>
      <div className="bb-qr" onClick={(e) => e.stopPropagation()}>
        <button className="bb-signin-close" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </button>
        <h2 className="bb-qr-title">Scan to view</h2>
        <p className="bb-qr-sub">Post this at the site so anyone can follow the report.</p>
        <div className="bb-qr-code">
          {dataUrl ? <img src={dataUrl} alt={`QR code for ${ref}`} /> : <div className="bb-qr-loading" />}
        </div>
        <p className="bb-qr-ref">{ref}</p>
        {dataUrl && (
          <a className="bb-qr-download" href={dataUrl} download={`${ref}.png`}>
            Download QR
          </a>
        )}
      </div>
    </div>
  )
}
