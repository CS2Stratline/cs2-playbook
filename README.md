# CS2 Playbook

Minimal Vite/React app for IGLs: pick map, side, site and round type, get a fast call during freeze time, log the result after the round.

English is the default language. Norwegian is available in the header. New installs come with a starter library (~70 well-known executes + CSNADES links) pre-loaded; replace or extend it from Book → settings. Rebuild with `npm run starter`.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints.

## Production build

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Hosting (GitHub Pages)

Push to `main` deploys automatically via GitHub Actions. See [GITHUB-PAGES.md](./GITHUB-PAGES.md).

## Lineups

Utility links use [CSNADES.gg](https://csnades.gg/) as the canonical source. See [LINEUPS.md](./LINEUPS.md).

## Content & auth

- [CONTENT.md](./CONTENT.md) — rules for generating starter strats (Claude/ChatGPT).
- [AUTH.md](./AUTH.md) — login/cloud sync is parked until multi-device sync is required.

Data is stored in the browser's `localStorage` (per device), including match session filters and an active freeze timer. Use **Full backup** in Book → settings when switching devices. Use **Export (team)** to share maps/strats only.
