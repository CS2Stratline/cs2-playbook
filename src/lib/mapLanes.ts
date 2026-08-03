import type { Site } from "./types";

export type LaneId = Exclude<Site, null>;

export type LaneDef = {
  id: LaneId;
  label: string;
  /** Short pill label */
  short: string;
};

/** Shared approach lanes: Mid = undecided map control (not mid→A/B executes). */
const STANDARD_LANES: LaneDef[] = [
  { id: "a", label: "A site", short: "A" },
  { id: "b", label: "B site", short: "B" },
  { id: "mid", label: "Mid", short: "Mid" },
];

/** Nuke: Outside replaces Mid; Ramp is a distinct approach into lower. */
const NUKE_LANES: LaneDef[] = [
  { id: "a", label: "A site", short: "A" },
  { id: "b", label: "B site", short: "B" },
  { id: "outside", label: "Outside", short: "Outside" },
  { id: "ramp", label: "Ramp", short: "Ramp" },
];

/** Uncategorized / map-wide calls (pistols, memes, etc.). */
const OTHER_LANE: LaneDef = { id: "default", label: "Other (any lane)", short: "Other" };

const LANES_BY_MAP: Record<string, LaneDef[]> = {
  Nuke: NUKE_LANES,
};

/** T-side approach lanes for Match filters / Playbook site groups. */
export function lanesForMap(map: string): LaneDef[] {
  return LANES_BY_MAP[map] || STANDARD_LANES;
}

/** Form picker includes Other for map-wide calls that are not A/B/Mid. */
export function formLanesForMap(map: string): LaneDef[] {
  return [...lanesForMap(map), OTHER_LANE];
}

export function isValidLane(map: string, site: string | null | undefined): boolean {
  if (!site || site === "all") return true;
  if (site === "default") return true;
  return lanesForMap(map).some((l) => l.id === site);
}

/** Match filter pills: All + approach lanes + Other (unlaned / map-wide). */
export function matchSiteFilters(map: string): { id: string; label: string }[] {
  return [
    { id: "all", label: "All" },
    ...lanesForMap(map).map((l) => ({ id: l.id, label: l.short })),
    { id: OTHER_LANE.id, label: OTHER_LANE.short },
  ];
}

export function isOtherLane(site: string | null | undefined): boolean {
  return !site || site === "default";
}

/** True when a strat matches the active Match site / lane filter. */
export function matchesSiteFilter(
  site: string | null | undefined,
  siteFilter: string,
  opts?: { isT?: boolean }
): boolean {
  if (opts?.isT === false) return true;
  if (!siteFilter || siteFilter === "all") return true;
  if (siteFilter === "default") return isOtherLane(site);
  return site === siteFilter;
}
