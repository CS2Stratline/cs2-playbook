import { usePlaybook } from "../lib/playbook";
import { MAPS, type Side } from "../lib/types";

export function MapSideChrome() {
  const { session, setSession } = usePlaybook();
  const accent = session.selected_side === "CT" ? "ct" : "";

  return (
    <div className="map-side-chrome">
      <div className="row" style={{ marginBottom: 6 }}>
        {MAPS.map((m) => (
          <button
            key={m}
            type="button"
            className={`pill ${session.selected_map === m ? `active ${accent}` : ""}`}
            onClick={() => void setSession({ selected_map: m })}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="row">
        {(["T", "CT"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`pill ${session.selected_side === s ? `active ${s === "CT" ? "ct" : ""}` : ""}`}
            onClick={() => void setSession({ selected_side: s, site_filter: "all" })}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
