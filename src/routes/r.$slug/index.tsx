import { createFileRoute, Link } from "@tanstack/react-router";
import { getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/")({ component: Home });

function Home() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  const heroTitle = t(
    locale,
    tenant.profile.branding.heroTitleAr || tenant.profile.shortAr || tenant.profile.nameAr,
    tenant.profile.branding.heroTitleEn || tenant.profile.shortEn || tenant.profile.nameEn,
  );
  return (
    <div>
      <section className="relative">
        <img
          src={tenant.profile.coverUrl || tenant.items[0]?.imageUrl || ""}
          alt=""
          className="h-[420px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          {tenant.profile.logoUrl ? (
            <img src={tenant.profile.logoUrl} alt="" className="mb-3 h-12 object-contain" />
          ) : null}
          <h1 className="font-display text-4xl uppercase">{heroTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            {t(locale, tenant.profile.shortAr || "", tenant.profile.shortEn || "")}
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link to="/r/$slug/menu" params={{ slug: tenant.slug }}>
                {t(locale, "اطلب الآن", "Order now")}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/r/$slug/offers" params={{ slug: tenant.slug }}>
                {t(locale, "العروض", "Offers")}
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-4 gap-2 p-4">
        {tenant.categories.slice(0, 4).map((c) => (
          <Link
            key={c.id}
            to="/r/$slug/menu"
            params={{ slug: tenant.slug }}
            search={{ cat: c.slug }}
            className="rounded-[length:var(--radius-md)] bg-elevated p-2 text-center text-[11px]"
          >
            {t(locale, c.nameAr, c.nameEn)}
          </Link>
        ))}
      </section>
      <section className="px-4 pb-6">
        <h2 className="font-display text-2xl">{t(locale, "الأكثر طلباً", "Featured")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {tenant.items
            .filter((i) => i.featured)
            .slice(0, 4)
            .map((item) => (
              <Link
                key={item.id}
                to="/r/$slug/product/$itemSlug"
                params={{ slug: tenant.slug, itemSlug: item.slug }}
                className="overflow-hidden rounded-[length:var(--radius-lg)] bg-surface"
              >
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-28 w-full object-cover" /> : null}
                <div className="p-2">
                  <p className="text-sm font-medium">{t(locale, item.nameAr, item.nameEn)}</p>
                  <p className="text-xs text-primary">
                    {item.price} {tenant.profile.currency}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
