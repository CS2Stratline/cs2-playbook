/**
 * Seed system packs into Supabase (service role).
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const seed = JSON.parse(readFileSync("src/data/system-packs.json", "utf8"));
const sb = createClient(url, key, { auth: { persistSession: false } });

const LEGACY_STACK_ID = "a90abddf-39a8-478b-a780-f96b9a511ae4";
const STARTER_ID =
  seed.packs.find((p) => p.slug === "starter-pack" || p.slug === "essentials-pug")?.id ||
  "2cf8d928-3c9a-4002-a6ba-f2cbe6047304";

// Conflict on id so renaming essentials-pug → starter-pack updates in place
// (onConflict slug would INSERT a new row and hit packs_pkey on the same UUID).
for (const p of seed.packs) {
  const { error } = await sb.from("packs").upsert(
    {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      tier: p.tier,
      visibility: "system",
      owner_user_id: null,
      team_id: null,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  console.log("pack", p.slug);
}

// Point legacy Stack strats at Starter before dropping the pack row.
{
  const { error } = await sb.from("strats").update({ pack_id: STARTER_ID }).eq("pack_id", LEGACY_STACK_ID);
  if (error) throw error;
}
{
  const { error } = await sb.from("packs").delete().eq("id", LEGACY_STACK_ID);
  if (error) throw error;
  console.log("removed legacy stack-standard pack");
}
// Drop orphan slug if a second Starter row ever existed.
{
  const { error } = await sb
    .from("packs")
    .delete()
    .eq("slug", "essentials-pug")
    .neq("id", STARTER_ID);
  if (error) throw error;
}

const { data: packRows } = await sb.from("packs").select("id, slug");
const bySlug = Object.fromEntries((packRows || []).map((r) => [r.slug, r.id]));

const rows = seed.strats.map((s) => {
  const pack = seed.packs.find((p) => p.id === s.pack_id);
  const pack_id = bySlug[pack?.slug] || s.pack_id;
  return {
    id: s.id,
    pack_id,
    owner_user_id: null,
    team_id: null,
    map: s.map,
    side: s.side,
    site: s.site,
    callout: s.callout,
    description: s.description,
    tasks: s.tasks,
    rounds: s.rounds,
    status: s.status,
    links: s.links,
    level: s.level || 5,
    wins: 0,
    losses: 0,
    upvotes: 0,
    downvotes: 0,
    times_used: 0,
    source: s.source || "system-seed",
  };
});

const chunk = 50;
for (let i = 0; i < rows.length; i += chunk) {
  const { error } = await sb.from("strats").upsert(rows.slice(i, i + chunk));
  if (error) throw error;
}
console.log("strats", rows.length);

const catalog = JSON.parse(readFileSync("src/csnades-catalog.json", "utf8"));
const nades = (catalog.nades || []).map((n) => ({
  map: n.map,
  type: n.type,
  title_to: n.to || "",
  title_from: n.from || "",
  slug: n.slug,
  url: n.url,
  team: n.team || null,
  label: n.label || "",
  label_en: n.label || "",
}));
for (let i = 0; i < nades.length; i += chunk) {
  const { error } = await sb.from("nade_catalog").upsert(nades.slice(i, i + chunk), { onConflict: "url" });
  if (error) throw error;
}
console.log("nades", nades.length);

// Meme pack stays off until the user toggles it (avoid polluting Match by default).
const memePackId = bySlug["meme-strats"];
if (memePackId) {
  const { data: profiles, error: profileErr } = await sb.from("profiles").select("id");
  if (profileErr) throw profileErr;
  const rows = (profiles || []).map((p) => ({
    user_id: p.id,
    pack_id: memePackId,
    enabled: false,
  }));
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await sb.from("user_pack_subscriptions").upsert(rows.slice(i, i + chunk), {
      onConflict: "user_id,pack_id",
    });
    if (error) throw error;
  }
  console.log("meme pack default-off for", rows.length, "profiles");
}
