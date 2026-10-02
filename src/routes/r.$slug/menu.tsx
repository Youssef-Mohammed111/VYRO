import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { z } from "zod";
import { t, useLocale } from "@/lib/vyro/locale";
import { cn } from "@/lib/utils";
import { presetFor } from "@/lib/vyro/presets";
import { ItemCard, ItemRow } from "@/features/storefront/blocks";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/menu")({
  validateSearch: z.object({ cat: z.string().optional() }),
  component: Menu,
});

function Menu() {
  const tenant = parent.useLoaderData();
  const { cat } = Route.useSearch();
  const locale = useLocale((s) => s.locale);
  const preset = presetFor(tenant.templateFamily);
  const listMode = preset.kind === "service" || preset.kind === "showcase";
  const active = cat || tenant.categories[0]?.slug;
  const category = tenant.categories.find((c) => c.slug === active);
  const items = tenant.items.filter((i) => i.categoryId === category?.id);
  return (
    <div className="p-4">
      <h1 className="font-display text-3xl">{t(locale, preset.catalogAr, preset.catalogEn)}</h1>
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
      {listMode ? (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              slug={tenant.slug}
              item={item}
              locale={locale}
              currency={tenant.profile.currency}
              cta={preset.kind === "service" ? t(locale, "احجز", "Book") : t(locale, "تفاصيل", "Details")}
              from={preset.kind === "showcase" ? t(locale, "يبدأ من", "From") : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} slug={tenant.slug} item={item} locale={locale} currency={tenant.profile.currency} />
          ))}
        </div>
      )}
    </div>
  );
}
