import CATALOG from "./csnades-catalog.json";

const TYPE_WORDS = [
  { type: "smoke", words: ["røyk", "royk", "smoke", "smokes"] },
  { type: "flashbang", words: ["flash", "flashbang", "popflash", "pop-flash"] },
  { type: "molotov", words: ["molly", "molotov", "incendiary", "brann"] },
  { type: "hegrenade", words: ["hegrenade", "grenade"] },
];

/**
 * Landing aliases matched against CSNADES titleTo / slug.
 * Keep aliases specific — short tokens like "con" create false positives.
 */
const LANDING_ALIASES = [
  ["ticket booth", ["ticket booth", "ticket", "booth", "ct / ticket", "ct/ticket"]],
  ["jungle", ["jungle"]],
  ["stairs", ["stairs", "stair"]],
  ["window", ["mid window", "midt window", "window"]],
  ["connector", ["connector"]],
  ["market window", ["market window", "marked window", "markedvindu"]],
  ["market door", ["market door", "marked door", "markeddor", "markeddør"]],
  ["catwalk", ["catwalk"]],
  ["palace", ["palace"]],
  ["tetris", ["tetris"]],
  ["firebox", ["firebox", "fire box"]],
  ["van", ["van"]],
  ["apps", ["apartments", "apts", "apps"]],
  ["xbox", ["xbox", "x-box"]],
  ["ct spawn", ["ct spawn", "ct-kryss", "ct cross"]],
  ["long doors", ["long doors", "long door"]],
  ["mid doors", ["mid doors", "midt doors"]],
  ["b doors", ["b doors", "b door"]],
  ["tunnels", ["tunnels", "tunnel"]],
  ["banana", ["banana", "banan"]],
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
  ["checker", ["checker"]],
  ["short", ["short"]],
];

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a");
}

function mapSlug(mapName) {
  return CATALOG.mapAliases[mapName] || CATALOG.mapAliases[norm(mapName)] || null;
}

function detectTypes(text) {
  const n = ` ${norm(text)} `;
  const found = [];
  for (const row of TYPE_WORDS) {
    if (row.words.some((w) => n.includes(norm(w)))) found.push(row.type);
  }
  // bare "he " only when clearly utility context
  if (/\bhe\b/.test(n) && /(røyk|royk|smoke|flash|molly|nade|grenade|utility|utstyr)/.test(n)) {
    if (!found.includes("hegrenade")) found.push("hegrenade");
  }
  return found;
}

function detectLandings(text) {
  const n = norm(text);
  const hits = [];
  for (const [canonical, aliases] of LANDING_ALIASES) {
    // longer aliases first already by list order within each row
    const sorted = [...aliases].sort((a, b) => b.length - a.length);
    if (sorted.some((a) => n.includes(norm(a)))) hits.push(canonical);
  }
  return [...new Set(hits)];
}

function variantPenalty(slug) {
  let x = 0;
  if (/-(b|c|d|e)$/.test(slug)) x += 2;
  if (/-\d+$/.test(slug)) x += 3;
  return x;
}

function landingMatchScore(nade, landing) {
  const to = norm(nade.to);
  const slug = norm(nade.slug);
  const l = norm(landing);
  const dash = l.replace(/\s+/g, "-");

  // Prefer exact / dedicated landing smokes over "Jungle And Connector"
  if (to === l) return 12;
  if (to.startsWith(l + " ") || to.endsWith(" " + l)) return 10;
  if (slug.startsWith(dash + "-from-") || slug.startsWith(dash + "-")) return 11;
  if (to.includes(l) && !to.includes(" and ") && !to.includes(" + ")) return 8;
  if (slug.includes(dash) && !slug.includes("-and-")) return 6;
  if (to.includes(l)) return 3;
  if (slug.includes(dash)) return 2;
  return 0;
}

function bestTypeForLanding(blob, landing, globalTypes) {
  // Look at the sentence/task that mentions this landing
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

/**
 * Suggest CSNADES lineup links for a strat draft.
 * Picks up to one strong link per detected landing spot.
 */
export function suggestLineupLinks(strat, { limit = 5, side } = {}) {
  const map = mapSlug(strat.map);
  if (!map) return [];

  const blob = [
    strat.callout,
    strat.calloutEn,
    strat.description,
    strat.descriptionEn,
    ...(strat.tasks || []),
    ...(strat.tasksEn || []),
  ].join("\n");

  const globalTypes = detectTypes(blob);
  const landings = detectLandings(blob);
  if (!landings.length) return [];

  const team = (side || strat.side || "").toLowerCase();
  const pool = CATALOG.nades.filter((n) => n.map === map);
  const out = [];
  const seenTo = new Set();

  for (const landing of landings) {
    if (out.length >= limit) break;
    const wantType = bestTypeForLanding(blob, landing, globalTypes);
    let best = null;
    let bestScore = 0;

    for (const nade of pool) {
      let score = landingMatchScore(nade, landing);
      if (score < 6) continue; // skip weak / combo-only hits
      if (nade.type === wantType) score += 4;
      else if (globalTypes.includes(nade.type)) score += 1;
      else score -= 2;

      if (team === "t" || team === "ct") {
        if (nade.team === team) score += 1;
        else if (nade.team && nade.team !== "both") score -= 1;
      }

      score -= variantPenalty(nade.slug);

      if (score > bestScore) {
        bestScore = score;
        best = nade;
      }
    }

    if (!best || bestScore < 8) continue;
    const dedupe = `${best.type}|${norm(best.to)}`;
    if (seenTo.has(dedupe)) continue;
    seenTo.add(dedupe);
    out.push({
      label: best.label,
      labelEn: best.labelEn,
      url: best.url,
    });
  }

  return out;
}

/** Snapshot size for settings hint — aliases for matching live in this file, not catalog JSON. */
export const CATALOG_SIZE = CATALOG.nades.length;
