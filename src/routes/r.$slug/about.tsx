import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";

const parent = getRouteApi("/r/$slug");
export const Route = createFileRoute("/r/$slug/about")({ component: About });

function About() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-4 p-4">
      {tenant.profile.logoUrl ? <img src={tenant.profile.logoUrl} alt="" className="mx-auto h-20 object-contain" /> : null}
      <h1 className="text-center font-display text-3xl">{t(locale, tenant.profile.nameAr, tenant.profile.nameEn)}</h1>
      <p className="text-sm leading-7 text-muted">{t(locale, tenant.profile.descAr || "", tenant.profile.descEn || "")}</p>
    </div>
  );
}
