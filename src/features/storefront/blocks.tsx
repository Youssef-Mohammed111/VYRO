import { Link } from "@tanstack/react-router";
import type { PublicItem } from "@/lib/vyro/types";
import { t } from "@/lib/vyro/locale";

type Loc = Parameters<typeof t>[0];

export function Cover({ src, label, className }: { src: string | null | undefined; label: string; className: string }) {
  if (src) return <img src={src} alt="" className={`${className} object-cover`} />;
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-primary/40 to-elevated`}>
      <span className="font-display text-3xl text-primary-fg/80">{label.trim().charAt(0)}</span>
    </div>
  );
}

export function Price({ item, currency, from }: { item: PublicItem; currency: string; from?: string }) {
  return (
    <span className="whitespace-nowrap">
      {from ? <span className="text-muted">{from} </span> : null}
      <span className="font-medium text-primary">
        {item.price.toLocaleString("en-US")} {currency}
      </span>
      {item.compareAt && item.compareAt > item.price ? (
        <span className="ms-2 text-xs text-subtle line-through">{item.compareAt.toLocaleString("en-US")}</span>
      ) : null}
    </span>
  );
}

export function ItemCard({ slug, item, locale, currency }: { slug: string; item: PublicItem; locale: Loc; currency: string }) {
  const name = t(locale, item.nameAr, item.nameEn);
  return (
    <Link
      to="/r/$slug/product/$itemSlug"
      params={{ slug, itemSlug: item.slug }}
      className="overflow-hidden rounded-[length:var(--radius-lg)] bg-surface"
    >
      <Cover src={item.imageUrl} label={name} className="h-32 w-full" />
      <div className="space-y-1 p-3">
        <p className="text-base font-medium">{name}</p>
        <p className="text-sm">
          <Price item={item} currency={currency} />
        </p>
      </div>
    </Link>
  );
}

export function ItemRow({
  slug,
  item,
  locale,
  currency,
  cta,
  from,
}: {
  slug: string;
  item: PublicItem;
  locale: Loc;
  currency: string;
  cta: string;
  from?: string;
}) {
  const name = t(locale, item.nameAr, item.nameEn);
  const desc = t(locale, item.descAr || "", item.descEn || "");
  return (
    <Link
      to="/r/$slug/product/$itemSlug"
      params={{ slug, itemSlug: item.slug }}
      className="flex items-center gap-3 rounded-[length:var(--radius-lg)] bg-surface p-3"
    >
      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-16 shrink-0 rounded-[length:var(--radius-md)] object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium">{name}</p>
        {desc ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{desc}</p> : null}
        <p className="mt-1 text-sm">
          <Price item={item} currency={currency} from={from} />
        </p>
      </div>
      <span className="shrink-0 rounded-[length:var(--radius-md)] bg-primary px-4 py-2 text-sm text-primary-fg">{cta}</span>
    </Link>
  );
}
