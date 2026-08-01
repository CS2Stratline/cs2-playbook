import { mapIconUrl } from "../lib/maps";
import { MapIcon } from "./icons";

/** Official-style CS2 map icon (falls back to stroke glyph). */
export function MapLogo({ map, size = 18, className }: { map: string; size?: number; className?: string }) {
  const src = mapIconUrl(map);
  if (!src) return <MapIcon map={map} size={size} />;
  return (
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
      style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
