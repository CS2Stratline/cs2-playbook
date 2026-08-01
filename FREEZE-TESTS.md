# Freeze-time test checklist

Run on a phone (or narrow browser) during casual/scrim freeze. Goal: readable call in ≤2 taps after filters.

## Setup

1. Hard-refresh the deployed app (or `npm run dev`).
2. Confirm strats are already in the pool (guest local seed, or signed-in cloud).
3. Pick map + side you are actually playing.

## Cases

| # | Action | Pass if |
|---|---|---|
| 1 | Surprise: tap **Surprise me** | Callout + tasks readable; lineup pills beside matching lines |
| 2 | Pick: tap a strat row | Same call card; intended strat shown |
| 3 | Playbook → expand → **Use in match** | Switches to Match with that strat |
| 4 | Refresh with an active call | Filters restored; call still visible |
| 5 | Change site filter | Active call clears; pool updates |
| 6 | Settings → Export JSON | Downloads `{ version, maps, packs, strats }` |

## Notes

Record time-to-call and any mis-taps. Prefer cutting Match chrome over adding prep features.
