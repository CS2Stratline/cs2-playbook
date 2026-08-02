import type { StratLink } from "./types";
import { safeHttpUrl } from "./safeUrl";

/** Serialize pinned lineups for the edit textarea. */
export function linksToText(links: StratLink[]): string {
  return (links || [])
    .map((l) => {
      const label = String(l.label || "").trim();
      const url = String(l.url || "").trim();
      if (!url) return "";
      return label ? `${label} | ${url}` : url;
    })
    .filter(Boolean)
    .join("\n");
}

function labelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(last).replace(/[-_]+/g, " ").slice(0, 80);
  } catch {
    return "Lineup";
  }
}

/**
 * Parse lineup lines from the edit field.
 * Formats: `Label | https://…`, `Label — https://…`, or bare `https://…`.
 */
export function textToLinks(text: string): StratLink[] {
  const out: StratLink[] = [];
  const seen = new Set<string>();
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let label = "";
    let urlRaw = line;
    const pipe = line.indexOf("|");
    const em = line.indexOf(" — ");
    const sep = pipe >= 0 ? pipe : em >= 0 ? em : -1;
    const sepLen = pipe >= 0 ? 1 : em >= 0 ? 3 : 0;
    if (sep >= 0) {
      label = line.slice(0, sep).trim();
      urlRaw = line.slice(sep + sepLen).trim();
    }
    const url = safeHttpUrl(urlRaw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ label: (label || labelFromUrl(url)).slice(0, 80), url });
    if (out.length >= 8) break;
  }
  return out;
}
