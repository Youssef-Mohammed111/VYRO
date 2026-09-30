import { Link } from "@tanstack/react-router";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";
import { cn } from "@/lib/utils";

type Variant = "mark" | "lockup" | "word";

export function VyroLogo({
  variant = "mark",
  to = "/",
  className,
  imgClassName,
}: {
  variant?: Variant;
  to?: string | false;
  className?: string;
  imgClassName?: string;
}) {
  const inner =
    variant === "lockup" ? (
      <img
        src={PLATFORM_BRAND.logoUrl}
        alt={`${PLATFORM_BRAND.name} — ${PLATFORM_BRAND.tagline}`}
        className={cn("h-auto w-full max-w-md object-contain", imgClassName)}
      />
    ) : variant === "word" ? (
      <span className="font-display text-lg tracking-[0.22em] text-fg">{PLATFORM_BRAND.name}</span>
    ) : (
      <>
        <img src={PLATFORM_BRAND.markUrl} alt="" className={cn("h-8 w-auto object-contain", imgClassName)} />
        <span className="font-display text-lg tracking-[0.2em] text-fg">{PLATFORM_BRAND.name}</span>
      </>
    );

  if (to === false) {
    return <span className={cn("inline-flex items-center gap-2", className)}>{inner}</span>;
  }
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2", className)} aria-label={PLATFORM_BRAND.name}>
      {inner}
    </Link>
  );
}
