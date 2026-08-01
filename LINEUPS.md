# Lineup-kilde: CSNADES.gg

**Kanonisk kilde for utility-lineups i Strat-boka er [CSNADES.gg](https://csnades.gg/).**

## Hvorfor denne

| Kilde | Dekning | Stabile deep-links | Egnet for AI/auto |
|---|---|---|---|
| **CSNADES.gg** | Site-wide 1000+; our snapshot ~566 on 7 maps | `/{map}/{type}/{slug}` | Ja |
| cs2util.com | God, interaktivt kart | Svakere per-nade URL | Nei |
| lineups.gg | ~200 | Begrenset | Delvis |
| csdb.gg | ~118 | Delvis | Delvis |

CSNADES har:

- Per-nade-sider med video + aim-point
- Forutsigbart URL-mønster
- Combinations for multi-smoke executes
- Offentlige kart vi bruker: Dust II, Mirage, Inferno, Nuke, Ancient, Anubis, Cache

## URL-mønster

```
https://csnades.gg/{map}/{type}/{slug}
```

- **map:** `dust2` | `mirage` | `inferno` | `nuke` | `ancient` | `anubis` | `cache`
- **type:** `smokes` | `flashbangs` | `molotovs` | `hegrenades` | `combinations`
- **slug:** `{landing}-from-{throw-spot}` (evt. `-b`, `-2`, … for varianter)

Eksempler:

- https://csnades.gg/mirage/smokes/ticket-booth-from-a-ramp
- https://csnades.gg/dust2/smokes/ct-spawn-from-xbox
- https://csnades.gg/inferno/molotovs/… (se katalogen)

Kartnavn i appen → slug: `Dust II` → `dust2`.

## Lokal katalog

`src/csnades-catalog.json` er et **manuelt snapshot** av offentlige CSNADES-sider (~566 nades for våre sju kart). Landing-/type-aliaser for auto-forslag ligger i `src/lineupMatch.js` (ikke i katalog-JSON).

`src/lineupMatch.js` foreslår lenker ut fra callout + tasks (norsk/engelsk).

## When Claude / ChatGPT lager nye strats

1. Skriv tasks med **konkrete landing-spots** (ticket booth, jungle, xbox, banana, heaven, …).
2. Sett `links` til konkrete CSNADES-URL-er fra mønsteret over, eller la feltet stå tomt — appen foreslår da automatisk ved lagring.
3. Bruk **ikke** andre lineup-domener med mindre CSNADES mangler naden.
4. Foretrekk én kanonisk variant per landing (unngå `-b`/`-2` med mindre laget har en bestemt preferanse).
5. For executes med flere røyker: lenk hver røyk, eller en `combinations/`-side hvis den finnes.
6. Følg også [CONTENT.md](./CONTENT.md) (korte callouts, ≤5 tasks, bilingual).

Eksempel-payload:

```json
{
  "map": "Mirage",
  "side": "T",
  "site": "a",
  "callout": "Trippel A",
  "calloutEn": "Triple A",
  "tasks": ["Røyk ticket booth", "Røyk jungle", "Røyk stairs"],
  "tasksEn": ["Smoke ticket booth", "Smoke jungle", "Smoke stairs"],
  "links": [
    {
      "label": "Røyk: Ticket Booth",
      "labelEn": "Smoke: Ticket Booth",
      "url": "https://csnades.gg/mirage/smokes/ticket-booth-from-a-ramp"
    }
  ]
}
```

## Oppdatere katalogen

Det finnes **ingen** auto-regen-script ennå. Oppdater `csnades-catalog.json` manuelt når CS2-patches endrer lineups (scrape/public pages → samme JSON-shape). Kjør deretter `npm run starter` for å validere at starter-URL-ene fortsatt finnes i katalogen.

## Designregel

Lineups er **forberedelse**. Kamp-fanen viser bare små lenke-chips. Ikke embed video i live-calleren.
