import type { Site } from "./types";

export type LaneId = Exclude<Site, null>;

export type LaneDef = {
  id: LaneId;
  label: string;
  /** Short pill label */
  short: string;
};

/** Shared lanes for maps with a real Mid control layer. */
const STANDARD_LANES: LaneDef[] = [
  { id: "a", label: "A site", short: "A" },
  { id: "b", label: "B site", short: "B" },
  { id: "mid", label: "Mid", short: "Mid" },
  { id: "default", label: "Default / other", short: "Def" },
];

/** Nuke: Outside replaces Mid; Ramp is a distinct approach into lower. */
const NUKE_LANES: LaneDef[] = [
  { id: "a", label: "A site", short: "A" },
  { id: "b", label: "B site", short: "B" },
  { id: "outside", label: "Outside", short: "Outside" },
  { id: "ramp", label: "Ramp", short: "Ramp" },
  { id: "default", label: "Default / other", short: "Def" },
];

const LANES_BY_MAP: Record<string, LaneDef[]> = {
  Nuke: NUKE_LANES,
};

/** T-side approach lanes for Match filters / Playbook groups. */
export function lanesForMap(map: string): LaneDef[] {
  return LANES_BY_MAP[map] || STANDARD_LANES;
}

export function isValidLane(map: string, site: string | null | undefined): boolean {
  if (!site || site === "all") return true;
  return lanesForMap(map).some((l) => l.id === site);
}

/** Match filter pills: All + map lanes. */
export function matchSiteFilters(map: string): { id: string; label: string }[] {
  return [{ id: "all", label: "All" }, ...lanesForMap(map).map((l) => ({ id: l.id, label: l.short }))];
}
