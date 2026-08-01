/** Public icon URL under `/icons/{name}.svg` (respects Vite base path). */
export function iconUrl(name: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}icons/${name}.svg`;
}
