export type PackTier = "pug" | "five_stack" | "pro";
export type PackVisibility = "system" | "private" | "team";
export type Side = "T" | "CT";
/** T-side approach lane (map-specific; see `lanesForMap`). CT uses null. */
export type Site = "a" | "b" | "mid" | "default" | "outside" | "ramp" | null;
export type RoundId = "full" | "force" | "eco" | "pistol" | "anti";

export type StratLink = {
  label: string;
  url: string;
};

export type Pack = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tier: PackTier;
  visibility: PackVisibility;
  owner_user_id: string | null;
  team_id: string | null;
  strat_count?: number;
};

/** Serious match packs: only Starter Pack is On by default. Meme / Advanced stay off. */
export function isPackDefaultEnabled(pack: Pick<Pack, "tier" | "slug"> | undefined | null): boolean {
  if (!pack) return false;
  return pack.slug === "starter-pack" || pack.slug === "essentials-pug";
}

export function isMemePack(pack: Pick<Pack, "slug"> | undefined | null): boolean {
  return pack?.slug === "meme-strats";
}

/**
 * Match / Playbook pack pill order: Starter Pack first, Meme last.
 * Includes legacy slugs so a partially migrated catalog never ranks Meme above Starter.
 */
const SYSTEM_PACK_ORDER = [
  "starter-pack",
  "essentials-pug",
  "stack-standard",
  "pro-structure",
  "meme-strats",
] as const;

export function compareSystemPacks(a: Pick<Pack, "slug">, b: Pick<Pack, "slug">): number {
  const ai = SYSTEM_PACK_ORDER.indexOf(a.slug as (typeof SYSTEM_PACK_ORDER)[number]);
  const bi = SYSTEM_PACK_ORDER.indexOf(b.slug as (typeof SYSTEM_PACK_ORDER)[number]);
  return (ai === -1 ? 50 : ai) - (bi === -1 ? 50 : bi);
}

/** Personal packs: "My pool" first, then stable slug order. */
export function comparePersonalPacks(
  a: Pick<Pack, "title" | "slug">,
  b: Pick<Pack, "title" | "slug">
): number {
  if (a.title === "My pool" && b.title !== "My pool") return -1;
  if (b.title === "My pool" && a.title !== "My pool") return 1;
  return a.slug.localeCompare(b.slug);
}

export type Strat = {
  id: string;
  pack_id: string;
  owner_user_id: string | null;
  team_id: string | null;
  map: string;
  side: Side;
  site: Site;
  callout: string;
  description: string;
  tasks: string[];
  rounds: string[];
  status: "ready" | "practice";
  links: StratLink[];
  /** FACEIT-style execution difficulty 1–10 (how hard the call is to run). */
  level: number;
  wins: number;
  losses: number;
  /** Community upvotes (catalog / shared target). */
  upvotes: number;
  /** Community downvotes (catalog / shared target). */
  downvotes: number;
  times_used: number;
  last_used: string | null;
  source?: string | null;
  /**
   * User-authored strats only. false = visible in Community for everyone.
   * System catalog rows ignore this (always treated as shared catalog).
   * Pool copies of catalog/community should stay private (true).
   */
  is_private: boolean;
  /** Community author username (from profiles.display_name). Client-joined. */
  author_display_name?: string | null;
};

/** Per-user vote on a strat: +1 upvote, -1 downvote, 0 none. */
export type StratVoteValue = -1 | 0 | 1;

export type UserSession = {
  tab: "match" | "book" | "settings";
  selected_map: string;
  selected_side: Side;
  site_filter: string;
  round_filter: string;
  include_practice: boolean;
  current_pick_id: string | null;
  logged: "win" | "loss" | null;
  timer_ends_at: number | null;
  called_at: number | null;
};

export type Nade = {
  map: string;
  type: string;
  to: string;
  from: string;
  slug: string;
  url: string;
  team?: string;
  label: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  default_tier_filter: string;
  /** Can edit shared system strats for everyone (Supabase). */
  is_admin?: boolean;
  /** Can grant/revoke admins in Settings. Implies admin. */
  is_super_admin?: boolean;
};

export type AdminProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
};

export const MAPS = ["Dust II", "Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Cache"] as const;

/** Session map filter: all maps (Playbook browse), not a real CS map. */
export const ALL_MAPS = "all";

export function isAllMaps(map: string | null | undefined): boolean {
  return map === ALL_MAPS;
}

/** Advanced (pro) packs stay locked until premium is wired up. */
export const PREMIUM_UNLOCKED = false;

export function isPackLocked(pack: Pick<Pack, "tier"> | undefined | null): boolean {
  if (!pack) return false;
  return pack.tier === "pro" && !PREMIUM_UNLOCKED;
}

/**
 * Match pack toggles (guest + signed-in).
 * Missing subscription key uses pack defaults (Starter On; Meme / Advanced Off).
 */
export function isPackInMatchPool(
  packId: string,
  subscriptions: Record<string, boolean>,
  packs: Pack[]
): boolean {
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return false;
  if (isPackLocked(pack)) return false;
  const sub = subscriptions[packId];
  if (sub === undefined) return isPackDefaultEnabled(pack);
  return sub;
}

export function catalogSourceKey(catalogStratId: string) {
  return `catalog:${catalogStratId}`;
}

export function catalogIdFromSource(source: string | null | undefined): string | null {
  if (!source || !source.startsWith("catalog:")) return null;
  return source.slice("catalog:".length);
}

/** User-authored public call (not a pool copy of catalog/community). */
export function isCommunityStrat(
  s: Pick<Strat, "owner_user_id" | "is_private" | "source"> | null | undefined
): boolean {
  if (!s?.owner_user_id || s.is_private) return false;
  if (catalogIdFromSource(s.source)) return false;
  return true;
}

/** Community meta label: "Community · You" or "Community · ples0". */
export function communityAuthorLabel(
  s: Pick<Strat, "owner_user_id" | "author_display_name">,
  viewerUserId: string | null | undefined
): string {
  if (s.owner_user_id && viewerUserId && s.owner_user_id === viewerUserId) {
    return "Community · You";
  }
  if (s.author_display_name) return `Community · ${s.author_display_name}`;
  return "Community";
}

export const SCHEMA_VERSION = 3;
