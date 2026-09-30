import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { z } from "zod";
import { t, useLocale } from "@/lib/vyro/locale";
import { cn } from "@/lib/utils";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/menu")({
  validateSearch: z.object({ cat: z.string().optional() }),
  component: Menu,
});

function Menu() {
  const tenant = parent.useLoaderData();
  const { cat } = Route.useSearch();
  const locale = useLocale((s) => s.locale);
  const active = cat || tenant.categories[0]?.slug;
  const category = tenant.categories.find((c) => c.slug === active);
  const items = tenant.items.filter((i) => i.categoryId === category?.id);
  return (
    <div className="p-4">
      <h1 className="font-display text-3xl">{t(locale, "المنيو", "Menu")}</h1>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {tenant.categories.map((c) => (
          <Link
            key={c.id}
            to="/r/$slug/menu"
            params={{ slug: tenant.slug }}
            search={{ cat: c.slug }}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-2 text-xs",
              c.slug === active ? "border-primary bg-primary text-primary-fg" : "border-border text-muted",
            )}
          >
            {t(locale, c.nameAr, c.nameEn)}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/r/$slug/product/$itemSlug"
            params={{ slug: tenant.slug, itemSlug: item.slug }}
            className="overflow-hidden rounded-[length:var(--radius-lg)] bg-surface"
          >
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-32 w-full object-cover" /> : null}
            <div className="p-3">
              <p className="text-sm font-medium">{t(locale, item.nameAr, item.nameEn)}</p>
              <p className="mt-1 text-xs text-primary">
                {item.price} {tenant.profile.currency}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
