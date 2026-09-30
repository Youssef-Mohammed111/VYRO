import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";

const parent = getRouteApi("/r/$slug");
export const Route = createFileRoute("/r/$slug/offers")({ component: Offers });

function Offers() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  return (
    <div className="p-4">
      <h1 className="font-display text-3xl">{t(locale, "العروض الخاصة", "Special Offers")}</h1>
      <div className="mt-4 space-y-3">
        {tenant.offers.map((o) => (
          <Link
            key={o.id}
            to="/r/$slug/product/$itemSlug"
            params={{ slug: tenant.slug, itemSlug: o.slug }}
            className="block overflow-hidden rounded-[length:var(--radius-xl)] bg-surface"
          >
            {o.imageUrl ? <img src={o.imageUrl} alt="" className="h-40 w-full object-cover" /> : null}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{t(locale, o.nameAr, o.nameEn)}</p>
                  <p className="mt-1 text-sm text-muted">{t(locale, o.descAr || "", o.descEn || "")}</p>
                </div>
                <p className="rounded-full bg-primary px-3 py-1 text-sm text-primary-fg">
                  {o.price} {tenant.profile.currency}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
