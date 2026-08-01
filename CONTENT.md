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
  "callout": "Trippel A",
  "calloutEn": "Triple A",
  "description": "…",
  "descriptionEn": "…",
  "rounds": ["full"],
  "status": "ready",
  "tasks": ["…"],
  "tasksEn": ["…"],
  "links": []
}
```

- `site`: `a` | `b` | `mid` | `default` for T; `null` for CT
- `rounds`: empty array = all round types; otherwise subset of `full` | `force` | `eco` | `pistol` | `anti`
- `status`: `ready` (match pool) or `practice`
- `links`: optional CSNADES URLs (see [LINEUPS.md](./LINEUPS.md)); leave `[]` to let the app suggest

## Writing rules

1. **Callout:** 1–3 words, shoutable (`Short split`, `Rush B`, not a sentence).
2. **Description:** one sentence — the idea, not a novel.
3. **Tasks:** max 5, one per player / job; concrete verbs.
4. **Landings:** name real spots (`ticket booth`, `xbox`, `banana`, `heaven`) so CSNADES matching works.
5. **Bilingual:** fill both `*` and `*En` when possible; UI falls back if one is blank.
6. **No boards / demos / role sheets** in this JSON — that belongs in heavier tools (Stratbase etc.).

## Coverage goals

- Every configured map × both sides
- Mix of full / force / eco / pistol where it makes sense
- Defaults and mid control, not only site executes
- Quality over volume — cut vague or duplicate callouts
- Prefer well-known executes (BLAST / standard meta) with CSNADES URLs that exist in `csnades-catalog.json`

## Regenerating the starter file

```bash
npm run starter
```

Writes `src/cs2-startbibliotek.json` and **fails** if any lineup URL is missing from the catalog.
Existing installs: Book → settings → **Replace book with starter library** (or add missing only).

## Storage schema

Persisted and full-backup JSON uses `version: 2` with `{ version, maps, strats, history, lang, session }`.
Team share export is `{ version, maps, strats }` only.
