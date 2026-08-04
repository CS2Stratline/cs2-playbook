import type { User } from "@supabase/supabase-js";

const MIN_LEN = 2;
const MAX_LEN = 24;

/** Trim + collapse whitespace; strip control chars. */
export function normalizeDisplayName(raw: string): string {
  return String(raw || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEN);
}

/** Returns an error message, or null when valid. */
export function validateDisplayName(raw: string): string | null {
  const name = normalizeDisplayName(raw);
  if (name.length < MIN_LEN) return `Username must be at least ${MIN_LEN} characters.`;
  if (name.length > MAX_LEN) return `Username must be at most ${MAX_LEN} characters.`;
  // Letters, numbers, spaces, and common handle punctuation.
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) {
    return "Use letters, numbers, spaces, or . _ ' -";
  }
  return null;
}

/**
 * Best-effort label from Discord / email auth metadata.
 * Prefer Discord username / global name over email local-part.
 */
export function suggestedDisplayNameFromUser(user: User | null | undefined): string | null {
  if (!user || user.is_anonymous) return null;
  const meta = user.user_metadata || {};
  const claims =
    meta.custom_claims && typeof meta.custom_claims === "object"
      ? (meta.custom_claims as Record<string, unknown>)
      : {};

  const candidates = [
    meta.preferred_username,
    meta.name,
    meta.full_name,
    claims.global_name,
    claims.username,
    meta.user_name,
    user.email ? String(user.email).split("@")[0] : null,
  ];

  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const name = normalizeDisplayName(c);
    if (!validateDisplayName(name)) return name;
  }
  return null;
}
