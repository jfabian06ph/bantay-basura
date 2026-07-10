import { useEffect, useRef, useState } from 'react'
import { Camera, Pencil, ChevronLeft, ChevronRight, Check, Plus, X, Flag } from 'lucide-react'
import type { Category, Report } from '../types'
import { CATEGORY_LABELS, CATEGORY_DESC, CATEGORY_ORDER } from '../types'
import { CATEGORY_ICON } from '../lib/categoryIcons'
import { reverseGeocode, type ReverseResult } from '../lib/geocode'
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
}

const STEPS = ['Location', 'Category', 'Photos', 'Details', 'Review']
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

export default function ReportSheet({
  open,
  onOpenChange,
  onSubmit,
  coords,
  detected,
  onAdjustLocation,
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
        <SheetHeader className="border-b border-white/10 px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2 text-[22px] tracking-[-0.04em]">
            <Flag className="size-5 text-primary" /> Report Waste
          </SheetTitle>
          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-primary">· {STEPS[step]}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-primary' : 'bg-white/12',
                )}
              />
            ))}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* STEP 1 — Location */}
          {step === 0 && (
            <Section title="Where is the issue?">
              {LocationBox}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Reports are pinned to a real location so clean-up teams can find
                them. Tap above to move the pin on the map.
              </p>
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
                      'flex flex-col gap-1 rounded-2xl border p-3 text-left transition',
                      category === c
                        ? 'border-primary bg-primary/12'
                        : 'border-white/10 bg-[#33445f]/50 hover:bg-[#33445f]',
                    )}
                  >
                    <Icon className="size-6 text-primary" />
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
                  <span className="flex flex-col items-center gap-2">
                    <Camera className="size-6" /> Take or upload photos
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
              </p>
            </Section>
          )}

          {/* STEP 4 — Details */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
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
                          ? 'border-primary bg-primary/15 text-white'
                          : 'border-transparent bg-[#33445f] text-[#edf2fb] hover:bg-[#3c4f6d]',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Description (optional)">
                <textarea
                  rows={3}
                  placeholder="e.g. pile of plastic waste beside the road, near the bridge…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[92px] w-full resize-none rounded-[18px] border border-white/10 bg-[#33445f] p-4 text-sm text-white outline-none placeholder:text-[#8f9db2] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
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
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Title</span>
                    <span className="max-w-[60%] truncate text-right font-bold">
                      {title.trim()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Location</span>
                  <span className="max-w-[60%] truncate text-right font-bold">
                    {placeName}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Type</span>
                  <span className="flex items-center gap-1.5 font-bold">
                    {category
                      ? (() => {
                          const Icon = CATEGORY_ICON[category]
                          return (
                            <>
                              <Icon className="size-4 text-primary" /> {CATEGORY_LABELS[category]}
                            </>
                          )
                        })()
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Severity</span>
                  <span className="font-bold">
                    {SEVERITIES.find((s) => s.v === severity)?.label}
                  </span>
                </div>
                {note.trim() && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Description</span>
                    <span>{note.trim()}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[rgba(35,194,102,.16)] bg-[rgba(35,194,102,.08)] px-3.5 py-3 text-xs leading-snug font-medium text-[#cbeed9]">
                🔒 Only the waste location and issue details are shown publicly.
                Personal information is kept private.
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
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex flex-1 items-center justify-center gap-1 rounded-[18px] bg-primary py-3 text-[15px] font-extrabold text-primary-foreground disabled:opacity-40"
            >
              Next <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
