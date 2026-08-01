# Freeze-time test checklist

Run on a phone (or narrow browser) during casual/scrim freeze. Goal: readable call in ≤2 taps after filters.

## Setup

1. Hard-refresh the deployed app (or `npm run dev`).
2. Confirm English default + strats already in the pool.
3. Pick map + side you are actually playing.

## Cases

| # | Action | Pass if |
|---|---|---|
| 1 | Surprise: tap **Give me a call** | Callout + tasks readable; timer runs |
| 2 | Pick: tap a row under **Or pick one** | Same call card; intended strat shown |
| 3 | Book → expand → **Use in match** | Switches to Match with that strat + timer |
| 4 | Refresh mid-timer | Filters restored; call still visible while timer alive |
| 5 | Change site filter | Active call clears; pool updates |
| 6 | Log Won/Lost | History strip updates; no double-log |
| 7 | Full backup → clear site data → restore | Book + filters come back |

## Notes

Record time-to-call and any mis-taps. Prefer cutting Match chrome over adding prep features.
