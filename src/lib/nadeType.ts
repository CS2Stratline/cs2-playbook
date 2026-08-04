export type NadeKind = "smoke" | "flashbang" | "molotov" | "hegrenade" | "combination";

/** Infer utility type from a CSNADES URL path and/or chip label. */
export function nadeTypeFromLink(link: { label?: string; url?: string }): NadeKind | null {
  const url = (link.url || "").toLowerCase();
  const label = ` ${ (link.label || "").toLowerCase() } `;

  if (url.includes("/combinations/") || label.includes(" combo") || label.includes("execute")) {
    return "combination";
  }
  if (url.includes("/smokes/") || label.includes("smoke")) return "smoke";
  if (url.includes("/flashbangs/") || label.includes("flash")) return "flashbang";
  if (url.includes("/molotovs/") || label.includes("molly") || label.includes("molotov") || label.includes("incendiary")) {
    return "molotov";
  }
  if (url.includes("/hegrenades/") || label.includes("he ") || label.includes("grenade")) return "hegrenade";
  return null;
}

export function nadeChipClass(type: NadeKind | null): string {
  if (!type) return "";
  return `nade-${type === "hegrenade" ? "he" : type === "flashbang" ? "flash" : type === "combination" ? "combo" : type}`;
}

/** Shared util vocabulary for task pills and lineup matching. */
export const NADE_TYPE_WORDS: { kind: Exclude<NadeKind, "combination">; label: string; words: string[] }[] = [
  { kind: "smoke", label: "Smoke", words: ["smoke", "smokes"] },
  { kind: "flashbang", label: "Flash", words: ["flash", "flashbang", "popflash", "pop-flash"] },
  { kind: "molotov", label: "Molly", words: ["molly", "molotov", "incendiary"] },
  { kind: "hegrenade", label: "HE", words: ["hegrenade", "grenade", " he "] },
];

/** First utility type mentioned in a task line (for freeze-time scan pills). */
export function utilTagFromTask(task: string): { kind: NadeKind; label: string } | null {
  const n = ` ${String(task || "").toLowerCase()} `;
  for (const row of NADE_TYPE_WORDS) {
    if (row.words.some((w) => n.includes(w))) return { kind: row.kind, label: row.label };
  }
  return null;
}
