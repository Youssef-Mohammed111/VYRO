import { createFileRoute } from "@tanstack/react-router";
import { getSuperDashboard, listPlans } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/admin/plans")({
  loader: async () => {
    const [planData, dash] = await Promise.all([listPlans(), getSuperDashboard()]);
    return { plans: planData.plans, features: planData.features, tenants: dash.tenants };
  },
  component: Page,
});

type Row = Record<string, unknown>;

const FEATURE_AR: Record<string, string> = {
  WHATSAPP_ORDERING: "طلبات واتساب",
  QR_CODES: "أكواد QR",
  NFC: "NFC",
  ANALYTICS: "التحليلات",
  OFFERS: "العروض",
  PAYMENT_PROOF: "إثبات الدفع",
  MULTI_BRANCH: "فروع متعددة",
  STAFF: "الموظفين",
  CUSTOM_DOMAIN: "دومين خاص",
  ADVANCED_ANALYTICS: "تحليلات متقدمة",
};

function Page() {
  const { plans, features, tenants } = Route.useLoaderData();
  const locale = useLocale((s) => s.locale);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">{t(locale, "الباقات", "Plans")}</h1>
      {(plans as Row[]).map((p) => {
        const id = String(p.id);
        const used = (tenants as Row[]).filter((tn) => String(tn.plan_id) === id).length;
        const feats = (features as Row[]).filter((f) => String(f.plan_id) === id);
        return (
          <Card key={id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-xl">{t(locale, String(p.name_ar), String(p.name_en))}</p>
                <p className="text-xs text-muted">{String(p.slug)}</p>
              </div>
              <Badge>
                {used} {t(locale, "عميل", "clients")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {feats.length === 0 && <span className="text-sm text-muted">{t(locale, "مفيش مميزات متسجلة", "No features set")}</span>}
              {feats.map((f) => (
                <span
                  key={String(f.feature_key)}
                  className={
                    "rounded-[length:var(--radius-sm)] px-3 py-1 text-sm " +
                    (f.enabled ? "bg-elevated text-fg" : "bg-elevated text-subtle line-through")
                  }
                >
                  {t(locale, FEATURE_AR[String(f.feature_key)] ?? String(f.feature_key), String(f.feature_key))}
                  {f.limit_value != null ? ` · ${String(f.limit_value)}` : ""}
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
