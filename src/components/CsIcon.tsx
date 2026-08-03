import { iconUrl } from "../lib/icons";

/** Valve silhouette icon: colored via `currentColor` + CSS mask. */
export function CsIcon({
  name,
  size = 16,
  className,
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const url = iconUrl(name);
  return (
    <span
      className={`cs-icon${className ? ` ${className}` : ""}`}
      title={title}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
      }}
    />
  );
}
