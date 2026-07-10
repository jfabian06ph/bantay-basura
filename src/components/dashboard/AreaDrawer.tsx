import { useEffect, useMemo, useState } from 'react'
import { MapPin, ArrowRight } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet'
import { CATEGORY_COLORS } from './Charts'
import { computeAreaDetail, relativeTime, type Hotspot } from '../../lib/stats'
import type { Report } from '../../types'

/** Right drawer on desktop, full-width bottom sheet on phones. */
function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

function days(n: number): string {
  const r = Math.round(n)
  return `${r} day${r === 1 ? '' : 's'}`
}

interface Props {
  area: Hotspot | null
  reports: Report[]
  now: number
  onClose: () => void
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/**
 * Detail panel for one "Areas Needing Attention" row. Keeps the dashboard
 * visible behind it (side drawer / bottom sheet) rather than a blocking modal.
 */
export default function AreaDrawer({ area, reports, now, onClose, onViewOnMap }: Props) {
  const isMobile = useIsMobile()
  const detail = useMemo(
    () => (area ? computeAreaDetail(reports, area.name, now) : null),
    [area, reports, now],
  )

  return (
    <Sheet open={!!area} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="bb-area-drawer border-[#eceae5] bg-white p-0 gap-0 text-[#14110f] sm:max-w-[420px]"
      >
        {area && detail && (
          <>
            <div className="bb-area-head">
              <SheetTitle className="bb-area-title">
                <MapPin size={18} className="bb-area-title-pin" />
                {area.name}
              </SheetTitle>
              <SheetDescription className="bb-area-sub">
                {detail.open} {detail.open === 1 ? 'report needs' : 'reports need'} attention
              </SheetDescription>
            </div>

            <div className="bb-area-body">
              <div className="bb-area-chips">
                <span className="bb-area-chip is-open">{detail.open} open</span>
                {detail.inReview > 0 && (
                  <span className="bb-area-chip is-review">{detail.inReview} in review</span>
                )}
                <span className="bb-area-chip">{detail.resolutionRate}% resolved all-time</span>
              </div>

              {detail.byCategory.length > 0 && (
                <div className="bb-area-block">
                  <h4 className="bb-area-block-title">By waste category</h4>
                  <ul className="bb-area-cats">
                    {detail.byCategory.map((c) => (
                      <li key={c.category}>
                        <span
                          className="bb-area-cat-dot"
                          style={{ background: CATEGORY_COLORS[c.category] }}
                        />
                        <span className="bb-area-cat-name">{c.label}</span>
                        <span className="bb-area-cat-n">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="bb-area-stats">
                {detail.latestReport != null && (
                  <div>
                    <dt>Latest report</dt>
                    <dd>{relativeTime(detail.latestReport, now)}</dd>
                  </div>
                )}
                {detail.oldestOpenDays != null && (
                  <div>
                    <dt>Oldest open report</dt>
                    <dd>{days(detail.oldestOpenDays)}</dd>
                  </div>
                )}
                {detail.avgOpenDays != null && (
                  <div>
                    <dt>Average time open</dt>
                    <dd>{detail.avgOpenDays.toFixed(1)} days</dd>
                  </div>
                )}
                <div>
                  <dt>Community confirmations</dt>
                  <dd>{detail.confirmations}</dd>
                </div>
                <div>
                  <dt>Residents watching</dt>
                  <dd>{detail.watching}</dd>
                </div>
                <div>
                  <dt>Last cleanup</dt>
                  <dd>{detail.lastCleanup != null ? relativeTime(detail.lastCleanup, now) : 'None yet'}</dd>
                </div>
              </dl>

              {onViewOnMap && (
                <button
                  className="bb-area-action"
                  onClick={() => {
                    onViewOnMap(area.lat, area.lng, area.zoom)
                    onClose()
                  }}
                >
                  View reports on map <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
