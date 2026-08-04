import catalog from "../data/strat-roulette.json";
import type { Side } from "./types";

export type RouletteCard = {
  callout: string;
  description: string;
  site: string | null;
  origin: "classic" | "meme";
  /** Real pack strat id when origin is meme */
  stratId?: string;
};

type RouletteEntry = {
  callout: string;
  description: string;
  side?: string | null;
  site?: string | null;
};

type RouletteCatalog = {
  reg: RouletteEntry[];
  ct: RouletteEntry[];
  t: RouletteEntry[];
  maps: Record<string, { ct: RouletteEntry[]; t: RouletteEntry[] }>;
};

const data = catalog as RouletteCatalog;

const RECENT_KEY = "cs2-playbook-roulette-recent";
const RECENT_MAX = 15;

function loadRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveRecent(keys: string[]) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(keys.slice(-RECENT_MAX)));
  } catch {
    /* ignore */
  }
}

function entryKey(e: RouletteEntry, map: string, side: Side) {
  return `${map}|${side}|${e.callout}|${e.description}`;
}

/** Classic token replace for chaos rolls. */
export function replaceRouletteTokens(desc: string, side: Side): string {
  const pistols =
    side === "CT"
      ? ["USP-S", "Desert Eagle", "Dual Berettas", "Five-SeveN", "P250"]
      : ["Glock-18", "Desert Eagle", "Dual Berettas", "Tec-9", "P250"];
  const shotguns =
    side === "CT" ? ["Nova", "XM-1014", "MAG-7"] : ["Nova", "XM-1014", "Sawed-Off"];
  const smgs =
    side === "CT"
      ? ["MP9", "MP7", "P90", "PP-Bizon", "UMP-45"]
      : ["MAC-10", "MP7", "P90", "PP-Bizon", "UMP-45"];
  const rifles =
    side === "CT"
      ? ["FAMAS", "M4A4", "SSG-08", "AWP", "SCAR-20"]
      : ["Galil AR", "AK-47", "SSG-08", "AWP", "G3SG1"];
  const special = side === "CT" ? "One person" : "The bomb carrier";
  const lmgs = ["Negev", "M249"];
  const site = ["A", "B"];
  const direction = ["right", "left"];

  let out = desc;
  // Strip any leftover HTML from old catalog rows.
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<[^>]+>/g, "");
  out = out.replace(/&nbsp;/gi, " ").replace(/&amp;/g, "&");

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;
  // Longer tokens first so @PISTOLs does not leave a trailing "s".
  out = out.replace(/@PISTOLs?\b/g, () => pick(pistols));
  out = out.replace(/@SHOTGUN\b/g, () => pick(shotguns));
  out = out.replace(/@LMG\b/g, () => pick(lmgs));
  out = out.replace(/@SMG\b/g, () => pick(smgs));
  out = out.replace(/@RIFLE\b/g, () => pick(rifles));
  out = out.replace(/@SITE\b/g, () => pick(site));
  out = out.replace(/@DIR\b/g, () => pick(direction));
  out = out.replace(/@SPECIAL\b/g, special);
  return out.trim();
}

/**
 * Classic mix: ~70% generic `reg`, else map-specific / side pool.
 * Avoids recent rolls when alternatives exist.
 */
export function rollClassicRoulette(map: string, side: Side): RouletteCard | null {
  const sideKey = side === "CT" ? "ct" : "t";
  const mapBlock = data.maps[map];
  const mapPool = mapBlock?.[sideKey] || [];
  const sidePool = side === "CT" ? data.ct : data.t;
  const recent = loadRecent();

  const candidates: RouletteEntry[] = [];
  // Bias like the original: often reg, sometimes map/side
  if (Math.random() < 0.7) {
    candidates.push(...data.reg);
  } else if (mapPool.length && Math.random() < 0.45) {
    candidates.push(...mapPool);
  } else {
    candidates.push(...sidePool);
  }
  // Fallback if a pool is empty
  if (!candidates.length) candidates.push(...data.reg, ...sidePool, ...mapPool);
  if (!candidates.length) return null;

  const fresh = candidates.filter((e) => !recent.includes(entryKey(e, map, side)));
  const pool = fresh.length ? fresh : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)]!;
  const key = entryKey(pick, map, side);
  const nextRecent = [...recent, key];
  if (nextRecent.length > RECENT_MAX) nextRecent.splice(0, nextRecent.length - RECENT_MAX);
  saveRecent(nextRecent);

  return {
    callout: pick.callout,
    description: replaceRouletteTokens(pick.description, side),
    site: pick.site ?? null,
    origin: "classic",
  };
}

