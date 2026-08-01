import systemSeed from "../data/system-packs.json";
import { supabase, supabaseConfigured } from "./supabase";
import type { Pack, Strat, UserSession, Profile, Side } from "./types";
import { MAPS } from "./types";

const LOCAL_KEY = "cs2-playbook-cloud-v1";
const LOCAL_USER = "local-demo-user";

type Store = {
  profile: Profile;
  packs: Pack[];
  strats: Strat[];
  favorites: string[];
  subscriptions: Record<string, boolean>;
  session: UserSession;
};

function defaultSession(): UserSession {
  return {
    tab: "lobby",
    selected_map: MAPS[1],
    selected_side: "T",
    site_filter: "all",
    round_filter: "all",
    include_practice: false,
    current_pick_id: null,
    logged: null,
    timer_ends_at: null,
    called_at: null,
  };
}

function seedStore(): Store {
  const packs = (systemSeed.packs as Pack[]).map((p) => ({ ...p, team_id: p.team_id ?? null }));
  const strats = systemSeed.strats as Strat[];
  const subscriptions: Record<string, boolean> = {};
  for (const p of packs) subscriptions[p.id] = true;
  return {
    profile: { id: LOCAL_USER, display_name: "IGL", default_tier_filter: "all" },
    packs,
    strats,
    favorites: [],
    subscriptions,
    session: defaultSession(),
  };
}

function loadLocal(): Store {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (Array.isArray(parsed.packs) && Array.isArray(parsed.strats)) return parsed;
    }
  } catch {
    /* fall through */
  }
  const seeded = seedStore();
  saveLocal(seeded);
  return seeded;
}

function saveLocal(store: Store) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
}

let memory = typeof window !== "undefined" ? loadLocal() : seedStore();

/** True only when Supabase is configured AND the user is signed in. Guests always use local data. */
let signedInUserId: string | null = null;

export function setCloudSignedInUser(userId: string | null) {
  signedInUserId = userId;
}

export function isCloudMode() {
  return supabaseConfigured && !!supabase && !!signedInUserId;
}

export function isSupabaseConfigured() {
  return supabaseConfigured && !!supabase;
}

export function getLocalUserId() {
  return memory.profile.id;
}

export async function ensureBootstrap(): Promise<void> {
  if (!isCloudMode()) {
    memory = loadLocal();
    return;
  }
  // Cloud: system packs must be seeded via SQL/admin; client loads visible rows.
}

export async function getProfile(userId: string): Promise<Profile> {
  if (!isCloudMode()) return memory.profile;
  const { data } = await supabase!.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (
    data || {
      id: userId,
      display_name: "IGL",
      default_tier_filter: "all",
    }
  );
}

export async function listPacks(): Promise<Pack[]> {
  if (!isCloudMode()) return memory.packs;
  const { data, error } = await supabase!.from("packs").select("*").order("tier");
  if (error) throw error;
  const packs = (data || []) as Pack[];
  const { data: counts } = await supabase!.from("strats").select("pack_id");
  const tally: Record<string, number> = {};
  for (const row of counts || []) tally[(row as { pack_id: string }).pack_id] = (tally[(row as { pack_id: string }).pack_id] || 0) + 1;
  return packs.map((p) => ({ ...p, strat_count: tally[p.id] || 0 }));
}

export async function listStrats(): Promise<Strat[]> {
  if (!isCloudMode()) return memory.strats;
  const { data, error } = await supabase!.from("strats").select("*");
  if (error) throw error;
  return (data || []).map(mapStratRow);
}

function mapStratRow(row: Record<string, unknown>): Strat {
  return {
    id: String(row.id),
    pack_id: String(row.pack_id),
    owner_user_id: (row.owner_user_id as string) || null,
    team_id: (row.team_id as string) || null,
    map: String(row.map),
    side: row.side as Side,
    site: (row.site as Strat["site"]) ?? null,
    callout: String(row.callout || ""),
    description: String(row.description || ""),
    tasks: (row.tasks as string[]) || [],
    rounds: (row.rounds as string[]) || [],
    status: (row.status as Strat["status"]) || "ready",
    links: (row.links as Strat["links"]) || [],
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    times_used: Number(row.times_used || 0),
    last_used: (row.last_used as string) || null,
    source: (row.source as string) || null,
  };
}

export async function getSubscriptions(userId: string): Promise<Record<string, boolean>> {
  if (!isCloudMode()) return { ...memory.subscriptions };
  const { data } = await supabase!.from("user_pack_subscriptions").select("pack_id, enabled").eq("user_id", userId);
  const out: Record<string, boolean> = {};
  for (const row of data || []) out[(row as { pack_id: string; enabled: boolean }).pack_id] = (row as { enabled: boolean }).enabled;
  return out;
}

export async function setPackEnabled(userId: string, packId: string, enabled: boolean) {
  if (!isCloudMode()) {
    memory.subscriptions[packId] = enabled;
    saveLocal(memory);
    return;
  }
  await supabase!.from("user_pack_subscriptions").upsert({ user_id: userId, pack_id: packId, enabled });
}

export async function getFavorites(userId: string): Promise<string[]> {
  if (!isCloudMode()) return [...memory.favorites];
  const { data } = await supabase!.from("user_favorites").select("strat_id").eq("user_id", userId);
  return (data || []).map((r) => (r as { strat_id: string }).strat_id);
}

export async function toggleFavorite(userId: string, stratId: string) {
  if (!isCloudMode()) {
    const i = memory.favorites.indexOf(stratId);
    if (i >= 0) memory.favorites.splice(i, 1);
    else memory.favorites.push(stratId);
    saveLocal(memory);
    return;
  }
  const { data } = await supabase!.from("user_favorites").select("strat_id").eq("user_id", userId).eq("strat_id", stratId).maybeSingle();
  if (data) await supabase!.from("user_favorites").delete().eq("user_id", userId).eq("strat_id", stratId);
  else await supabase!.from("user_favorites").insert({ user_id: userId, strat_id: stratId });
}

export async function getSession(userId: string): Promise<UserSession> {
  if (!isCloudMode()) return { ...memory.session };
  const { data } = await supabase!.from("user_sessions").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return defaultSession();
  const row = data as Record<string, unknown>;
  return {
    tab: (row.tab as UserSession["tab"]) || "match",
    selected_map: String(row.selected_map || MAPS[1]),
    selected_side: (row.selected_side as Side) || "T",
    site_filter: String(row.site_filter || "all"),
    round_filter: String(row.round_filter || "all"),
    include_practice: Boolean(row.include_practice),
    current_pick_id: (row.current_pick_id as string) || null,
    logged: (row.logged as UserSession["logged"]) || null,
    timer_ends_at: row.timer_ends_at ? Date.parse(String(row.timer_ends_at)) : null,
    called_at: row.called_at ? Date.parse(String(row.called_at)) : null,
  };
}

export async function saveSession(userId: string, session: UserSession) {
  if (!isCloudMode()) {
    memory.session = session;
    saveLocal(memory);
    return;
  }
  await supabase!.from("user_sessions").upsert({
    user_id: userId,
    tab: session.tab,
    selected_map: session.selected_map,
    selected_side: session.selected_side,
    site_filter: session.site_filter,
    round_filter: session.round_filter,
    include_practice: session.include_practice,
    current_pick_id: session.current_pick_id,
    logged: session.logged,
    timer_ends_at: session.timer_ends_at ? new Date(session.timer_ends_at).toISOString() : null,
    called_at: session.called_at ? new Date(session.called_at).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

export async function bumpStratUsage(stratId: string) {
  const now = new Date().toISOString();
  if (!isCloudMode()) {
    memory.strats = memory.strats.map((s) =>
      s.id === stratId ? { ...s, times_used: s.times_used + 1, last_used: now } : s
    );
    saveLocal(memory);
    return;
  }
  const { data } = await supabase!.from("strats").select("times_used").eq("id", stratId).single();
  const times = Number((data as { times_used?: number })?.times_used || 0) + 1;
  await supabase!.from("strats").update({ times_used: times, last_used: now }).eq("id", stratId);
}

export async function logStratResult(stratId: string, result: "win" | "loss") {
  if (!isCloudMode()) {
    memory.strats = memory.strats.map((s) =>
      s.id === stratId
        ? {
            ...s,
            wins: s.wins + (result === "win" ? 1 : 0),
            losses: s.losses + (result === "loss" ? 1 : 0),
          }
        : s
    );
    saveLocal(memory);
    return;
  }
  const { data } = await supabase!.from("strats").select("wins, losses").eq("id", stratId).single();
  const row = data as { wins: number; losses: number };
  await supabase!
    .from("strats")
    .update({
      wins: row.wins + (result === "win" ? 1 : 0),
      losses: row.losses + (result === "loss" ? 1 : 0),
    })
    .eq("id", stratId);
}

export async function upsertPrivateStrat(userId: string, packId: string, strat: Partial<Strat> & { id?: string }) {
  if (!isCloudMode()) {
    if (strat.id) {
      memory.strats = memory.strats.map((s) => (s.id === strat.id ? { ...s, ...strat } as Strat : s));
    } else {
      const id = crypto.randomUUID();
      memory.strats.push({
        id,
        pack_id: packId,
        owner_user_id: userId,
        team_id: null,
        map: strat.map || "Mirage",
        side: strat.side || "T",
        site: strat.site ?? "default",
        callout: strat.callout || "",
        description: strat.description || "",
        tasks: strat.tasks || [],
        rounds: strat.rounds || [],
        status: strat.status || "ready",
        links: strat.links || [],
        wins: 0,
        losses: 0,
        times_used: 0,
        last_used: null,
        source: "user",
      });
    }
    saveLocal(memory);
    return;
  }
  const payload = {
    pack_id: packId,
    owner_user_id: userId,
    map: strat.map,
    side: strat.side,
    site: strat.site,
    callout: strat.callout,
    description: strat.description,
    tasks: strat.tasks,
    rounds: strat.rounds,
    status: strat.status || "ready",
    links: strat.links || [],
    source: "user",
  };
  if (strat.id) await supabase!.from("strats").update(payload).eq("id", strat.id).eq("owner_user_id", userId);
  else await supabase!.from("strats").insert(payload);
}

export async function createPrivatePack(userId: string, input: { title: string; description: string; tier: Pack["tier"] }) {
  const slug = `user-${userId.slice(0, 8)}-${Date.now()}`;
  if (!isCloudMode()) {
    const id = crypto.randomUUID();
    memory.packs.push({
      id,
      slug,
      title: input.title,
      description: input.description,
      tier: input.tier,
      visibility: "private",
      owner_user_id: userId,
      team_id: null,
      strat_count: 0,
    });
    memory.subscriptions[id] = true;
    saveLocal(memory);
    return id;
  }
  const { data, error } = await supabase!
    .from("packs")
    .insert({
      slug,
      title: input.title,
      description: input.description,
      tier: input.tier,
      visibility: "private",
      owner_user_id: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  await supabase!.from("user_pack_subscriptions").upsert({ user_id: userId, pack_id: data.id, enabled: true });
  return data.id as string;
}

export async function deleteStrat(userId: string, stratId: string) {
  if (!isCloudMode()) {
    memory.strats = memory.strats.filter((s) => !(s.id === stratId && s.owner_user_id === userId));
    memory.favorites = memory.favorites.filter((id) => id !== stratId);
    saveLocal(memory);
    return;
  }
  await supabase!.from("strats").delete().eq("id", stratId).eq("owner_user_id", userId);
}

export function resetLocalDemo() {
  memory = seedStore();
  saveLocal(memory);
}

export function exportBookJson() {
  return {
    version: 3,
    maps: [...MAPS],
    packs: memory.packs,
    strats: memory.strats,
  };
}
