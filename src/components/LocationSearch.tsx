import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  MapPin,
  ChevronRight,
  Clock,
  LoaderCircle,
  Navigation,
  Map as MapIcon,
  ArrowLeft,
  LocateFixed,
  Star,
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { searchPlaces, geocodeText, type GeoResult } from '../lib/geocode'
import { MUNICIPALITIES, type Place } from '../municipalities'
import { distanceMeters } from '../lib/geo'
import type { UserLocation } from '../hooks/useUserLocation'
import {
  getRegions,
  getProvinces,
  getCitiesByProvince,
  getCitiesByRegion,
  getBarangays,
  type PsgcItem,
} from '../lib/psgc'

export interface Target {
  lat: number
  lng: number
  zoom: number
}

interface Props {
  onJump: (target: Target) => void
  /** Current location, used to sort nearby suggestions. */
  userPos?: UserLocation | null
  /** Fly to / request the user's location ("Near Me"). */
  onNearMe?: () => void
}

type Level = 'region' | 'province' | 'city' | 'barangay'
type Mode = 'home' | 'browse'

const RECENT_KEY = 'bb-recent-locations'

// Popular towns to seed brand-new visitors who have no recent history yet.
const POPULAR_NAMES = ['Subic', 'Masinloc', 'San Felipe']
const POPULAR: Place[] = POPULAR_NAMES.map((n) => MUNICIPALITIES.find((m) => m.name === n)).filter(
  (p): p is Place => Boolean(p),
)

function loadRecent(): GeoResult[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

export default function LocationSearch({ onJump, userPos, onNearMe }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<GeoResult[]>(loadRecent)
  const [mode, setMode] = useState<Mode>('home')

  // Drill-down (only used in "browse" mode)
  const [level, setLevel] = useState<Level>('region')
  const [items, setItems] = useState<PsgcItem[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [sel, setSel] = useState<{
    region?: PsgcItem
    province?: PsgcItem
    city?: PsgcItem
    barangay?: PsgcItem
  }>({})

  // Nearby towns first when we know where the user is.
  const suggestions = useMemo<Place[]>(() => {
    const list = [...MUNICIPALITIES]
    if (userPos) list.sort((a, b) => distanceMeters(userPos, a) - distanceMeters(userPos, b))
    return list.slice(0, 3)
  }, [userPos])

  async function showRegions() {
    setMode('browse')
    setLevel('region')
    setSel({})
    setBrowseLoading(true)
    setItems(await getRegions())
    setBrowseLoading(false)
  }

  async function showProvinces(region: PsgcItem) {
    setBrowseLoading(true)
    const provs = await getProvinces(region.code)
    if (provs.length) {
      setLevel('province')
      setItems(provs)
    } else {
      setLevel('city')
      setItems(await getCitiesByRegion(region.code))
    }
    setBrowseLoading(false)
  }

  async function showCities(province: PsgcItem) {
    setBrowseLoading(true)
    setLevel('city')
    setItems(await getCitiesByProvince(province.code))
    setBrowseLoading(false)
  }

  async function showBarangays(city: PsgcItem) {
    setBrowseLoading(true)
    setLevel('barangay')
    setItems(await getBarangays(city.code))
    setBrowseLoading(false)
  }

  // Reset to the home menu each time the panel opens.
  useEffect(() => {
    if (open) {
      setMode('home')
      setQ('')
    }
  }, [open])

  // Debounced free-text search.
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(q.trim(), ctrl.signal)
        .then(setResults)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  function addRecent(item: GeoResult) {
    const next = [
      item,
      ...recent.filter((r) => !(r.label === item.label && r.sub === item.sub)),
    ].slice(0, 6)
    setRecent(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }

  function go(item: GeoResult) {
    onJump({ lat: item.lat, lng: item.lng, zoom: item.zoom })
    addRecent(item)
    setOpen(false)
    setQ('')
  }

  function goPlace(p: Place) {
    go({ lat: p.lat, lng: p.lng, zoom: p.zoom, label: p.name, sub: 'Zambales' })
  }

  function nearMe() {
    onNearMe?.()
    setOpen(false)
  }

  function clickItem(item: PsgcItem) {
    if (level === 'region') {
      setSel({ region: item })
      showProvinces(item)
    } else if (level === 'province') {
      setSel((s) => ({ region: s.region, province: item }))
      showCities(item)
    } else if (level === 'city') {
      setSel((s) => ({ ...s, city: item, barangay: undefined }))
      showBarangays(item)
    } else {
      setSel((s) => ({ ...s, barangay: item }))
    }
  }

  const drillTarget = useMemo(() => {
    if (sel.barangay)
      return {
        query: [sel.barangay.name, sel.city?.name, sel.province?.name, 'Philippines'],
        label: sel.barangay.name,
        sub: [sel.city?.name, sel.province?.name].filter(Boolean).join(', '),
        zoom: 16,
      }
    if (sel.city)
      return {
        query: [sel.city.name, sel.province?.name, sel.region?.name, 'Philippines'],
        label: sel.city.name,
        sub: [sel.province?.name, sel.region?.name].filter(Boolean).join(', '),
        zoom: 14,
      }
    if (sel.province)
      return {
        query: [sel.province.name, sel.region?.name, 'Philippines'],
        label: sel.province.name,
        sub: sel.region?.name ?? '',
        zoom: 10,
      }
    if (sel.region)
      return { query: [sel.region.name, 'Philippines'], label: sel.region.name, sub: '', zoom: 8 }
    return null
  }, [sel])

  async function goToDrill() {
    if (!drillTarget) return
    setBrowseLoading(true)
    const geo = await geocodeText(drillTarget.query.filter(Boolean).join(', '), drillTarget.zoom)
    setBrowseLoading(false)
    if (geo) go({ ...geo, label: drillTarget.label, sub: drillTarget.sub })
  }

  const searching = q.trim().length >= 2

  // Breadcrumb crumbs (browse mode)
  const crumbs: { label: string; onClick: () => void }[] = [
    { label: 'Regions', onClick: () => showRegions() },
  ]
  if (sel.region)
    crumbs.push({ label: sel.region.name, onClick: () => showProvinces(sel.region!) })
  if (sel.province)
    crumbs.push({ label: sel.province.name, onClick: () => showCities(sel.province!) })
  if (sel.city)
    crumbs.push({ label: sel.city.name, onClick: () => showBarangays(sel.city!) })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="bb-control" aria-label="Search places">
          <Search className="size-4 text-muted-foreground" />
          Search places
        </button>
      </PopoverTrigger>

      <PopoverContent
        collisionPadding={16}
        className="bb-search-pop flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search places…"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col overflow-y-auto p-2">
          {/* --- Search results --- */}
          {searching && (
            <>
              {results.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lng}-${i}`}
                  onClick={() => go(r)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                </button>
              ))}
              {!loading && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No matches. Try a different search.
                </p>
              )}
            </>
          )}

          {/* --- Browse Philippines (drill-down) --- */}
          {!searching && mode === 'browse' && (
            <>
              <button
                onClick={() => setMode('home')}
                className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft className="size-4" /> Places
              </button>

              <div className="flex flex-wrap items-center gap-1 px-3 pb-1 text-xs">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
                    <button
                      onClick={c.onClick}
                      className={
                        i === crumbs.length - 1
                          ? 'font-bold text-white'
                          : 'text-muted-foreground hover:text-white'
                      }
                    >
                      {c.label}
                    </button>
                  </span>
                ))}
              </div>

              <div className="max-h-56 overflow-y-auto">
                {browseLoading && items.length === 0 ? (
                  <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" /> Loading…
                  </p>
                ) : (
                  items.map((it) => {
                    const isLeaf = level === 'barangay'
                    const selected = sel.barangay?.code === it.code
                    return (
                      <button
                        key={it.code}
                        onClick={() => clickItem(it)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 ${selected ? 'bg-primary/15 font-bold' : ''}`}
                      >
                        <span className="truncate">{it.name}</span>
                        {!isLeaf && (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              <button
                onClick={goToDrill}
                disabled={!drillTarget || browseLoading}
                className="mx-1 mt-2 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
              >
                {browseLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Navigation className="size-4" />
                )}
                {drillTarget ? `Go to ${drillTarget.label}` : 'Select an area'}
              </button>
            </>
          )}

          {/* --- Home menu (Google-Maps-style) --- */}
          {!searching && mode === 'home' && (
            <>
              {/* Quick actions */}
              <button
                onClick={nearMe}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full"
                  style={{ background: 'rgba(59,130,246,0.16)', color: '#3b82f6' }}
                >
                  <LocateFixed className="size-4" />
                </span>
                <span className="text-sm font-bold">Near Me</span>
              </button>
              <button
                onClick={showRegions}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/8 text-muted-foreground">
                  <MapIcon className="size-4" />
                </span>
                <span className="flex-1 text-sm font-bold">Explore Philippines</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>

              {/* Popular — always shown, so first-time users have a starting point */}
              <p className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Popular
              </p>
              {POPULAR.map((p) => (
                <button
                  key={`popular-${p.name}`}
                  onClick={() => goPlace(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <Star className="size-4 shrink-0 text-amber-400" />
                  <span className="text-sm font-bold">{p.name}</span>
                </button>
              ))}

              {/* Recent */}
              {recent.length > 0 && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">
                    Recent
                  </p>
                  {recent.map((r, i) => (
                    <button
                      key={`recent-${i}`}
                      onClick={() => go(r)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                    >
                      <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{r.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {/* Suggested nearby places */}
              <p className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Suggested places
              </p>
              {suggestions.map((p) => (
                <button
                  key={p.name}
                  onClick={() => goPlace(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-bold">{p.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
