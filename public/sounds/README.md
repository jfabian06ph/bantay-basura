# Splash sound

The splash's **UI cues are synthesized** at runtime (Web Audio) — tick/pebble,
warm chime, airy swell, whoosh, sub-bass, hover click. Nothing to download for
those; see `src/lib/splashAudio.ts`.

## The one file to add: the ambient bed

Drop a single looping field recording here:

```
public/sounds/ambient.mp3
```

It plays very quietly (≈13% gain) under the whole intro — the "I'm entering a
real community" layer. If the file is absent, the engine falls back to a
near-inaudible synthesized wind, so the mix still works without it.

### What to look for

Aim for a **calm, seamless-looping, ~20–40s** bed. For Bantay Basura, Philippine
outdoor ambience beats generic "digital" ambience:

- distant birds
- gentle wind / leaves
- faint ocean or river
- a tricycle far away, children playing far off (barely there)

Keep it **soft and uneventful** — no sudden peaks (a passing car, a bark) that
would poke through the mix. If a listener consciously notices it, it's too loud.

### Free, license-clean sources

- **Mixkit** — https://mixkit.co/free-sound-effects/ — search *Ambient Nature*,
  *Forest*, *Wind*, *Birds*. (Free, no attribution.)
- **Pixabay** — https://pixabay.com/sound-effects/ — search *ambient*, *forest*,
  *wind*, *nature*. (Free, no attribution.)
- **Freesound** — https://freesound.org — huge, but check each file's license.

### Prep tips

- Trim to a clean loop (fade the last ~1s into the first ~1s so it doesn't click).
- Export as MP3, mono is fine, ~128kbps keeps it small.
- Target quiet — the engine keeps it low, but start with a mellow source.

That's it. Once `ambient.mp3` is in this folder, it loads automatically on the
first user gesture (browsers block audio until then).
