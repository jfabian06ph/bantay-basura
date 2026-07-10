/**
 * Splash sound design — tiny, tactile, mostly synthesized.
 *
 * The mix, per the brief: ~70% soft ambient bed, ~20% UI cues, ~10% silence.
 * UI cues (tick, chime, swell, whoosh, sub-bass, click) are generated with the
 * Web Audio API — Apple/Linear/Nothing style — so there are no assets to ship
 * or license. The ambient bed is a real field recording dropped in at
 * `public/sounds/ambient.mp3` (see public/sounds/README.md); if it's missing we
 * fall back to a nearly-inaudible synthesized wind so the scene never feels dead.
 *
 * Browsers block audio until a user gesture, so nothing sounds until the first
 * pointer/key/touch (or the sound toggle). Cues scheduled before that unlock are
 * simply skipped — the visuals never wait on audio.
 *
 * Everything is deliberately quiet. If a listener consciously notices a sound,
 * it's too loud.
 */

type Ctx = AudioContext

const MASTER = 0.6 // overall ceiling — the cue peaks below are already gentle
const AMBIENT_GAIN = 0.13 // the bed, kept well under the cues

function now(ctx: Ctx) {
  return ctx.currentTime
}

/** A short attack / exponential-decay gain envelope feeding the master bus. */
function envGain(ctx: Ctx, out: AudioNode, peak: number, attack: number, decay: number) {
  const g = ctx.createGain()
  const t = now(ctx)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  g.connect(out)
  return { node: g, stopAt: t + attack + decay + 0.05 }
}

export class SplashAudio {
  private ctx: Ctx | null = null
  private master: GainNode | null = null
  private unlocked = false
  private muted = false
  private disposed = false

  // ambient
  private wantAmbient = false
  private ambientBuffer: AudioBuffer | null = null
  private ambientBytes: ArrayBuffer | null = null
  private ambientNodes: AudioNode[] = []

  private noiseBuf: AudioBuffer | null = null
  // A looping near-silent <audio> element. Playing an HTMLMediaElement flips iOS
  // into the "playback" audio session, which lets Web Audio play through the
  // hardware ring/silent switch (Web Audio alone is muted by it).
  private silentEl: HTMLAudioElement | null = null

  private supported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    )
  }

  private ensure(): Ctx | null {
    if (this.disposed || !this.supported()) return null
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : MASTER
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  /**
   * Resume the context (needs a user gesture) and kick off the ambient bed.
   * Resolves once the context is actually running, so callers can fire a cue
   * immediately after without it being dropped mid-resume.
   */
  unlock(): Promise<void> {
    // Create the context HERE — inside the user gesture. iOS Safari won't
    // produce sound from a context created outside a gesture.
    const ctx = this.ensure()
    if (!ctx) return Promise.resolve()
    // iOS unlock primer: play a 1-frame silent buffer synchronously in the
    // gesture so the audio hardware actually wakes.
    try {
      const b = ctx.createBuffer(1, 1, 22050)
      const s = ctx.createBufferSource()
      s.buffer = b
      s.connect(ctx.destination)
      s.start(0)
    } catch {
      /* ignore */
    }
    // iOS ring-switch bypass: keep a looping near-silent media element playing.
    if (!this.silentEl && typeof Audio !== 'undefined') {
      try {
        const el = new Audio('/silence.wav')
        el.loop = true
        el.setAttribute('playsinline', '')
        el.volume = 0.02
        void el.play().catch(() => {})
        this.silentEl = el
      } catch {
        /* ignore */
      }
    }
    const resumed = ctx.state !== 'running' ? ctx.resume() : Promise.resolve()
    return resumed.then(() => {
      if (!this.unlocked) {
        this.unlocked = true
        if (this.wantAmbient && !this.muted) this.beginAmbient()
      }
    })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master && this.ctx) {
      const t = now(this.ctx)
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.linearRampToValueAtTime(muted ? 0 : MASTER, t + 0.12)
    }
    if (!muted && this.unlocked && this.wantAmbient && this.ambientNodes.length === 0) {
      this.beginAmbient()
    }
  }

  private get out(): AudioNode | null {
    return this.master
  }

  private canPlay(): Ctx | null {
    if (this.disposed || this.muted || !this.unlocked) return null
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || !this.master) return null
    return ctx
  }

  private getNoise(ctx: Ctx): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf
    // Brown-ish noise — softer, airier than white; good for wind + whooshes.
    const len = Math.floor(ctx.sampleRate * 2)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
    this.noiseBuf = buf
    return buf
  }

  // ---- UI cues ------------------------------------------------------------

  /** Deep, soft "mmmm" for the opening — like the start of a keynote. */
  subBass() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.24, t + 0.4)
    g.gain.setValueAtTime(0.24, t + 1.1)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3)
    g.connect(this.out)
    for (const [freq, level] of [
      [48, 1],
      [96, 0.28],
      [72, 0.14],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      const og = ctx.createGain()
      og.gain.value = level
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + 2.4)
    }
  }

  /**
   * A pin being "placed" — a rounded low-mid pebble tock with a downward glide,
   * a little octave body for presence, and a crisp placement click. Triangle
   * waves (not a thin sine) so it actually reads over the ambient bed. Not a
   * notification.
   */
  tick(kind: 'sharp' | 'soft' = 'sharp') {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    const f = kind === 'soft' ? 400 : 520
    const peak = kind === 'soft' ? 0.2 : 0.26
    const decay = kind === 'soft' ? 0.16 : 0.13

    // body: fundamental + octave, each gliding down as it "lands"
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + decay)
    g.connect(this.out)
    for (const [mult, lvl] of [
      [1, 1],
      [2, 0.35],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(f * mult, t)
      o.frequency.exponentialRampToValueAtTime(f * mult * 0.8, t + decay)
      const og = ctx.createGain()
      og.gain.value = lvl
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + decay + 0.06)
    }

    // placement click — a short high-passed noise transient, "set down"
    const n = ctx.createBufferSource()
    n.buffer = this.getNoise(ctx)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1500
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(0.09, t + 0.001)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    n.connect(hp).connect(ng).connect(this.out)
    n.start(t)
    n.stop(t + 0.06)
  }

  /** Warm two-note chime for a resolved report — completion, not alert. */
  chime() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3000
    lp.connect(this.out)
    // D5 then up a fifth to A5 — soft, rounded, a small exhale of relief.
    const notes: Array<[number, number]> = [
      [587.33, 0],
      [880.0, 0.08],
    ]
    for (const [freq, offset] of notes) {
      const t = now(ctx) + offset
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.12, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
      g.connect(lp)
      for (const [mult, lvl] of [
        [1, 1],
        [2, 0.18],
      ] as const) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = freq * mult
        const og = ctx.createGain()
        og.gain.value = lvl
        o.connect(og).connect(g)
        o.start(t)
        o.stop(t + 0.8)
      }
    }
  }

  /** Warm, low "arrival" as the wordmark lands — dramatic but never a jump. */
  impact() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    // low body with a downward settle
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.2, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75)
    g.connect(this.out)
    for (const [freq, lvl] of [
      [82, 1],
      [164, 0.28],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(freq * 1.5, t)
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.22)
      const og = ctx.createGain()
      og.gain.value = lvl
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + 0.8)
    }
    // airy bloom on top so it breathes rather than thuds
    const n = ctx.createBufferSource()
    n.buffer = this.getNoise(ctx)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(700, t)
    lp.frequency.linearRampToValueAtTime(2000, t + 0.4)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(0.05, t + 0.12)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    n.connect(lp).connect(ng).connect(this.out)
    n.start(t)
    n.stop(t + 0.65)
  }

  /** Airy swell for the logo — like a slow inhale. */
  swell() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    const src = ctx.createBufferSource()
    src.buffer = this.getNoise(ctx)
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(300, t)
    lp.frequency.linearRampToValueAtTime(1300, t + 0.9)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.09, t + 0.7)
    g.gain.linearRampToValueAtTime(0.0001, t + 1.4)
    src.connect(lp).connect(g).connect(this.out)
    src.start(t)
    src.stop(t + 1.5)
  }

  /** Air moving — for the map arriving and the final hand-off into the app. */
  whoosh() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    const src = ctx.createBufferSource()
    src.buffer = this.getNoise(ctx)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.7
    bp.frequency.setValueAtTime(300, t)
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.3)
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.65)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.1, t + 0.18)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    src.connect(bp).connect(g).connect(this.out)
    src.start(t)
    src.stop(t + 0.75)
  }

  /** Tiny click for hover. */
  click() {
    const ctx = this.canPlay()
    if (!ctx || !this.out) return
    const t = now(ctx)
    const n = ctx.createBufferSource()
    n.buffer = this.getNoise(ctx)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3200
    const { node: g, stopAt } = envGain(ctx, this.out, 0.06, 0.001, 0.014)
    n.connect(hp).connect(g)
    n.start(t)
    n.stop(stopAt)
  }

  // ---- Ambient bed --------------------------------------------------------

  /** Ask for the ambient bed; loads the file now, actually plays on unlock. */
  startAmbient(url: string) {
    this.wantAmbient = true
    // Fetch raw bytes now — NO AudioContext yet (it's created on the gesture for
    // iOS). We decode once unlocked.
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('no ambient file'))))
      .then((bytes) => {
        this.ambientBytes = bytes
        if (this.unlocked && !this.muted && this.ambientNodes.length === 0) this.beginAmbient()
      })
      .catch(() => {
        /* no file — the synth wind fallback covers it */
      })
  }

  /** Decode the ambient bytes (if any) then start the bed; else synth wind. */
  private beginAmbient() {
    if (this.ambientNodes.length || !this.ctx) return
    if (this.ambientBytes && !this.ambientBuffer) {
      this.ctx
        .decodeAudioData(this.ambientBytes.slice(0))
        .then((buf) => {
          this.ambientBuffer = buf
          this.startAmbientNodes()
        })
        .catch(() => this.startAmbientNodes())
      return
    }
    this.startAmbientNodes()
  }

  private startAmbientNodes() {
    const ctx = this.ctx
    if (!ctx || !this.out || this.ambientNodes.length) return
    const g = ctx.createGain()
    const t = now(ctx)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(AMBIENT_GAIN, t + 2.2)
    g.connect(this.out)

    if (this.ambientBuffer) {
      const src = ctx.createBufferSource()
      src.buffer = this.ambientBuffer
      src.loop = true
      src.connect(g)
      src.start(t)
      this.ambientNodes = [src, g]
    } else {
      // Fallback: near-inaudible wind — brown noise, gently filtered + drifting.
      const src = ctx.createBufferSource()
      src.buffer = this.getNoise(ctx)
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 480
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.07
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 180
      lfo.connect(lfoGain).connect(lp.frequency)
      src.connect(lp).connect(g)
      src.start(t)
      lfo.start(t)
      this.ambientNodes = [src, lfo, lfoGain, lp, g]
    }
  }

  /** Fade the whole mix out over `seconds` as we hand off to the app. */
  fadeOut(seconds: number) {
    if (!this.ctx || !this.master) return
    const t = now(this.ctx)
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setValueAtTime(this.master.gain.value, t)
    this.master.gain.linearRampToValueAtTime(0.0001, t + seconds)
  }

  dispose() {
    this.disposed = true
    if (this.silentEl) {
      try {
        this.silentEl.pause()
        this.silentEl.src = ''
      } catch {
        /* ignore */
      }
      this.silentEl = null
    }
    if (this.ctx) void this.ctx.close().catch(() => {})
    this.ctx = null
    this.master = null
    this.ambientNodes = []
  }
}
