import { useMemo, useState } from 'react'
import { MapPin, ArrowRight, X, Search, ChevronDown } from 'lucide-react'
import Reveal from '../Reveal'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { relativeTime, type Hotspot } from '../../lib/stats'
import { CATEGORY_LABELS, CATEGORY_ORDER, type Category } from '../../types'

interface Props {
  hotspots: Hotspot[]
  now: number
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}

/** How many areas to show before the "See all" modal. */
const PREVIEW_COUNT = 5

/** Compact count text: "3 open" or "1 in review" when nothing's past triage. */
function countText(h: Hotspot): string {
  if (h.open > 0 && h.open === h.inReview) return 'in review'
  return 'open'
}

/** One area row — shared by the inline preview and the full-list modal. */
function HotspotRow({
  h,
  rank,
  now,
  onViewOnMap,
}: {
  h: Hotspot
  rank: number
  now: number
  onViewOnMap?: (lat: number, lng: number, zoom: number) => void
}) {
  const inReview = h.open > 0 && h.open === h.inReview
  return (
    <li className="bb-hotspot">
      <span className="bb-hotspot-rank">{rank}</span>

      <div className="bb-hotspot-main">
        <div className="bb-hotspot-area">
          <MapPin size={15} className="bb-hotspot-pin" />
          {h.name}
        </div>
        <div className="bb-hotspot-meta">
          {h.topCategoryLabel && <span>{h.topCategoryLabel}</span>}
          {h.lastReported && <span>{relativeTime(h.lastReported, now)}</span>}
        </div>
      </div>

      <span className={`bb-hotspot-badge ${inReview ? 'is-review' : ''}`}>
        <b>{h.open}</b> {countText(h)}
      </span>

      {onViewOnMap && (
        <button
          className="bb-hotspot-map"
          title="View on map"
          aria-label={`View ${h.name} on map`}
          onClick={() => onViewOnMap(h.lat, h.lng, h.zoom)}
        >
          <MapPin size={16} />
        </button>
      )}
    </li>
  )
}

/**
 * "Areas Needing Attention" — areas with the most open reports, so residents
 * and LGUs can see where attention is needed. Shows the top few inline; the
 * full ranked list opens in a scrollable, filterable modal.
 */
export default function HotspotsSection({ hotspots, now, onViewOnMap }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | Category>('all')

  const hasMore = hotspots.length > PREVIEW_COUNT
  const preview = hotspots.slice(0, PREVIEW_COUNT)

  // Waste types actually present, so the dropdown never offers empty filters.
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

  // Close the modal before flying the map so the map isn't hidden behind it.
  const viewOnMap = onViewOnMap
    ? (lat: number, lng: number, zoom: number) => {
        setOpen(false)
        onViewOnMap(lat, lng, zoom)
      }
    : undefined

  return (
    <section className="bb-dash-section">
      <div className="bb-dash-eyebrow">Areas Needing Attention</div>
      <p className="bb-dash-section-lede">
        Places where residents have reported recurring waste issues.
      </p>

      {hotspots.length ? (
        <Reveal>
          <ol className="bb-hotspots">
            {preview.map((h, i) => (
              <HotspotRow key={h.name} h={h} rank={i + 1} now={now} onViewOnMap={onViewOnMap} />
            ))}
          </ol>

          {hasMore && (
            <button className="bb-hotspots-more" onClick={() => setOpen(true)}>
              See all {hotspots.length} areas
              <ArrowRight size={16} className="bb-hotspots-more-chev" aria-hidden />
            </button>
          )}
        </Reveal>
      ) : (
        <p className="bb-dash-empty">
          No open reports right now — every flagged area has been cleared. 🎉
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
              onClick={() => setOpen(false)}
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
                {filtered.map((h, i) => (
                  <HotspotRow key={h.name} h={h} rank={i + 1} now={now} onViewOnMap={viewOnMap} />
                ))}
              </ol>
            ) : (
              <p className="bb-hotspots-noresult">No areas match your filters.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
