export type PackTier = "pug" | "five_stack" | "pro";
export type PackVisibility = "system" | "private" | "team";
export type Side = "T" | "CT";
/** T-side approach lane (map-specific — see `lanesForMap`). CT uses null. */
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

/** Serious match packs start on; Advanced (locked) + Meme stay off until toggled. */
export function isPackDefaultEnabled(pack: Pick<Pack, "tier" | "slug"> | undefined | null): boolean {
  if (!pack) return false;
  if (pack.tier === "pro") return false;
  if (pack.slug === "meme-strats") return false;
  return true;
}

export function isMemePack(pack: Pick<Pack, "slug"> | undefined | null): boolean {
  return pack?.slug === "meme-strats";
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

/** Match pack toggles (guest + signed-in). Missing subscription key defaults to on (except locked). */
export function isPackInMatchPool(
  packId: string,
  subscriptions: Record<string, boolean>,
  packs: Pack[]
): boolean {
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return false;
  if (isPackLocked(pack)) return false;
  return subscriptions[packId] !== false;
}

export function catalogSourceKey(catalogStratId: string) {
  return `catalog:${catalogStratId}`;
}

export function catalogIdFromSource(source: string | null | undefined): string | null {
  if (!source || !source.startsWith("catalog:")) return null;
  return source.slice("catalog:".length);
}

export const SCHEMA_VERSION = 3;
