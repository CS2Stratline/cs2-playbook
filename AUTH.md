# Auth / cloud sync — parked

Login and cloud sync are **intentionally not built**.

## Why

- The Match tab must stay a freeze-time tool on one phone.
- The book already persists in `localStorage` on this device.
- Session (filters, active call timer) also persists locally (schema v2).
- Team sharing works via Export (maps + strats).
- Device moves work via Full backup (strats + history + session).

## When to revisit

Build auth only when **all** of these are true:

1. The same book must live on 2+ devices at once.
2. Export / full backup is no longer enough for the team.
3. Someone will own conflict resolution (who wins on concurrent edits).

## Preferred shape later

Keep Match UX unchanged. Add optional cloud backup behind the existing `storageGet` / `storageSet` adapter so local-first behavior remains the default offline path.
