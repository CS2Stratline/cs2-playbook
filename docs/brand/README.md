# Stratline brand

Canonical identity for Stratline.

## Assets

| File | Use |
|------|-----|
| [stratline-brand-sheet.pdf](./stratline-brand-sheet.pdf) | Official brand profile (size ladder, lockup, construction, palette, type) |
| [`/public/stratline-mark.svg`](../../public/stratline-mark.svg) | Bare list→play mark (in-app header) |
| [`/public/favicon.svg`](../../public/favicon.svg) | Squircle favicon (browsers) |
| [`/public/apple-touch-icon.png`](../../public/apple-touch-icon.png) | iOS home-screen icon (180×180 PNG — iOS ignores SVG) |
| [`/public/icon-192.png`](../../public/icon-192.png) / [`icon-512.png`](../../public/icon-512.png) | PWA / Android icons |
| [`/public/og-image.png`](../../public/og-image.png) | Open Graph / Twitter share card (1200×630) |

SVGs in `public/` are the source of truth for shipping UI. The PDF is the human design reference — do not regenerate icons from a raster of the sheet; edit the SVGs.

## Mark

**List → Play:** three call bars + execution triangle.

- Metaphor: freeze-time calls, then go
- Gap between list and triangle = 1× bar thickness
- Triangle height = full list stack
- Bar length ≈ 0.9× triangle’s left edge
- Square corners (not pills)
- Minimum digital size: **16px**

## Color

| Token | Hex |
|-------|-----|
| Stratline Orange | `#FF5500` |
| Stratline Dark | `#0B0E12` |

Matches app CSS `--brand` / shell background.

## Type

**Barlow Condensed Bold**, all caps for the STRATLINE wordmark. In-product UI also uses IBM Plex Sans / Mono (see `index.html`).

## Usage

- **Favicon / browsers:** `favicon.svg` (squircle)
- **iOS home screen:** `apple-touch-icon.png` (full-bleed PNG; Apple applies its own mask)
- **Header lockup:** bare mark + **Stratline** (`BrandLockup`)
- **Playbook** remains the in-app screen/tab name for the strat book — not the product wordmark
- Do not use outline-on-white or glossy iOS-style tiles
