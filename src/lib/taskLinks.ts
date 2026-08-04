import type { StratLink } from "./types";
import { normalizeSearchText as norm } from "./text";

/** Short chip label: "Smoke: Jungle" → "Jungle", keep short labels as-is. */
export function shortLinkLabel(label: string): string {
  const cleaned = label.replace(/^(smoke|flash|molly|molotov|he|nade)\s*:\s*/i, "").trim();
  return cleaned || label;
}

const STOP = new Set([
  "the",
  "and",
  "from",
  "with",
  "for",
  "into",
  "onto",
  "smoke",
  "smokes",
  "flash",
  "flashbang",
  "flashbangs",
  "molly",
  "molotov",
  "molotovs",
  "grenade",
  "hegrenade",
  "hegrenades",
  "nade",
  "combo",
  "combination",
  "combinations",
  "csnades",
  "https",
  "www",
]);

/** Destination phrase from a CSNADES slug / chip label ("market window", "mid window"). */
export function linkLandingPhrase(link: StratLink): string {
  const blob = norm(`${link.label} ${link.url}`);
  const fromSlug = blob.match(/\/(?:smokes|flashbangs|molotovs|hegrenades|combinations)\/([a-z0-9-]+)/);
  const slugLanding = fromSlug?.[1]?.replace(/-from-.*$/, "").replace(/-/g, " ") || "";
  const afterColon = norm(link.label || "")
    .replace(/^(smoke|flash|molly|molotov|he|nade)\s*:\s*/i, "")
    .trim();
  // Prefer the longer, more specific phrase.
  if (slugLanding && afterColon) {
    return slugLanding.length >= afterColon.length ? slugLanding : afterColon;
  }
  return slugLanding || afterColon;
}

function typeCompatible(task: string, link: StratLink): boolean {
  const t = norm(task);
  const blob = norm(`${link.label} ${link.url}`);
  const taskSmoke = t.includes("smoke");
  const taskFlash = t.includes("flash");
  const taskMolly = t.includes("molly") || t.includes("molotov") || t.includes("incendiary");
  const taskHe = /\bhe\b/.test(t) || t.includes("grenade");
  const linkSmoke = blob.includes("smoke");
  const linkFlash = blob.includes("flash");
  const linkMolly = blob.includes("molotov") || blob.includes("molly");
  const linkHe = blob.includes("hegrenade") || blob.includes("/he ");
  // If the task names a util type, require the link to match that family.
  if (taskSmoke || taskFlash || taskMolly || taskHe) {
    if (taskSmoke && linkSmoke) return true;
    if (taskFlash && linkFlash) return true;
    if (taskMolly && linkMolly) return true;
    if (taskHe && linkHe) return true;
    return false;
  }
  return true;
}

/**
 * How well a lineup belongs on a task line.
 * Full multi-word landings beat shared single tokens ("window" in "market window").
 */
export function linkTaskMatchScore(task: string, link: StratLink): number {
  if (!typeCompatible(task, link)) return 0;

  const t = norm(task);
  const landing = linkLandingPhrase(link);
  if (!landing || landing.length < 3) return 0;

  // Exact destination phrase in the step text.
  if (t.includes(landing)) return 100 + landing.length;

  const words = landing
    .split(/\s+/)
    .map(norm)
    .filter((w) => w.length >= 3 && !STOP.has(w));

  if (words.length > 1) {
    // Multi-word lineup (Mid Window, Market Window): require every content word.
    // "Smoke market window" must not accept Mid Window via shared "window".
    if (words.every((w) => t.includes(w))) return 60 + landing.length;
    return 0;
  }

  // Single-word landing: word must appear, but not only as part of a *different*
  // multi-word callout already in the task (e.g. bare "window" vs "market window").
  const word = words[0];
  if (!word || !t.includes(word)) return 0;

  // If the task contains "<something> <word>" where something isn't a util verb,
  // treat as a more specific callout and reject the bare match.
  // ("market window" rejects Mid Window; "flash site" still accepts B Site.)
  const richer = t.match(new RegExp(`\\b([a-z0-9]+)\\s+${word}\\b`));
  const prefix = richer?.[1];
  if (prefix && prefix !== word && !STOP.has(prefix)) {
    return 0;
  }

  return 20 + word.length;
}

function linkKey(link: StratLink) {
  return `${link.url}\0${link.label}`;
}

/**
 * Attach lineup links to every task line they belong on (by landing + util type).
 * A heaven smoke can sit on both "Smoke heaven" and "Smoke heaven and platform".
 * Unmatched links are returned separately for a "More" row.
 */
export function attachLinksToTasks(
  tasks: string[],
  links: StratLink[]
): { rows: { task: string; links: StratLink[] }[]; leftover: StratLink[] } {
  const used = new Set<string>();
  const rows = tasks.map((task) => {
    const scored = links
      .map((link) => ({ link, score: linkTaskMatchScore(task, link) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || links.indexOf(a.link) - links.indexOf(b.link));
    for (const x of scored) used.add(linkKey(x.link));
    return { task, links: scored.map((x) => x.link) };
  });

  const leftover = links.filter((l) => !used.has(linkKey(l)));
  return { rows, leftover };
}
