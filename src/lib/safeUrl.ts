/** Only allow http(s) lineup / external links. */
export function safeHttpUrl(url: string | null | undefined): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
