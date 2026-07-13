import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, Pencil, ChevronLeft, ChevronRight, Check, Plus, X, Flag, Crosshair } from 'lucide-react'
import type { Category, Report } from '../types'
import { CATEGORY_LABELS, CATEGORY_DESC, CATEGORY_ORDER } from '../types'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import { reverseGeocode, type ReverseResult } from '../lib/geocode'
import { distanceMeters, locationTier } from '../lib/geo'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'

type Draft = Omit<Report, 'id' | 'status' | 'stillHere' | 'cleared' | 'createdAt'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: Draft) => void
  coords: { lat: number; lng: number } | null
  detected: boolean
  onAdjustLocation: () => void
  onUseMyLocation: () => void
  /** Reporter's GPS, for the "far from you" nudge. Null if unknown. */
  position: { lat: number; lng: number } | null
  /** Has the reporter already acknowledged a location warning this draft? */
  locationAck: boolean
  /** Guard the location step's "Next" — resolves false to stay put. */
  onRequestLocationNext: (coords: { lat: number; lng: number }) => Promise<boolean>
}

// Conversational step names — feels like a friendly chat, not a form (item 8).
const STEPS = ['Where?', 'What?', 'Show us', 'Describe', 'Review']
const SEVERITIES = [
  { v: 1 as const, label: 'Minor' },
  { v: 2 as const, label: 'Moderate' },
  { v: 3 as const, label: 'Severe' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-extrabold tracking-[0.11em] text-[#b7c4d8] uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

/** A gentle privacy/safety reminder, shown on the photo + description steps. */
function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-col gap-1 rounded-2xl border border-[rgba(35,194,102,.16)] bg-[rgba(35,194,102,.08)] px-3.5 py-3 text-xs leading-snug text-[#cbeed9]">
      <span className="font-bold">🔒 Keep everyone safe</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

export default function ReportSheet({
  open,
  onOpenChange,
  onSubmit,
  coords,
  detected,
  onAdjustLocation,
  onUseMyLocation,
  position,
  locationAck,
  onRequestLocationNext,
}: Props) {
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<Category | null>(null)
  const [severity, setSeverity] = useState<1 | 2 | 3>(2)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [place, setPlace] = useState<ReverseResult | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fresh wizard each time the drawer opens.
  useEffect(() => {
    if (open) {
      setStep(0)
      setCategory(null)
      setSeverity(2)
      setTitle('')
      setNote('')
      setPhotoUrls([])
    }
  }, [open])

  // Reverse-geocode the location for the Location + Review steps.
  useEffect(() => {
    if (!open || !coords) return
    setPlace(null)
    setPlaceLoading(true)
    const ctrl = new AbortController()
    reverseGeocode(coords.lat, coords.lng, ctrl.signal)
      .then((r) => setPlace(r))
      .catch(() => {})
      .finally(() => setPlaceLoading(false))
    return () => ctrl.abort()
  }, [open, coords])

  const placeName = place
    ? [place.label, place.sub].filter(Boolean).join(', ')
    : coords
      ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      : 'No location set'

  const MAX_PHOTOS = 6

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const room = MAX_PHOTOS - photoUrls.length
    Promise.all(
      files.slice(0, room).map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          }),
      ),
    ).then((urls) => setPhotoUrls((prev) => [...prev, ...urls]))
    // Allow re-selecting the same file after removal.
    e.target.value = ''
  }

  function removePhoto(idx: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  function submit() {
    if (!coords || !category) return
    onSubmit({
      ...coords,
      category,
      severity,
      title: title.trim() || undefined,
      note: note.trim() || undefined,
      photoUrl: photoUrls[0],
      photoUrls: photoUrls.length ? photoUrls : undefined,
    })
  }

  const canNext = step === 0 ? !!coords : step === 1 ? !!category : true
  const last = step === STEPS.length - 1

  // Gentle, non-blocking "far from you" cue on the location step. Shows for
  // medium distances, and stays as a reminder once a bigger warning has been
  // acknowledged (the blocking dialog itself is owned by the flow hook).
  const gpsMeters =
    position && coords ? distanceMeters(position, coords) : null
  const gpsTier = gpsMeters != null ? locationTier(gpsMeters) : 'none'
  const showBanner =
    gpsTier === 'banner' ||
    ((gpsTier === 'dialog' || gpsTier === 'strong') && locationAck)
  const bannerKm =
    gpsMeters == null
      ? '0'
      : gpsMeters >= 10_000
        ? String(Math.round(gpsMeters / 1000))
        : (gpsMeters / 1000).toFixed(1)

  async function goNext() {
    if (step === 0 && coords) {
      const proceed = await onRequestLocationNext(coords)
      if (!proceed) return
    }
    setStep((s) => s + 1)
  }

  const LocationBox = (
    <button
      type="button"
      onClick={onAdjustLocation}
      className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-[#33445f] p-4 text-left hover:bg-[#3c4f6d]"
    >
      <span className="min-w-0">
        <strong className="block truncate font-extrabold">
          📍 {placeLoading ? 'Locating…' : placeName}
        </strong>
        <small className="text-[#b8c5d8]">
          {detected ? 'Location detected' : 'Approximate'} · tap to adjust on the map
        </small>
      </span>
      <Pencil className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-[28px] p-0 sm:inset-y-6 sm:top-6 sm:right-6 sm:left-auto sm:bottom-auto sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[min(485px,calc(100vw-3rem))] sm:rounded-[30px] sm:border"
      >
        <SheetHeader className="border-b border-white/10 px-6 pt-6 pb-3">
          <SheetTitle className="flex items-center gap-2 text-[22px] tracking-[-0.04em]">
            <Flag className="size-5 text-primary" /> Report Waste
          </SheetTitle>
          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-white">· {STEPS[step]}</span>
          </div>
          {/* Numbered steps with connecting lines — makes reporting feel shorter (item 9). */}
          <ol className="bb-steps" aria-hidden>
            {STEPS.map((label, i) => {
              const state = i < step ? 'is-done' : i === step ? 'is-active' : ''
              return (
                <li key={label} className={`bb-step ${state}`}>
                  <span className="bb-step-dot">{i < step ? <Check className="size-3.5" /> : i + 1}</span>
                  {i < STEPS.length - 1 && <span className="bb-step-line" />}
                </li>
              )
            })}
          </ol>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-3 pb-5">
          {/* STEP 1 — Location */}
          {step === 0 && (
            <Section title="Where is the issue?">
              {LocationBox}
              <button
                type="button"
                onClick={onUseMyLocation}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-transparent py-2.5 text-sm font-bold text-[#8fb4ff] hover:bg-white/5"
              >
                <Crosshair className="size-4" /> Snap to my location
              </button>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                The pin sits where the map is centered. Drag the map (tap above)
                to place it on the waste, or snap it back to where you are.
              </p>
              {showBanner && (
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3 text-xs leading-snug font-medium text-amber-100">
                  <span aria-hidden>📍</span>
                  <span>
                    This spot is about <b>{bannerKm} km</b> from where you are
                    now. Double-check the pin is on the actual waste.
                  </span>
                </div>
              )}
            </Section>
          )}

          {/* STEP 2 — Category (cards) */}
          {step === 1 && (
            <Section title="What kind of waste?">
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORY_ORDER.map((c) => {
                  const Icon = CATEGORY_ICON[c]
                  return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      'relative flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition',
                      category === c
                        ? 'border-[#22c55e] bg-[#0f2318]'
                        : 'border-white/10 bg-[#33445f]/50 hover:bg-[#33445f]',
                    )}
                  >
                    {category === c && (
                      <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-[#22c55e] text-white">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                    <Icon className="size-6 text-[#f28b93]" />
                    <span className="text-sm leading-tight font-extrabold">
                      {CATEGORY_LABELS[c]}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {CATEGORY_DESC[c]}
                    </span>
                  </button>
                  )
                })}
              </div>
            </Section>
          )}

          {/* STEP 3 — Photos */}
          {step === 2 && (
            <Section title="Add photos (optional)">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={onPhoto}
              />
              {photoUrls.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid min-h-[120px] w-full place-items-center rounded-[18px] border border-dashed border-white/15 bg-[#33445f]/85 text-sm font-bold text-white hover:bg-[#33445f]"
                >
                  <span className="flex flex-col items-center gap-1.5">
                    <Camera className="size-6" />
                    <span className="text-[15px] font-extrabold">Add photos</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Help others verify faster
                    </span>
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {photoUrls.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-white/10"
                    >
                      <img className="h-full w-full object-cover" src={src} alt={`photo ${i + 1}`} />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {photoUrls.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Add more photos"
                      className="grid aspect-square place-items-center rounded-2xl border border-dashed border-white/15 bg-[#33445f]/85 text-white hover:bg-[#33445f]"
                    >
                      <Plus className="size-6" />
                    </button>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Photos help neighbors and LGUs verify the report faster. Add up to {MAX_PHOTOS}.
                They are checked before they appear publicly.
              </p>
              <SafetyNote>
                Focus your photo on the waste. Please avoid showing faces, house numbers,
                vehicle plates, or other personal details. Reports are publicly visible on
                the community map.
              </SafetyNote>
            </Section>
          )}

          {/* STEP 4 — Details */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              {/* Severity is required, so it leads — the eye fills it first. */}
              <Section title="How bad is it?">
                <div className="flex flex-wrap gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setSeverity(s.v)}
                      className={cn(
                        'rounded-full border px-4 py-2.5 text-sm font-bold transition',
                        severity === s.v
                          ? 'border-[#3b82f6] bg-[#3b82f6]/15 text-white'
                          : 'border-transparent bg-[#33445f] text-[#edf2fb] hover:bg-[#3c4f6d]',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Title (optional)">
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Plastic Waste, Roadside Dumpsite…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-[#33445f] p-4 text-sm text-white outline-none placeholder:text-[#8f9db2] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  A short name for the issue. Leave blank to use the waste type.
                </p>
              </Section>
              <Section title="Description (optional)">
                <textarea
                  rows={3}
                  placeholder="e.g. pile of plastic waste beside the road, near the bridge…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[92px] w-full resize-none rounded-[18px] border border-white/10 bg-[#33445f] p-4 text-sm text-white outline-none placeholder:text-[#8f9db2] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <SafetyNote>
                  Describe the waste, not people or exact addresses. Please avoid including
                  house numbers, names, phone numbers, or other personal information. Reports
                  are publicly visible on the community map.
                </SafetyNote>
              </Section>
            </div>
          )}

          {/* STEP 5 — Review */}
          {step === 4 && (
            <Section title="Review & submit">
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#33445f]/40 p-4 text-sm">
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {photoUrls.map((src, i) => (
                      <img
                        key={i}
                        className="h-20 w-full rounded-lg object-cover"
                        src={src}
                        alt=""
                      />
                    ))}
                  </div>
                )}
                {title.trim() && (
                  <div className="grid grid-cols-[88px_1fr] gap-3">
                    <span className="text-muted-foreground">Title</span>
                    <span className="truncate font-bold">{title.trim()}</span>
                  </div>
                )}
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <span className="text-muted-foreground">Location</span>
                  <span className="truncate font-bold">{placeName}</span>
                </div>
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <span className="text-muted-foreground">Type</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    {category
                      ? (() => {
                          const Icon = CATEGORY_ICON[category]
                          return (
                            <>
                              <Icon className="size-4 text-[#f28b93]" /> {CATEGORY_LABELS[category]}
                            </>
                          )
                        })()
                      : 'None selected'}
                  </span>
                </div>
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <span className="text-muted-foreground">Severity</span>
                  <span className="font-bold">
                    {SEVERITIES.find((s) => s.v === severity)?.label}
                  </span>
                </div>
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <span className="text-muted-foreground">Photos</span>
                  <span className="font-bold">
                    {photoUrls.length > 0 ? `${photoUrls.length} attached` : 'None added'}
                  </span>
                </div>
                {note.trim() && (
                  <div className="grid grid-cols-[88px_1fr] gap-3">
                    <span className="text-muted-foreground">Description</span>
                    <span>{note.trim()}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[rgba(35,194,102,.16)] bg-[rgba(35,194,102,.08)] px-3.5 py-3 text-xs leading-snug font-medium text-[#cbeed9]">
                🔒 Your personal information is never shown publicly.
              </div>
            </Section>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 rounded-[18px] border border-white/15 px-4 py-3 text-sm font-extrabold text-[#c7d2e4] hover:bg-white/5"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
          )}
          {last ? (
            <button
              type="button"
              onClick={submit}
              disabled={!category || !coords}
              className="flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-[#ff3547] to-[var(--red)] py-3 text-[15px] font-extrabold text-white shadow-[0_14px_28px_rgba(227,30,47,.25)] disabled:opacity-50"
            >
              <Check className="size-4" /> Submit report
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="flex flex-1 items-center justify-center gap-1 rounded-[18px] bg-gradient-to-b from-[#2fbf6b] to-[#16a34a] py-3 text-[15px] font-extrabold text-white shadow-[0_14px_28px_rgba(22,163,74,.28)] disabled:opacity-40"
            >
              Next <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
