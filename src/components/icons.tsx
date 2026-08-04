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

export const ChevronUp = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="m18 15-6-6-6 6" />
  </Icon>
);

export const ChevronDown = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ExternalLink = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
);

/** Discord mark (filled Clyde). */
export const Discord = (p: { size?: number }) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.07.07 0 0 0-.079.04c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.08.08 0 0 0-.079-.04A19.7 19.7 0 0 0 3.677 4.37a.09.09 0 0 0-.04.04C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.08.08 0 0 0 .084-.028 14 14 0 0 0 1.226-1.994.08.08 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.08.08 0 0 1-.008-.127c.126-.094.252-.192.372-.291a.08.08 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.08.08 0 0 1 .079.01c.12.098.246.198.373.292a.08.08 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.08.08 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.08.08 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.08.08 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.04-.04ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
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

/** Strat roulette / meme */
export const Dice = (p: { size?: number }) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

/** Playbook tab — open book with spine (not list→play, not pause bars). */
export const BookOpen = (p: { size?: number }) => (
  <Icon {...p}>
    <path d="M12 7v13" />
    <path d="M12 7c-2.8-1.6-6.5-1.8-8.5-.4v13.2c2.5-1.2 5.7-.9 8.5.5" />
    <path d="M12 7c2.8-1.6 6.5-1.8 8.5-.4v13.2c-2.5-1.2-5.7-.9-8.5.5" />
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

/** Compact map marks: original glyphs, not Valve art */
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

/** Bomb-site / filter icons: official CS map markers where available. */
export function SiteIcon({ site, size = 12 }: { site: string; size?: number }) {
  const key =
    site === "a"
      ? "site_a"
      : site === "b"
        ? "site_b"
        : site === "mid"
          ? "site_mid"
          : site === "outside"
            ? "outside"
            : site === "ramp"
              ? "ramp"
              : site === "all"
                ? "all"
                : null;
  if (key) return <CsIcon name={key} size={size} />;
  // Other / uncategorized: letter badge
  const label = site === "default" ? "O" : String(site).toUpperCase().slice(0, 1) || "?";
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
