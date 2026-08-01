/**
 * Build expanded starter strat library from well-known CS2 executes.
 * Sources: BLAST.tv smoke guides, CSNADES.gg catalog (verified URLs only).
 * English-only. Run: npm run starter
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "src/csnades-catalog.json"), "utf8"));
const urlSet = new Set(catalog.nades.map((n) => n.url));

function L(label, url) {
  if (!urlSet.has(url)) throw new Error(`URL not in catalog: ${url}`);
  return { label, url };
}

function S(partial) {
  return {
    rounds: ["full"],
    status: "ready",
    links: [],
    ...partial,
  };
}

const strats = [
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Contact A",
    description: "Fast A contact: light util, trade ramp together — no full triple setup.",
    rounds: ["full","force"],
    tasks: [
      "One stairs or jungle smoke if you have it",
      "Flash ramp, five contact together",
      "Plant default, hold con soft",
    ],
    links: [
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-t-spawn"),
      L("Flash: Ramp", "https://csnades.gg/mirage/flashbangs/a-ramp-from-t-spawn"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Fast B",
    description: "Quick B: market window smoke + apps entry — lighter than full Apps B.",
    rounds: ["full","force"],
    tasks: [
      "Smoke market window",
      "Flash site from apps",
      "Plant for retake, hold apps/short",
    ],
    links: [
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-back-alley"),
      L("Flash: B site", "https://csnades.gg/mirage/flashbangs/b-site-from-apts"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Pistol stairs",
    description: "Pistol A: one stairs smoke, flash ramp, plant for armor next.",
    rounds: ["pistol"],
    tasks: [
      "Smoke stairs from spawn",
      "Flash ramp / palace exit",
      "Plant default, save util",
    ],
    links: [
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-t-spawn"),
      L("Flash: Ramp", "https://csnades.gg/mirage/flashbangs/a-ramp-from-t-spawn"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Apps split",
    description: "Mid window + apps hit together — split B instead of five apps.",
    rounds: ["full","force"],
    tasks: [
      "Smoke mid window, take short",
      "Two through apps with market smokes",
      "Trade site together",
    ],
    links: [
      L("Smoke: Mid window", "https://csnades.gg/mirage/smokes/mid-window-from-t-spawn-a"),
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-back-alley"),
      L("Smoke: Market door", "https://csnades.gg/mirage/smokes/market-door-from-back-alley"),
      L("Flash: B site", "https://csnades.gg/mirage/flashbangs/b-site-from-apts"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Triple A",
    description: "Classic A execute: ticket, jungle and stairs together, then enter as five.",
    tasks: [
      "Smoke ticket booth / CT",
      "Smoke jungle",
      "Smoke stairs",
      "Flash in, entry ramp + palace",
      "Hold con after plant",
    ],
    links: [
      L("Smoke: Ticket", "https://csnades.gg/mirage/smokes/ticket-booth-from-a-ramp"),
      L("Smoke: Jungle", "https://csnades.gg/mirage/smokes/jungle-from-a-ramp"),
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-a-ramp"),
      L("Molly: Firebox", "https://csnades.gg/mirage/molotovs/firebox-from-stairs"),
      L("Flash: Ramp", "https://csnades.gg/mirage/flashbangs/a-ramp-from-t-spawn"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Spawn triple",
    description: "Same A isolation, all three smokes from T spawn (easier for newer players).",
    tasks: [
      "Smoke jungle from spawn",
      "Smoke stairs from spawn",
      "Smoke ticket from ramp (or spawn variant)",
      "Push ramp together when smokes land",
    ],
    links: [
      L("Smoke: Jungle", "https://csnades.gg/mirage/smokes/jungle-from-t-spawn"),
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-t-spawn"),
      L("Smoke: Ticket", "https://csnades.gg/mirage/smokes/ticket-booth-from-t-spawn-fence"),
      L("Smoke: Deep stairs", "https://csnades.gg/mirage/smokes/deep-stairs-from-t-spawn"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Palace pop",
    description: "Fast palace exit with flash — works on eco/force for plant money.",
    rounds: ["full","force","eco"],
    tasks: [
      "1–2 in palace, rest default mid/ramp",
      "Flash balcony, pop out",
      "Plant default or fall back",
    ],
    links: [
      L("Flash: Balcony", "https://csnades.gg/mirage/flashbangs/balcony-from-palace"),
      L("Molly: Dark", "https://csnades.gg/mirage/molotovs/dark-from-palace-safe"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Ramp only",
    description: "Five on ramp, no palace. Jungle + stairs, then hard entry.",
    tasks: [
      "Smoke jungle and stairs",
      "Molly/HE tetris or firebox",
      "Flash ramp entry, trade hard",
      "One holds top mid vs rotate",
    ],
    links: [
      L("Smoke: Jungle", "https://csnades.gg/mirage/smokes/jungle-from-a-ramp"),
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-a-ramp"),
      L("Molly: Tetris", "https://csnades.gg/mirage/molotovs/triple-box-from-tetris"),
      L("Flash: Ramp", "https://csnades.gg/mirage/flashbangs/a-ramp-from-a-ramp"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "Under split",
    description: "Take underpass control, split A via con + ramp.",
    tasks: [
      "Win underpass / short",
      "Smoke jungle from under or tetris",
      "2–3 out con, 2 ramp",
      "Touch site together",
    ],
    links: [
      L("Smoke: Jungle", "https://csnades.gg/mirage/smokes/jungle-from-tetris"),
      L("Smoke: Jungle+con", "https://csnades.gg/mirage/smokes/jungle-and-connector-from-underpass"),
      L("Molly: Underpass", "https://csnades.gg/mirage/molotovs/underpass-from-jungle"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "a",
    callout: "A fake to B",
    description: "Show A smokes, rotate fast to B apps while CTs fall A.",
    tasks: [
      "Throw 1–2 A smokes (jungle/stairs)",
      "Make A noise/util for 3–4s",
      "Full team apps → B",
      "Smoke market window + door on entry",
    ],
    links: [
      L("Smoke: Stairs", "https://csnades.gg/mirage/smokes/stairs-from-t-spawn"),
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-back-alley"),
      L("Smoke: Market door", "https://csnades.gg/mirage/smokes/market-door-from-back-alley"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Apps B",
    description: "Standard B: market window + door, entry through apps.",
    tasks: [
      "Smoke market window",
      "Smoke market door",
      "Molly van / bench",
      "Flash site, entry apps",
      "Plant for apps or van",
    ],
    links: [
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-back-alley"),
      L("Smoke: Market door", "https://csnades.gg/mirage/smokes/market-door-from-back-alley"),
      L("Molly: Van", "https://csnades.gg/mirage/molotovs/van-from-b-apts"),
      L("Flash: B site", "https://csnades.gg/mirage/flashbangs/b-site-from-apts"),
      L("Molly: Bench", "https://csnades.gg/mirage/molotovs/bench-from-b-apts"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Four in market",
    description: "Full B isolation: market + catwalk smokes. Full buy only.",
    tasks: [
      "Smoke market window and door",
      "Smoke catwalk / short",
      "Molly van",
      "Entry apps, not short",
    ],
    links: [
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-back-alley"),
      L("Smoke: Market door", "https://csnades.gg/mirage/smokes/market-door-from-back-alley"),
      L("Smoke: Catwalk", "https://csnades.gg/mirage/smokes/catwalk-from-t-spawn"),
      L("Smoke: B short", "https://csnades.gg/mirage/smokes/b-short-from-back-alley"),
      L("Molly: Van", "https://csnades.gg/mirage/molotovs/van-from-b-apts"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Short B",
    description: "Hit B via short/cat after mid control.",
    tasks: [
      "Take window / top mid",
      "Smoke market door or window",
      "Flash short, go cat → B",
      "Trade bench and van",
    ],
    links: [
      L("Smoke: Mid window", "https://csnades.gg/mirage/smokes/mid-window-from-t-spawn-a"),
      L("Smoke: Catwalk", "https://csnades.gg/mirage/smokes/catwalk-from-top-mid"),
      L("Smoke: Market door", "https://csnades.gg/mirage/smokes/market-door-from-back-alley"),
      L("Flash: Short", "https://csnades.gg/mirage/flashbangs/b-short-from-catwalk"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "b",
    callout: "Rush apps",
    description: "Straight apps, no smokes — pistol/eco when CTs are passive.",
    rounds: ["pistol","eco","force"],
    tasks: [
      "Five apps immediately",
      "Flash site from back alley",
      "Spray bench, plant fast",
    ],
    links: [
      L("Flash: B site", "https://csnades.gg/mirage/flashbangs/b-site-from-back-alley"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "mid",
    callout: "Window control",
    description: "Smoke mid window, take top mid for info and splits.",
    tasks: [
      "Smoke mid window from spawn",
      "Flash top mid, take control",
      "Decide A-con or B-short",
    ],
    links: [
      L("Smoke: Mid window", "https://csnades.gg/mirage/smokes/mid-window-from-t-spawn-a"),
      L("Smoke: Connector", "https://csnades.gg/mirage/smokes/connector-from-t-spawn"),
      L("Flash: Top mid", "https://csnades.gg/mirage/flashbangs/top-mid-from-triple"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "mid",
    callout: "Mid to B",
    description: "Window → short → B after mid control.",
    tasks: [
      "Smoke window, win mid",
      "Catwalk smoke if needed",
      "Hit B short with 4, 1 lurks A",
    ],
    links: [
      L("Smoke: Mid window", "https://csnades.gg/mirage/smokes/mid-window-from-t-spawn-a"),
      L("Smoke: Catwalk", "https://csnades.gg/mirage/smokes/catwalk-from-t-spawn"),
      L("Smoke: Market window", "https://csnades.gg/mirage/smokes/market-window-from-default-b"),
    ],
  }),
  S({
    map: "Mirage",
    side: "T",
    site: "mid",
    callout: "Mid to A",
    description: "Window/con control, then A through connector.",
    tasks: [
      "Smoke window",
      "Smoke or clear connector",
      "2–3 out con, 2 ramp support",
    ],
    links: [
      L("Smoke: Mid window", "https://csnades.gg/mirage/smokes/mid-window-from-t-spawn-b"),
      L("Smoke: Connector", "https://csnades.gg/mirage/smokes/connector-from-t-spawn"),
      L("Smoke: Jungle", "https://csnades.gg/mirage/smokes/jungle-from-t-spawn"),
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Ramp hold",
    description: "Strong ramp/palace A — soft B, punish fast A contact.",
    rounds: [],
    tasks: [
      "2 ramp / tetris",
      "1 palace or ticket",
      "1 mid, 1 B soft",
      "Fall con only on clear B info",
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Mid give",
    description: "Give mid space on purpose — play for retake / late rotate, save util.",
    rounds: ["full","force","eco"],
    tasks: [
      "Soft window — do not die mid",
      "2 A, 2 B anchors",
      "Util ready for retake, not mid duel",
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Eco window",
    description: "Eco: stack window/top mid for info — fall to sites on execute.",
    rounds: ["eco"],
    tasks: [
      "3–4 window / top mid",
      "1 soft A or B",
      "Fall on smoke execute",
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Short mid push",
    description: "Push mid with short support to break T mid control.",
    rounds: ["full","force"],
    tasks: [
      "1 short ready to swing",
      "2 mid (window + under)",
      "1 A, 1 B anchors",
      "Flash mid, take space, fall on rotate",
    ],
    links: [
      L("Flash: Mid window", "https://csnades.gg/mirage/flashbangs/mid-window-from-jungle"),
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Anti apps",
    description: "When apps push: let them exit, molly floor/bench, trade from site + short.",
    rounds: ["full","force","anti"],
    tasks: [
      "1 short, 1 site/van",
      "Molly bench/site — not deep apps",
      "Trade exit, hold market",
    ],
    links: [
      L("Molly: Bench", "https://csnades.gg/mirage/molotovs/bench-from-b-apts"),
      L("Molly: Van", "https://csnades.gg/mirage/molotovs/van-from-b-apts"),
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "A stack",
    description: "Three A, one mid, one B — punish A takes.",
    rounds: [],
    tasks: [
      "3 A (ramp/palace/ticket)",
      "1 window or con",
      "1 B apps/short",
      "Rotate B only on clear info",
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "B stack",
    description: "Three B, punish apps rushes.",
    rounds: [],
    tasks: [
      "3 B (bench/van/market)",
      "1 mid, 1 A",
      "Molly apps early",
    ],
    links: [
      L("Molly: Apps", "https://csnades.gg/mirage/molotovs/b-apts-from-b-site"),
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Mid aggression",
    description: "Press mid/window for info and pace.",
    rounds: ["full","force"],
    tasks: [
      "2 mid (window + under/con)",
      "Flash mid, take space",
      "Fall back to site on execute",
    ],
    links: [
      L("Flash: Mid window", "https://csnades.gg/mirage/flashbangs/mid-window-from-jungle"),
    ],
  }),
  S({
    map: "Mirage",
    side: "CT",
    site: null,
    callout: "Retake A",
    description: "Standard retake: utility from jungle/con + CT.",
    rounds: ["full","force","anti"],
    tasks: [
      "Stack 3+ before retake",
      "Utility stairs/tetris",
      "Swing together from con + CT",
    ],
    links: [
      L("HE: Tetris", "https://csnades.gg/mirage/hegrenades/tetris-from-jungle"),
      L("Flash: Stairs", "https://csnades.gg/mirage/flashbangs/stairs-from-stairs"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "a",
    callout: "Long A",
    description: "Take long, smoke CT cross, plant A.",
    tasks: [
      "Smoke xbox early (mid info)",
      "Clear long doors, molly car",
      "Smoke CT spawn / cross",
      "Flash pit, entry long",
    ],
    links: [
      L("Smoke: Xbox", "https://csnades.gg/dust2/smokes/xbox-from-t-spawn"),
      L("Smoke: CT spawn", "https://csnades.gg/dust2/smokes/ct-spawn-from-xbox"),
      L("Molly: Car", "https://csnades.gg/dust2/molotovs/car-from-long-doors"),
      L("Smoke: A cross", "https://csnades.gg/dust2/smokes/a-cross-from-long-doors"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "a",
    callout: "Short A",
    description: "Cat/short execute after mid control.",
    tasks: [
      "Smoke xbox, take mid",
      "Smoke CT from xbox",
      "Flash short, go cat",
      "Trade goose / site",
    ],
    links: [
      L("Smoke: Xbox", "https://csnades.gg/dust2/smokes/xbox-from-t-spawn"),
      L("Smoke: CT spawn", "https://csnades.gg/dust2/smokes/ct-spawn-from-xbox"),
      L("Flash: A short", "https://csnades.gg/dust2/flashbangs/a-site-from-a-short"),
      L("Smoke: Short", "https://csnades.gg/dust2/smokes/short-from-short"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "a",
    callout: "Split A",
    description: "Long + short at the same time.",
    tasks: [
      "2–3 long, 2 short",
      "Smoke CT cross",
      "Touch site same tick",
    ],
    links: [
      L("Smoke: Xbox", "https://csnades.gg/dust2/smokes/xbox-from-t-spawn"),
      L("Smoke: CT spawn", "https://csnades.gg/dust2/smokes/ct-spawn-from-xbox"),
      L("Smoke: A cross", "https://csnades.gg/dust2/smokes/a-cross-from-a-long"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "a",
    callout: "Fast long",
    description: "Pistol/eco long rush without heavy utility.",
    rounds: ["pistol","eco","force"],
    tasks: [
      "Five long immediately",
      "Flash doors, spray through",
      "Plant near long",
    ],
    links: [
      L("Smoke: Long corner", "https://csnades.gg/dust2/smokes/long-corner-from-t-spawn"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "b",
    callout: "B doors",
    description: "Standard B: smoke doors/window, entry tunnels.",
    tasks: [
      "Smoke B doors",
      "Smoke B window",
      "Flash tunnels, entry",
      "Clear car / plat",
    ],
    links: [
      L("Smoke: B doors", "https://csnades.gg/dust2/smokes/b-doors-from-upper-tunnels-a"),
      L("Smoke: B window", "https://csnades.gg/dust2/smokes/b-window-from-outside-b-tunnels"),
      L("Smoke: B plat", "https://csnades.gg/dust2/smokes/b-plat-from-upper-tunnels"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "b",
    callout: "Rush B",
    description: "Straight tunnels — classic pistol/eco.",
    rounds: ["pistol","eco","force"],
    tasks: [
      "Five upper tunnels",
      "Flash B, spray doors",
      "Plant default B",
    ],
    links: [
      L("Smoke: B doors", "https://csnades.gg/dust2/smokes/b-doors-from-t-spawn"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "b",
    callout: "Mid to B",
    description: "Xbox/mid doors, then B via CT or tunnels.",
    tasks: [
      "Smoke xbox + mid doors",
      "Take mid control",
      "Hit B doors or CT rotate",
    ],
    links: [
      L("Smoke: Xbox", "https://csnades.gg/dust2/smokes/xbox-from-t-spawn"),
      L("Smoke: Mid doors", "https://csnades.gg/dust2/smokes/mid-doors-from-t-spawn"),
      L("Smoke: B doors", "https://csnades.gg/dust2/smokes/b-doors-from-catwalk"),
    ],
  }),
  S({
    map: "Dust II",
    side: "T",
    site: "mid",
    callout: "Xbox mid",
    description: "Smoke xbox, press mid for picks.",
    tasks: [
      "Smoke xbox from spawn",
      "Flash mid doors",
      "Hit short or B after info",
    ],
    links: [
      L("Smoke: Xbox", "https://csnades.gg/dust2/smokes/xbox-from-t-spawn"),
      L("Smoke: Mid doors", "https://csnades.gg/dust2/smokes/mid-doors-from-t-spawn"),
      L("Flash: Mid doors", "https://csnades.gg/dust2/flashbangs/mid-doors-from-xbox"),
    ],
  }),
  S({
    map: "Dust II",
    side: "CT",
    site: null,
    callout: "A hold",
    description: "Strong A (long + short), soft B.",
    rounds: [],
    tasks: [
      "2 long/pit, 1 short, 1 mid, 1 B",
      "Hold close long angles",
      "Rotate early on B sound",
    ],
  }),
  S({
    map: "Dust II",
    side: "CT",
    site: null,
    callout: "B hold",
    description: "Double B, punish tunnels.",
    rounds: [],
    tasks: [
      "2 B, 1 mid, 2 A",
      "Molly tunnels entry",
      "Don't over-rotate A",
    ],
  }),
  S({
    map: "Dust II",
    side: "CT",
    site: null,
    callout: "Mid push",
    description: "Aggression through mid doors for info.",
    rounds: ["full","force"],
    tasks: [
      "2 mid, flash doors",
      "Take xbox space briefly",
      "Fall back before execute",
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "b",
    callout: "Banana B",
    description: "BLAST standard: CT + coffins smoke, entry banana.",
    tasks: [
      "Take banana control",
      "Smoke CT (cover boost)",
      "Smoke coffins",
      "Molly new box, flash in",
    ],
    links: [
      L("Smoke: CT", "https://csnades.gg/inferno/smokes/ct-from-banana"),
      L("Smoke: Coffins", "https://csnades.gg/inferno/smokes/coffins-from-banana"),
      L("Smoke: CT boost", "https://csnades.gg/inferno/smokes/ct-boost-from-banana"),
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "b",
    callout: "Fast banana",
    description: "Early banana for map control or rush.",
    rounds: ["full","force","pistol"],
    tasks: [
      "Utility banana first 10s",
      "Flash deep, take car/logs",
      "Hold or hit B",
    ],
    links: [
      L("Smoke: CT", "https://csnades.gg/inferno/smokes/ct-from-banana-b"),
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "a",
    callout: "Apps A",
    description: "A through apartments / balcony.",
    tasks: [
      "Control apps",
      "Smoke/molly balcony fights",
      "Entry balcony → site",
      "Clear pit and library",
    ],
    links: [
      L("Smoke: Hay", "https://csnades.gg/inferno/smokes/hay-from-apts-a"),
      L("Smoke: Pit", "https://csnades.gg/inferno/smokes/pit-from-mid"),
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "a",
    callout: "Arch A",
    description: "BLAST A wrap: arch + library + moto.",
    tasks: [
      "Smoke arch",
      "Smoke library",
      "Smoke moto",
      "Entry short/long together",
    ],
    links: [
      L("Smoke: Arch", "https://csnades.gg/inferno/smokes/arch-from-alt-mid"),
      L("Smoke: Library", "https://csnades.gg/inferno/smokes/library-from-alt-mid"),
      L("Smoke: Moto", "https://csnades.gg/inferno/smokes/moto-from-alt-mid"),
      L("Smoke: Arches", "https://csnades.gg/inferno/smokes/arches-from-alt-mid"),
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "a",
    callout: "Short A",
    description: "Mid → short with moto smoke.",
    tasks: [
      "Take mid/alt-mid",
      "Smoke moto (AWP library)",
      "Flash short, entry",
    ],
    links: [
      L("Smoke: Moto", "https://csnades.gg/inferno/smokes/moto-from-alt-mid"),
      L("Smoke: Pit", "https://csnades.gg/inferno/smokes/pit-from-alt-mid"),
      L("Smoke: Library", "https://csnades.gg/inferno/smokes/library-from-bottom-mid"),
    ],
  }),
  S({
    map: "Inferno",
    side: "T",
    site: "mid",
    callout: "Mid control",
    description: "Take mid for A-short or info.",
    tasks: [
      "Utility top mid",
      "Clear boiler / alt",
      "Hit short or hold",
    ],
    links: [
      L("Smoke: Boiler", "https://csnades.gg/inferno/smokes/boiler-from-t-spawn"),
      L("Smoke: Arch", "https://csnades.gg/inferno/smokes/arch-from-bottom-mid"),
    ],
  }),
  S({
    map: "Inferno",
    side: "CT",
    site: null,
    callout: "Banana hold",
    description: "Double banana, deny early control.",
    rounds: [],
    tasks: [
      "2 banana, 2 A, 1 mid",
      "Molly/HE deep banana",
      "Fall to coffins on execute",
    ],
  }),
  S({
    map: "Inferno",
    side: "CT",
    site: null,
    callout: "A stack",
    description: "Strong A, soft banana.",
    rounds: [],
    tasks: [
      "3 A (pit/site/library), 1 mid, 1 banana",
      "Punish apps",
      "Early call on banana loss",
    ],
  }),
  S({
    map: "Inferno",
    side: "CT",
    site: null,
    callout: "Retake B",
    description: "Retake from CT + apps/banana.",
    rounds: ["full","force","anti"],
    tasks: [
      "Group before peeks",
      "Utility site/newbox",
      "Swing CT + banana together",
    ],
  }),
  S({
    map: "Nuke",
    side: "T",
    site: "outside",
    callout: "Outside A",
    description: "Outside smokes → secret/ramp or heaven pressure.",
    tasks: [
      "Smoke outside main / garage",
      "Smoke secret close/far",
      "Take outside, hit A main or heaven",
    ],
    links: [
      L("Smoke: Outside main", "https://csnades.gg/nuke/smokes/outside-main-from-t-spawn"),
      L("Smoke: Garage", "https://csnades.gg/nuke/smokes/front-garage-from-t-spawn"),
      L("Smoke: Secret close", "https://csnades.gg/nuke/smokes/secret-close-from-t-spawn"),
      L("Smoke: Secret far", "https://csnades.gg/nuke/smokes/secret-far-from-t-spawn"),
    ],
  }),
  S({
    map: "Nuke",
    side: "T",
    site: "a",
    callout: "Heaven A",
    description: "Silo/heaven smoke, enter A from above.",
    tasks: [
      "Smoke heaven from silo",
      "Control hut/silo",
      "Drop A, clear rafters",
    ],
    links: [
      L("Smoke: Heaven", "https://csnades.gg/nuke/smokes/heaven-from-silo"),
      L("Smoke: A main", "https://csnades.gg/nuke/smokes/a-main-from-t-roof"),
      L("Smoke: Lockers", "https://csnades.gg/nuke/smokes/lockers-from-t-spawn-a"),
    ],
  }),
  S({
    map: "Nuke",
    side: "T",
    site: "ramp",
    callout: "Ramp",
    description: "Trophy/ramp pressure down toward B/lower.",
    tasks: [
      "Control ramp/trophy",
      "Flash ramp, entry",
      "Clear dark / hut support",
    ],
    links: [
      L("Smoke: Ramp", "https://csnades.gg/nuke/smokes/ramp-from-trophy-a"),
      L("Flash: Ramp", "https://csnades.gg/nuke/flashbangs/ramp-from-trophy"),
    ],
  }),
  S({
    map: "Nuke",
    side: "T",
    site: "b",
    callout: "Secret B",
    description: "Outside → secret → B.",
    tasks: [
      "Outside smokes",
      "Secret entry",
      "Hit B dark / site",
    ],
    links: [
      L("Smoke: Outside main", "https://csnades.gg/nuke/smokes/outside-main-from-outside-t-spawn"),
      L("Smoke: Secret far", "https://csnades.gg/nuke/smokes/secret-far-from-outside-t-spawn"),
      L("Molly: Secret", "https://csnades.gg/nuke/molotovs/secret-entry-from-mini"),
    ],
  }),
  S({
    map: "Nuke",
    side: "T",
    site: "b",
    callout: "Vent B",
    description: "Vent drop into B/lower.",
    tasks: [
      "Control vent area",
      "Smoke/flash vent",
      "Drop B, trade dark",
    ],
    links: [
      L("Smoke: Vent", "https://csnades.gg/nuke/smokes/vent-from-t-spawn-a"),
      L("Molly: Back vent", "https://csnades.gg/nuke/molotovs/back-vent-from-t-roof"),
    ],
  }),
  S({
    map: "Nuke",
    side: "CT",
    site: null,
    callout: "Outside hold",
    description: "Deny outside, soft ramp.",
    rounds: [],
    tasks: [
      "2 outside, 1 ramp, 1 heaven, 1 hut",
      "Utility secret entry",
      "Fall silent on A hit",
    ],
  }),
  S({
    map: "Nuke",
    side: "CT",
    site: null,
    callout: "Ramp stack",
    description: "Strong ramp/lower, punish ramp rushes.",
    rounds: [],
    tasks: [
      "2–3 ramp/lower, 1 outside, 1 heaven",
      "HE/molly trophy",
      "Don't overcommit outside",
    ],
  }),
  S({
    map: "Ancient",
    side: "T",
    site: "a",
    callout: "Donut A",
    description: "Donut/temple smokes, entry A.",
    tasks: [
      "Smoke donut",
      "Smoke temple / CT",
      "Entry A main or cave",
    ],
    links: [
      L("Smoke: Donut", "https://csnades.gg/ancient/smokes/donut-from-t-spawn"),
      L("Smoke: Temple", "https://csnades.gg/ancient/smokes/temple-from-outside-a"),
      L("Smoke: CT", "https://csnades.gg/ancient/smokes/ct-from-t-spawn"),
      L("Smoke: Plat", "https://csnades.gg/ancient/smokes/plat-from-outside-a"),
    ],
  }),
  S({
    map: "Ancient",
    side: "T",
    site: "a",
    callout: "Cave split",
    description: "Cave + A main split.",
    tasks: [
      "Smoke cave lane",
      "2 cave, 3 main",
      "Touch site together",
    ],
    links: [
      L("Smoke: Cave", "https://csnades.gg/ancient/smokes/cave-from-ruins"),
      L("Smoke: Temple", "https://csnades.gg/ancient/smokes/temple-from-outside-a-b"),
      L("Smoke: Deep donut", "https://csnades.gg/ancient/smokes/deep-donut-from-outside-a-main"),
    ],
  }),
  S({
    map: "Ancient",
    side: "T",
    site: "b",
    callout: "Ruins B",
    description: "B through ruins / alley.",
    tasks: [
      "Smoke CT alley / back alley",
      "Smoke B alley",
      "Entry ruins → B",
    ],
    links: [
      L("Smoke: CT alley", "https://csnades.gg/ancient/smokes/ct-alley-from-ruins"),
      L("Smoke: B alley", "https://csnades.gg/ancient/smokes/b-alley-from-ruins"),
      L("Smoke: Back alley", "https://csnades.gg/ancient/smokes/back-alley-from-ruins"),
    ],
  }),
  S({
    map: "Ancient",
    side: "T",
    site: "mid",
    callout: "Mid control",
    description: "Top mid smokes for elbow/donut access.",
    tasks: [
      "Smoke top mid",
      "Take elbow space",
      "Hit A donut or B",
    ],
    links: [
      L("Smoke: Top mid", "https://csnades.gg/ancient/smokes/top-mid-from-t-spawn"),
      L("Smoke: Donut", "https://csnades.gg/ancient/smokes/donut-from-t-mid"),
      L("Smoke: Cat", "https://csnades.gg/ancient/smokes/cat-from-t-spawn"),
    ],
  }),
  S({
    map: "Ancient",
    side: "CT",
    site: null,
    callout: "A hold",
    description: "Strong A/donut.",
    rounds: [],
    tasks: [
      "2–3 A, 1 mid, 1 B",
      "Deny donut early",
      "Rotate on ruins sound",
    ],
  }),
  S({
    map: "Ancient",
    side: "CT",
    site: null,
    callout: "B hold",
    description: "Strong ruins/B.",
    rounds: [],
    tasks: [
      "2 B, 1 mid, 2 A",
      "Utility ruins entry",
      "Hold cave close",
    ],
  }),
  S({
    map: "Anubis",
    side: "T",
    site: "a",
    callout: "Water A",
    description: "Heaven/canal smokes, entry water/A.",
    tasks: [
      "Smoke heaven",
      "Smoke temple / connector",
      "Entry water → A",
    ],
    links: [
      L("Smoke: Heaven", "https://csnades.gg/anubis/smokes/heaven-from-water"),
      L("Smoke: Temple", "https://csnades.gg/anubis/smokes/temple-from-canals"),
      L("Molly: Heaven", "https://csnades.gg/anubis/molotovs/heaven-from-water"),
      L("Smoke: Platform", "https://csnades.gg/anubis/smokes/platform-from-water"),
    ],
  }),
  S({
    map: "Anubis",
    side: "T",
    site: "a",
    callout: "Connector A",
    description: "Mid/connector into A.",
    tasks: [
      "Take mid doors",
      "Smoke connector",
      "Split A main + water",
    ],
    links: [
      L("Smoke: Connector", "https://csnades.gg/anubis/smokes/connector-from-mid-doors"),
      L("Smoke: Heaven", "https://csnades.gg/anubis/smokes/heaven-from-t-upper"),
      L("Smoke: Mid", "https://csnades.gg/anubis/smokes/mid-from-t-spawn"),
    ],
  }),
  S({
    map: "Anubis",
    side: "T",
    site: "b",
    callout: "Ruins B",
    description: "B through ruins with ebox/CT smokes.",
    tasks: [
      "Smoke ebox / canals",
      "Smoke CT",
      "Smoke B site lane",
      "Entry ruins",
    ],
    links: [
      L("Smoke: EBox", "https://csnades.gg/anubis/smokes/ebox-from-ruins"),
      L("Smoke: CT", "https://csnades.gg/anubis/smokes/ct-from-ruins"),
      L("Smoke: B site", "https://csnades.gg/anubis/smokes/b-site-from-ruins"),
      L("Flash: B site", "https://csnades.gg/anubis/flashbangs/b-site-from-ruins"),
    ],
  }),
  S({
    map: "Anubis",
    side: "T",
    site: "b",
    callout: "Street B",
    description: "Mid street → B door.",
    tasks: [
      "Control street/mid",
      "Smoke mid B door",
      "Hit B with ruins support",
    ],
    links: [
      L("Smoke: Mid B door", "https://csnades.gg/anubis/smokes/mid-b-door-from-street"),
      L("Smoke: Top mid", "https://csnades.gg/anubis/smokes/top-mid-from-t-spawn"),
      L("Smoke: B site", "https://csnades.gg/anubis/smokes/b-site-from-t-spawn"),
    ],
  }),
  S({
    map: "Anubis",
    side: "T",
    site: "mid",
    callout: "Mid control",
    description: "Top mid for both sites.",
    tasks: [
      "Smoke top mid",
      "Take mid doors",
      "Hit A con or B street",
    ],
    links: [
      L("Smoke: Top mid", "https://csnades.gg/anubis/smokes/top-mid-from-t-spawn"),
      L("Smoke: Mid", "https://csnades.gg/anubis/smokes/mid-from-t-spawn"),
      L("Smoke: Connector", "https://csnades.gg/anubis/smokes/connector-from-t-upper"),
    ],
  }),
  S({
    map: "Anubis",
    side: "CT",
    site: null,
    callout: "A hold",
    description: "Strong heaven/water.",
    rounds: [],
    tasks: [
      "2–3 A, 1 mid, 1 B",
      "Deny water early",
      "Rotate on ruins",
    ],
  }),
  S({
    map: "Anubis",
    side: "CT",
    site: null,
    callout: "B hold",
    description: "Strong ruins/ebox.",
    rounds: [],
    tasks: [
      "2 B, 1 mid, 2 A",
      "Utility ruins",
      "Hold ebox close",
    ],
  }),
  S({
    map: "Cache",
    side: "T",
    site: "a",
    callout: "Squeaky A",
    description: "Squeaky/forklift smokes into A.",
    tasks: [
      "Smoke forklift",
      "Smoke back site",
      "Entry squeaky / main",
    ],
    links: [
      L("Smoke: Forklift", "https://csnades.gg/cache/smokes/forklift-from-outside-squeaky"),
      L("Smoke: Back A", "https://csnades.gg/cache/smokes/back-a-site-from-outside-squeaky"),
      L("Molly: Forklift", "https://csnades.gg/cache/molotovs/forklift-from-a-main"),
    ],
  }),
  S({
    map: "Cache",
    side: "T",
    site: "a",
    callout: "Main A",
    description: "A main with forklift smoke.",
    tasks: [
      "Smoke forklift from main",
      "Flash site",
      "Clear checker / NBK",
    ],
    links: [
      L("Smoke: Forklift", "https://csnades.gg/cache/smokes/forklift-from-a-main"),
      L("Smoke: NBK", "https://csnades.gg/cache/smokes/nbk-from-outside-a-main"),
      L("Smoke: Back A", "https://csnades.gg/cache/smokes/back-a-site-from-outside-garage"),
    ],
  }),
  S({
    map: "Cache",
    side: "T",
    site: "b",
    callout: "B main",
    description: "Heaven/CT smokes, entry B.",
    tasks: [
      "Smoke heaven",
      "Smoke CT",
      "Entry B main / sun room",
    ],
    links: [
      L("Smoke: Heaven", "https://csnades.gg/cache/smokes/heaven-from-b-main"),
      L("Smoke: CT", "https://csnades.gg/cache/smokes/ct-from-b-main"),
      L("Smoke: B main", "https://csnades.gg/cache/smokes/b-main-from-b-halls"),
      L("Smoke: Front B", "https://csnades.gg/cache/smokes/front-b-site-from-sun-room"),
    ],
  }),
  S({
    map: "Cache",
    side: "T",
    site: "b",
    callout: "Highway B",
    description: "Highway/truck path to B.",
    tasks: [
      "Smoke highway",
      "Support B main",
      "Trade heaven",
    ],
    links: [
      L("Smoke: Highway", "https://csnades.gg/cache/smokes/highway-from-truck"),
      L("Smoke: Heaven", "https://csnades.gg/cache/smokes/heaven-from-garbage"),
      L("Smoke: CT", "https://csnades.gg/cache/smokes/ct-from-sun-room"),
    ],
  }),
  S({
    map: "Cache",
    side: "T",
    site: "mid",
    callout: "Mid split",
    description: "Mid smokes for connector split.",
    tasks: [
      "Smoke left/right mid",
      "Smoke connector",
      "Split A or B",
    ],
    links: [
      L("Smoke: Left mid", "https://csnades.gg/cache/smokes/left-mid-from-garage"),
      L("Smoke: Right mid", "https://csnades.gg/cache/smokes/right-mid-from-garage"),
      L("Smoke: Connector", "https://csnades.gg/cache/smokes/connector-from-t-spawn"),
    ],
  }),
  S({
    map: "Cache",
    side: "CT",
    site: null,
    callout: "A hold",
    description: "Strong A (forklift/checker).",
    rounds: [],
    tasks: [
      "2–3 A, 1 mid, 1 B",
      "Deny squeaky",
      "Rotate B on heaven sound",
    ],
  }),
  S({
    map: "Cache",
    side: "CT",
    site: null,
    callout: "B hold",
    description: "Strong heaven/B main.",
    rounds: [],
    tasks: [
      "2 B, 1 mid, 2 A",
      "Hold heaven close",
      "Utility B halls",
    ],
  }),
];

// Validate structure
for (const s of strats) {
  if (!s.callout) throw new Error("missing callout");
  if ((s.tasks || []).length > 5) throw new Error(`too many tasks: ${s.callout}`);
  if ((s.links || []).length > 5) throw new Error(`too many links: ${s.callout}`);
}

const out = {
  name: "Starter library",
  version: 2,
  note:
    "Well-known CS2 executes (BLAST.tv smoke guides + standard meta). All lineup URLs are verified against the CSNADES.gg catalog. Keep callouts short; practice lineups before scrim.",
  sources: [
    "https://blast.tv/article/cs2-mirage-smokes",
    "https://blast.tv/article/cs2-inferno-smokes",
    "https://onlycsgo.com/guides/mirage-smoke-lineups",
    "https://csnades.gg/ (lineup catalog snapshot in csnades-catalog.json)",
  ],
  maps: ["Dust II", "Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Cache"],
  strats,
};

const dest = join(root, "src/cs2-startbibliotek.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");

const by = {};
for (const s of strats) {
  const k = `${s.map}|${s.side}|${s.site || "-"}`;
  by[k] = (by[k] || 0) + 1;
}
const withLinks = strats.filter((s) => (s.links || []).length).length;
console.log(`Wrote ${strats.length} strats (${withLinks} with links) → ${dest}`);
Object.keys(by)
  .sort()
  .forEach((k) => console.log(k, by[k]));
