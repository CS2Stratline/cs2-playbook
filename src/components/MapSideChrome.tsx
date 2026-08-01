import { usePlaybook } from "../lib/playbook";
import { ALL_MAPS, MAPS, type Side } from "../lib/types";
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
  const accent = session.selected_side === "CT" ? "ct" : "";

  return (
    <div className="map-side-chrome">
      <div className="row map-pills" style={{ marginBottom: 6 }}>
        <button
          type="button"
          className={`pill pill-icon ${session.selected_map === ALL_MAPS ? `active ${accent}` : ""}`}
          onClick={() => void setSession({ selected_map: ALL_MAPS, current_pick_id: null, timer_ends_at: null, called_at: null })}
          title="All maps"
          aria-label="All maps"
        >
          <span>All</span>
        </button>
        {MAPS.map((m) => (
          <button
            key={m}
            type="button"
            className={`pill pill-icon ${session.selected_map === m ? `active ${accent}` : ""}`}
            onClick={() => void setSession({ selected_map: m })}
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
            onClick={() => void setSession({ selected_side: s, site_filter: "all" })}
          >
            {s === "T" ? <SideT size={14} /> : <SideCT size={14} />}
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
