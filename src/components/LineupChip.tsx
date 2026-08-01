import { shortLinkLabel } from "../lib/taskLinks";
import { nadeChipClass, nadeTypeFromLink } from "../lib/nadeType";
import { NadeIcon } from "./icons";

type Props = {
  label: string;
  url: string;
  suggested?: boolean;
  title?: string;
  /** Shorter landing name for inline task rows ("Smoke: Jungle" → "Jungle"). */
  compact?: boolean;
};

export function LineupChip({ label, url, suggested, title, compact }: Props) {
  const type = nadeTypeFromLink({ label, url });
  const nadeClass = nadeChipClass(type);
  const text = compact ? shortLinkLabel(label) : label;
  return (
    <a
      className={`chip-link ${nadeClass}${suggested ? " suggested" : ""}${compact ? " compact" : ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title || label}
    >
      <NadeIcon type={type} size={compact ? 13 : 14} />
      <span>{text}</span>
    </a>
  );
}
