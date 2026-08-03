function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${path.replace(/^\//, "")}`;
}

/** Public icon URL under `/icons/{name}.svg` (respects Vite base path). */
export function iconUrl(name: string): string {
  return publicAssetUrl(`icons/${name}.svg`);
}

/** Bare Stratline list→play mark (no squircle). */
export function stratlineMarkUrl(): string {
  return publicAssetUrl("stratline-mark.svg");
}
