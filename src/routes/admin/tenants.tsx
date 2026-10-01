import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  assignPlan,
  assignTemplate,
  createTenant,
  getSuperDashboard,
  listPlans,
  listTemplates,
  updateTenantStatus,
} from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/admin/tenants")({
  loader: async () => {
    const [dash, templates, planData] = await Promise.all([getSuperDashboard(), listTemplates(), listPlans()]);
    return { tenants: dash.tenants, templates, plans: planData.plans };
  },
  component: Page,
});

type Row = Record<string, unknown>;
const FILTERS = ["all", "active", "trial", "suspended", "archived"] as const;

function Page() {
  const { tenants, templates, plans } = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", nameAr: "", slug: "", templateId: "", planId: "", ownerEmail: "" });
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormMsg(null);
    try {
      const res = await createTenant({
        data: {
          name: form.name,
          nameAr: form.nameAr || undefined,
          slug: form.slug,
          templateId: form.templateId || String((templates as Row[])[0]?.id ?? ""),
          planId: form.planId || String((plans as Row[])[0]?.id ?? ""),
          ownerEmail: form.ownerEmail || undefined,
        },
      });
      setFormMsg(
        res.ownerLinked || !form.ownerEmail
          ? t(locale, "تم إنشاء العميل ✅", "Client created ✅")
          : t(
              locale,
              "تم إنشاء العميل ✅ لكن إيميل المالك مش مسجّل لسه. أنشئ المستخدم من صفحة المستخدمين واربطه.",
              "Client created ✅ but the owner email has no account yet. Create the user in Users and link them.",
            ),
      );
      setForm({ name: "", nameAr: "", slug: "", templateId: "", planId: "", ownerEmail: "" });
      await router.invalidate();
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : t(locale, "حصل خطأ", "Something went wrong"));
    } finally {
      setCreating(false);
    }
  }

  const statusLabel: Record<string, string> = {
    all: t(locale, "الكل", "All"),
    active: t(locale, "نشط", "Active"),
    trial: t(locale, "تجريبي", "Trial"),
    suspended: t(locale, "موقوف", "Suspended"),
    archived: t(locale, "مؤرشف", "Archived"),
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (tenants as Row[]).filter((r) => {
      if (filter !== "all" && String(r.status) !== filter) return false;
      if (!needle) return true;
      return `${r.name} ${r.slug}`.toLowerCase().includes(needle);
    });
  }, [tenants, q, filter]);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    try {
      await action();
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  function setStatus(r: Row, status: "active" | "suspended") {
    if (status === "suspended") {
      const ok = window.confirm(
        t(locale, `إيقاف "${String(r.name)}"؟ العملاء مش هيقدروا يطلبوا منه.`, `Suspend "${String(r.name)}"? Customers will not be able to order.`),
      );
      if (!ok) return;
    }
    void run(String(r.id), () => updateTenantStatus({ data: { id: String(r.id), status } }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">{t(locale, "العملاء", "Clients")}</h1>
        <div className="flex items-center gap-2">
          <Badge>{rows.length}</Badge>
          <Button onClick={() => setShowNew((v) => !v)}>
            {showNew ? t(locale, "إغلاق", "Close") : t(locale, "+ عميل جديد", "+ New client")}
          </Button>
        </div>
      </div>

      {showNew && (
        <Card>
          <form onSubmit={submitNew} className="space-y-3">
            <div className="space-y-1">
              <Label>{t(locale, "اسم العميل (إنجليزي)", "Client name")}</Label>
              <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t(locale, "الاسم بالعربي", "Arabic name")}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t(locale, "الرابط (حروف إنجليزي وأرقام وشرطة)", "Slug (a-z, 0-9, dashes)")}</Label>
              <Input
                required
                dir="ltr"
                placeholder="my-restaurant"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "القالب", "Template")}
                <select
                  className="h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg"
                  value={form.templateId}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                >
                  {(templates as Row[]).map((tm) => (
                    <option key={String(tm.id)} value={String(tm.id)}>
                      {String(tm.name_en)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "الباقة", "Plan")}
                <select
                  className="h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg"
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                >
                  {(plans as Row[]).map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {String(p.name_en)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-1">
              <Label>{t(locale, "إيميل المالك (اختياري، لازم يكون مسجّل)", "Owner email (optional, must have an account)")}</Label>
              <Input type="email" dir="ltr" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
            </div>
            {formMsg && <p className="text-sm text-muted">{formMsg}</p>}
            <Button type="submit" disabled={creating} className="w-full">
              {creating ? t(locale, "جاري الإنشاء…", "Creating…") : t(locale, "إنشاء العميل", "Create client")}
            </Button>
          </form>
        </Card>
      )}

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(locale, "ابحث بالاسم أو الرابط…", "Search by name or slug…")}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
            {statusLabel[f]}
          </Button>
        ))}
      </div>

      {rows.length === 0 && (
        <Card>
          <p className="text-muted">{t(locale, "مفيش عملاء مطابقين.", "No matching clients.")}</p>
        </Card>
      )}

      {rows.map((r) => {
        const id = String(r.id);
        const disabled = busy === id;
        return (
          <Card key={id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-medium">{String(r.name)}</p>
                <a className="text-sm text-primary underline-offset-4 hover:underline" href={`/r/${String(r.slug)}`} target="_blank" rel="noreferrer">
                  /r/{String(r.slug)}
                </a>
              </div>
              <Badge>{statusLabel[String(r.status)] ?? String(r.status)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-3">
                <p className="text-muted">{t(locale, "الطلبات", "Orders")}</p>
                <p className="text-xl font-medium">{Number(r.orders_count ?? 0)}</p>
              </div>
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-3">
                <p className="text-muted">{t(locale, "الموظفين", "Staff")}</p>
                <p className="text-xl font-medium">{Number(r.members_count ?? 0)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "الباقة", "Plan")}
                <select
                  className="h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg"
                  value={String(r.plan_id)}
                  disabled={disabled}
                  onChange={(e) => void run(id, () => assignPlan({ data: { tenantId: id, planId: e.target.value } }))}
                >
                  {(plans as Row[]).map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {String(p.name_en)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "القالب", "Template")}
                <select
                  className="h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg"
                  value={String(r.template_id)}
                  disabled={disabled}
                  onChange={(e) => void run(id, () => assignTemplate({ data: { tenantId: id, templateId: e.target.value } }))}
                >
                  {(templates as Row[]).map((tm) => (
                    <option key={String(tm.id)} value={String(tm.id)}>
                      {String(tm.name_en)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {String(r.status) === "active" ? (
                <Button variant="danger" disabled={disabled} onClick={() => setStatus(r, "suspended")}>
                  {t(locale, "إيقاف", "Suspend")}
                </Button>
              ) : (
                <Button disabled={disabled} onClick={() => setStatus(r, "active")}>
                  {t(locale, "تفعيل", "Activate")}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
