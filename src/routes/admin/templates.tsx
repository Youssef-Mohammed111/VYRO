import { createFileRoute } from "@tanstack/react-router";
import { getSuperDashboard, listTemplates } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t, useLocale } from "@/lib/vyro/locale";
import { presetFor } from "@/lib/vyro/presets";

export const Route = createFileRoute("/admin/templates")({
  loader: async () => {
    const [templates, dash] = await Promise.all([listTemplates(), getSuperDashboard()]);
    return { templates, tenants: dash.tenants };
  },
  component: Page,
});

type Row = Record<string, unknown>;

function Page() {
  const { templates, tenants } = Route.useLoaderData();
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">{t(locale, "القوالب", "Templates")}</h1>
      <p className="text-sm text-muted">
        {t(
          locale,
          "كل عميل بياخد قالب جاهز، ومبيقدرش يعدّل التصميم. غيّر قالب العميل من صفحة العملاء.",
          "Each client gets a ready template and cannot edit the layout. Change a client's template from Clients.",
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(templates as Row[]).map((tm) => {
          const id = String(tm.id);
          const users = (tenants as Row[]).filter((tn) => String(tn.template_id) === id);
          const pr = presetFor(String(tm.family));
          return (
            <Card key={id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl">{t(locale, String(tm.name_ar), String(tm.name_en))}</p>
                  <p className="text-xs text-muted">
                    {String(tm.industry)} · v{String(tm.version)}
                  </p>
                </div>
                <Badge>{t(locale, presetFor(String(tm.family)).labelAr, presetFor(String(tm.family)).labelEn)}</Badge>
              </div>
              <p className="text-sm text-muted">
                {t(locale, `يبدأ بـ ${pr.items.length} عنصر تجريبي في ${pr.cats.length} أقسام · زرار: ${pr.ctaAr}`, `Starts with ${pr.items.length} sample items in ${pr.cats.length} categories · CTA: ${pr.ctaEn}`)}
              </p>
              <p className="text-sm text-muted">
                {users.length === 0
                  ? t(locale, "مفيش عملاء بيستخدموه", "No clients use it")
                  : `${t(locale, "مستخدم عند", "Used by")}: ${users.map((u) => String(u.name)).join("، ")}`}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
