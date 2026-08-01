import type { Nade, Strat, StratLink } from "./types";

const TYPE_WORDS = [
  { type: "smoke", words: ["smoke", "smokes"] },
  { type: "flashbang", words: ["flash", "flashbang", "popflash", "pop-flash"] },
  { type: "molotov", words: ["molly", "molotov", "incendiary"] },
  { type: "hegrenade", words: ["hegrenade", "grenade", "he "] },
];

const LANDING_ALIASES: [string, string[]][] = [
  ["ticket booth", ["ticket booth", "ticket", "booth"]],
  ["jungle", ["jungle"]],
  ["stairs", ["stairs", "stair"]],
  ["window", ["mid window", "window"]],
  ["connector", ["connector"]],
  ["market window", ["market window"]],
  ["market door", ["market door"]],
  ["catwalk", ["catwalk"]],
  ["palace", ["palace"]],
  ["tetris", ["tetris"]],
  ["firebox", ["firebox", "fire box"]],
  ["van", ["van"]],
  ["apps", ["apartments", "apts", "apps"]],
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

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectTypes(text: string) {
  const n = ` ${norm(text)} `;
  const found: string[] = [];
  for (const row of TYPE_WORDS) {
    if (row.words.some((w) => n.includes(norm(w)))) found.push(row.type);
  }
  return found;
}

function detectLandings(text: string) {
  const n = norm(text);
  const hits: string[] = [];
  for (const [canonical, aliases] of LANDING_ALIASES) {
    const sorted = [...aliases].sort((a, b) => b.length - a.length);
    if (sorted.some((a) => n.includes(norm(a)))) hits.push(canonical);
  }
  return [...new Set(hits)];
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
    // Multi-word destinations only (avoids "window" matching "Market Window").
    if (l.includes(" ") && to === l) best = Math.max(best, 12);
    // Catalog often uses "B Apts" for apps landings
    if (to === `b ${l}`) best = Math.max(best, 10);
  }
  return best;
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

/** Only lines that mention utility — avoids matching hold callouts like "heaven" / "forklift". */
function utilLines(blob: string) {
  return blob
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && (detectTypes(line).length > 0 || /\b(util|utility|nades?)\b/i.test(line)));
}

export function suggestLineupLinks(
  strat: Pick<Strat, "map" | "side" | "callout" | "description" | "tasks">,
  catalog: Nade[],
  { limit = 5 }: { limit?: number } = {}
): StratLink[] {
  const mapSlug = MAP_ALIASES[norm(strat.map)];
  if (!mapSlug) return [];

  const blob = [strat.callout, strat.description, ...(strat.tasks || [])].join("\n");
  const utilBlob = utilLines(blob).join("\n");
  if (!utilBlob) return [];

  const globalTypes = detectTypes(utilBlob);
  const landings = detectLandings(utilBlob);
  if (!landings.length) return [];

  const team = (strat.side || "").toLowerCase();
  // Hard filter by side — never suggest T execute smokes on CT holds (or vice versa).
  const pool = catalog.filter((n) => {
    if (!(n.map === mapSlug || norm(n.map) === mapSlug)) return false;
    if (team !== "t" && team !== "ct") return true;
    return !n.team || n.team === "both" || n.team === team;
  });
  if (!pool.length) return [];

  const out: StratLink[] = [];
  const seen = new Set<string>();

  for (const landing of landings) {
    if (out.length >= limit) break;
    const wantType = bestTypeForLanding(utilBlob, landing, globalTypes);
    let best: Nade | null = null;
    let bestScore = 0;

    for (const nade of pool) {
      let score = landingMatchScore(nade, landing);
      if (score < 6) continue;
      if (nade.type === wantType) score += 4;
      else if (globalTypes.includes(nade.type)) score += 1;
      else score -= 2;
      score -= variantPenalty(nade.slug);
      if (score > bestScore) {
        bestScore = score;
        best = nade;
      }
    }

    if (!best || bestScore < 8) continue;
    const dedupe = `${best.type}|${norm(best.to)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({
      label: best.label || best.to,
      url: best.url,
    });
  }

  return out;
}

export function mergeSuggested(
  pinned: StratLink[],
  suggested: StratLink[],
  limit = 5
): { pinned: StratLink[]; suggested: StratLink[] } {
  const pinnedUrls = new Set(pinned.map((l) => l.url));
  const extra = suggested.filter((s) => !pinnedUrls.has(s.url)).slice(0, Math.max(0, limit - pinned.length));
  return { pinned, suggested: extra };
}
