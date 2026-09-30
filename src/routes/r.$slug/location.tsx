import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackPublicEvent } from "@/lib/vyro/public";

const parent = getRouteApi("/r/$slug");
export const Route = createFileRoute("/r/$slug/location")({ component: LocationPage });

function LocationPage() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  const hours = (() => {
    try {
      return JSON.parse(tenant.profile.hoursJson) as Record<string, string>;
    } catch {
      return {};
    }
  })();
  return (
    <div className="space-y-4 p-4">
      <h1 className="font-display text-3xl">{t(locale, "تواصل معنا", "Find us")}</h1>
      <Card>
        <p>{t(locale, tenant.profile.addressAr || "", tenant.profile.addressEn || "")}</p>
        {tenant.profile.mapsUrl ? (
          <Button asChild className="mt-3" variant="secondary">
            <a href={tenant.profile.mapsUrl} target="_blank" rel="noreferrer">
              {t(locale, "افتح الخريطة", "Open maps")}
            </a>
          </Button>
        ) : null}
      </Card>
      <Card className="space-y-2">
        {tenant.profile.phone ? (
          <Button asChild className="w-full" onClick={() => void trackPublicEvent({ data: { slug: tenant.slug, event: "call_click" } })}>
            <a href={`tel:${tenant.profile.phone}`}>{t(locale, "اتصل", "Call")} {tenant.profile.phone}</a>
          </Button>
        ) : null}
        {tenant.profile.whatsapp ? (
          <Button
            asChild
            variant="secondary"
            className="w-full"
            onClick={() => void trackPublicEvent({ data: { slug: tenant.slug, event: "whatsapp_click" } })}
          >
            <a href={`https://wa.me/${tenant.profile.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        ) : null}
      </Card>
      <Card>
        <p className="text-sm text-muted">{t(locale, "ساعات العمل", "Hours")}</p>
        <p className="mt-2 text-sm">{Object.values(hours)[0] || "12:00–02:00"}</p>
      </Card>
    </div>
  );
}
