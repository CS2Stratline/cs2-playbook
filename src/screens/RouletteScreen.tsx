import { useState } from "react";
import { usePlaybook } from "../lib/playbook";
import { rollClassicRoulette, type RouletteCard } from "../lib/stratRoulette";
import { MapLogo } from "../components/MapLogo";
import { SiteIcon, Shuffle } from "../components/icons";

export function RouletteScreen() {
  const { session } = usePlaybook();
  const accent = session.selected_side === "CT" ? "ct" : "";
  const [card, setCard] = useState<RouletteCard | null>(null);

  function roll() {
    setCard(rollClassicRoulette(session.selected_map, session.selected_side));
  }

  return (
    <div className="roulette-screen">
      <div className="panel roulette-panel">
        <p className="eyebrow roulette-eyebrow">Strat roulette</p>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
          Pure chaos. Not a Match pack. Just roll and shout.
        </p>

        <div className="roulette-stage">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className={`badge badge-map ${accent === "ct" ? "five_stack" : "pro"}`}>
              <MapLogo map={session.selected_map} size={16} />
              {session.selected_map}
              {session.selected_side}
              {card?.site ? <SiteIcon site={String(card.site)} size={12} /> : null}
            </span>
          </div>

          {card ? (
            <>
              <div className={`callout-hero roulette-hero ${accent}`}>{card.callout}</div>
              <p className="roulette-desc">{card.description}</p>
            </>
          ) : (
            <div className="roulette-empty">
              <p className="h2" style={{ fontSize: 26, marginBottom: 6 }}>
                Hit roll
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Pick map and side above, then roll.
              </p>
            </div>
          )}
        </div>

        <button type="button" className={`btn btn-primary roulette-roll ${accent}`} onClick={roll}>
          <Shuffle size={18} />
          {card ? "Roll again" : "Roll"}
        </button>
      </div>
    </div>
  );
}
