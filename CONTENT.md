# Strat content rules (for Claude / ChatGPT)

Use this when generating or expanding the starter strat database for The Playbook.

## Product job

Each strat must work as a **15-second freeze-time call** on a phone. Prefer clarity over completeness.

## Required fields

```json
{
  "map": "Mirage",
  "side": "T",
  "site": "a",
  "callout": "Triple A",
  "description": "Classic A execute: ticket, jungle and stairs together, then enter as five.",
  "rounds": ["full"],
  "status": "ready",
  "tasks": ["Smoke ticket booth / CT", "Smoke jungle", "Smoke stairs", "Flash in, entry ramp + palace", "Hold con after plant"],
  "links": []
}
```

- `site` (T-side approach lane; CT always `null`):
  - Most maps: `a` | `b` | `mid` | `default`
  - Nuke: `a` | `b` | `outside` | `ramp` | `default` (no Mid; Outside is the control layer)
- `rounds`: empty array = all round types; otherwise subset of `full` | `force` | `eco` | `pistol` | `anti`
- `status`: `ready` (match pool) or `practice`
- `links`: optional CSNADES URLs (see [LINEUPS.md](./LINEUPS.md)); leave `[]` to let the app suggest

## Writing rules

1. **Callout:** 1–3 words, shoutable (`Short split`, `Rush B`, not a sentence). Avoid vague `Default` callouts. Name the approach (`Window control`, `Outside`, `Banana B`).
2. **Description:** one sentence. The idea, not a novel.
3. **Tasks:** max 5, one per player / job; concrete verbs.
4. **Landings:** name real spots (`ticket booth`, `xbox`, `banana`, `heaven`) so CSNADES matching works.
5. **English only.** No bilingual `*En` fields or Norwegian copy.
6. **No boards / demos / role sheets** in this JSON. That belongs in heavier tools (Stratbase etc.).

## Coverage goals

- Every configured map × both sides
- Mix of full / force / eco / pistol where it makes sense
- Defaults and mid control, not only site executes
- Quality over volume: cut vague or duplicate callouts
- Prefer well-known executes (BLAST / standard meta) with CSNADES URLs that exist in `csnades-catalog.json`
- Inspiration (adapt to freeze-time tasks, do not copy role boards / demo titles): [cs2tactics](https://cs2tactics.vercel.app/tactics), [cs2strats.net](https://cs2strats.net), [cs2strat.com Mirage](https://www.cs2strat.com/en/maps/mirage)

## Regenerating the starter + cloud seed

```bash
npm run starter          # writes src/starter-library.json (fails if a lineup URL is missing)
npm run seed:packs       # rebuilds src/data/system-packs.json (Starter + Advanced + Meme; appends starter-pack-strats.json if present)
# Prefer applying Claude MECE diffs without a full regen:
node scripts/apply-starter-pack-mece.mjs
npm run seed:supabase    # upserts packs/strats/nades (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
```

Guests pick up catalog fixes via the app seed revision. Signed-in users need `seed:supabase` (and a hard refresh).

Catalog packs: **Starter** (day-1 calls), **Advanced** (premium), **Meme**.

## Local export schema

Settings → **Export JSON** writes `{ version: 3, maps, packs, strats }` (`SCHEMA_VERSION` in `src/lib/types.ts`).
There is no in-app “restore backup”. Use Reset local data (guest) or re-seed Supabase for cloud.
