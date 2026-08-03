import { stratlineMarkUrl } from "../lib/icons";

/** Header brand: eyebrow + list→play mark + Stratline wordmark. */
export function BrandLockup({ eyebrow }: { eyebrow: string }) {
  return (
    <p className="brand">
      <span>{eyebrow}</span>
      <span className="brand-mark">
        <img className="brand-icon" src={stratlineMarkUrl()} alt="" width={22} height={22} />
        Stratline
      </span>
    </p>
  );
}
