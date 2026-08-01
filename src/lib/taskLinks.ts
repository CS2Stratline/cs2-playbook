import type { StratLink } from "./types";

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Short chip label: "Smoke: Jungle" → "Jungle", keep short labels as-is. */
export function shortLinkLabel(label: string): string {
  const cleaned = label.replace(/^(smoke|flash|molly|molotov|he|nade)\s*:\s*/i, "").trim();
  return cleaned || label;
}

/**
 * Attach lineup links to the task line they belong to (by shared landing words).
 * Unmatched links are returned separately for a "More" row.
 */
export function attachLinksToTasks(
  tasks: string[],
  links: StratLink[]
): { rows: { task: string; links: StratLink[] }[]; leftover: StratLink[] } {
  const unused = [...links];
  const rows = tasks.map((task) => {
    const t = norm(task);
    const matched: StratLink[] = [];
    for (let i = unused.length - 1; i >= 0; i--) {
      const link = unused[i];
      const blob = norm(`${link.label} ${link.url}`);
      // Pull landing-ish tokens from the link label / slug
      const tokens = extractTokens(blob);
      const hit = tokens.some((tok) => tok.length >= 3 && t.includes(tok));
      // Also: task mentions a type word that matches the link type path
      const typeHit =
        (t.includes("smoke") && blob.includes("smoke")) ||
        (t.includes("flash") && blob.includes("flash")) ||
        ((t.includes("molly") || t.includes("molotov")) && (blob.includes("molotov") || blob.includes("molly"))) ||
        (t.includes("he ") && blob.includes("hegrenade"));

      if (hit || (typeHit && tokens.some((tok) => t.includes(tok)))) {
        matched.push(link);
        unused.splice(i, 1);
      }
    }
    // Prefer stronger landing matches; keep order stable
    return { task, links: matched.reverse() };
  });

  return { rows, leftover: unused };
}

function extractTokens(blob: string): string[] {
  // From "smoke: ticket booth" or ".../ticket-booth-from-a-ramp"
  const fromSlug = blob.match(/\/(?:smokes|flashbangs|molotovs|hegrenades|combinations)\/([a-z0-9-]+)/);
  const slugPart = fromSlug?.[1]?.replace(/-from-.*$/, "").replace(/-/g, " ") || "";
  const labelPart = blob.replace(/https?:\/\/\S+/g, " ");
  const raw = `${labelPart} ${slugPart}`;
  const words = raw
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
    .filter((w) => !STOP.has(w));
  // Also keep multi-word landings present in label after ":"
  const afterColon = labelPart.split(":").slice(1).join(" ").trim();
  if (afterColon) words.push(...afterColon.split(/\s+/).filter((w) => w.length >= 3));
  if (afterColon.length >= 3) words.push(norm(afterColon));
  return [...new Set(words.map(norm))];
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
