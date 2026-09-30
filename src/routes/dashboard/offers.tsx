import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { listOffers, setOfferActive, upsertOffer } from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/dashboard/offers")({
  loader: () => listOffers({ data: {} }),
  component: Page,
});

type Row = Record<string, unknown>;

function Page() {
  const offers = Route.useLoaderData() as Row[];
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const current = editing && editing !== "new" ? offers.find((o) => o.id === editing) : undefined;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await upsertOffer({
        data: {
          id: current ? String(current.id) : undefined,
          slug: String(fd.get("slug") || "").trim().toLowerCase(),
          nameEn: String(fd.get("nameEn")),
          nameAr: String(fd.get("nameAr")),
          descEn: String(fd.get("descEn") || ""),
          descAr: String(fd.get("descAr") || ""),
          price: Math.round(Number(fd.get("price") || 0)),
          imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
          active: fd.get("active") === "on",
        },
      });
      toast.success(t(locale, "تم حفظ العرض", "Offer saved"));
      setEditing(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t(locale, "العروض", "Offers")}</h1>
        <Button onClick={() => setEditing("new")}>{t(locale, "إنشاء عرض", "Create offer")}</Button>
      </div>
      <p className="text-xs text-muted">
        {t(locale, "كل عرض بيظهر في صفحة العروض ويتباع من الكارت زي أي منتج.", "Each offer shows on the Offers page and can be ordered like any product.")}
      </p>
      {offers.map((o) => {
        const active = o.active === true;
        return (
          <Card key={String(o.id)} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl">{String(locale === "ar" ? o.name_ar : o.name_en)}</p>
              <p className="text-sm text-muted">
                {String(o.price)} EGP · {String(o.slug)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={active ? "success" : "muted"}>{active ? t(locale, "مفعّل", "Active") : t(locale, "متوقف", "Off")}</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await setOfferActive({ data: { id: String(o.id), active: !active } });
                    await router.invalidate();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              >
                {active ? t(locale, "إيقاف", "Disable") : t(locale, "تفعيل", "Enable")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(String(o.id))}>
                {t(locale, "تعديل", "Edit")}
              </Button>
            </div>
          </Card>
        );
      })}
      {editing ? (
        <Card>
          <form key={editing} className="grid gap-3" onSubmit={save}>
            <Input name="nameEn" placeholder="Name EN" required defaultValue={String(current?.name_en ?? "")} />
            <Input name="nameAr" placeholder="Name AR" required defaultValue={String(current?.name_ar ?? "")} />
            <Input name="slug" placeholder="slug (a-z, 0-9, -)" required defaultValue={String(current?.slug ?? "")} />
            <Input name="price" type="number" min={0} placeholder="Price" required defaultValue={current ? String(current.price ?? 0) : ""} />
            <Input name="imageUrl" placeholder="Image URL (/path or https://)" defaultValue={String(current?.image_url ?? "")} />
            <div>
              <Label htmlFor="descEn">Description EN</Label>
              <Textarea id="descEn" name="descEn" defaultValue={String(current?.desc_en ?? "")} />
            </div>
            <div>
              <Label htmlFor="descAr">Description AR</Label>
              <Textarea id="descAr" name="descAr" defaultValue={String(current?.desc_ar ?? "")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={current ? current.active === true : true} /> {t(locale, "مفعّل", "Active")}
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "…" : "Save"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
