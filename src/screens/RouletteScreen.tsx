import { useState } from "react";
import { usePlaybook } from "../lib/playbook";
import { isMemePack } from "../lib/types";
import { rollClassicRoulette, type RouletteCard } from "../lib/stratRoulette";
import { MapLogo } from "../components/MapLogo";
import { SiteIcon, Shuffle } from "../components/icons";

function rollMemeFromPack(
  strats: { id: string; map: string; side: string; callout: string; description: string; site: string | null; pack_id: string }[],
  packs: { id: string; slug: string }[],
  map: string,
  side: string,
  recent: string[],
  pushRecent: (key: string) => void
): RouletteCard | null {
  const memePackIds = new Set(packs.filter((p) => isMemePack(p)).map((p) => p.id));
  const pool = strats.filter((s) => memePackIds.has(s.pack_id) && s.map === map && s.side === side);
  if (!pool.length) return null;
  const fresh = pool.filter((s) => !recent.includes(s.id));
  const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))]!;
  pushRecent(pick.id);
  return {
    callout: pick.callout,
    description: pick.description,
    site: pick.site,
    origin: "meme",
    stratId: pick.id,
  };
}

export function RouletteScreen() {
  const { session, setSession, strats, packs } = usePlaybook();
  const accent = session.selected_side === "CT" ? "ct" : "";
  const [card, setCard] = useState<RouletteCard | null>(null);
  const [memeRecent, setMemeRecent] = useState<string[]>([]);

  function pushMemeRecent(id: string) {
    setMemeRecent((prev) => {
      const next = [...prev, id];
      return next.length > 15 ? next.slice(-15) : next;
    });
  }

  function roll() {
    const map = session.selected_map;
    const side = session.selected_side;

    let next: RouletteCard | null = null;
    // Occasionally pull from the meme pack; otherwise the chaos catalog.
    if (Math.random() < 0.3) {
      next = rollMemeFromPack(strats, packs, map, side, memeRecent, pushMemeRecent);
    }
    if (!next) next = rollClassicRoulette(map, side);
    if (!next) next = rollMemeFromPack(strats, packs, map, side, memeRecent, pushMemeRecent);

    setCard(next);
    if (next?.stratId) {
      void setSession({ current_pick_id: next.stratId, timer_ends_at: null, called_at: Date.now() });
    }
  }

  return (
    <div className="roulette-screen">
      <div className="panel roulette-panel">
        <p className="eyebrow roulette-eyebrow">Strat roulette</p>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
          Roll a chaos call. Shout it in freezetime.
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
