import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { deleteCatalogItem, getCatalogAdmin, setItemAvailability, upsertCatalogItem } from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/dashboard/catalog")({
  loader: () => getCatalogAdmin({ data: {} }),
  component: CatalogPage,
});

type Row = Record<string, unknown>;

function CatalogPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data.items as Row[];
  const categories = data.categories as Row[];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (cat && i.category_id !== cat) return false;
      if (!q) return true;
      return [i.name_en, i.name_ar, i.slug].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [items, query, cat]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const compare = String(fd.get("compareAt") || "");
    setBusy(true);
    try {
      await upsertCatalogItem({
        data: {
          id: editing && editing !== "new" ? editing : undefined,
          categoryId: String(fd.get("categoryId") || "") || undefined,
          slug: String(fd.get("slug") || "").trim().toLowerCase(),
          nameEn: String(fd.get("nameEn")),
          nameAr: String(fd.get("nameAr")),
          descEn: String(fd.get("descEn") || ""),
          descAr: String(fd.get("descAr") || ""),
          price: Math.round(Number(fd.get("price") || 0)),
          compareAt: compare ? Math.round(Number(compare)) : null,
          imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
          available: fd.get("available") === "on",
          featured: fd.get("featured") === "on",
        },
      });
      toast.success(t(locale, "تم الحفظ", "Saved"));
      setEditing(null);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const current = editing && editing !== "new" ? items.find((i) => i.id === editing) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t(locale, "الكتالوج / المنيو", "Catalog")}</h1>
        <Button onClick={() => setEditing("new")}>{t(locale, "إضافة منتج", "Add product")}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted" />
          <Input className="ps-9" placeholder={t(locale, "بحث في المنتجات", "Search products")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-11 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-sm"
        >
          <option value="">{t(locale, "كل التصنيفات", "All categories")}</option>
          {categories.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {String(locale === "ar" ? c.name_ar : c.name_en)}
            </option>
          ))}
        </select>
      </div>
      {shown.length === 0 ? <p className="text-sm text-muted">{t(locale, "لا توجد منتجات.", "No products.")}</p> : null}
      <div className="grid gap-3">
        {shown.map((item) => {
          const available = item.available === true;
          return (
            <Card key={String(item.id)} className="flex flex-wrap items-center gap-3 p-3">
              {item.image_url ? <img src={String(item.image_url)} alt="" className="size-14 rounded-[length:var(--radius-sm)] object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <p className="truncate">{String(locale === "ar" ? item.name_ar : item.name_en)}</p>
                <p className="text-xs text-muted">
                  {String(item.price)} EGP · {String(item.slug)}
                </p>
              </div>
              <Badge tone={available ? "success" : "danger"}>{available ? t(locale, "متاح", "In stock") : t(locale, "نفد", "Sold out")}</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await setItemAvailability({ data: { id: String(item.id), available: !available } });
                    await router.invalidate();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              >
                {available ? t(locale, "نفد", "Sold out") : t(locale, "متوفر", "Restock")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(String(item.id))}>
                {t(locale, "تعديل", "Edit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!window.confirm(t(locale, "حذف المنتج نهائياً؟", "Delete this product permanently?"))) return;
                  try {
                    await deleteCatalogItem({ data: { id: String(item.id) } });
                    toast.success(t(locale, "تم الحذف", "Deleted"));
                    await router.invalidate();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              >
                {t(locale, "حذف", "Delete")}
              </Button>
            </Card>
          );
        })}
      </div>
      {editing ? (
        <Card>
          {/* key remounts the form when switching between products so defaultValues refresh */}
          <form key={editing} className="grid gap-3 md:grid-cols-2" onSubmit={save}>
            <Field name="nameEn" label="Name EN" defaultValue={str(current, "name_en")} />
            <Field name="nameAr" label="Name AR" defaultValue={str(current, "name_ar")} />
            <Field name="slug" label="Slug (a-z, 0-9, -)" defaultValue={str(current, "slug")} />
            <Field name="price" label="Price" type="number" defaultValue={str(current, "price")} />
            <Field name="compareAt" label={t(locale, "السعر قبل الخصم (اختياري)", "Compare-at price (optional)")} type="number" defaultValue={str(current, "compare_at")} required={false} />
            <Field name="imageUrl" label="Image URL (/path or https://)" defaultValue={str(current, "image_url")} required={false} />
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={str(current, "category_id")}
                className="mt-1 h-11 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-sm"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name_en)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="descEn">Description EN</Label>
              <Textarea id="descEn" name="descEn" defaultValue={str(current, "desc_en")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="descAr">Description AR</Label>
              <Textarea id="descAr" name="descAr" defaultValue={str(current, "desc_ar")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="available" defaultChecked={current ? current.available === true : true} /> Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" defaultChecked={current ? current.featured === true : false} /> Featured
            </label>
            <div className="flex gap-2 md:col-span-2">
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

function str(row: Row | undefined, key: string) {
  return row?.[key] != null ? String(row[key]) : "";
}

function Field({ name, label, defaultValue, type = "text", required = true }: { name: string; label: string; defaultValue: string; type?: string; required?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} type={type} required={required} min={type === "number" ? 0 : undefined} />
    </div>
  );
}
