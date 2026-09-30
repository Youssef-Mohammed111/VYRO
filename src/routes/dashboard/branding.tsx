import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getTenantDashboard, updateBranding } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";
import { contrastText, isHexColor } from "@/lib/vyro/validation";

export const Route = createFileRoute("/dashboard/branding")({
  loader: () => getTenantDashboard({ data: {} }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const p = (data.profile ?? {}) as Record<string, unknown>;
  let branding: Record<string, string> = {};
  try {
    branding = JSON.parse(String(p.branding_json || "{}"));
  } catch {
    branding = {};
  }
  const [color, setColor] = useState(isHexColor(branding.primary ?? "") ? branding.primary : "#1a8cff");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await updateBranding({
        data: {
          primary: color,
          heroTitleEn: String(fd.get("heroTitleEn") || ""),
          heroTitleAr: String(fd.get("heroTitleAr") || ""),
          logoUrl: String(fd.get("logoUrl") || "").trim(),
          coverUrl: String(fd.get("coverUrl") || "").trim(),
        },
      });
      toast.success(t(locale, "تم حفظ الهوية", "Branding saved"));
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl">{t(locale, "الهوية", "Branding")}</h1>
      <p className="text-sm text-muted">{t(locale, "الألوان والعناوين والصور فقط — هيكل القالب ثابت.", "Colors, titles and images only — the template structure is locked.")}</p>
      <form className="space-y-4" onSubmit={save}>
        <Card className="space-y-3">
          <Label htmlFor="primary">{t(locale, "اللون الأساسي", "Primary color")}</Label>
          <div className="flex items-center gap-3">
            <input id="primary" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-16 cursor-pointer rounded border border-border bg-elevated" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="max-w-32" maxLength={7} />
            <span
              className="rounded-full px-4 py-2 text-sm"
              style={{ background: isHexColor(color) ? color : "#1a8cff", color: contrastText(color) }}
            >
              {t(locale, "معاينة الزر", "Button preview")}
            </span>
          </div>
        </Card>
        <Card className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="heroTitleEn">Hero title EN</Label>
            <Input id="heroTitleEn" name="heroTitleEn" defaultValue={branding.heroTitleEn ?? ""} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="heroTitleAr">Hero title AR</Label>
            <Input id="heroTitleAr" name="heroTitleAr" defaultValue={branding.heroTitleAr ?? ""} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="logoUrl">Logo URL (/path or https://)</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={String(p.logo_url ?? "")} />
          </div>
          <div>
            <Label htmlFor="coverUrl">Cover URL (/path or https://)</Label>
            <Input id="coverUrl" name="coverUrl" defaultValue={String(p.cover_url ?? "")} />
          </div>
        </Card>
        <Button type="submit" disabled={busy}>
          {busy ? "…" : t(locale, "حفظ", "Save")}
        </Button>
      </form>
    </div>
  );
}
