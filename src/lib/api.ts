import systemSeed from "../data/system-packs.json";
import { supabase, supabaseConfigured } from "./supabase";
import type { AdminProfile, Pack, Strat, StratVoteValue, UserSession, Profile, Side, StratLink } from "./types";
import { MAPS, SCHEMA_VERSION, catalogIdFromSource, catalogSourceKey, compareSystemPacks, isPackLocked, isPackDefaultEnabled } from "./types";
import { clampFaceitLevel, estimateStratLevel } from "./faceitLevels";
import { safeHttpUrl } from "./safeUrl";

function sanitizeLinks(links: StratLink[] | undefined | null): StratLink[] {
  return (links || [])
    .map((l) => {
      const url = safeHttpUrl(l.url);
      if (!url) return null;
      return { label: String(l.label || "").trim().slice(0, 80), url };
    })
    .filter((l): l is StratLink => !!l)
    .slice(0, 8);
}

const LOCAL_KEY = "cs2-playbook-cloud-v2";
const LOCAL_USER = "local-demo-user";
/** Bump when `system-packs.json` content changes so guests pick up fixes. */
const SEED_REVISION = 12;

/** Shared catalog row id to edit, or null if this is a private-only strat. */
export function sharedStratTargetId(strat: Pick<Strat, "id" | "owner_user_id" | "source">): string | null {
  const fromCopy = catalogIdFromSource(strat.source);
  if (fromCopy) return fromCopy;
  if (!strat.owner_user_id) return strat.id;
  return null;
}

export function canEditSharedStrats(opts: {
  profile?: Pick<Profile, "is_admin" | "is_super_admin"> | null;
}): boolean {
  // Local demo (no Supabase): edit shared strats on this device.
  if (!supabaseConfigured) return true;
  return Boolean(opts.profile?.is_admin || opts.profile?.is_super_admin);
}

export function canManageAdmins(opts: {
  profile?: Pick<Profile, "is_super_admin"> | null;
}): boolean {
  if (!supabaseConfigured) return true;
  return Boolean(opts.profile?.is_super_admin);
}

type Store = {
  profile: Profile;
  packs: Pack[];
  strats: Strat[];
  favorites: string[];
  subscriptions: Record<string, boolean>;
  session: UserSession;
  seedRevision?: number;
};

function defaultSession(): UserSession {
  return {
    tab: "match",
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
  const strats = (systemSeed.strats as Strat[]).map((s) => ({
    ...s,
    level: s.level || estimateStratLevel({ ...s, tier: packs.find((p) => p.id === s.pack_id)?.tier }),
    upvotes: Number(s.upvotes || 0),
    downvotes: Number(s.downvotes || 0),
  }));
  const subscriptions: Record<string, boolean> = {};
  for (const p of packs) subscriptions[p.id] = isPackDefaultEnabled(p);
  return {
    profile: {
      id: LOCAL_USER,
      display_name: "IGL",
      default_tier_filter: "all",
      is_admin: true,
      is_super_admin: true,
    },
    packs,
    strats,
    favorites: [],
    subscriptions,
    session: defaultSession(),
    seedRevision: SEED_REVISION,
  };
}

/** Replace system packs/strats from the bundled seed; keep favorites, session, custom strats + private packs. */
function refreshSystemSeed(store: Store): Store {
  const fresh = seedStore();
  const customStrats = store.strats.filter((s) => s.source !== "system-seed");
  const privatePacks = (store.packs || []).filter((p) => p.visibility === "private");
  const subscriptions = { ...fresh.subscriptions, ...store.subscriptions };
  for (const p of fresh.packs) {
    if (subscriptions[p.id] === undefined) subscriptions[p.id] = isPackDefaultEnabled(p);
  }
  for (const p of privatePacks) {
    if (subscriptions[p.id] === undefined) subscriptions[p.id] = true;
  }
  return {
    ...store,
    packs: [...fresh.packs, ...privatePacks],
    strats: [...fresh.strats, ...customStrats],
    subscriptions,
    seedRevision: SEED_REVISION,
  };
}

function loadLocal(): Store {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (Array.isArray(parsed.packs) && Array.isArray(parsed.strats) && parsed.packs.length > 0) {
        const store =
          parsed.seedRevision === SEED_REVISION ? parsed : refreshSystemSeed(parsed);
        const hadLegacyVotes = Object.prototype.hasOwnProperty.call(parsed, "votes");
        store.strats = store.strats.map((s) => ({
          ...s,
          level:
            s.level ||
            estimateStratLevel({ ...s, tier: store.packs.find((p) => p.id === s.pack_id)?.tier }),
          upvotes: Number(s.upvotes || 0),
          downvotes: Number(s.downvotes || 0),
        }));
        // Drop legacy local vote map from early vote prototypes (never read anymore).
        if ("votes" in store) delete (store as { votes?: unknown }).votes;
        if (store.seedRevision !== parsed.seedRevision || hadLegacyVotes) saveLocal(store);
        return store;
      }
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

/** Session user id when Supabase is configured (anonymous or permanent). */
let signedInUserId: string | null = null;

export function setCloudSignedInUser(userId: string | null) {
  signedInUserId = userId;
}

/** True when Supabase is configured AND a session exists (anonymous browser id or Discord/email). */
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
  // Local mode already holds live memory; only seed when empty (SSR / fresh tab).
  if (!isCloudMode()) {
    if (!memory?.packs?.length) memory = loadLocal();
    return;
  }
  // Cloud: system packs must be seeded via SQL/admin; client loads visible rows.
}

export async function getProfile(userId: string): Promise<Profile> {
  if (!isCloudMode()) return memory.profile;
  const { data } = await supabase!.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!data) {
    return {
      id: userId,
      display_name: "IGL",
      default_tier_filter: "all",
      is_admin: false,
      is_super_admin: false,
    };
  }
  const superAdmin = Boolean(data.is_super_admin);
  return {
    id: String(data.id),
    display_name: (data.display_name as string) || null,
    default_tier_filter: String(data.default_tier_filter || "all"),
    is_admin: Boolean(data.is_admin) || superAdmin,
    is_super_admin: superAdmin,
  };
}

function mapAdminRow(row: Record<string, unknown>): AdminProfile {
  return {
    id: String(row.id),
    display_name: (row.display_name as string) || null,
    email: (row.email as string) || null,
    is_admin: Boolean(row.is_admin),
    is_super_admin: Boolean(row.is_super_admin),
  };
}

/** Super admin: list everyone with admin or super_admin. */
export async function listAdminProfiles(): Promise<AdminProfile[]> {
  if (!isCloudMode()) {
    return [
      {
        id: memory.profile.id,
        display_name: memory.profile.display_name,
        email: "local@demo",
        is_admin: true,
        is_super_admin: true,
      },
    ];
  }
  const { data, error } = await supabase!.rpc("list_admin_profiles");
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => mapAdminRow(row));
}

/** Super admin: grant/revoke regular admin by email (user must have signed in once). */
export async function setAdminByEmail(email: string, isAdmin: boolean): Promise<AdminProfile> {
  if (!isCloudMode()) {
    throw new Error("Admin management requires cloud sign-in");
  }
  const { data, error } = await supabase!.rpc("set_admin_by_email", {
    p_email: email.trim(),
    p_is_admin: isAdmin,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("No result from set_admin_by_email");
  return mapAdminRow(row as Record<string, unknown>);
}

export async function listPacks(): Promise<Pack[]> {
  const sortPacks = (packs: Pack[]) =>
    [...packs].sort((a, b) => {
      if (a.visibility === "system" && b.visibility === "system") return compareSystemPacks(a, b);
      if (a.visibility === "system") return -1;
      if (b.visibility === "system") return 1;
      return a.slug.localeCompare(b.slug);
    });

  if (!isCloudMode()) return sortPacks(memory.packs);

  const { data, error } = await supabase!.from("packs").select("*").order("tier");
  if (error) throw error;
  const packs = (data || []) as Pack[];
  const { data: counts } = await supabase!.from("strats").select("pack_id");
  const tally: Record<string, number> = {};
  for (const row of counts || []) tally[(row as { pack_id: string }).pack_id] = (tally[(row as { pack_id: string }).pack_id] || 0) + 1;
  return sortPacks(packs.map((p) => ({ ...p, strat_count: tally[p.id] || 0 })));
}

export async function listStrats(): Promise<Strat[]> {
  if (!isCloudMode()) return memory.strats;
  const { data, error } = await supabase!.from("strats").select("*");
  if (error) throw error;
  return (data || []).map(mapStratRow);
}

function mapStratRow(row: Record<string, unknown>): Strat {
  const levelRaw = row.level;
  const level =
    levelRaw == null || levelRaw === ""
      ? estimateStratLevel({
          callout: String(row.callout || ""),
          description: String(row.description || ""),
          tasks: (row.tasks as string[]) || [],
          links: (row.links as Strat["links"]) || [],
          rounds: (row.rounds as string[]) || [],
          side: String(row.side || ""),
        })
      : clampFaceitLevel(Number(levelRaw));
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
    level,
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    upvotes: Number(row.upvotes || 0),
    downvotes: Number(row.downvotes || 0),
    times_used: Number(row.times_used || 0),
    last_used: (row.last_used as string) || null,
    source: (row.source as string) || null,
  };
}

/** Vote against the shared catalog row when present so pool copies share one score. */
export function voteTargetId(strat: Pick<Strat, "id" | "owner_user_id" | "source">): string {
  return sharedStratTargetId(strat) ?? strat.id;
}

export type StratVoteResult = {
  upvotes: number;
  downvotes: number;
  myVote: StratVoteValue;
};

/** Community votes are cloud-only (anonymous browser session or Discord/email). */
export async function getMyVotes(userId: string): Promise<Record<string, StratVoteValue>> {
  if (!isCloudMode()) return {};
  const { data, error } = await supabase!
    .from("user_strat_votes")
    .select("strat_id, value")
    .eq("user_id", userId);
  // Migration may not be applied yet — don't break the whole playbook load.
  if (error) return {};
  const out: Record<string, StratVoteValue> = {};
  for (const row of data || []) {
    const r = row as { strat_id: string; value: number };
    if (r.value === 1 || r.value === -1) out[r.strat_id] = r.value;
  }
  return out;
}

/**
 * Set or toggle a vote (cloud session required — anonymous or Discord/email).
 * Pass 1 (up) or -1 (down). Same value again clears. Pass 0 to clear explicitly.
 */
export async function setStratVote(stratId: string, value: StratVoteValue): Promise<StratVoteResult> {
  if (!isCloudMode()) {
    throw new Error("Voting requires a cloud session");
  }

  const { data, error } = await supabase!.rpc("set_strat_vote", {
    p_strat_id: stratId,
    p_value: value,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { upvotes: number; downvotes: number; my_vote: number }
    | undefined;
  if (!row) throw new Error("No result from set_strat_vote");
  const myVote: StratVoteValue = row.my_vote === 1 || row.my_vote === -1 ? row.my_vote : 0;
  return {
    upvotes: Number(row.upvotes || 0),
    downvotes: Number(row.downvotes || 0),
    myVote,
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

/** Explicitly set favorite on/off (used when starring also copies into My pool). */
export async function setFavorite(userId: string, stratId: string, on: boolean) {
  if (!isCloudMode()) {
    const i = memory.favorites.indexOf(stratId);
    if (on && i < 0) memory.favorites.push(stratId);
    if (!on && i >= 0) memory.favorites.splice(i, 1);
    saveLocal(memory);
    return;
  }
  if (on) {
    await supabase!.from("user_favorites").upsert({ user_id: userId, strat_id: stratId });
  } else {
    await supabase!.from("user_favorites").delete().eq("user_id", userId).eq("strat_id", stratId);
  }
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
    tab: row.tab === "book" || row.tab === "settings" ? row.tab : "match",
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
  const { error } = await supabase!.rpc("bump_strat_usage", { p_strat_id: stratId });
  if (error) throw error;
}

export type SharedStratPatch = {
  callout: string;
  description: string;
  tasks: string[];
  rounds: string[];
  site: Strat["site"];
  status: Strat["status"];
  links: Strat["links"];
  level?: number;
  map?: string;
  side?: Side;
};

/** Update a system strat for everyone. Syncs personal pool copies (`catalog:<id>`). */
export async function upsertSharedStrat(systemStratId: string, patch: SharedStratPatch) {
  const links = sanitizeLinks(patch.links);
  const tasks = (patch.tasks || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  const callout = String(patch.callout || "").trim().slice(0, 60);
  const description = String(patch.description || "").trim().slice(0, 280);
  const level =
    patch.level ??
    estimateStratLevel({
      callout,
      description,
      tasks,
      links,
      rounds: patch.rounds,
      side: patch.side,
    });

  if (!isCloudMode()) {
    const apply = (s: Strat): Strat => {
      const isTarget = s.id === systemStratId || catalogIdFromSource(s.source) === systemStratId;
      if (!isTarget) return s;
      return {
        ...s,
        callout,
        description,
        tasks,
        rounds: patch.rounds,
        site: patch.site,
        status: patch.status,
        links,
        level,
        ...(patch.map ? { map: patch.map } : {}),
        ...(patch.side ? { side: patch.side } : {}),
      };
    };
    memory.strats = memory.strats.map(apply);
    saveLocal(memory);
    return;
  }

  const { error } = await supabase!.rpc("admin_update_shared_strat", {
    p_id: systemStratId,
    p_callout: callout,
    p_description: description,
    p_tasks: tasks,
    p_rounds: patch.rounds,
    p_site: patch.site,
    p_status: patch.status,
    p_links: links,
    p_level: level,
    p_map: patch.map ?? null,
    p_side: patch.side ?? null,
  });
  if (error) throw error;
}

export async function upsertPrivateStrat(userId: string, packId: string, strat: Partial<Strat> & { id?: string }) {
  const links = sanitizeLinks(strat.links);
  const tasks = (strat.tasks || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  const callout = String(strat.callout || "").trim().slice(0, 60);
  const description = String(strat.description || "").trim().slice(0, 280);
  const cleaned = { ...strat, links, tasks, callout, description };

  if (!isCloudMode()) {
    if (cleaned.id) {
      memory.strats = memory.strats.map((s) =>
        s.id === cleaned.id ? ({ ...s, ...cleaned, pack_id: packId } as Strat) : s
      );
    } else {
      const id = crypto.randomUUID();
      const level =
        cleaned.level ??
        estimateStratLevel({
          callout,
          description,
          tasks,
          links,
          rounds: cleaned.rounds,
          side: cleaned.side,
        });
      memory.strats.push({
        id,
        pack_id: packId,
        owner_user_id: userId,
        team_id: null,
        map: cleaned.map || "Mirage",
        side: cleaned.side || "T",
        site: cleaned.site ?? "default",
        callout,
        description,
        tasks,
        rounds: cleaned.rounds || [],
        status: cleaned.status || "ready",
        links,
        level,
        wins: 0,
        losses: 0,
        upvotes: 0,
        downvotes: 0,
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
    map: cleaned.map,
    side: cleaned.side,
    site: cleaned.site,
    callout,
    description,
    tasks,
    rounds: cleaned.rounds,
    status: cleaned.status || "ready",
    links,
    level:
      cleaned.level ??
      estimateStratLevel({
        callout,
        description,
        tasks,
        links,
        rounds: cleaned.rounds,
        side: cleaned.side,
      }),
    source: "user",
  };
  if (cleaned.id) await supabase!.from("strats").update(payload).eq("id", cleaned.id).eq("owner_user_id", userId);
  else await supabase!.from("strats").insert(payload);
}

export async function createPrivatePack(userId: string, input: { title: string; description: string; tier: Pack["tier"] }) {
  const title = String(input.title || "").trim().slice(0, 40);
  if (!title) throw new Error("Pack needs a name");
  const existing = (await listPacks()).filter((p) => p.visibility === "private" && p.owner_user_id === userId);
  if (existing.length >= MAX_PRIVATE_PACKS) {
    throw new Error(`Max ${MAX_PRIVATE_PACKS} personal packs`);
  }
  const slug = `user-${userId.slice(0, 8)}-${Date.now()}`;
  if (!isCloudMode()) {
    const id = crypto.randomUUID();
    memory.packs.push({
      id,
      slug,
      title,
      description: String(input.description || "").trim().slice(0, 120),
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
      title,
      description: String(input.description || "").trim().slice(0, 120),
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

/** Soft cap — Match toggles stay scannable. */
export const MAX_PRIVATE_PACKS = 8;

/** Private packs owned by this user, oldest first (stable default = first). */
export async function listUserPrivatePacks(userId: string): Promise<Pack[]> {
  const packs = await listPacks();
  return packs
    .filter((p) => p.visibility === "private" && p.owner_user_id === userId)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Default personal pack for catalog stars / fundamentals seed / New strat fallback. */
export function defaultPrivatePackId(packs: Pack[], userId: string): string | null {
  const mine = packs
    .filter((p) => p.visibility === "private" && p.owner_user_id === userId)
    .sort((a, b) => {
      // Prefer the original "My pool" label, then stable slug order.
      if (a.title === "My pool" && b.title !== "My pool") return -1;
      if (b.title === "My pool" && a.title !== "My pool") return 1;
      return a.slug.localeCompare(b.slug);
    });
  return mine[0]?.id || null;
}

/** Ensure at least one private pack exists (bootstrap "My pool"). */
export async function ensureUserPrivatePack(userId: string): Promise<string> {
  const existing = await listUserPrivatePacks(userId);
  if (existing.length) {
    const preferred = existing.find((p) => p.title === "My pool") || existing[0];
    return preferred.id;
  }
  return createPrivatePack(userId, {
    title: "My pool",
    description: "Strats you shopped or created",
    tier: "five_stack",
  });
}

export async function renamePrivatePack(
  userId: string,
  packId: string,
  input: { title: string; description?: string }
): Promise<void> {
  const title = String(input.title || "").trim().slice(0, 40);
  if (!title) throw new Error("Pack needs a name");
  const packs = await listPacks();
  const pack = packs.find((p) => p.id === packId);
  if (!pack || pack.visibility !== "private" || pack.owner_user_id !== userId) {
    throw new Error("Pack not found");
  }
  const description =
    input.description !== undefined
      ? String(input.description || "").trim().slice(0, 120)
      : pack.description;
  if (!isCloudMode()) {
    memory.packs = memory.packs.map((p) => (p.id === packId ? { ...p, title, description } : p));
    saveLocal(memory);
    return;
  }
  const { error } = await supabase!
    .from("packs")
    .update({ title, description })
    .eq("id", packId)
    .eq("owner_user_id", userId)
    .eq("visibility", "private");
  if (error) throw error;
}

/** Deletes a personal pack and its strats (FK cascade). Refuses to delete the last one. */
export async function deletePrivatePack(userId: string, packId: string): Promise<void> {
  const mine = await listUserPrivatePacks(userId);
  if (mine.length <= 1) throw new Error("Keep at least one personal pack");
  const pack = mine.find((p) => p.id === packId);
  if (!pack) throw new Error("Pack not found");
  if (!isCloudMode()) {
    memory.strats = memory.strats.filter((s) => s.pack_id !== packId);
    memory.packs = memory.packs.filter((p) => p.id !== packId);
    delete memory.subscriptions[packId];
    memory.favorites = memory.favorites.filter((id) => memory.strats.some((s) => s.id === id));
    saveLocal(memory);
    return;
  }
  const { error } = await supabase!
    .from("packs")
    .delete()
    .eq("id", packId)
    .eq("owner_user_id", userId)
    .eq("visibility", "private");
  if (error) throw error;
}

export function findPoolCopy(poolStrats: Strat[], catalogStratId: string, packId?: string): Strat | undefined {
  const key = catalogSourceKey(catalogStratId);
  return poolStrats.find((s) => s.source === key && (!packId || s.pack_id === packId));
}

/** Copy a catalog strat into a personal pack (idempotent per pack). */
export async function addCatalogStratToPool(
  userId: string,
  catalog: Strat,
  packs: Pack[],
  targetPackId?: string
): Promise<string> {
  const packMeta = packs.find((p) => p.id === catalog.pack_id);
  if (isPackLocked(packMeta)) throw new Error("This level is locked.");
  const packId = targetPackId || defaultPrivatePackId(packs, userId) || (await ensureUserPrivatePack(userId));
  const target = packs.find((p) => p.id === packId);
  if (!target || target.visibility !== "private" || target.owner_user_id !== userId) {
    throw new Error("Pick one of your packs");
  }
  const all = await listStrats();
  const mine = all.filter((s) => s.owner_user_id === userId);
  const existing = findPoolCopy(mine, catalog.id, packId);
  if (existing) return existing.id;

  const source = catalogSourceKey(catalog.id);
  if (!isCloudMode()) {
    const id = crypto.randomUUID();
    memory.strats.push({
      id,
      pack_id: packId,
      owner_user_id: userId,
      team_id: null,
      map: catalog.map,
      side: catalog.side,
      site: catalog.site,
      callout: catalog.callout,
      description: catalog.description,
      tasks: [...catalog.tasks],
      rounds: [...catalog.rounds],
      status: catalog.status,
      links: catalog.links.map((l) => ({ ...l })),
      level: catalog.level || estimateStratLevel(catalog),
      wins: 0,
      losses: 0,
      upvotes: 0,
      downvotes: 0,
      times_used: 0,
      last_used: null,
      source,
    });
    saveLocal(memory);
    return id;
  }

  const { data, error } = await supabase!
    .from("strats")
    .insert({
      pack_id: packId,
      owner_user_id: userId,
      map: catalog.map,
      side: catalog.side,
      site: catalog.site,
      callout: catalog.callout,
      description: catalog.description,
      tasks: catalog.tasks,
      rounds: catalog.rounds,
      status: catalog.status,
      links: catalog.links,
      level: catalog.level || estimateStratLevel(catalog),
      source,
    })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

/** Add all Starter Pack catalog strats for a map into the default personal pack. */
export async function addStarterPackForMap(userId: string, map: string, packs: Pack[]): Promise<number> {
  const all = await listStrats();
  const packId = defaultPrivatePackId(packs, userId) || (await ensureUserPrivatePack(userId));
  const mine = all.filter((s) => s.owner_user_id === userId);
  const starter = all.filter((s) => {
    const pack = packs.find((p) => p.id === s.pack_id);
    return (
      pack?.visibility === "system" &&
      (pack.slug === "starter-pack" || pack.slug === "essentials-pug") &&
      s.map === map &&
      !s.owner_user_id
    );
  });
  let added = 0;
  for (const s of starter) {
    if (findPoolCopy(mine, s.id, packId)) continue;
    await addCatalogStratToPool(userId, s, packs, packId);
    mine.push({ ...s, id: "pending", pack_id: packId, owner_user_id: userId, source: catalogSourceKey(s.id) });
    added += 1;
  }
  return added;
}

/** Keep legacy key so already-seeded accounts are not re-copied. */
function starterSeedKey(userId: string) {
  return `cs2-playbook-fundamentals-seeded:${userId}`;
}

/** True after we have auto-seeded (or user already has pool strats). */
export function hasAutoSeededStarterPack(userId: string) {
  try {
    return localStorage.getItem(starterSeedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markAutoSeededStarterPack(userId: string) {
  try {
    localStorage.setItem(starterSeedKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * First-login bootstrap: copy Starter Pack strats for every map into My pool.
 * Idempotent — skips strats already in the pool. Marks a local flag so we
 * don't re-run after the user intentionally clears their pool.
 */
export async function ensureStarterPackSeeded(userId: string, packs: Pack[]): Promise<number> {
  if (hasAutoSeededStarterPack(userId)) return 0;
  let total = 0;
  for (const map of MAPS) {
    total += await addStarterPackForMap(userId, map, packs);
  }
  markAutoSeededStarterPack(userId);
  return total;
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
    version: SCHEMA_VERSION,
    maps: [...MAPS],
    packs: memory.packs,
    strats: memory.strats,
  };
}

export type LiveCallView = {
  ok: boolean;
  has_pick: boolean;
  selected_map: string;
  selected_side: Side;
  site_filter: string;
  timer_ends_at: string | null;
  updated_at: string | null;
  logged: "win" | "loss" | null;
  callout: string | null;
  description: string | null;
  tasks: string[];
  links: { label: string; url: string }[];
  site: string | null;
};

export async function ensureLiveShareToken(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("ensure_live_share");
  if (error) throw error;
  return String(data);
}

export async function regenerateLiveShareToken(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("regenerate_live_share");
  if (error) throw error;
  return String(data);
}

export async function fetchLiveCall(token: string): Promise<LiveCallView | null> {
  if (!supabase || !token) return null;
  const { data, error } = await supabase.rpc("get_live_call", { p_token: token });
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const tasks = Array.isArray(row.tasks) ? (row.tasks as string[]) : [];
  const links = Array.isArray(row.links) ? (row.links as { label: string; url: string }[]) : [];
  return {
    ok: Boolean(row.ok),
    has_pick: Boolean(row.has_pick),
    selected_map: String(row.selected_map || "Mirage"),
    selected_side: (row.selected_side as Side) || "T",
    site_filter: String(row.site_filter || "all"),
    timer_ends_at: row.timer_ends_at ? String(row.timer_ends_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    logged: (row.logged as LiveCallView["logged"]) || null,
    callout: row.callout ? String(row.callout) : null,
    description: row.description ? String(row.description) : null,
    tasks,
    links,
    site: row.site ? String(row.site) : null,
  };
}
