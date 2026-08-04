/** Lowercase + strip diacritics for fuzzy matching (tasks, lineups, search). */
export function normalizeSearchText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
