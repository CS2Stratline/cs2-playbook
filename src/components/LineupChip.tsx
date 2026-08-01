import { NadeIcon } from "./icons";
import { nadeChipClass, nadeTypeFromLink } from "../lib/nadeType";

type Props = {
  label: string;
  url: string;
  suggested?: boolean;
  title?: string;
};

export function LineupChip({ label, url, suggested, title }: Props) {
  const type = nadeTypeFromLink({ label, url });
  const nadeClass = nadeChipClass(type);
  return (
    <a
      className={`chip-link ${nadeClass}${suggested ? " suggested" : ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title || (type ? type : undefined)}
    >
      <NadeIcon type={type} size={12} />
      <span>{label}</span>
    </a>
  );
}
