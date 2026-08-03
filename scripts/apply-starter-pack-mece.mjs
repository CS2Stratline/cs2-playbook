/**
 * Apply starter-pack-spec.md §3–4 fixes, append MECE strats, collapse
 * Fundamentals + Stack → Starter. Run from repo root.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FUND = "2cf8d928-3c9a-4002-a6ba-f2cbe6047304";
const STACK = "a90abddf-39a8-478b-a780-f96b9a511ae4";
const ADV = "cd992d39-87c4-423f-b543-b8ed209e41c0";
const MEME = "92eba09f-84c7-4820-8b55-44a42e2579af";

const path = "src/data/system-packs.json";
const data = JSON.parse(readFileSync(path, "utf8"));
const neu = JSON.parse(readFileSync("starter-pack-strats.json", "utf8"));
if (!Array.isArray(neu) || neu.length !== 54) {
  throw new Error(`Expected 54 new strats, got ${neu.length}`);
}

function must(map, side, callout) {
  const s = data.strats.find((x) => x.map === map && x.side === side && x.callout === callout);
  if (!s) throw new Error(`Missing ${map} ${side} ${callout}`);
  return s;
}

// ── §3 map vocabulary corrections ──────────────────────────────────────────
{
  const s = must("Anubis", "T", "Water A");
  if (s.tasks[1] !== "Smoke temple / connector" && s.tasks[1] !== "Smoke heaven and platform") {
    throw new Error(`Water A unexpected tasks[1]: ${s.tasks[1]}`);
  }
  s.tasks[1] = "Smoke heaven and platform";
  const urls = new Set(s.links.map((l) => l.url));
  for (const link of [
    { label: "Smoke: Heaven", url: "https://csnades.gg/anubis/smokes/heaven-from-water-b" },
    { label: "Smoke: Platform", url: "https://csnades.gg/anubis/smokes/platform-from-water" },
  ]) {
    if (!urls.has(link.url)) s.links.push(link);
  }
}

{
  const s = data.strats.find((x) => x.map === "Anubis" && x.side === "T" && (x.callout === "Street B" || x.callout === "Ebox B"));
  if (!s) throw new Error("Missing Anubis Street B / Ebox B");
  s.callout = "Ebox B";
  s.description = "Mid into B through ebox.";
  s.tasks = ["Take top mid and double doors", "Smoke street and sniper", "Enter ebox, ruins group supports"];
}

{
  const s = data.strats.find((x) => x.map === "Cache" && x.side === "T" && (x.callout === "Highway B" || x.callout === "Highway A"));
  if (!s) throw new Error("Missing Cache Highway B/A");
  s.callout = "Highway A";
  s.site = "a";
  s.description = "Mid into A over highway.";
  s.tasks = ["Take garage and white box", "Smoke CT connector and elektro", "Enter highway, trade at forklift"];
}

{
  const s = must("Cache", "T", "Main A");
  const i = s.tasks.findIndex((t) => /checker|NBK|quad/i.test(t));
  if (i < 0) throw new Error("Main A missing clear task");
  s.tasks[i] = "Clear quad and NBK";
}

// ── §4 exclusivity rewrites ────────────────────────────────────────────────
{
  const s = must("Dust II", "CT", "B hold");
  s.description = "Three B. Punish tunnel rushes, give A space.";
  s.tasks = ["3 B: car, closet, plat", "1 mid doors, 1 A short", "Molly tunnels on first sound", "Don't rotate A until the plant"];
}
{
  const s = must("Ancient", "CT", "B hold");
  s.description = "Three B. Deny ramp early, give A space.";
  s.tasks = ["3 B: ramp close, cave, back alley", "1 mid, 1 A", "Util ramp on first sound", "Nobody peeks top mid"];
}
{
  const s = must("Ancient", "CT", "A hold");
  s.tasks[0] = "3 A: site, donut, long";
}
{
  const s = must("Anubis", "CT", "B hold");
  s.description = "Three B. Deny B long early, give A space.";
  s.tasks = ["3 B: corner, back site, sniper", "1 middle, 1 A", "Util B long on first sound", "Hold ebox close"];
}
{
  const s = must("Anubis", "CT", "A hold");
  s.tasks[0] = "3 A: heaven, site, main";
}
{
  const s = must("Cache", "CT", "B hold");
  s.description = "Three B. Punish halls commits, give A space.";
  s.tasks = ["3 B: heaven, new boxes, close left", "1 mid, 1 A", "Smoke B main from heaven on halls commit", "Watch checkers for the vents flank"];
}
{
  const s = must("Cache", "CT", "A hold");
  s.tasks[0] = "3 A: quad, forklift, NBK";
}

// Round retags
const retags = [
  ["Dust II", "T", "Fast long", ["eco", "force"]],
  ["Dust II", "T", "Rush B", ["eco", "force"]],
  ["Mirage", "T", "Rush apps", ["eco", "force"]],
  ["Inferno", "T", "Fast banana", ["full", "force"]],
];
for (const [map, side, callout, rounds] of retags) {
  must(map, side, callout).rounds = rounds;
}

// ── Append 54 MECE strats (remap Stack → Starter pack id) ──────────────────
const existingIds = new Set(data.strats.map((s) => s.id));
const existingKeys = new Set(data.strats.map((s) => `${s.map}|${s.side}|${s.callout}`));
let added = 0;
for (const raw of neu) {
  if (existingIds.has(raw.id)) throw new Error(`Duplicate id ${raw.id}`);
  const key = `${raw.map}|${raw.side}|${raw.callout}`;
  if (existingKeys.has(key)) throw new Error(`Duplicate callout ${key}`);
  const pack_id = raw.pack_id === STACK ? FUND : raw.pack_id;
  if (![FUND, ADV, MEME].includes(pack_id) && pack_id !== STACK) {
    // allow FUND/ADV after remap
  }
  if (pack_id !== FUND && pack_id !== ADV) {
    throw new Error(`Unexpected pack on ${raw.callout}: ${pack_id}`);
  }
  data.strats.push({ ...raw, pack_id });
  existingIds.add(raw.id);
  existingKeys.add(key);
  added += 1;
}
if (added !== 54) throw new Error(`Added ${added}`);

// ── Collapse Stack → Starter ───────────────────────────────────────────────
for (const s of data.strats) {
  if (s.pack_id === STACK) s.pack_id = FUND;
}

const starter = data.packs.find((p) => p.id === FUND);
if (!starter) throw new Error("Missing essentials-pug pack");
starter.title = "Starter Pack";
starter.description = "Day-1 calls for every map.";
starter.slug = "starter-pack";
// Keep same id so cloud subscriptions still resolve.

data.packs = data.packs.filter((p) => p.id !== STACK);
// Stable UI order: Starter Pack → Meme → Advanced
const packOrder = ["starter-pack", "meme-strats", "pro-structure"];
data.packs.sort((a, b) => {
  const ai = packOrder.indexOf(a.slug);
  const bi = packOrder.indexOf(b.slug);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

for (const p of data.packs) {
  p.strat_count = data.strats.filter((s) => s.pack_id === p.id).length;
}

// ── Verify ─────────────────────────────────────────────────────────────────
const errors = [];
if (data.strats.length !== 321) errors.push(`len ${data.strats.length}`);
if (new Set(data.strats.map((s) => s.id)).size !== 321) errors.push("dup ids");
const mece = data.strats.filter((s) => s.source === "starter-pack-mece");
if (mece.length !== 54) errors.push(`mece ${mece.length}`);
if (data.strats.some((s) => s.pack_id === STACK)) errors.push("stack pack refs remain");
const expected = { "starter-pack": 106, "pro-structure": 31, "meme-strats": 184 };
for (const p of data.packs) {
  const n = data.strats.filter((s) => s.pack_id === p.id).length;
  if (p.strat_count !== n) errors.push(`${p.slug} count mismatch`);
  if (expected[p.slug] != null && expected[p.slug] !== n) {
    errors.push(`${p.slug} want ${expected[p.slug]} got ${n}`);
  }
}
// no duplicate callout per map+side (non-meme)
const seen = new Map();
for (const s of data.strats) {
  if (s.pack_id === MEME) continue;
  const k = `${s.map}|${s.side}|${s.callout}`;
  if (seen.has(k)) errors.push(`dup callout ${k}`);
  seen.set(k, true);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("OK", data.packs.map((p) => `${p.slug}:${p.strat_count}`).join(" "), "total", data.strats.length);
