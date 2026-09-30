import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getTenantDashboard, updateBusinessProfile } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { t, useLocale } from "@/lib/vyro/locale";
import { DAY_KEYS, DAY_LABEL, parseHours } from "@/lib/vyro/hours";

export const Route = createFileRoute("/dashboard/profile")({
  loader: () => getTenantDashboard({ data: {} }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const p = (data.profile ?? {}) as Record<string, unknown>;
  const hours = parseHours(String(p.hours_json ?? "{}"));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) || "").trim();
    const opening: Record<string, string> = {};
    for (const d of DAY_KEYS) opening[d] = get(`hours_${d}`);
    setBusy(true);
    try {
      await updateBusinessProfile({
        data: {
          nameEn: get("nameEn"),
          nameAr: get("nameAr"),
          shortEn: get("shortEn"),
          shortAr: get("shortAr"),
          descEn: get("descEn"),
          descAr: get("descAr"),
          phone: get("phone"),
          whatsapp: get("whatsapp"),
          email: get("email"),
          addressEn: get("addressEn"),
          addressAr: get("addressAr"),
          mapsUrl: get("mapsUrl"),
          reviewUrl: get("reviewUrl"),
          facebookUrl: get("facebookUrl"),
          instagramUrl: get("instagramUrl"),
          tiktokUrl: get("tiktokUrl"),
          websiteUrl: get("websiteUrl"),
          hours: opening,
          deliveryFee: Math.max(0, Math.round(Number(get("deliveryFee") || 0))),
          minOrder: Math.max(0, Math.round(Number(get("minOrder") || 0))),
          acceptingOrders: fd.get("acceptingOrders") === "on",
        },
      });
      toast.success(t(locale, "تم حفظ الملف", "Profile saved"));
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid max-w-3xl gap-3 md:grid-cols-2" onSubmit={save}>
      <h1 className="font-display text-3xl md:col-span-2">{t(locale, "ملف النشاط", "Business profile")}</h1>
      <F name="nameEn" label="Name EN" defaultValue={String(p.name_en ?? "")} required />
      <F name="nameAr" label="Name AR" defaultValue={String(p.name_ar ?? "")} required />
      <F name="shortEn" label="Short EN" defaultValue={String(p.short_en ?? "")} />
      <F name="shortAr" label="Short AR" defaultValue={String(p.short_ar ?? "")} />
      <F name="phone" label="Phone" defaultValue={String(p.phone ?? "")} />
      <F name="whatsapp" label="WhatsApp (01xxxxxxxxx or +20…)" defaultValue={String(p.whatsapp ?? "")} />
      <F name="email" label="Email" defaultValue={String(p.email ?? "")} />
      <F name="mapsUrl" label="Google Maps URL (https)" defaultValue={String(p.maps_url ?? "")} />
      <F name="reviewUrl" label="Google Review URL (https)" defaultValue={String(p.review_url ?? "")} />
      <F name="facebookUrl" label="Facebook URL (https)" defaultValue={String(p.facebook_url ?? "")} />
      <F name="instagramUrl" label="Instagram URL (https)" defaultValue={String(p.instagram_url ?? "")} />
      <F name="tiktokUrl" label="TikTok URL (https)" defaultValue={String(p.tiktok_url ?? "")} />
      <F name="websiteUrl" label="Website (https)" defaultValue={String(p.website_url ?? "")} />
      <F name="addressEn" label="Address EN" defaultValue={String(p.address_en ?? "")} />
      <F name="addressAr" label="Address AR" defaultValue={String(p.address_ar ?? "")} />
      <div className="md:col-span-2">
        <Label htmlFor="descEn">Description EN</Label>
        <Textarea id="descEn" name="descEn" defaultValue={String(p.desc_en ?? "")} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="descAr">Description AR</Label>
        <Textarea id="descAr" name="descAr" defaultValue={String(p.desc_ar ?? "")} />
      </div>

      <Card className="grid gap-3 md:col-span-2 md:grid-cols-3">
        <p className="text-sm font-medium md:col-span-3">{t(locale, "إعدادات الطلب", "Ordering")}</p>
        <F name="deliveryFee" label={t(locale, "رسوم التوصيل", "Delivery fee")} type="number" defaultValue={String(p.delivery_fee ?? 30)} />
        <F name="minOrder" label={t(locale, "الحد الأدنى للطلب", "Minimum order")} type="number" defaultValue={String(p.min_order ?? 0)} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" name="acceptingOrders" defaultChecked={p.accepting_orders !== false} /> {t(locale, "استقبال الطلبات", "Accepting orders")}
        </label>
      </Card>

      <Card className="grid gap-3 md:col-span-2 md:grid-cols-2">
        <p className="text-sm font-medium md:col-span-2">
          {t(locale, "مواعيد العمل", "Opening hours")}{" "}
          <span className="text-xs text-muted">{t(locale, "مثال: 12:00–02:00 أو closed", "e.g. 12:00–02:00 or closed")}</span>
        </p>
        {DAY_KEYS.map((d) => (
          <div key={d} className="flex items-center gap-2">
            <span className="w-24 text-sm text-muted">{DAY_LABEL[d][locale]}</span>
            <Input name={`hours_${d}`} defaultValue={hours[d] ?? ""} placeholder="12:00–02:00" />
          </div>
        ))}
      </Card>

      <Button type="submit" className="md:col-span-2" disabled={busy}>
        {busy ? "…" : t(locale, "حفظ", "Save")}
      </Button>
    </form>
  );
}

function F({ name, label, defaultValue, type = "text", required }: { name: string; label: string; defaultValue: string; type?: string; required?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} type={type} required={required} min={type === "number" ? 0 : undefined} />
    </div>
  );
}
