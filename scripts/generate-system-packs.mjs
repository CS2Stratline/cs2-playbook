/**
 * Regenerate src/data/system-packs.json from cs2-startbibliotek.json (+ extra CT coverage).
 * Run: npm run seed:packs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const starter = JSON.parse(readFileSync("src/cs2-startbibliotek.json", "utf8"));
const uid = () => randomUUID();

function enStrat(s) {
  const links = (s.links || [])
    .map((l) => ({ label: l.labelEn || l.label || "", url: l.url }))
    .filter((l) => l.url);
  return {
    id: uid(),
    map: s.map,
    side: s.side,
    site: s.site ?? null,
    callout: (s.calloutEn || s.callout || "").trim(),
    description: (s.descriptionEn || s.description || "").trim(),
    tasks: (s.tasksEn?.length ? s.tasksEn : s.tasks || []).map((t) => String(t).trim()).filter(Boolean),
    rounds: Array.isArray(s.rounds) ? s.rounds : [],
    status: s.status || "ready",
    links,
    wins: 0,
    losses: 0,
    times_used: 0,
    last_used: null,
  };
}

function tierOf(s) {
  const blob = `${s.calloutEn || ""} ${s.callout || ""} ${(s.tasksEn || s.tasks || []).join(" ")}`.toLowerCase();
  const rounds = s.rounds || [];
  if (/fake|split|retake|under split|four in market|pro/.test(blob)) return "pro";
  if (rounds.some((r) => ["pistol", "eco", "force"].includes(r)) || /rush|fast |pop|palace pop/.test(blob)) return "pug";
  if ((s.tasksEn || s.tasks || []).length <= 3 && s.side === "CT") return "pug";
  return "five_stack";
}

const packs = {
  pug: {
    id: uid(),
    slug: "essentials-pug",
    title: "Essentials (PUG)",
    description: "Short callouts, light utility — ranked and pickup friendly.",
    tier: "pug",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
  five_stack: {
    id: uid(),
    slug: "stack-standard",
    title: "Stack Standard",
    description: "Full executes, defaults, and CT holds for a coordinated five.",
    tier: "five_stack",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
  pro: {
    id: uid(),
    slug: "pro-structure",
    title: "Pro Structure",
    description: "Fakes, splits, retakes — tighter roles and timing.",
    tier: "pro",
    visibility: "system",
    owner_user_id: null,
    strats: [],
  },
};

for (const raw of starter.strats) {
  const t = tierOf(raw);
  const strat = enStrat(raw);
  strat.pack_id = packs[t].id;
  packs[t].strats.push(strat);
}

const extraCT = [
  { map: "Nuke", side: "CT", site: null, callout: "Heaven hold", calloutEn: "Heaven hold", descriptionEn: "Strong heaven/hut, soft outside.", tasksEn: ["2 heaven/hut", "1 ramp", "1 outside", "1 secret watch"], rounds: [], status: "ready", links: [] },
  { map: "Nuke", side: "CT", site: null, callout: "Anti-eco stack", calloutEn: "Anti-eco stack", descriptionEn: "Stack likely hit site on their eco.", tasksEn: ["Stack predicted site", "Save util for entry", "Don't overpeek"], rounds: ["anti", "eco"], status: "ready", links: [] },
  { map: "Nuke", side: "CT", site: null, callout: "Retake A", calloutEn: "Retake A", descriptionEn: "Group before swinging lower/heaven.", tasksEn: ["Stack 3+", "Util dark/site", "Swing heaven + ramp together"], rounds: ["full", "force", "anti"], status: "ready", links: [] },
  { map: "Mirage", side: "CT", site: null, callout: "Apps nade", calloutEn: "Apps nade", descriptionEn: "Deny early apps with utility.", tasksEn: ["Molly/HE apps early", "1 short 1 market", "Info mid"], rounds: ["full", "force"], status: "ready", links: [{ labelEn: "Molly: Apps", url: "https://csnades.gg/mirage/molotovs/b-apts-from-b-site" }] },
  { map: "Dust II", side: "CT", site: null, callout: "Long nade", calloutEn: "Long nade", descriptionEn: "Delay long with early util.", tasksEn: ["HE/molly long doors", "2 A long/pit", "Rotate on B sound"], rounds: ["full"], status: "ready", links: [] },
  { map: "Inferno", side: "CT", site: null, callout: "Apps watch", calloutEn: "Apps watch", descriptionEn: "Hold balcony/apps, soft banana.", tasksEn: ["2 A apps/balcony", "1 pit", "1 mid", "1 banana"], rounds: [], status: "ready", links: [] },
  { map: "Ancient", side: "CT", site: null, callout: "Donut stack", calloutEn: "Donut stack", descriptionEn: "Deny donut, punish A hits.", tasksEn: ["2–3 A/donut", "1 mid", "1 B", "Util donut early"], rounds: ["full"], status: "ready", links: [] },
  { map: "Anubis", side: "CT", site: null, callout: "Water deny", calloutEn: "Water deny", descriptionEn: "Nade water, hold heaven.", tasksEn: ["Utility water early", "2 A", "1 mid", "1 B"], rounds: ["full", "force"], status: "ready", links: [] },
  { map: "Cache", side: "CT", site: null, callout: "Mid control", calloutEn: "Mid control", descriptionEn: "Press mid for info, soft sites.", tasksEn: ["2 mid", "1 A", "2 B soft", "Fall on execute"], rounds: ["full"], status: "ready", links: [] },
];

for (const raw of extraCT) {
  const t = tierOf(raw);
  const strat = enStrat(raw);
  strat.pack_id = packs[t].id;
  packs[t].strats.push(strat);
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
