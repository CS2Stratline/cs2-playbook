/** App map name → CS2 workshop / icon slug. */
export const MAP_SLUG: Record<string, string> = {
  "Dust II": "de_dust2",
  Mirage: "de_mirage",
  Inferno: "de_inferno",
  Nuke: "de_nuke",
  Ancient: "de_ancient",
  Anubis: "de_anubis",
  Cache: "de_cache",
};

export function mapIconUrl(map: string): string | null {
  const slug = MAP_SLUG[map];
  if (!slug) return null;
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}maps/${slug}.png`;
}
