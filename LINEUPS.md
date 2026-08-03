# Lineup source: CSNADES.gg

**Canonical source for utility lineups is [CSNADES.gg](https://csnades.gg/).**

## Why this source

| Source | Coverage | Stable deep links | Fit for auto-suggest |
|---|---|---|---|
| **CSNADES.gg** | Site-wide 1000+; our snapshot ~566 on 7 maps | `/{map}/{type}/{slug}` | Yes |
| cs2util.com | Strong, interactive map | Weaker per-nade URL | No |
| lineups.gg | ~200 | Limited | Partial |
| csdb.gg | ~118 | Partial | Partial |

CSNADES gives per-nade pages (video + aim point), a predictable URL pattern, combination pages for multi-smoke executes, and public coverage for Dust II, Mirage, Inferno, Nuke, Ancient, Anubis, and Cache.

## URL pattern

```
https://csnades.gg/{map}/{type}/{slug}
```

- **map:** `dust2` | `mirage` | `inferno` | `nuke` | `ancient` | `anubis` | `cache`
- **type:** `smokes` | `flashbangs` | `molotovs` | `hegrenades` | `combinations`
- **slug:** `{landing}-from-{throw-spot}` (optional `-b`, `-2`, … for variants)

Examples:

- https://csnades.gg/mirage/smokes/ticket-booth-from-a-ramp
- https://csnades.gg/dust2/smokes/ct-spawn-from-xbox

App map name → slug: `Dust II` → `dust2`.

## Local catalog

`src/csnades-catalog.json` is a **manual snapshot** of public CSNADES pages (~566 nades). Landing/type aliases for auto-suggest live in `src/lib/lineupMatch.ts`.

`suggestLineupLinks` only reads utility task lines, matches throw destinations, and **hard-filters by side** (`team` t/ct) so CT holds never get T execute smokes.

## When writing new strats

1. Use **concrete landing spots** in tasks (ticket booth, jungle, xbox, banana, heaven, …).
2. Set `links` to real CSNADES URLs, or leave `[]`. The app suggests on save.
3. Prefer CSNADES over other domains unless a nade is missing.
4. Prefer one canonical variant per landing (avoid `-b`/`-2` unless the team has a preferred line).
5. For multi-smoke executes: one link per smoke, or a `combinations/` page if it exists.
6. Follow [CONTENT.md](./CONTENT.md) (short callouts, ≤5 tasks, English only).

Example:

```json
{
  "map": "Mirage",
  "side": "T",
  "site": "a",
  "callout": "Triple A",
  "tasks": ["Smoke ticket booth", "Smoke jungle", "Smoke stairs"],
  "links": [
    {
      "label": "Smoke: Ticket Booth",
      "url": "https://csnades.gg/mirage/smokes/ticket-booth-from-a-ramp"
    }
  ]
}
```

## Updating the catalog

No auto-regen script yet. Update `csnades-catalog.json` manually when patches change lineups, then run `npm run starter` to validate starter URLs still exist.

## Design rule

Lineups are **prep**. Match shows small link chips only. Do not embed video in the live caller.
