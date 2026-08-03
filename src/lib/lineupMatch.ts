import type { Nade, Site, Strat, StratLink } from "./types";
import { linkLandingPhrase } from "./taskLinks";
import { nadeTypeFromLink } from "./nadeType";

const TYPE_WORDS = [
  { type: "smoke", words: ["smoke", "smokes"] },
  { type: "flashbang", words: ["flash", "flashbang", "popflash", "pop-flash"] },
  { type: "molotov", words: ["molly", "molotov", "incendiary"] },
  { type: "hegrenade", words: ["hegrenade", "grenade", "he "] },
];

/**
 * Longer / more specific landings first in practice via span matching.
 * Keep multi-word spots as their own entries so "market window" never also
 * yields bare "window" (which would pull Mid Window lineups).
 */
const LANDING_ALIASES: [string, string[]][] = [
  ["ticket booth", ["ticket booth", "ticket", "booth"]],
  ["jungle", ["jungle"]],
  ["stairs", ["stairs", "stair"]],
  ["market window", ["market window"]],
  ["mid window", ["mid window"]],
  ["window", ["window"]],
  ["connector", ["connector"]],
  ["market door", ["market door"]],
  ["catwalk", ["catwalk"]],
  ["palace", ["palace"]],
  ["tetris", ["tetris"]],
  ["firebox", ["firebox", "fire box"]],
  ["van", ["van"]],
  ["apps", ["apartments", "apts", "apps"]],
  ["platform", ["platform", "plat"]],
  ["b site", ["b site", "bsite"]],
  ["a site", ["a site", "asite"]],
  ["xbox", ["xbox", "x-box"]],
  ["ct spawn", ["ct spawn", "ct cross"]],
  ["long doors", ["long doors", "long door"]],
  ["mid doors", ["mid doors"]],
  ["b doors", ["b doors", "b door"]],
  ["tunnels", ["tunnels", "tunnel"]],
  ["banana", ["banana"]],
  ["coffins", ["coffins", "coffin"]],
  ["library", ["library"]],
  ["moto", ["moto", "motorcycle"]],
  ["pit", ["pit"]],
  ["car", ["sandbags", "sandbag", "car"]],
  ["heaven", ["heaven"]],
  ["garage", ["garage"]],
  ["ramp", ["ramp"]],
  ["hut", ["hut"]],
  ["outside", ["outside"]],
  ["secret", ["secret"]],
  ["vents", ["vents", "vent"]],
  ["temple", ["temple"]],
  ["donut", ["donut"]],
  ["cave", ["cave"]],
  ["ruins", ["ruins"]],
  ["canal", ["canals", "canal"]],
  ["ebox", ["ebox", "e-box"]],
  ["bridge", ["bridge"]],
  ["squeaky", ["squeaky"]],
  ["forklift", ["forklift"]],
  ["short", ["short"]],
];

const MAP_ALIASES: Record<string, string> = {
  "dust ii": "dust2",
  dust2: "dust2",
  mirage: "mirage",
  inferno: "inferno",
  nuke: "nuke",
  ancient: "ancient",
  anubis: "anubis",
  cache: "cache",
};

/** Site → prefer / demote destination keywords (keeps B executes off Mid Window, etc.). */
const SITE_LANDING_HINTS: Record<string, { prefer: RegExp; demote: RegExp }> = {
  a: {
    prefer: /\b(ticket|jungle|stairs|palace|ramp|tetris|connector|firebox|triple|a site|a ramp)\b/,
    demote: /\b(market|mid window|b apts|b site|van|apps)\b/,
  },
  b: {
    prefer: /\b(market|b apts|b site|apps|apts|short|van|apartment)\b/,
    demote: /\b(mid window|ticket|jungle|palace|ramp|tetris|a site)\b/,
  },
  mid: {
    prefer: /\b(mid|window|connector|top mid|underpass|xbox)\b/,
    demote: /\b(market window|palace|banana|apps)\b/,
  },
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBoundary(ch: string | undefined) {
  return !ch || /[^a-z0-9]/.test(ch);
}

function detectTypes(text: string) {
  const n = ` ${norm(text)} `;
  const found: string[] = [];
  for (const row of TYPE_WORDS) {
    if (row.words.some((w) => n.includes(norm(w)))) found.push(row.type);
  }
  return found;
}

/**
 * Longest non-overlapping alias spans win.
 * "Smoke market window" → market window only (not also window / mid window).
 */
export function detectLandings(text: string): string[] {
  const n = norm(text);
  type Hit = { canonical: string; start: number; end: number; len: number };
  const hits: Hit[] = [];

  for (const [canonical, aliases] of LANDING_ALIASES) {
    for (const alias of aliases) {
      const needle = norm(alias);
      if (!needle) continue;
      let from = 0;
      while (from <= n.length) {
        const idx = n.indexOf(needle, from);
        if (idx === -1) break;
        const before = n[idx - 1];
        const after = n[idx + needle.length];
        if (isBoundary(before) && isBoundary(after)) {
          hits.push({
            canonical,
            start: idx,
            end: idx + needle.length,
            len: needle.length,
          });
        }
        from = idx + 1;
      }
    }
  }

  hits.sort((a, b) => b.len - a.len || a.start - b.start);
  const kept: Hit[] = [];
  for (const h of hits) {
    if (kept.some((k) => !(h.end <= k.start || h.start >= k.end))) continue;
    kept.push(h);
  }
  return [...new Set(kept.map((h) => h.canonical))];
}

function variantPenalty(slug: string) {
  let x = 0;
  if (/-(b|c|d|e)$/.test(slug)) x += 2;
  if (/-\d+$/.test(slug)) x += 3;
  return x;
}

function landingTokens(landing: string) {
  const l = norm(landing);
  const aliases = LANDING_ALIASES.find(([canonical]) => canonical === l)?.[1] || [l];
  return [...new Set([l, ...aliases.map(norm)])];
}

function landingMatchScore(nade: Nade, landing: string) {
  const to = norm(nade.to);
  const slug = norm(nade.slug);
  let best = 0;
  for (const l of landingTokens(landing)) {
    const dash = l.replace(/\s+/g, "-");
    if (to === l) best = Math.max(best, 12);
    // Landing is the throw *destination* (`to`), encoded as `{landing}-from-…` in CSNADES slugs.
    // Do not treat origin suffixes like `chair-from-b-short` as a "short" landing.
    if (slug.startsWith(dash + "-from-")) best = Math.max(best, 11);
    // Catalog often uses "B Apts" for apps landings
    if (to === `b ${l}`) best = Math.max(best, 10);
  }
  // Players often say bare "window" for Mid Window on Mirage.
  if (landing === "window") {
    if (to === "mid window" || slug.startsWith("mid-window-from-")) best = Math.max(best, 10);
  }
  // "Flash site" / apps entry → B Site flashes
  if (landing === "apps" || landing === "b site") {
    if (to === "b site" || slug.startsWith("b-site-from-")) best = Math.max(best, landing === "b site" ? 12 : 9);
  }
  return best;
}

function siteContextScore(nade: Nade, site: Site | string | null | undefined) {
  if (!site || site === "default" || site === "outside" || site === "ramp") return 0;
  const hints = SITE_LANDING_HINTS[norm(String(site))];
  if (!hints) return 0;
  const blob = norm(`${nade.to} ${nade.from} ${nade.slug}`);
  if (hints.prefer.test(blob)) return 2;
  if (hints.demote.test(blob)) return -4;
  return 0;
}

function bestTypeForLanding(blob: string, landing: string, globalTypes: string[]) {
  const lines = blob.split(/\n|·|\./);
  const l = norm(landing);
  for (const line of lines) {
    if (!norm(line).includes(l)) continue;
    const local = detectTypes(line);
    if (local.length) return local[0];
  }
  if (globalTypes.length === 1) return globalTypes[0];
  return "smoke";
}

/** Only lines that mention utility. Avoids matching hold callouts like "heaven" / "forklift". */
function utilLines(blob: string) {
  return blob
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && (detectTypes(line).length > 0 || /\b(util|utility|nades?)\b/i.test(line)));
}

function pickBestNade(
  pool: Nade[],
  landing: string,
  wantType: string,
  globalTypes: string[],
  site: Site | string | null | undefined
): { nade: Nade; score: number } | null {
  let best: Nade | null = null;
  let bestScore = 0;

  for (const nade of pool) {
    let score = landingMatchScore(nade, landing);
    if (score < 6) continue;
    if (nade.type === wantType) score += 4;
    else if (globalTypes.includes(nade.type)) score += 1;
    else score -= 2;
    score -= variantPenalty(nade.slug);
    score += siteContextScore(nade, site);
    if (score > bestScore) {
      bestScore = score;
      best = nade;
    }
  }

  if (!best || bestScore < 8) return null;
  return { nade: best, score: bestScore };
}

export function suggestLineupLinks(
  strat: Pick<Strat, "map" | "side" | "callout" | "description" | "tasks"> & {
    site?: Strat["site"];
  },
  catalog: Nade[],
  { limit = 5 }: { limit?: number } = {}
): StratLink[] {
  const mapSlug = MAP_ALIASES[norm(strat.map)];
  if (!mapSlug) return [];

  // Prefer concrete util steps; only fall back to callout/description when tasks
  // have no utility lines (avoids "apps entry" in a blurb pulling a random apps smoke).
  const taskUtil = utilLines((strat.tasks || []).join("\n"));
  const fallbackUtil = utilLines([strat.callout, strat.description].join("\n"));
  const lines = taskUtil.length ? taskUtil : fallbackUtil;
  if (!lines.length) return [];

  const utilBlob = lines.join("\n");
  const globalTypes = detectTypes(utilBlob);

  const team = (strat.side || "").toLowerCase();
  // Hard filter by side. Never suggest T execute smokes on CT holds (or vice versa).
  const pool = catalog.filter((n) => {
    if (!(n.map === mapSlug || norm(n.map) === mapSlug)) return false;
    if (team !== "t" && team !== "ct") return true;
    return !n.team || n.team === "both" || n.team === team;
  });
  if (!pool.length) return [];

  const out: StratLink[] = [];
  const seen = new Set<string>();

  // Score per util line so "Smoke market window" and "Flash site from apps"
  // each get the right type + landing, without cross-talk.
  for (const line of lines) {
    if (out.length >= limit) break;
    const landings = detectLandings(line);
    const lineTypes = detectTypes(line);
    for (const landing of landings) {
      if (out.length >= limit) break;
      const wantType =
        lineTypes[0] || bestTypeForLanding(utilBlob, landing, globalTypes);
      const picked = pickBestNade(pool, landing, wantType, globalTypes, strat.site);
      if (!picked) continue;
      const dedupe = `${picked.nade.type}|${norm(picked.nade.to)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({
        label: picked.nade.label || picked.nade.to,
        url: picked.nade.url,
      });
    }
  }

  return out;
}

export function mergeSuggested(
  pinned: StratLink[],
  suggested: StratLink[],
  limit = 5
): { pinned: StratLink[]; suggested: StratLink[] } {
  const pinnedUrls = new Set(pinned.map((l) => l.url));
  const pinnedLandings = new Set(
    pinned.map((l) => `${nadeTypeFromLink(l) || "?"}|${linkLandingPhrase(l)}`)
  );
  const extra = suggested
    .filter((s) => {
      if (pinnedUrls.has(s.url)) return false;
      const key = `${nadeTypeFromLink(s) || "?"}|${linkLandingPhrase(s)}`;
      // Don't suggest a second Heaven smoke when one is already pinned.
      if (key !== "?|" && pinnedLandings.has(key)) return false;
      return true;
    })
    .slice(0, Math.max(0, limit - pinned.length));
  return { pinned, suggested: extra };
}
