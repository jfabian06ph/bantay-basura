import { useMemo, useRef, useState } from 'react'
import { MapPin, ArrowRight, X, Search, ChevronDown, PartyPopper } from 'lucide-react'
import Reveal from '../Reveal'
import AreaDrawer from './AreaDrawer'
import MapThumb from './MapThumb'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { relativeTime, type Hotspot } from '../../lib/stats'
import { CATEGORY_LABELS, CATEGORY_ORDER, type Category, type Report } from '../../types'

interface Props {
  hotspots: Hotspot[]
  reports: Report[]
  now: number
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/** How many areas to show before the "See all" modal. */
const PREVIEW_COUNT = 5

/** One tappable area row. */
function HotspotRow({
  h,
  now,
  i = 0,
  ctaLabel = 'View details',
  onSelect,
  onHover,
}: {
  h: Hotspot
  now: number
  i?: number
  ctaLabel?: string
  onSelect: (h: Hotspot) => void
  onHover?: (h: Hotspot | null, e?: React.MouseEvent | React.FocusEvent) => void
}) {
  const pending = h.open - h.inReview
  const meta: string[] = []
  if (h.lastReported) meta.push(`Reported ${relativeTime(h.lastReported, now)}`)
  if (h.confirmations > 0) meta.push(`Confirmed by ${h.confirmations} residents`)
  return (
    <li style={{ '--i': i } as React.CSSProperties}>
      <button
        className="bb-hotspot"
        onClick={() => onSelect(h)}
        onMouseEnter={onHover ? (e) => onHover(h, e) : undefined}
        onMouseLeave={onHover ? () => onHover(null) : undefined}
        onFocus={onHover ? (e) => onHover(h, e) : undefined}
      >
        <div className="bb-hotspot-main">
          <div className="bb-hotspot-area">
            <MapPin size={16} className="bb-hotspot-pin" />
            {h.name}
          </div>
          {meta.length > 0 && <div className="bb-hotspot-meta">{meta.join(' • ')}</div>}
        </div>

        <div className="bb-hotspot-status">
          {pending > 0 && (
            <span className="bb-hotspot-stat is-open">
              <i />
              <b>{pending}</b> Open
            </span>
          )}
          {h.inReview > 0 && (
            <span className="bb-hotspot-stat is-review">
              <i />
              <b>{h.inReview}</b> In Review
            </span>
          )}
        </div>

        <span className="bb-hotspot-cta">
          {ctaLabel} <ArrowRight size={14} />
        </span>
      </button>
    </li>
  )
}

/**
 * "Areas Needing Attention" — areas with the most open reports. Shows the top
 * few inline; the full ranked list opens in a filterable modal. Clicking any
 * row opens a detail drawer that can fly the map to that area.
 */
export default function HotspotsSection({ hotspots, reports, now, onViewOnMap }: Props) {
  const [listOpen, setListOpen] = useState(false)
  const [selected, setSelected] = useState<Hotspot | null>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | Category>('all')

  // Row-anchored hover preview: a mini-map popover that pops up above the row
  // the cursor is on, with a tip pointing at it. A short hide-delay bridges the
  // gap so you can move up onto the popover and click "Open on map".
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const showTimer = useRef<number | undefined>(undefined)
  const [preview, setPreview] = useState<{ h: Hotspot; top: number; left: number } | null>(null)

  const showPreview = (h: Hotspot | null, e?: React.MouseEvent | React.FocusEvent) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (showTimer.current) window.clearTimeout(showTimer.current)
    if (!h) {
      hideTimer.current = window.setTimeout(() => setPreview(null), 150)
      return
    }
    const wrap = wrapRef.current
    const el = e?.currentTarget as HTMLElement | undefined
    if (!wrap || !el) {
      setPreview({ h, top: 0, left: 0 })
      return
    }
    // Capture geometry now (the event is gone by the time the timer fires).
    const wr = wrap.getBoundingClientRect()
    const rr = el.getBoundingClientRect()
    const half = 130
    const clientX = e && 'clientX' in e ? e.clientX : rr.left + rr.width / 2
    const pos = {
      h,
      top: rr.top - wr.top,
      left: Math.max(half, Math.min(wr.width - half, clientX - wr.left)),
    }
    // Short delay so brushing past rows doesn't flicker the popover.
    showTimer.current = window.setTimeout(() => setPreview(pos), 140)
  }
  const keepPreview = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
  }

  const hasMore = hotspots.length > PREVIEW_COUNT
  const previewRows = hotspots.slice(0, PREVIEW_COUNT)

  const availableTypes = useMemo(() => {
    const set = new Set<Category>()
    for (const h of hotspots) if (h.topCategory) set.add(h.topCategory)
    return CATEGORY_ORDER.filter((c) => set.has(c))
  }, [hotspots])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return hotspots.filter((h) => {
      if (type !== 'all' && h.topCategory !== type) return false
      if (q && !h.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [hotspots, query, type])

  // From the full-list modal, jump straight into the drawer.
  const selectFromList = (h: Hotspot) => {
    setListOpen(false)
    setSelected(h)
  }

  return (
    <section className="bb-dash-section">
      <div className="bb-dash-eyebrow">Areas Needing Attention</div>
      <p className="bb-dash-section-lede">
        Places where residents have reported recurring waste issues.
      </p>

      {hotspots.length ? (
        <Reveal>
          <div
            className={`bb-hotspots-wrap ${preview ? 'has-preview' : ''}`}
            ref={wrapRef}
            onMouseLeave={() => showPreview(null)}
          >
            <ol className="bb-hotspots">
              {previewRows.map((h, i) => (
                <HotspotRow
                  key={h.name}
                  h={h}
                  i={i}
                  now={now}
                  onSelect={setSelected}
                  onHover={showPreview}
                />
              ))}
            </ol>

            {/* #15 — hovering an area pops a live map snapshot up above that row,
                with a tip pointing at it and an "Open on map" shortcut. */}
            {preview && (
              <button
                className={`bb-hotspots-preview is-anchored ${onViewOnMap ? 'is-clickable' : ''}`}
                style={{ top: preview.top, left: preview.left }}
                onMouseEnter={keepPreview}
                onMouseLeave={() => showPreview(null)}
                onClick={
                  onViewOnMap
                    ? () => onViewOnMap(preview.h.lat, preview.h.lng, preview.h.zoom)
                    : undefined
                }
                aria-label={onViewOnMap ? `Open ${preview.h.name} on the map` : undefined}
              >
                <MapThumb lat={preview.h.lat} lng={preview.h.lng} size={92} zoom={13} />
                <span className="bb-hotspots-preview-info">
                  <span className="bb-hotspots-preview-name">
                    <MapPin size={13} /> {preview.h.name}
                  </span>
                  <span className="bb-hotspots-preview-sub">Community overview</span>
                  <span className="bb-hotspots-preview-stat">
                    {preview.h.open} active {preview.h.open === 1 ? 'report' : 'reports'}
                    {preview.h.lastReported
                      ? ` · Latest ${relativeTime(preview.h.lastReported, now)}`
                      : ''}
                  </span>
                  <span className="bb-hotspots-dots" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className={i < Math.min(5, preview.h.open) ? 'on' : ''} />
                    ))}
                  </span>
                  {onViewOnMap && (
                    <span className="bb-hotspots-preview-cta">
                      Open on map <ArrowRight size={12} />
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>

          {hasMore && (
            <button className="bb-hotspots-more" onClick={() => setListOpen(true)}>
              See all {hotspots.length} areas
              <ArrowRight size={16} className="bb-hotspots-more-chev" aria-hidden />
            </button>
          )}
        </Reveal>
      ) : (
        <p className="bb-dash-empty">
          No open reports right now. Every flagged area has been cleared.{' '}
          <PartyPopper size={15} aria-hidden />
        </p>
      )}

      {/* Full, filterable list */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-[620px] w-[calc(100%-2.5rem)] gap-0 overflow-hidden border-[#eceae5] bg-white p-0 text-[#14110f]">
          <div className="bb-hotspots-modal-head">
            <div>
              <DialogTitle className="text-[#14110f]">Areas Needing Attention</DialogTitle>
              <DialogDescription className="text-[#55504a]">
                {filtered.length} of {hotspots.length} areas with open reports.
              </DialogDescription>
            </div>
            <button
              className="bb-hotspots-modal-close"
              onClick={() => setListOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bb-hotspots-filters">
            <div className="bb-filter-search">
              <Search size={15} className="bb-filter-search-icon" aria-hidden />
              <input
                className="bb-filter-input"
                type="search"
                placeholder="Search area…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="bb-filter-select-wrap">
              <select
                className="bb-filter-select"
                value={type}
                onChange={(e) => setType(e.target.value as 'all' | Category)}
                aria-label="Filter by waste type"
              >
                <option value="all">All waste types</option>
                {availableTypes.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="bb-filter-chev" aria-hidden />
            </div>
          </div>

          <div className="bb-hotspots-modal-body">
            {filtered.length ? (
              <ol className="bb-hotspots bb-hotspots--flush">
                {filtered.map((h) => (
                  <HotspotRow key={h.name} h={h} now={now} onSelect={selectFromList} />
                ))}
              </ol>
            ) : (
              <p className="bb-hotspots-noresult">No areas match your filters.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AreaDrawer
        area={selected}
        reports={reports}
        now={now}
        onClose={() => setSelected(null)}
        onViewOnMap={onViewOnMap}
      />
    </section>
  )
}
