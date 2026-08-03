import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePlaybook } from "../lib/playbook";
import { ALL_MAPS, MAPS, type Side } from "../lib/types";
import { isAllMaps } from "../lib/types";
import { isValidLane } from "../lib/mapLanes";
import { CsIcon } from "./CsIcon";
import { MapLogo } from "./MapLogo";
import { SideCT, SideT } from "./icons";

const MAP_SHORT: Record<string, string> = {
  "Dust II": "D2",
  Mirage: "Mirage",
  Inferno: "Inferno",
  Nuke: "Nuke",
  Ancient: "Ancient",
  Anubis: "Anubis",
  Cache: "Cache",
};

export function MapSideChrome() {
  const { session, setSession } = usePlaybook();
  const location = useLocation();
  const accent = session.selected_side === "CT" ? "ct" : "";
  const onPlaybook = location.pathname.startsWith("/playbook");
  // Match + Roulette need a real map. All is Playbook-only.
  useEffect(() => {
    if (!onPlaybook && isAllMaps(session.selected_map)) {
      void setSession({ selected_map: "Mirage", current_pick_id: null, timer_ends_at: null, called_at: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPlaybook, session.selected_map]);

  function selectMap(m: string) {
    const site_filter = isValidLane(m, session.site_filter) ? session.site_filter : "all";
    // One patch: map + clear call + fix lane. Avoids fast-tap races with separate effects.
    void setSession({
      selected_map: m,
      site_filter,
      current_pick_id: null,
      timer_ends_at: null,
      called_at: null,
    });
  }

  return (
    <div className="map-side-chrome">
      <div className="row map-pills" style={{ marginBottom: 6 }}>
        {onPlaybook && (
          <button
            type="button"
            className={`pill pill-icon ${session.selected_map === ALL_MAPS ? `active ${accent}` : ""}`}
            onClick={() =>
              void setSession({ selected_map: ALL_MAPS, current_pick_id: null, timer_ends_at: null, called_at: null })
            }
            title="All maps"
            aria-label="All maps"
          >
            <CsIcon name="all" size={14} />
            <span>All</span>
          </button>
        )}
        {MAPS.map((m) => (
          <button
            key={m}
            type="button"
            className={`pill pill-icon ${session.selected_map === m ? `active ${accent}` : ""}`}
            onClick={() => selectMap(m)}
            title={m}
            aria-label={m}
          >
            <MapLogo map={m} size={16} />
            <span>{MAP_SHORT[m] || m}</span>
          </button>
        ))}
      </div>
      <div className="row side-pills">
        {(["T", "CT"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`pill pill-icon ${session.selected_side === s ? `active ${s === "CT" ? "ct" : ""}` : ""}`}
            onClick={() =>
              void setSession({
                selected_side: s,
                site_filter: "all",
                current_pick_id: null,
                timer_ends_at: null,
                called_at: null,
              })
            }
          >
            {s === "T" ? <SideT size={14} /> : <SideCT size={14} />}
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
