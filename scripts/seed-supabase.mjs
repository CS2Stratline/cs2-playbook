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
    { onConflict: "slug" }
  );
  if (error) throw error;
  console.log("pack", p.slug);
}

// Resolve pack ids by slug (upsert may keep existing ids)
const { data: packRows } = await sb.from("packs").select("id, slug");
const bySlug = Object.fromEntries((packRows || []).map((r) => [r.slug, r.id]));

const rows = seed.strats.map((s) => {
  const pack = seed.packs.find((p) => p.id === s.pack_id);
  const pack_id = bySlug[pack?.slug] || s.pack_id;
  // Do NOT include upvotes / downvotes / times_used / wins / losses.
  // Upsert would overwrite live community stats with zeros on every content re-seed.
  // New rows pick up DB defaults (0); existing rows keep their counters.
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
    source: "system-seed",
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
