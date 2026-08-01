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
  wins: number;
  losses: number;
  times_used: number;
  last_used: string | null;
  source?: string | null;
};

export type UserSession = {
  tab: "match" | "book" | "lobby" | "settings";
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
  pug: "PUG",
  five_stack: "5-stack",
  pro: "Pro",
};

export const FREEZE_SECONDS = 15;
export const SCHEMA_VERSION = 3;
