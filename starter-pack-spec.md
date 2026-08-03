# Starter pack — MECE strat grid

Companion to `starter-pack-strats.json` (54 new strats). **Apply `playbook-fixes.md` first** — this builds on the deduped, corrected file.

New records carry `"source": "starter-pack-mece"`, so they can be filtered or rolled back in one query. No meme strats.

---

## 1. The grid

Every map gets the same 16 slots. Two cards are in the same slot only if a five-stack would play them the same way — that's the exclusivity test, and it's what the duplicate audit was really about.

**T side (8 slots)**

| Slot | What it is | Pack | Level | Rounds |
|---|---|---|---|---|
| `T-PISTOL` | Pistol-round plan. No util to save, plant for the next buy | Fundamentals | 1–2 | `pistol` |
| `T-RUSH-A` | No-util A commit | Fundamentals | 1 | `eco`, `force` |
| `T-RUSH-B` | No-util B commit | Fundamentals | 1 | `eco`, `force` |
| `T-EXEC-A` | Full-utility A execute | Stack | 6–8 | `full` |
| `T-EXEC-B` | Full-utility B execute | Stack | 6–8 | `full` |
| `T-DEFAULT` | Map control first, commit late | Stack | 6–7 | `full`, `force` |
| `T-FAKE` | Show one site, hit the other | Advanced | 9 | `full` |
| `T-SPLIT` | Two entrances, same second | Advanced | 10 | `full` |

**CT side (8 slots)**

| Slot | What it is | Pack | Level | Rounds |
|---|---|---|---|---|
| `CT-DEFAULT` | The balanced setup — 2-1-2 or the map's standard | Fundamentals | 2 | any |
| `CT-STACK-A` | Three bodies A | Fundamentals | 2 | any |
| `CT-STACK-B` | Three bodies B | Fundamentals | 2 | any |
| `CT-AGGRO` | Early contest for info, then reset | Fundamentals/Stack | 3–6 | `full`, `force` |
| `CT-ECO` | Their eco. Close angles, no wide peeks | Fundamentals | 1 | `eco`, `anti` |
| `CT-PASSIVE` | Concede space, save util, play the retake | Stack | 5–6 | `full`, `force` |
| `CT-RETAKE-A` | Grouped A retake | Advanced | 10 | `full`, `force`, `anti` |
| `CT-RETAKE-B` | Grouped B retake | Advanced | 10 | `full`, `force`, `anti` |

Extra cards beyond one per slot are fine — they're variants, and Mirage has plenty. The rule is that no slot is **empty** and no two cards in the same slot are **interchangeable**.

---

## 2. Coverage after merge

**NEW** = in `starter-pack-strats.json`. **fix** = existing card, changed by `playbook-fixes.md` or by §4 below. Variants in brackets.

### Dust II
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol short** NEW | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | Fast long | | CT-STACK-A | A hold |
| T-RUSH-B | Rush B | | CT-STACK-B | B hold *(fix)* |
| T-EXEC-A | Long A *(Short A)* | | CT-AGGRO | Mid push *(Long nade)* |
| T-EXEC-B | B doors *(Mid to B)* | | CT-ECO | **Anti-eco close** NEW |
| T-DEFAULT | Xbox mid | | CT-PASSIVE | **Give mid** NEW |
| T-FAKE | **Long fake B** NEW | | CT-RETAKE-A | **Retake A** NEW |
| T-SPLIT | Split A | | CT-RETAKE-B | **Retake B** NEW |

### Mirage
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | Pistol stairs | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | Contact A *(Palace pop)* | | CT-STACK-A | A stack *(fix)* *(Ramp hold)* |
| T-RUSH-B | Rush apps | | CT-STACK-B | B stack |
| T-EXEC-A | Triple A *(Spawn triple, Ramp only)* | | CT-AGGRO | Short mid push *(Mid aggression fix, Anti apps, Apps nade)* |
| T-EXEC-B | Apps B *(Fast B, Short B, Four in market)* | | CT-ECO | Eco window |
| T-DEFAULT | Window control *(Mid to A, Mid to B)* | | CT-PASSIVE | Mid give |
| T-FAKE | A fake to B | | CT-RETAKE-A | Retake A |
| T-SPLIT | Apps split *(Under split)* | | CT-RETAKE-B | **Retake B** NEW |

### Inferno
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol banana** NEW | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | **Rush apps** NEW | | CT-STACK-A | A stack |
| T-RUSH-B | Fast banana *(retag)* | | CT-STACK-B | Banana hold |
| T-EXEC-A | Apps A *(fix)* *(Arch A, Short A)* | | CT-AGGRO | Apps watch |
| T-EXEC-B | Banana B | | CT-ECO | **Anti-eco banana** NEW |
| T-DEFAULT | Mid control | | CT-PASSIVE | **Give banana** NEW |
| T-FAKE | **Banana fake A** NEW | | CT-RETAKE-A | **Retake A** NEW |
| T-SPLIT | **Apps and short** NEW | | CT-RETAKE-B | Retake B |

### Nuke
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol lobby** NEW | | CT-DEFAULT | Outside hold |
| T-RUSH-A | **Rush hut** NEW | | CT-STACK-A | Heaven hold |
| T-RUSH-B | **Rush ramp** NEW | | CT-STACK-B | Ramp stack |
| T-EXEC-A | Outside A *(Heaven A)* | | CT-AGGRO | **Outside push** NEW |
| T-EXEC-B | Secret B *(Vent B, Ramp)* | | CT-ECO | Anti-eco A + Anti-eco B *(fix)* |
| T-DEFAULT | **Outside default** NEW | | CT-PASSIVE | **Give outside** NEW |
| T-FAKE | **Outside fake ramp** NEW | | CT-RETAKE-A | Retake A |
| T-SPLIT | **Main and squeaky** NEW | | CT-RETAKE-B | **Retake B** NEW |

### Ancient
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol ramp** NEW | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | **Rush A main** NEW | | CT-STACK-A | A hold *(fix)* |
| T-RUSH-B | **Rush ramp** NEW | | CT-STACK-B | B hold *(fix)* |
| T-EXEC-A | Donut A *(fix)* | | CT-AGGRO | Donut stack *(fix)* |
| T-EXEC-B | Ruins B | | CT-ECO | **Anti-eco close** NEW |
| T-DEFAULT | Mid control | | CT-PASSIVE | **Give mid** NEW |
| T-FAKE | **Mid fake B** NEW | | CT-RETAKE-A | **Retake A** NEW |
| T-SPLIT | Donut split *(fix)* | | CT-RETAKE-B | **Retake B** NEW |

### Anubis
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol B long** NEW | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | **Rush water** NEW | | CT-STACK-A | A hold *(fix)* |
| T-RUSH-B | **Rush gate** NEW | | CT-STACK-B | B hold *(fix)* |
| T-EXEC-A | Water A *(fix)* | | CT-AGGRO | Water deny |
| T-EXEC-B | Ruins B *(Ebox B, fix)* | | CT-ECO | **Anti-eco close** NEW |
| T-DEFAULT | Mid control | | CT-PASSIVE | **Give mid** NEW |
| T-FAKE | **B fake A** NEW | | CT-RETAKE-A | **Retake A** NEW |
| T-SPLIT | Connector A | | CT-RETAKE-B | **Retake B** NEW |

### Cache
| Slot | Card | | Slot | Card |
|---|---|---|---|---|
| T-PISTOL | **Pistol B halls** NEW | | CT-DEFAULT | **Default 2-1-2** NEW |
| T-RUSH-A | **Rush A main** NEW | | CT-STACK-A | A hold *(fix)* |
| T-RUSH-B | **Rush B main** NEW | | CT-STACK-B | B hold *(fix)* |
| T-EXEC-A | Main A *(fix)* *(Squeaky A, Highway A fix)* | | CT-AGGRO | Mid control |
| T-EXEC-B | B main | | CT-ECO | **Anti-eco close** NEW |
| T-DEFAULT | **Garage default** NEW | | CT-PASSIVE | **Give mid** NEW |
| T-FAKE | **A fake B** NEW | | CT-RETAKE-A | **Retake A** NEW |
| T-SPLIT | Mid split | | CT-RETAKE-B | **Retake B** NEW |

---

## 3. Corrections to the earlier audit

Found while checking route vocabulary against the official callout lists for this build. **These are map errors I missed on the first pass** — I cleared Anubis and Cache as "nothing broken" and that was wrong. Apply them alongside `playbook-fixes.md`.

**Anubis T "Water A"** — `tasks[1]` is `"Smoke temple / connector"`. Anubis does have a spot people call Temple, but it's a **CT-side throwing position on B** (csnades lists a backsite molly from there under B Defensive), so it has no business in an A execute. The lineups that actually make up the A exec from water are Heaven and Platform.
→ `"Smoke heaven and platform"`
→ add links: `Smoke: Heaven` `https://csnades.gg/anubis/smokes/heaven-from-water-b`, `Smoke: Platform` `https://csnades.gg/anubis/smokes/platform-from-water`

**Anubis T "Street B"** — Street runs from CT Spawn to B Site; Ts can't take it. The mid route into B is E Box.
→ `callout`: `"Street B"` → `"Ebox B"`
→ `description`: `"Mid street → B door."` → `"Mid into B through ebox."`
→ `tasks`: `["Take top mid and double doors", "Smoke street and sniper", "Enter ebox, ruins group supports"]`

**Cache T "Highway B"** — Highway connects Mid to **A Site**, not B. The card is a mid-to-A execute wearing a B label.
→ `callout`: `"Highway B"` → `"Highway A"`
→ `site`: `"b"` → `"a"`
→ `description`: `"Highway/truck path to B."` → `"Mid into A over highway."`
→ `tasks`: `["Take garage and white box", "Smoke CT connector and elektro", "Enter highway, trade at forklift"]`

**Cache T "Main A"** — `tasks[2]` is `"Clear checker / NBK"`. Checkers is on the B side (Vents → Checkers → B Main).
→ `"Clear quad and NBK"`

**Cache CT "B hold"** — `tasks[1]` says `"watch B main / garbage"`. Garbage isn't a Cache callout.
→ see §4, this card is being rewritten anyway.

*Watch item, no edit:* Inferno CT `A stack` and `Apps watch` both distribute 3 A / 1 mid / 1 banana. They differ in where the three A players stand (site+library vs apps+balcony), which is enough to keep both, but if you ever trim Inferno, that's the pair to look at.

---

## 4. Edits that make the grid exclusive

On Dust II, Ancient, Anubis and Cache the card called **"B hold" is actually a 2-1-2 default**, not a B stack. With a real `CT-DEFAULT` card now added, each B hold needs to become a genuine three-body stack, otherwise the two cards read the same in freezetime.

**Dust II CT "B hold"**
- `description` → `"Three B. Punish tunnel rushes, give A space."`
- `tasks` → `["3 B: car, closet, plat", "1 mid doors, 1 A short", "Molly tunnels on first sound", "Don't rotate A until the plant"]`

**Ancient CT "B hold"**
- `description` → `"Three B. Deny ramp early, give A space."`
- `tasks` → `["3 B: ramp close, cave, back alley", "1 mid, 1 A", "Util ramp on first sound", "Nobody peeks top mid"]`

*(Vocabulary note: TotalCS calls these Back Halls / Square / House; csnades and your existing Ancient cards use Back Alley / B Alley / Cave. I've matched your file, so the callouts line up with the lineups you can link.)*

**Ancient CT "A hold"** — `tasks[0]` `"2–3 A, 1 mid, 1 B"` → `"3 A: site, donut, long"`

**Anubis CT "B hold"**
- `description` → `"Three B. Deny B long early, give A space."`
- `tasks` → `["3 B: corner, back site, sniper", "1 middle, 1 A", "Util B long on first sound", "Hold ebox close"]`

**Anubis CT "A hold"** — `tasks[0]` `"2–3 A (heaven/water), 1 mid, 1 B"` → `"3 A: heaven, site, main"`

**Cache CT "B hold"**
- `description` → `"Three B. Punish halls commits, give A space."`
- `tasks` → `["3 B: heaven, new boxes, close left", "1 mid, 1 A", "Smoke B main from heaven on halls commit", "Watch checkers for the vents flank"]`

**Cache CT "A hold"** — `tasks[0]` `"2–3 A (forklift/checker/site), 1 mid, 1 B"` → `"3 A: quad, forklift, NBK"`

**Round retags** — a card tagged `pistol` *and* `eco` *and* `force` occupies two slots at once. Now that each map has a dedicated pistol card, drop `pistol` from these:

| Map | Side | Callout | `rounds` becomes |
|---|---|---|---|
| Dust II | T | Fast long | `["eco","force"]` |
| Dust II | T | Rush B | `["eco","force"]` |
| Mirage | T | Rush apps | `["eco","force"]` |
| Inferno | T | Fast banana | `["full","force"]` |

---

## 5. Merge

1. Apply `playbook-fixes.md`, then §3 and §4 above.
2. Append all 54 objects from `starter-pack-strats.json` into the `strats` array. Key order already matches the existing schema — don't reorder.
3. Recompute `packs[].strat_count`. Expected end state:

| Pack | slug | strat_count |
|---|---|---|
| Fundamentals | `essentials-pug` | 59 |
| Stack | `stack-standard` | 47 |
| Advanced | `pro-structure` | 31 |
| Meme | `meme-strats` | 184 |

Total strats: **321**.

---

## 6. Sourcing and links

The utility on these cards isn't invented. csnades.gg publishes a per-map nade guide grouped by execute (A Exec / B Exec / Mid Control / A Defensive / B Defensive), and the cards were built against those groupings — so a card that says "smoke moto, arches and pit" is naming the three lineups that guide actually lists for the Inferno A exec, not three plausible-sounding smokes.

**29 of the 54 cards carry links — 55 link objects, 43 distinct URLs, every one read off a real page.** The remaining 25 are rushes, holds, defaults and eco setups that are positional and don't call for utility.

Where the source changed my draft:

| Card | Was | Now |
|---|---|---|
| Nuke "Main and squeaky" | smoke heaven and hut | smoke A main from T roof, molly hut roof, flash A site + hut — the actual listed A exec |
| Inferno "Banana fake A" | smoke library and CT, molly pit | smoke moto, arches and pit |
| Inferno "Apps and short" | smoke library and CT | smoke moto, arches and pit, flash balcony from apts |
| Anubis "B fake A" | smoke heaven and connector | smoke heaven and platform, molly site |
| Ancient "Mid fake B" | smoke back halls, molly square | smoke back alley, molly pillar |
| Nuke rush/pistol cards | flash over sandbags | flash hut from lobby / flash ramp from trophy |

**Cache is the exception.** csnades has no Cache guide, so its four links are reused from URLs already present in your export rather than re-verified. Cache is also a reserve map, not Active Duty — lowest priority if you're spot-checking.

Two things worth knowing about the links:

- I only attached a lineup when the **throwing position matches the side and route on the card**. Mirage "Retake B" has no links for this reason: the market/van/bench lineups in your file are all thrown from apartments, i.e. T-side, and are no use to a CT retaking from market.
- The guides carry an update date (Nuke and Inferno were last touched in 2024, Anubis in April 2026). Lineups drift with map updates, so treat the older ones as worth a spot-check in game rather than gospel.

---

## 7. Verification

- [ ] JSON parses; `len(strats) == 321`.
- [ ] All ids unique.
- [ ] 54 strats have `source == "starter-pack-mece"`.
- [ ] Every map has exactly one card per slot minimum — 16 slots × 7 maps, no empties.
- [ ] No task string exceeds 10 words (longest new one is 8).
- [ ] No two cards share a `callout` within the same map + side.
- [ ] Every strat tagged `pistol` is a dedicated pistol card.
- [ ] Pack counts match the table in §5.
