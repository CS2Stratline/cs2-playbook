# Stratline brand

Canonical identity for Stratline / Cloud Playbook.

## Assets

| File | Use |
|------|-----|
| [stratline-brand-sheet.png](./stratline-brand-sheet.png) | Human reference: size ladder, lockup, construction, palette, type |
| [`/public/stratline-mark.svg`](../../public/stratline-mark.svg) | Bare list→play mark (in-app header) |
| [`/public/favicon.svg`](../../public/favicon.svg) | Squircle favicon / apple-touch-icon |

SVGs in `public/` are the source of truth for shipping UI. The brand sheet is the design reference — do not regenerate icons from a screenshot of the sheet; edit the SVGs.

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

- **Favicon / PWA:** squircle (`favicon.svg`)
- **Header lockup:** bare mark + product name (`BrandLockup`)
- Do not use outline-on-white or glossy iOS-style tiles
