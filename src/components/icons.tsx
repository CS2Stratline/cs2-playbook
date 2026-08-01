import type { ReactNode, SVGProps } from "react";
import type { NadeKind } from "../lib/nadeType";
import { CsIcon } from "./CsIcon";

export type { NadeKind };

export function Icon({
  size = 16,
  children,
  fill = "none",
  ...props
}: { size?: number; children: ReactNode; fill?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Shuffle = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="m4 4 5 5" />
  </Icon>
);

export const Star = (p: { size?: number; filled?: boolean }) => (
  <Icon {...p}>
    <path
      d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"
      fill={p.filled ? "currentColor" : "none"}
    />
  </Icon>
);

export const Pack = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </Icon>
);

export const ExternalLink = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
);

export const Plus = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const LogOut = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);

/** Match / freeze caller */
export const Crosshair = (p: { size?: number }) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </Icon>
);

/** Playbook / book */
export const BookOpen = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M2 6a2 2 0 0 1 2-2h6v16H4a2 2 0 0 1-2-2Z" />
    <path d="M22 6a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 0 2-2Z" />
  </Icon>
);

export const Gear = (p: { size?: number }) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
  </Icon>
);

/** Official T silhouette (Valve). */
export const SideT = (p: { size?: number }) => <CsIcon name="t" size={p.size ?? 14} />;

/** Official CT silhouette (Valve). */
export const SideCT = (p: { size?: number }) => <CsIcon name="ct" size={p.size ?? 14} />;

export function NadeIcon({ type, size = 12 }: { type: NadeKind | string | null | undefined; size?: number }) {
  switch (type) {
    case "smoke":
    case "smokes":
      return <CsIcon name="smoke" size={size} />;
    case "flashbang":
    case "flashbangs":
    case "flash":
      return <CsIcon name="flash" size={size} />;
    case "molotov":
    case "molotovs":
    case "incendiary":
      return <CsIcon name="molotov" size={size} />;
    case "hegrenade":
    case "hegrenades":
    case "he":
      return <CsIcon name="he" size={size} />;
    case "combination":
    case "combinations":
      return <CsIcon name="smoke" size={size} />;
    default:
      return <ExternalLink size={size} />;
  }
}

/** Compact map marks — original glyphs, not Valve art */
export function MapIcon({ map, size = 14 }: { map: string; size?: number }) {
  const common = { size, strokeWidth: 1.6 as const };
  switch (map) {
    case "Dust II":
      return (
        <Icon {...common}>
          <path d="M4 16h16" />
          <path d="M7 16V9l2.5 3L12 8l2.5 4L17 9v7" />
          <path d="M9 19h2M13 19h2" />
        </Icon>
      );
    case "Mirage":
      return (
        <Icon {...common}>
          <path d="M5 18V10l7-5 7 5v8" />
          <path d="M10 18v-5h4v5" />
          <path d="M5 10h14" />
        </Icon>
      );
    case "Inferno":
      return (
        <Icon {...common}>
          <path d="M12 21c3.5 0 6-2.4 6-5.5 0-3-2-5-4-7.5-.5 2-2 3-2 3S10.5 9 10 7c-2 2.5-4 4.5-4 8.5C6 18.6 8.5 21 12 21Z" />
        </Icon>
      );
    case "Nuke":
      return (
        <Icon {...common}>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
          <path d="M6.5 6.5c2.2 2.2 2.2 8.8 0 11M17.5 6.5c-2.2 2.2-2.2 8.8 0 11" />
        </Icon>
      );
    case "Ancient":
      return (
        <Icon {...common}>
          <path d="M4 19h16" />
          <path d="M6 19V12l6-7 6 7v7" />
          <path d="M10 19v-4h4v4" />
        </Icon>
      );
    case "Anubis":
      return (
        <Icon {...common}>
          <path d="M12 4 4 19h16Z" />
          <path d="M9 14h6" />
          <path d="M12 9v5" />
        </Icon>
      );
    case "Cache":
      return (
        <Icon {...common}>
          <rect x="5" y="7" width="14" height="12" rx="1" />
          <path d="M5 11h14M12 7v12" />
          <path d="M8 7V5h8v2" />
        </Icon>
      );
    default:
      return (
        <Icon {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M8 12h8" />
        </Icon>
      );
  }
}

/** Bomb-site / filter icons — official CS map markers where available. */
export function SiteIcon({ site, size = 12 }: { site: string; size?: number }) {
  const key =
    site === "a"
      ? "site_a"
      : site === "b"
        ? "site_b"
        : site === "mid"
          ? "site_mid"
          : site === "all"
            ? "all"
            : null;
  if (key) return <CsIcon name={key} size={size} />;
  // Default / other — letter badge
  const label = site === "default" ? "D" : String(site).toUpperCase().slice(0, 1) || "?";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="site-icon">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="8"
        y="11.5"
        textAnchor="middle"
        fill="currentColor"
        fontSize="8"
        fontFamily="var(--font-display), sans-serif"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        {label}
      </text>
    </svg>
  );
}

export const RoundIcons = {
  full: (p: { size?: number }) => (
    <Icon {...p} strokeWidth={1.75}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </Icon>
  ),
  force: (p: { size?: number }) => (
    <Icon {...p} strokeWidth={1.75}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </Icon>
  ),
  eco: (p: { size?: number }) => (
    <Icon {...p} strokeWidth={1.75}>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.5 8.5c-.8-1-2-1.5-3.2-1.5-2.2 0-3.8 1.5-3.8 3.5S9.1 14 11.3 14c1.3 0 2.5-.6 3.2-1.6" />
      <path d="M8 12h6" />
    </Icon>
  ),
  pistol: (p: { size?: number }) => (
    <Icon {...p} strokeWidth={1.75}>
      <path d="M5 10h11l1 2v2H9l-1 4H6l1-4H5Z" />
      <path d="M14 10V8h3v2" />
    </Icon>
  ),
  anti: (p: { size?: number }) => (
    <Icon {...p} strokeWidth={1.75}>
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6Z" />
      <path d="M9 12h6" />
    </Icon>
  ),
  all: (p: { size?: number }) => <CsIcon name="all" size={p.size ?? 13} />,
};
