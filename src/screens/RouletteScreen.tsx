import { useEffect, useState } from "react";
import { usePlaybook } from "../lib/playbook";
import { rollClassicRoulette, type RouletteCard } from "../lib/stratRoulette";
import { MapLogo } from "../components/MapLogo";
import { Dice, SiteIcon } from "../components/icons";

export function RouletteScreen() {
  const { session } = usePlaybook();
  const [card, setCard] = useState<RouletteCard | null>(null);

  // Drop the previous roll when map/side changes so it never looks like a Match call.
  useEffect(() => {
    setCard(null);
  }, [session.selected_map, session.selected_side]);

  function roll() {
    setCard(rollClassicRoulette(session.selected_map, session.selected_side));
  }

  return (
    <div className="roulette-screen">
      <div className="panel roulette-panel">
        <p className="eyebrow roulette-eyebrow">Strat roulette</p>
        <p className="roulette-lede roulette-warn" role="note">
          Warning: party rolls only — not real Match calls. Match&apos;s <strong>Surprise me</strong>{" "}
          picks strats from your pack.
        </p>

        <div className="roulette-stage">
          <div className="roulette-stamp" aria-hidden="true">
            For fun
          </div>

          <div className="row" style={{ marginBottom: 10, gap: 8 }}>
            <span className="roulette-tag">Not a real call</span>
            <span className="badge badge-map roulette-map-badge">
              <MapLogo map={session.selected_map} size={16} />
              {session.selected_map} {session.selected_side}
              {card?.site ? <SiteIcon site={String(card.site)} size={12} /> : null}
            </span>
          </div>

          {card ? (
            <>
              <div className="roulette-hero">{card.callout}</div>
              <p className="roulette-desc">{card.description}</p>
              <p className="roulette-disclaimer">Would get you votekicked. That&apos;s the joke.</p>
            </>
          ) : (
            <div className="roulette-empty">
              <p className="h2" style={{ fontSize: 26, marginBottom: 6 }}>
                Hit roll
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Pick map and side above, then roll. Nothing here belongs in a ranked call.
              </p>
            </div>
          )}
        </div>

        <button type="button" className="btn roulette-roll" onClick={roll}>
          <Dice size={18} />
          {card ? "Roll again" : "Roll"}
        </button>
      </div>
    </div>
  );
}
