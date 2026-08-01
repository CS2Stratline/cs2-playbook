export type PackTier = "pug" | "five_stack" | "pro";
export type PackVisibility = "system" | "private" | "team";
export type Side = "T" | "CT";
export type Site = "a" | "b" | "mid" | "default" | null;
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
  times_used: number;
  last_used: string | null;
  source?: string | null;
};

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
  labelEn: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  default_tier_filter: string;
};

export const MAPS = ["Dust II", "Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Cache"] as const;

export const TIER_LABEL: Record<PackTier, string> = {
  pug: "Fundamentals",
  five_stack: "Stack",
  pro: "Advanced",
};

/** Advanced (pro) packs stay locked until premium is wired up. */
export const PREMIUM_UNLOCKED = false;

export function isPackLocked(pack: Pick<Pack, "tier"> | undefined | null): boolean {
  if (!pack) return false;
  return pack.tier === "pro" && !PREMIUM_UNLOCKED;
}

/** Guest Match pool: pack toggles. Missing subscription key defaults to on (except locked). */
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

export const FREEZE_SECONDS = 15;
export const SCHEMA_VERSION = 3;
