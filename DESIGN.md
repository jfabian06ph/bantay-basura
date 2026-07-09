# Bantay Basura — Visual Identity

The goal: when someone sees a screenshot, they think **"That's Bantay Basura,"** not
"that's another React dashboard." This document is the source of truth for the brand's
visual language. The tokens live in `src/App.css` (`:root`) — prefer them over raw values.

## The idea in one line

**A calm navy control room for a civic mission — soft, glassy, and quiet, so the red of
an urgent report and the green of a cleanup are the only things that shout.**

## Principles

1. **Navy is the ground, not a color you notice.** The whole interface sits on deep navy
   so the map and the status colors carry all the meaning.
2. **Red means act or urgent. Green means done. Nothing else uses them.** No red section
   headers, no green links. Color is reserved for signal, never decoration.
3. **Everything floats.** Panels are glass cards over the map — never full-bleed chrome.
4. **Soft geometry.** Corners are 18–20px. Nothing is sharp. Shadows are deep but diffuse.
5. **Large, confident typography.** Headlines are big and tight (`-0.03…-0.05em`).
   Numbers are tabular so they don't jitter as they animate.
6. **Motion is smooth and physical.** Fly-to and panel transitions use one shared easing
   curve. Views slide; they don't blink.
7. **Minimal icons.** Line icons (lucide), thin strokes, only where they add scanning speed.
8. **Consistent spacing.** A 4px scale (`--space-1…6`). No arbitrary margins.

## Palette

| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#0b1220` | Scrims, deepest shadow |
| `--bg` | `#101a2d` | App background |
| `--surface` | `#1b2a43` | Raised cards |
| `--surface-2` | `#33445f` | Inputs, hover surfaces |
| `--map-bg` | `#eef1ec` | Soft off-white map canvas |
| `--text` / `--text-strong` | `#f8fafc` / `#fff` | Body / emphasis |
| `--text-dim` / `--text-mute` | `#aebbd0` / `#7f8ca3` | Secondary / tertiary |
| `--red` (`--action`, `--urgent`) | `#e31e2f` | CTAs + pending/open issues |
| `--amber` (`--review`) | `#f5b84b` | In-review |
| `--green` (`--resolved`) | `#23c266` | Resolved / completed |

## Glass overlays

The signature surface. Floating panels use:

```
background: var(--glass-bg);          /* rgba(12,20,35,.93) */
border: 1px solid var(--glass-border);
backdrop-filter: blur(var(--glass-blur));
box-shadow: var(--shadow);
border-radius: var(--radius-card);    /* 20px */
```

Inner tiles/rows use `--glass-bg-soft` and `--radius` / `--radius-sm`.

## Radii, elevation, spacing, motion

- **Radii:** `--radius-sm` 12 · `--radius` 18 · `--radius-card` 20 · `--radius-pill` 999.
- **Elevation:** `--shadow` (floating panels) · `--softshadow` (subtle lift). Two only.
- **Spacing:** `--space-1` 4 → `--space-6` 28.
- **Motion:** `--ease` `cubic-bezier(.22,.61,.36,1)`; `--dur-fast` .18s, `--dur` .32s.
  Fly-to on the map runs ~1.4s. Never use `linear`.

## Status color = the one place color speaks

Status is always rendered with its semantic color, ideally as a **top color strip** on the
relevant card (Linear-style) plus a dot — never color alone (accessibility):

- Pending / open → `--urgent` (red)
- In review → `--review` (amber)
- Resolved → `--resolved` (green)

## Anti-patterns

- ❌ Hover-only affordances (no hover on mobile) — make things tappable and label them.
- ❌ Red or green used decoratively.
- ❌ Sharp corners, hairline flat cards, or full-width toolbars.
- ❌ Instant view swaps — transition with a slide.
- ❌ Raw hex in components when a token exists.
