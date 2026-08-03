import { ChevronDown, ChevronUp } from "./icons";
import { usePlaybook } from "../lib/playbook";
import type { Strat } from "../lib/types";

type Props = {
  strat: Strat;
  /** Compact for dense list rows; default is the Match detail size. */
  compact?: boolean;
};

/**
 * Up / score / down.
 * Works for anonymous browser sessions and Discord/email accounts (one vote each).
 * Disabled only when Supabase is not configured (pure local demo).
 */
export function StratVote({ strat, compact = false }: Props) {
  const { getVote, getVoteScore, castVote, canVote } = usePlaybook();
  const myVote = canVote ? getVote(strat) : 0;
  const { score } = getVoteScore(strat);
  const size = compact ? 14 : 16;

  return (
    <div
      className={`strat-vote${compact ? " strat-vote-compact" : ""}${myVote === 1 ? " up" : ""}${myVote === -1 ? " down" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Strat rating"
    >
      <button
        type="button"
        className={`strat-vote-btn${myVote === 1 ? " active up" : ""}`}
        onClick={() => {
          if (canVote) void castVote(strat, 1);
        }}
        disabled={!canVote}
        aria-label={myVote === 1 ? "Remove upvote" : "Upvote"}
        aria-pressed={myVote === 1}
        title={canVote ? (myVote === 1 ? "Remove upvote" : "Upvote") : "Voting unavailable"}
      >
        <ChevronUp size={size} />
      </button>
      <span className="strat-vote-score" title={`${score >= 0 ? "+" : ""}${score} net`}>
        {score}
      </span>
      <button
        type="button"
        className={`strat-vote-btn${myVote === -1 ? " active down" : ""}`}
        onClick={() => {
          if (canVote) void castVote(strat, -1);
        }}
        disabled={!canVote}
        aria-label={myVote === -1 ? "Remove downvote" : "Downvote"}
        aria-pressed={myVote === -1}
        title={canVote ? (myVote === -1 ? "Remove downvote" : "Downvote") : "Voting unavailable"}
      >
        <ChevronDown size={size} />
      </button>
    </div>
  );
}
