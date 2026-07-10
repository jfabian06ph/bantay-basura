import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { SplashAudio } from '../lib/splashAudio'
import './splash.css'

const SEEN_KEY = 'bb-splash-seen'
const MUTED_KEY = 'bb-splash-muted'

/**
 * The one true timeline (ms, absolute from mount). Every beat below reads from
 * this — the CSS delays are fed from it as variables — so the rhythm lives in
 * exactly one place. Tune here and the whole sequence stays in sync.
 *
 *   0 ──▶ black. silence.
 *   line ──── "What if everyone could see what needs fixing?"  (in · hold · lingering fade)
 *   map ───── the real map fades in underneath, still empty (~1s)
 *   ·· a held breath of empty map ··
 *   pins ──── reports pin in one at a time, telling the lifecycle as a micro-story:
 *             reported → verified → in review → resolved  (see PINS)
 *   ·· ~1s of silence after the green 'resolved' beat — the mission lands ··
 *   welcome ─ the logo blooms, then lingers ~2s
 *   cta ───── "Explore the live map →" — appears a beat after the logo has its moment
 *   hold ──── the finished scene waits for the click; auto-dissolve is the safety net
 *
 * Paced like a trailer, not a loading bar — each beat gets room to breathe.
 */
// Times are relative to the click that begins the sequence. The question lives
// on the gate (held as long as the visitor likes), so the click dives straight
// into the map: it flashes sharp + zooming, then settles into the usual overlay.
const TL = {
  line: { at: 0, dur: 600 }, // the question fades out fast, leaving a clean black beat
  map: { at: 850, dur: 2200 }, // ~0.85s of deliberate black after the click, THEN the map breathes in
  welcome: { at: 9800, dur: 1200 }, // a longer still pause (~0.7s) on the finished map before the reveal
  cta: { at: 13200, dur: 600 }, // after the whole lockup has landed, line by line
  hold: 6000, // wait for the click; auto-dissolve is the safety net
} as const

/** Derived: play through the CTA + a hold, then dissolve as a safety net. */
const ACTIVE_MS = TL.cta.at + TL.cta.dur + TL.hold
/** Fade-out duration once dismissing (must match .bb-splash-out in CSS). */
const FADE_MS = 900
/** Beat between a dot landing and its label fading in — the little "…then" pause. */
const CAPTION_LAG = 500

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Whether the intro should play. Returning visitors and reduced-motion users
 * skip it; `?splash=1` forces it back for previewing. Runs before first paint
 * so the app never flashes the map behind it.
 */
export function shouldShowSplash(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('splash') === '1') return true
  if (prefersReducedMotion()) return false
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* private mode — just replay next time, no harm */
  }
}

/**
 * The micro-story: a single report walking the whole lifecycle, one beat at a
 * time, so the viewer subconsciously learns the workflow. Colour carries the
 * meaning — red reported, red confirmed, amber in review, green resolved. Each
 * pin's `at` is its own hand-authored beat (dot lands, then CAPTION_LAG later
 * the label fades in). They sit in the upper band, framing the centred lockup.
 * `flip` puts the label on a pin's left so right-side labels stay on-screen.
 */
// Deliberately spaced ~1.4s apart — each report gets its own quiet moment.
// Desktop frames the top corners; narrow screens stack them on separate rows
// (alternating sides) so the long captions never collide.
const PINS = [
  {
    at: 3900,
    tone: 'urgent',
    label: 'Reported 3 hours ago',
    top: '16%', left: '30%', flip: false,
    mTop: '12%', mLeft: '11%', mFlip: false,
  },
  {
    at: 5300,
    tone: 'urgent',
    label: 'Verified by 7 residents',
    top: '32%', left: '13%', flip: false,
    mTop: '23%', mLeft: '89%', mFlip: true,
  },
  {
    at: 6700,
    tone: 'review',
    label: 'In review',
    top: '22%', left: '63%', flip: true,
    mTop: '31%', mLeft: '11%', mFlip: false,
  },
  {
    at: 8100,
    tone: 'resolved',
    label: 'Cleanup completed yesterday',
    top: '34%', left: '87%', flip: true,
    mTop: '41%', mLeft: '89%', mFlip: true,
  },
].map((p) => ({ ...p, delay: p.at }))

/** A handful of near-invisible dust motes so the black gate never feels "off". */
const DUST = [
  { left: '18%', top: '30%', size: 3, dur: '13s', delay: '0s' },
  { left: '73%', top: '22%', size: 2, dur: '17s', delay: '2s' },
  { left: '40%', top: '66%', size: 2, dur: '15s', delay: '1s' },
  { left: '85%', top: '54%', size: 3, dur: '19s', delay: '4s' },
  { left: '57%', top: '38%', size: 2, dur: '16s', delay: '3s' },
  { left: '28%', top: '78%', size: 2, dur: '18s', delay: '5s' },
  { left: '66%', top: '72%', size: 3, dur: '14s', delay: '1.5s' },
  { left: '10%', top: '50%', size: 2, dur: '20s', delay: '2.5s' },
]

interface Props {
  onDone: () => void
}

/**
 * The first-visit intro. A single question on black, then the map wakes up with
 * live reports and lands on the wordmark + a way in. Motion only — opacity,
 * blur, scale — so it reads as entering a movement, not a loading bar.
 */
export default function Splash({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)
  const audioRef = useRef<SplashAudio | null>(null)

  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTED_KEY) === '1'
    } catch {
      return false
    }
  })

  // The gate: nothing runs until one intentional tap, which unlocks audio (the
  // browser requires a gesture) AND launches the sequence — so the sub-bass hits
  // on the very first black frame. If sound was muted on a previous visit there's
  // nothing to unlock, so we skip the gate and just play the visuals.
  const [started, setStarted] = useState(muted)
  // Narrow screens get a taller, stacked pin layout (evaluated once — the splash
  // is transient, so we don't track resize).
  const [isNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 520px)').matches,
  )

  function begin() {
    if (started) return
    setStarted(true)
    const audio = audioRef.current
    // resume the context, THEN hit the sub-bass, so it isn't dropped mid-resume
    if (audio) audio.unlock().then(() => audio.subBass())
  }

  function dismiss() {
    if (finished.current) return
    finished.current = true
    markSeen()
    setLeaving(true)
    // the hand-off whoosh, then fade the whole mix as the map resolves
    audioRef.current?.whoosh()
    audioRef.current?.fadeOut(FADE_MS / 1000)
    window.setTimeout(onDone, FADE_MS)
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(MUTED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      audioRef.current?.unlock() // the toggle click is a valid gesture
      audioRef.current?.setMuted(next)
      return next
    })
  }

  // Build the audio engine once and preload the ambient bed. It stays silent
  // (context suspended) until begin() unlocks it on the tap.
  useEffect(() => {
    const audio = new SplashAudio()
    audioRef.current = audio
    audio.setMuted(muted)
    audio.startAmbient('/sounds/ambient.mp3')
    // Preload + decode the map during the gate so the reveal never paints blank.
    const pre = new Image()
    pre.src = '/splash-map.jpg'
    return () => audio.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Once begun, schedule every cue off the same TL clock as the visuals (so
  // picture and audio can't drift) and arm the auto-dismiss safety net.
  useEffect(() => {
    if (!started) return
    const audio = audioRef.current
    if (!audio) return

    const timers: number[] = []
    const cue = (at: number, fn: () => void) => timers.push(window.setTimeout(fn, at))

    cue(TL.map.at, () => audio.whoosh()) // air moving as the map arrives
    for (const p of PINS) {
      cue(p.at, () =>
        p.tone === 'resolved'
          ? audio.chime() // warm completion
          : audio.tick(p.tone === 'review' ? 'soft' : 'sharp'),
      )
    }
    // The logo, scored: an airy inhale leads it in, then a warm low "arrival"
    // lands exactly as the wordmark snaps into focus.
    cue(TL.welcome.at, () => audio.swell()) // inhale
    cue(TL.welcome.at + 1200, () => audio.impact()) // lands as the wordmark settles sharp

    const dismissTimer = window.setTimeout(dismiss, ACTIVE_MS)

    return () => {
      window.clearTimeout(dismissTimer)
      timers.forEach(window.clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  const playHover = () => audioRef.current?.click()

  // Feed the timeline into CSS so the declarative animations stay in lockstep
  // with the JS auto-dismiss above — one authoritative rhythm, no drift. Delays
  // are relative to when the sequence elements mount, i.e. the tap that begins it.
  const timing = {
    '--d-line': `${TL.line.dur}ms`,
    '--t-map': `${TL.map.at}ms`,
    '--d-map': `${TL.map.dur}ms`,
    '--t-welcome': `${TL.welcome.at}ms`,
    '--d-welcome': `${TL.welcome.dur}ms`,
    '--t-cta': `${TL.cta.at}ms`,
    '--d-cta': `${TL.cta.dur}ms`,
  } as React.CSSProperties

  return (
    <div
      className={`bb-splash ${started ? 'bb-splash-started' : 'bb-splash-gated'} ${
        leaving ? 'bb-splash-out' : ''
      }`}
      style={timing}
      onClick={started ? undefined : begin}
      role="dialog"
      aria-label="Welcome to Bantay Basura"
    >
      {/* The map + reports only exist once the sequence begins; before that it's
          pure black behind the question. */}
      {started && (
        <>
          <div className="bb-splash-bg" />
          <div className="bb-splash-scrim" />
        </>
      )}

      {/* Beat 1 — the question, revealed line by line (~120ms apart). Held on
          black through the gate, then fades as a whole once the map takes over.
          The same element persists across both, so it never blinks. */}
      <p className="bb-splash-line" aria-label="What if everyone could see what needs fixing?">
        <span className="bb-splash-line-row" aria-hidden="true">
          What if everyone
        </span>
        <span className="bb-splash-line-row" aria-hidden="true">
          could see what
        </span>
        <span className="bb-splash-line-row" aria-hidden="true">
          needs fixing?
        </span>
      </p>

      {/* Faint drifting dust — only on the black gate, to keep it feeling alive */}
      {!started && (
        <div className="bb-splash-dust" aria-hidden="true">
          {DUST.map((d, i) => (
            <span
              key={i}
              style={{
                left: d.left,
                top: d.top,
                width: `${d.size}px`,
                height: `${d.size}px`,
                animationDuration: d.dur,
                animationDelay: d.delay,
              }}
            />
          ))}
        </div>
      )}

      {started && (
        <>
          {/* Beat 2 — the map comes alive */}
          <div className="bb-splash-pins" aria-hidden="true">
            {PINS.map((p, i) => {
              const top = isNarrow ? p.mTop : p.top
              const left = isNarrow ? p.mLeft : p.left
              const flip = isNarrow ? p.mFlip : p.flip
              return (
              <div
                key={i}
                className={`bb-splash-pin bb-splash-pin-${p.tone} ${flip ? 'bb-splash-pin-flip' : ''}`}
                style={
                  {
                    top,
                    left,
                    animationDelay: `${p.delay}ms`,
                    // the status "aura" (::after) starts the instant the dot lands
                    '--pin-delay': `${p.delay}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="bb-splash-dot" />
                {p.label && (
                  <span
                    className="bb-splash-caption"
                    style={{ '--cap-delay': `${p.delay + CAPTION_LAG}ms` } as React.CSSProperties}
                  >
                    {p.label}
                  </span>
                )}
              </div>
              )
            })}
          </div>

          {/* Beat 3 — the logo blooms over the living map */}
          <div className="bb-splash-welcome">
            <img className="bb-splash-mark" src="/logo-mark.svg" alt="" aria-hidden="true" />
            <h2 className="bb-splash-word">Bantay Basura</h2>
            <p className="bb-splash-tag">Making waste visible. Together.</p>
            <p className="bb-splash-tag bb-splash-tag-b">So we can act together.</p>
          </div>

          {/* The closing line, anchored just above the button (not in the lockup) */}
          <p className="bb-splash-lead">Discover what&rsquo;s happening in your community.</p>

          {/* Beat 4 — the way in */}
          <button className="bb-splash-cta" onClick={dismiss} onMouseEnter={playHover}>
            Explore the live map <span aria-hidden="true">→</span>
          </button>

          <button className="bb-splash-skip" onClick={dismiss} onMouseEnter={playHover}>
            Skip
          </button>
        </>
      )}

      {/* The gate — one tap (or any key) to begin, with sound */}
      {!started && (
        <button
          className="bb-splash-gate"
          onClick={begin}
          autoFocus
          aria-label="Click anywhere to begin, with sound"
        >
          <span className="bb-splash-gate-hint">
            <span className="bb-splash-gate-dot" /> Click anywhere to begin
          </span>
        </button>
      )}

      <button
        className="bb-splash-sound"
        onClick={(e) => {
          e.stopPropagation() // muting on the gate shouldn't also begin the sequence
          toggleMute()
        }}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        title={muted ? 'Sound off' : 'Sound on'}
      >
        {muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
      </button>
    </div>
  )
}
