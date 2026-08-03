/**
 * Regenerate src/data/system-packs.json from starter-library.json (+ extra CT coverage + meme pack).
 * Preserves existing pack/strat UUIDs when slug or (pack,map,side,callout) still match.
 * Run: npm run seed:packs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const starter = JSON.parse(readFileSync("src/starter-library.json", "utf8"));
const memeLib = JSON.parse(readFileSync("src/data/meme-strats.json", "utf8"));
const prevPath = "src/data/system-packs.json";
const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : { packs: [], strats: [] };
const prevPackIdBySlug = Object.fromEntries((prev.packs || []).map((p) => [p.slug, p.id]));
const prevStratIdByKey = Object.fromEntries(
  (prev.strats || []).map((s) => {
    const pack = (prev.packs || []).find((p) => p.id === s.pack_id);
    return [`${pack?.slug || ""}|${s.map}|${s.side}|${s.callout}`, s.id];
  })
);
/** Renames / splits that should keep the previous UUID when callout text changes. */
const STRAT_ID_ALIASES = {
  "pro-structure|Ancient|T|Donut split": "pro-structure|Ancient|T|Cave split",
  "essentials-pug|Nuke|CT|Anti-eco A": "essentials-pug|Nuke|CT|Anti-eco stack",
};
/** Pin UUIDs for newly inserted catalog cards. */
const FIXED_STRAT_IDS = {
  "essentials-pug|Nuke|CT|Anti-eco B": "682bdfb8-60b6-4ca6-aa23-6ec931033eec",
};
/** Force pack tier for content-review overrides (slug of destination pack). */
const PACK_OVERRIDES = {
  "Mirage|T|Fast B": "pug",
  "Mirage|CT|Ramp hold": "pug",
};
/** Force FACEIT level when estimateLevel would drift. */
const LEVEL_OVERRIDES = {
  "Mirage|T|Fast B": 3,
  "Mirage|CT|Ramp hold": 3,
};
const uid = () => randomUUID();
const packId = (slug) => prevPackIdBySlug[slug] || uid();
const stratId = (slug, s) => {
  const key = `${slug}|${s.map}|${s.side}|${(s.callout || "").trim()}`;
  if (FIXED_STRAT_IDS[key]) return FIXED_STRAT_IDS[key];
  if (prevStratIdByKey[key]) return prevStratIdByKey[key];
  const alias = STRAT_ID_ALIASES[key];
  if (alias && prevStratIdByKey[alias]) return prevStratIdByKey[alias];
  return uid();
};

function estimateLevel(s, tier) {
  const callout = String(s.callout || "").toLowerCase();
  const desc = String(s.description || "").toLowerCase();
  const tasks = (s.tasks || []).map((t) => String(t).toLowerCase());
  const blob = `${callout} ${desc} ${tasks.join(" ")}`;
  const rounds = s.rounds || [];
  const links = (s.links || []).length;
  const util = (blob.match(/\b(smoke|flash|molly|molotov|nade|hegrenade|incendiary)\b/g) || []).length;
  let level = tier === "pro" ? 8 : tier === "five_stack" ? 6 : tier === "meme" ? 1 : 3;
  if (/\brush\b|\bfast\b/.test(blob) || rounds.some((r) => r === "pistol" || r === "eco")) level -= 2;
  if (/\bpop\b/.test(callout) && util <= 2) level -= 1;
  if (/\bhold\b|\bstack\b/.test(callout) && util <= 1 && s.side === "CT") level -= 1;
  if (/\bdefault\b/.test(callout) && util === 0) level -= 1;
  if (util >= 3 || links >= 3) level += 1;
  if (util >= 5 || links >= 5) level += 1;
  if (/\bfake\b|\bsplit\b|\bretake\b|\bfour in\b|\bunder split\b/.test(blob)) level += 2;
  if (tasks.length >= 5) level += 1;
  return Math.max(1, Math.min(10, Math.round(level)));
}

function toStrat(s, tier = "five_stack", packSlug = "") {
  const links = (s.links || [])
    .map((l) => ({ label: l.label || "", url: l.url }))
    .filter((l) => l.url);
  const tasks = (s.tasks || []).map((t) => String(t).trim()).filter(Boolean);
  const strat = {
    id: stratId(packSlug, s),
    map: s.map,
    side: s.side,
    site: s.site ?? null,
    callout: (s.callout || "").trim(),
    description: (s.description || "").trim(),
    tasks,
    rounds: Array.isArray(s.rounds) ? s.rounds : [],
    status: s.status || "ready",
    links,
    level: (() => {
      const key = `${s.map}|${s.side}|${(s.callout || "").trim()}`;
      if (LEVEL_OVERRIDES[key] != null) return LEVEL_OVERRIDES[key];
      return typeof s.level === "number" ? s.level : estimateLevel(s, tier);
    })(),
    wins: 0,
    losses: 0,
    upvotes: 0,
    downvotes: 0,
    times_used: 0,
    last_used: null,
  };
  return strat;
}

function tierOf(s) {
  const override = PACK_OVERRIDES[`${s.map}|${s.side}|${(s.callout || "").trim()}`];
  if (override) return override;
  const blob = `${s.callout || ""} ${(s.tasks || []).join(" ")}`.toLowerCase();
  const rounds = s.rounds || [];
  if (/fake|split|retake|under split|four in market|pro/.test(blob)) return "pro";
  if (rounds.some((r) => ["pistol", "eco", "force"].includes(r)) || /rush|fast |pop|palace pop/.test(blob)) return "pug";
  if ((s.tasks || []).length <= 3 && s.side === "CT") return "pug";
  return "five_stack";
}

const packs = {
  pug: {
    id: packId("essentials-pug"),
    slug: "essentials-pug",
    title: "Fundamentals",
    description: "Rushes, holds, and simple executes. Easy to call in freeze time.",
    tier: "pug",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
  five_stack: {
    id: packId("stack-standard"),
    slug: "stack-standard",
    title: "Stack",
    description: "Standard smokes and mid control for a coordinated five.",
    tier: "five_stack",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
  pro: {
    id: packId("pro-structure"),
    slug: "pro-structure",
    title: "Advanced",
    description: "Fakes, timings, denser utility. Premium / locked for now.",
    tier: "pro",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
  meme: {
    id: packId("meme-strats"),
    slug: "meme-strats",
    title: "Meme",
    description: "Funny chaos calls. Rush B, Zeus openers, flash rain. Off by default.",
    // Use pug tier so Supabase pack_tier enum stays valid without a migration.
    tier: "pug",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
};

for (const raw of starter.strats) {
  const t = tierOf(raw);
  const strat = toStrat(raw, t, packs[t].slug);
  strat.pack_id = packs[t].id;
  packs[t].strats.push(strat);
}

const extraCT = [
  { map: "Nuke", side: "CT", site: null, callout: "Heaven hold", description: "Strong heaven/hut, soft outside.", tasks: ["2 heaven/hut", "1 ramp", "1 outside", "1 secret watch"], rounds: [], status: "ready", links: [] },
  { map: "Nuke", side: "CT", site: "a", callout: "Anti-eco A", description: "Stack A on their eco. Let them walk into you.", tasks: ["2 heaven/hut, 2 A site", "1 ramp for info", "Save util for their entry", "No outside peeks"], rounds: ["anti", "eco"], status: "ready", links: [] },
  { map: "Nuke", side: "CT", site: "b", callout: "Anti-eco B", description: "Stack B on their eco. Let them walk into you.", tasks: ["2 ramp/lower, 2 B site", "1 heaven for info", "Save util for their entry", "No early ramp peeks"], rounds: ["anti", "eco"], status: "ready", links: [] },
  { map: "Nuke", side: "CT", site: null, callout: "Retake A", description: "Group before swinging lower/heaven.", tasks: ["Stack 3+", "Util dark/site", "Swing heaven + ramp together"], rounds: ["full", "force", "anti"], status: "ready", links: [] },
  { map: "Mirage", side: "CT", site: null, callout: "Apps nade", description: "Deny early apps with utility.", tasks: ["Molly/HE apps early", "1 short 1 market", "Info mid"], rounds: ["full", "force"], status: "ready", links: [{ label: "Molly: Apps", url: "https://csnades.gg/mirage/molotovs/b-apts-from-b-site" }] },
  { map: "Dust II", side: "CT", site: null, callout: "Long nade", description: "Delay long with early util.", tasks: ["HE/molly long doors", "2 A long/pit", "Rotate on B sound"], rounds: ["full"], status: "ready", links: [] },
  { map: "Inferno", side: "CT", site: null, callout: "Apps watch", description: "Hold balcony/apps, soft banana.", tasks: ["2 A apps/balcony", "1 pit", "1 mid", "1 banana"], rounds: [], status: "ready", links: [] },
  { map: "Ancient", side: "CT", site: null, callout: "Donut stack", description: "Two live inside donut. Deny the mid-to-A tunnel outright.", tasks: ["2 inside donut, 1 A site", "1 mid, 1 B", "Util donut early, don't peek out", "Fall to A site together if donut breaks"], rounds: ["full"], status: "ready", links: [] },
  { map: "Anubis", side: "CT", site: null, callout: "Water deny", description: "Nade water, hold heaven.", tasks: ["Utility water early", "2 A", "1 mid", "1 B"], rounds: ["full", "force"], status: "ready", links: [] },
  { map: "Cache", side: "CT", site: null, callout: "Mid control", description: "Press mid for info, soft sites.", tasks: ["2 mid", "1 A", "2 B soft", "Fall on execute"], rounds: ["full"], status: "ready", links: [] },
];

for (const raw of extraCT) {
  const t = tierOf(raw);
  const strat = toStrat(raw, t, packs[t].slug);
  strat.pack_id = packs[t].id;
  packs[t].strats.push(strat);
}

for (const raw of memeLib.strats || []) {
  const strat = toStrat(raw, "meme", packs.meme.slug);
  strat.pack_id = packs.meme.id;
  packs.meme.strats.push(strat);
}

mkdirSync("src/data", { recursive: true });
const out = {
  maps: starter.maps,
  packs: Object.values(packs).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    tier: p.tier,
    visibility: p.visibility,
    owner_user_id: null,
    team_id: null,
    strat_count: p.strats.length,
  })),
  strats: Object.values(packs).flatMap((p) =>
    p.strats.map((s) => ({
      ...s,
      owner_user_id: null,
      team_id: null,
      source: "system-seed",
    }))
  ),
};
writeFileSync("src/data/system-packs.json", JSON.stringify(out, null, 2) + "\n");
console.log(out.packs.map((p) => `${p.slug}:${p.strat_count}`).join(" "), "total", out.strats.length);
