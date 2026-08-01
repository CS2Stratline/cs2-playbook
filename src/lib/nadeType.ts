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
