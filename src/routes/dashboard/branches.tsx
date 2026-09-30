import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { deleteBranch, listBranches, upsertBranch } from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/dashboard/branches")({
  loader: () => listBranches({ data: {} }),
  component: Page,
});

type Row = Record<string, unknown>;

function Page() {
  const branches = Route.useLoaderData() as Row[];
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const current = editing && editing !== "new" ? branches.find((b) => b.id === editing) : undefined;

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

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) || "").trim();
    await run(async () => {
      await upsertBranch({
        data: {
          id: current ? String(current.id) : undefined,
          nameEn: get("nameEn"),
          nameAr: get("nameAr"),
          addressEn: get("addressEn"),
          addressAr: get("addressAr"),
          phone: get("phone"),
          whatsapp: get("whatsapp"),
          mapsUrl: get("mapsUrl"),
          status: fd.get("active") === "on" ? "active" : "inactive",
        },
      });
      setEditing(null);
    }, t(locale, "تم الحفظ", "Saved"));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t(locale, "الفروع", "Branches")}</h1>
        <Button onClick={() => setEditing("new")}>{t(locale, "إضافة فرع", "Add branch")}</Button>
      </div>
      {branches.map((b) => (
        <Card key={String(b.id)} className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl">{String(locale === "ar" ? b.name_ar : b.name_en)}</p>
            <p className="text-sm text-muted">{String((locale === "ar" ? b.address_ar : b.address_en) ?? "")}</p>
            <p className="text-sm">{String(b.phone ?? "")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={b.status === "active" ? "success" : "muted"}>{b.status === "active" ? t(locale, "نشط", "Active") : t(locale, "متوقف", "Inactive")}</Badge>
            <Button size="sm" variant="secondary" onClick={() => setEditing(String(b.id))}>
              {t(locale, "تعديل", "Edit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || branches.length <= 1}
              onClick={() => {
                if (window.confirm(t(locale, "حذف الفرع؟", "Delete this branch?"))) {
                  void run(() => deleteBranch({ data: { id: String(b.id) } }), t(locale, "تم الحذف", "Deleted"));
                }
              }}
            >
              {t(locale, "حذف", "Delete")}
            </Button>
          </div>
        </Card>
      ))}
      {editing ? (
        <Card>
          <form key={editing} className="grid gap-3 md:grid-cols-2" onSubmit={save}>
            <F name="nameEn" label="Name EN" defaultValue={String(current?.name_en ?? "")} required />
            <F name="nameAr" label="Name AR" defaultValue={String(current?.name_ar ?? "")} required />
            <F name="addressEn" label="Address EN" defaultValue={String(current?.address_en ?? "")} />
            <F name="addressAr" label="Address AR" defaultValue={String(current?.address_ar ?? "")} />
            <F name="phone" label="Phone" defaultValue={String(current?.phone ?? "")} />
            <F name="whatsapp" label="WhatsApp" defaultValue={String(current?.whatsapp ?? "")} />
            <F name="mapsUrl" label="Google Maps URL (https)" defaultValue={String(current?.maps_url ?? "")} />
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" name="active" defaultChecked={current ? current.status === "active" : true} /> {t(locale, "نشط", "Active")}
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

function F({ name, label, defaultValue, required }: { name: string; label: string; defaultValue: string; required?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required={required} />
    </div>
  );
}
