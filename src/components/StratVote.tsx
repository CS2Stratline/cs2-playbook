import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "./icons";
import { usePlaybook } from "../lib/playbook";
import type { Strat } from "../lib/types";

type Props = {
  strat: Strat;
  /** Compact for dense list rows; default is the Match detail size. */
  compact?: boolean;
};

/** Up / score / down. Voting requires cloud sign-in; score is always shown. */
export function StratVote({ strat, compact = false }: Props) {
  const navigate = useNavigate();
  const { getVote, getVoteScore, castVote, canVote } = usePlaybook();
  const myVote = canVote ? getVote(strat) : 0;
  const { score } = getVoteScore(strat);
  const size = compact ? 14 : 16;

  function onVote(value: 1 | -1) {
    if (!canVote) {
      navigate("/settings");
      return;
    }
    void castVote(strat, value);
  }

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
        onClick={() => onVote(1)}
        aria-label={canVote ? (myVote === 1 ? "Remove upvote" : "Upvote") : "Sign in to upvote"}
        aria-pressed={myVote === 1}
        title={canVote ? (myVote === 1 ? "Remove upvote" : "Upvote") : "Sign in to vote"}
      >
        <ChevronUp size={size} />
      </button>
      <span className="strat-vote-score" title={`${score >= 0 ? "+" : ""}${score} net`}>
        {score}
      </span>
      <button
        type="button"
        className={`strat-vote-btn${myVote === -1 ? " active down" : ""}`}
        onClick={() => onVote(-1)}
        aria-label={canVote ? (myVote === -1 ? "Remove downvote" : "Downvote") : "Sign in to downvote"}
        aria-pressed={myVote === -1}
        title={canVote ? (myVote === -1 ? "Remove downvote" : "Downvote") : "Sign in to vote"}
      >
        <ChevronDown size={size} />
      </button>
    </div>
  );
}
