import { createFileRoute, Link } from "@tanstack/react-router";
import { getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { presetFor } from "@/lib/vyro/presets";
import { Cover, ItemCard, ItemRow } from "@/features/storefront/blocks";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/")({ component: Home });

function FoodHome() {
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

function Home() {
  const tenant = parent.useLoaderData();
  const kind = presetFor(tenant.templateFamily).kind;
  if (kind === "retail") return <RetailHome />;
  if (kind === "service") return <ServiceHome />;
  if (kind === "showcase") return <ShowcaseHome />;
  return <FoodHome />;
}

function useStore() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  const preset = presetFor(tenant.templateFamily);
  const name = t(locale, tenant.profile.nameAr, tenant.profile.nameEn);
  const tagline = t(locale, tenant.profile.shortAr || "", tenant.profile.shortEn || "");
  return { tenant, locale, preset, name, tagline, currency: tenant.profile.currency };
}

function RetailHome() {
  const { tenant, locale, preset, name, tagline, currency } = useStore();
  const offers = tenant.items.filter((i) => i.compareAt && i.compareAt > i.price).slice(0, 4);
  const featured = tenant.items.filter((i) => i.featured).slice(0, 6);
  return (
    <div className="space-y-6 p-4">
      <section className="rounded-[length:var(--radius-lg)] bg-primary p-5 text-primary-fg">
        <h1 className="font-display text-3xl">{name}</h1>
        {tagline ? <p className="mt-1 text-sm opacity-90">{tagline}</p> : null}
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/r/$slug/menu" params={{ slug: tenant.slug }}>
            {t(locale, preset.ctaAr, preset.ctaEn)}
          </Link>
        </Button>
      </section>
      <section className="flex gap-2 overflow-x-auto pb-1">
        {tenant.categories.map((c) => (
          <Link
            key={c.id}
            to="/r/$slug/menu"
            params={{ slug: tenant.slug }}
            search={{ cat: c.slug }}
            className="whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2 text-sm"
          >
            {t(locale, c.nameAr, c.nameEn)}
          </Link>
        ))}
      </section>
      {offers.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">{t(locale, "عروض اليوم", "Today's deals")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {offers.map((item) => (
              <ItemCard key={item.id} slug={tenant.slug} item={item} locale={locale} currency={currency} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="font-display text-2xl">{t(locale, preset.featuredAr, preset.featuredEn)}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {featured.map((item) => (
            <ItemCard key={item.id} slug={tenant.slug} item={item} locale={locale} currency={currency} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceHome() {
  const { tenant, locale, preset, name, tagline, currency } = useStore();
  return (
    <div>
      <section className="relative">
        <Cover src={tenant.profile.coverUrl} label={name} className="h-64 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h1 className="font-display text-4xl">{name}</h1>
          {tagline ? <p className="mt-1 text-sm text-muted">{tagline}</p> : null}
          <Button asChild className="mt-3">
            <Link to="/r/$slug/menu" params={{ slug: tenant.slug }}>
              {t(locale, preset.ctaAr, preset.ctaEn)}
            </Link>
          </Button>
        </div>
      </section>
      <div className="space-y-6 p-4">
        {tenant.categories.slice(0, 3).map((c) => {
          const items = tenant.items.filter((i) => i.categoryId === c.id).slice(0, 4);
          if (items.length === 0) return null;
          return (
            <section key={c.id}>
              <h2 className="font-display text-2xl">{t(locale, c.nameAr, c.nameEn)}</h2>
              <div className="mt-3 space-y-2">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    slug={tenant.slug}
                    item={item}
                    locale={locale}
                    currency={currency}
                    cta={t(locale, "احجز", "Book")}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ShowcaseHome() {
  const { tenant, locale, preset, name, tagline, currency } = useStore();
  const wa = (tenant.profile.whatsapp || "").replace(/\D/g, "");
  const tel = (tenant.profile.phone || "").replace(/[^\d+]/g, "");
  const listings = (tenant.items.some((i) => i.featured) ? tenant.items.filter((i) => i.featured) : tenant.items).slice(0, 6);
  return (
    <div>
      <section className="relative">
        <Cover src={tenant.profile.coverUrl} label={name} className="h-72 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h1 className="font-display text-4xl">{name}</h1>
          {tagline ? <p className="mt-1 text-sm text-muted">{tagline}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {wa ? (
              <Button asChild>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                  {t(locale, preset.ctaAr, preset.ctaEn)}
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/r/$slug/menu" params={{ slug: tenant.slug }}>
                  {t(locale, preset.ctaAr, preset.ctaEn)}
                </Link>
              </Button>
            )}
            {tel ? (
              <Button asChild variant="secondary">
                <a href={`tel:${tel}`}>{t(locale, "اتصل بنا", "Call us")}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <section className="space-y-2 p-4">
        <h2 className="font-display text-2xl">{t(locale, preset.featuredAr, preset.featuredEn)}</h2>
        {listings.map((item) => (
          <ItemRow
            key={item.id}
            slug={tenant.slug}
            item={item}
            locale={locale}
            currency={currency}
            cta={t(locale, "تفاصيل", "Details")}
            from={t(locale, "يبدأ من", "From")}
          />
        ))}
        <Button asChild variant="secondary" className="w-full">
          <Link to="/r/$slug/menu" params={{ slug: tenant.slug }}>
            {t(locale, `عرض كل ${preset.catalogAr}`, `View all ${preset.catalogEn}`)}
          </Link>
        </Button>
      </section>
    </div>
  );
}
