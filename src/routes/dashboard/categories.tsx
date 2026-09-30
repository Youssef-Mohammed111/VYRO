import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { deleteCategory, getCatalogAdmin, reorderCategories, upsertCategory } from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/dashboard/categories")({
  loader: () => getCatalogAdmin({ data: {} }),
  component: Page,
});

type Row = Record<string, unknown>;

function Page() {
  const { categories, items } = Route.useLoaderData() as { categories: Row[]; items: Row[] };
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const current = editing && editing !== "new" ? categories.find((c) => c.id === editing) : undefined;
  const countIn = (id: unknown) => items.filter((i) => i.category_id === id).length;

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const ids = categories.map((c) => String(c.id));
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    void run(() => reorderCategories({ data: { ids } }));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(async () => {
      await upsertCategory({
        data: {
          id: current ? String(current.id) : undefined,
          slug: String(fd.get("slug") || "").trim().toLowerCase(),
          nameEn: String(fd.get("nameEn")),
          nameAr: String(fd.get("nameAr")),
          imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
          active: fd.get("active") === "on",
        },
      });
      setEditing(null);
    }, t(locale, "تم الحفظ", "Saved"));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t(locale, "التصنيفات", "Categories")}</h1>
        <Button onClick={() => setEditing("new")}>{t(locale, "إضافة تصنيف", "Add category")}</Button>
      </div>
      <p className="text-sm text-muted">{t(locale, "استخدم الأسهم لترتيب التصنيفات في المنيو.", "Use the arrows to set the order shown in the menu.")}</p>
      {categories.map((c, i) => (
        <Card key={String(c.id)} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate">{String(locale === "ar" ? c.name_ar : c.name_en)}</p>
            <p className="text-xs text-muted">
              {String(c.slug)} · {t(locale, `${countIn(c.id)} منتج`, `${countIn(c.id)} products`)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge tone={c.active === true ? "success" : "muted"}>{c.active === true ? t(locale, "ظاهر", "Visible") : t(locale, "مخفي", "Hidden")}</Badge>
            <Button size="icon" variant="ghost" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="up">
              <ArrowUp className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" disabled={busy || i === categories.length - 1} onClick={() => move(i, 1)} aria-label="down">
              <ArrowDown className="size-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(String(c.id))}>
              {t(locale, "تعديل", "Edit")}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={busy}
              aria-label="delete"
              onClick={() => {
                const n = countIn(c.id);
                const msg = n
                  ? t(locale, `حذف التصنيف؟ ${n} منتج هيفضل بدون تصنيف.`, `Delete this category? ${n} products will be left uncategorized.`)
                  : t(locale, "حذف التصنيف؟", "Delete this category?");
                if (window.confirm(msg)) void run(() => deleteCategory({ data: { id: String(c.id) } }), t(locale, "تم الحذف", "Deleted"));
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
      {editing ? (
        <Card>
          <form key={editing} className="grid gap-3 md:grid-cols-2" onSubmit={save}>
            <div>
              <Label htmlFor="nameEn">Name EN</Label>
              <Input id="nameEn" name="nameEn" required defaultValue={String(current?.name_en ?? "")} />
            </div>
            <div>
              <Label htmlFor="nameAr">Name AR</Label>
              <Input id="nameAr" name="nameAr" required defaultValue={String(current?.name_ar ?? "")} />
            </div>
            <div>
              <Label htmlFor="slug">Slug (a-z, 0-9, -)</Label>
              <Input id="slug" name="slug" required defaultValue={String(current?.slug ?? "")} />
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL (/path or https://)</Label>
              <Input id="imageUrl" name="imageUrl" defaultValue={String(current?.image_url ?? "")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={current ? current.active === true : true} /> {t(locale, "ظاهر في المنيو", "Visible in menu")}
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "…" : t(locale, "حفظ", "Save")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t(locale, "إلغاء", "Cancel")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
