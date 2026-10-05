import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { listSubscriptions, recordPayment, subscriptionAction, suspendExpired } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/admin/subscriptions")({
  loader: () => listSubscriptions(),
  component: Page,
});

type Row = Record<string, unknown>;
type State = "active" | "trial" | "expiring" | "expired" | "suspended";
const FILTERS = ["all", "active", "trial", "expiring", "expired", "suspended"] as const;
const METHODS = ["cash", "instapay", "vodafone_cash", "bank", "card", "other"] as const;
const DAY = 86_400_000;

const fmtDate = (v: unknown) =>
  v ? new Date(String(v)).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "2-digit", month: "short", year: "numeric" }) : "—";

function stateOf(r: Row, now: number): { state: State; daysLeft: number | null } {
  const end = r.end_at ? new Date(String(r.end_at)).getTime() : null;
  const daysLeft = end === null ? null : Math.ceil((end - now) / DAY);
  if (String(r.tenant_status) === "suspended") return { state: "suspended", daysLeft };
  if (daysLeft !== null && daysLeft < 0) return { state: "expired", daysLeft };
  if (daysLeft !== null && daysLeft <= 7) return { state: "expiring", daysLeft };
  if (String(r.sub_status) === "TRIAL" || String(r.tenant_status) === "trial") return { state: "trial", daysLeft };
  return { state: "active", daysLeft };
}

function Page() {
  const { rows, payments, collectedThisMonth } = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pay, setPay] = useState({ amount: "", method: "cash" as (typeof METHODS)[number], months: "1", reference: "" });
  const now = Date.now();

  const label: Record<string, string> = {
    all: t(locale, "الكل", "All"),
    active: t(locale, "نشط", "Active"),
    trial: t(locale, "تجريبي", "Trial"),
    expiring: t(locale, "قرب ينتهي", "Expiring"),
    expired: t(locale, "منتهي", "Expired"),
    suspended: t(locale, "موقوف", "Suspended"),
  };
  const methodLabel: Record<string, string> = {
    cash: t(locale, "كاش", "Cash"),
    instapay: t(locale, "إنستاباي", "InstaPay"),
    vodafone_cash: t(locale, "فودافون كاش", "Vodafone Cash"),
    bank: t(locale, "تحويل بنكي", "Bank"),
    card: t(locale, "كارت", "Card"),
    other: t(locale, "أخرى", "Other"),
  };

  const items = useMemo(
    () => (rows as Row[]).map((r) => ({ r, ...stateOf(r, now) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const count = (s: State) => items.filter((i) => i.state === s).length;
  const mrr = items
    .filter((i) => i.state === "active" || i.state === "expiring")
    .reduce((sum, i) => sum + (String(i.r.billing_cycle) === "yearly" ? Number(i.r.price_yearly) / 12 : Number(i.r.price_monthly)), 0);
  const shown = items.filter((i) => filter === "all" || i.state === filter);

  async function run(action: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      if (ok) setMsg(ok);
      await router.invalidate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t(locale, "حصل خطأ", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  const act = (tenantId: string, action: "activate" | "suspend" | "cancel" | "extend" | "trial", extra?: { months?: number; days?: number }) => {
    if (action === "suspend" || action === "cancel") {
      if (!window.confirm(t(locale, "تأكيد إيقاف العميل؟ هيتقفل موقعه فورًا.", "Suspend this client? Their site goes offline immediately."))) return;
    }
    void run(() => subscriptionAction({ data: { tenantId, action, ...extra } }));
  };

  function submitPayment(e: React.FormEvent, tenantId: string) {
    e.preventDefault();
    void run(async () => {
      await recordPayment({
        data: {
          tenantId,
          amount: Math.round(Number(pay.amount)),
          method: pay.method,
          months: Number(pay.months) || 0,
          reference: pay.reference || undefined,
        },
      });
      setPay({ amount: "", method: "cash", months: "1", reference: "" });
      setOpen(null);
    }, t(locale, "تم تسجيل الدفعة ✅", "Payment recorded ✅"));
  }

  const kpi = (title: string, value: string) => (
    <div className="rounded-[length:var(--radius-md)] bg-elevated p-3">
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 text-xl font-medium">{value}</p>
    </div>
  );
  const selectCls = "h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">{t(locale, "الاشتراكات", "Subscriptions")}</h1>
        <Button
          variant="secondary"
          disabled={busy || count("expired") === 0}
          onClick={() => {
            if (window.confirm(t(locale, "إيقاف كل العملاء المنتهي اشتراكهم؟", "Suspend every client whose subscription has expired?"))) {
              void run(async () => {
                const res = await suspendExpired();
                setMsg(t(locale, `تم إيقاف ${res.suspended} عميل`, `${res.suspended} client(s) suspended`));
              });
            }
          }}
        >
          {t(locale, "إيقاف المنتهيين", "Suspend expired")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpi(t(locale, "إيراد شهري متكرر", "Monthly recurring"), `${Math.round(mrr).toLocaleString("en-US")} ${t(locale, "ج.م", "EGP")}`)}
        {kpi(t(locale, "تحصيل هذا الشهر", "Collected this month"), `${Number(collectedThisMonth).toLocaleString("en-US")} ${t(locale, "ج.م", "EGP")}`)}
        {kpi(t(locale, "نشط", "Active"), String(count("active") + count("expiring")))}
        {kpi(t(locale, "قرب ينتهي (7 أيام)", "Expiring in 7 days"), String(count("expiring")))}
        {kpi(t(locale, "تجريبي", "Trials"), String(count("trial")))}
        {kpi(t(locale, "منتهي", "Expired"), String(count("expired")))}
        {kpi(t(locale, "موقوف", "Suspended"), String(count("suspended")))}
        {kpi(t(locale, "إجمالي العملاء", "Clients"), String(items.length))}
      </div>

      {msg && (
        <Card>
          <p className="text-sm">{msg}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
            {label[f]}
          </Button>
        ))}
      </div>

      {shown.length === 0 && (
        <Card>
          <p className="text-muted">{t(locale, "مفيش عملاء في الحالة دي.", "No clients in this state.")}</p>
        </Card>
      )}

      {shown.map(({ r, state, daysLeft }) => {
        const id = String(r.id);
        const price = String(r.billing_cycle) === "yearly" ? Number(r.price_yearly) : Number(r.price_monthly);
        return (
          <Card key={id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-medium">{String(r.name)}</p>
                <p className="text-sm text-muted">
                  {t(locale, String(r.plan_name_ar), String(r.plan_name))} · {price.toLocaleString("en-US")} {t(locale, "ج.م", "EGP")} /{" "}
                  {String(r.billing_cycle) === "yearly" ? t(locale, "سنة", "yr") : t(locale, "شهر", "mo")}
                </p>
              </div>
              <Badge>{label[state]}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-2">
                <p className="text-muted">{t(locale, "ينتهي", "Ends")}</p>
                <p>
                  {fmtDate(r.end_at)}
                  {daysLeft !== null ? ` (${daysLeft >= 0 ? daysLeft : -daysLeft} ${daysLeft >= 0 ? t(locale, "يوم", "d") : t(locale, "يوم تأخير", "d late")})` : ""}
                </p>
              </div>
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-2">
                <p className="text-muted">{t(locale, "آخر طلب", "Last order")}</p>
                <p>{fmtDate(r.last_order_at)}</p>
              </div>
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-2">
                <p className="text-muted">{t(locale, "طلبات 30 يوم", "Orders 30d")}</p>
                <p>
                  {Number(r.orders_30d)} · {Number(r.members_count)} {t(locale, "موظف", "staff")}
                </p>
              </div>
              <div className="rounded-[length:var(--radius-sm)] bg-elevated p-2">
                <p className="text-muted">{t(locale, "إجمالي المدفوع", "Total paid")}</p>
                <p>
                  {Number(r.paid_total).toLocaleString("en-US")} · {fmtDate(r.last_payment_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {state === "suspended" || state === "expired" ? (
                <Button disabled={busy} onClick={() => act(id, "activate", { months: 1 })}>
                  {t(locale, "تفعيل (شهر)", "Activate (1 mo)")}
                </Button>
              ) : (
                <Button variant="secondary" disabled={busy} onClick={() => act(id, "suspend")}>
                  {t(locale, "إيقاف", "Suspend")}
                </Button>
              )}
              <Button variant="secondary" disabled={busy} onClick={() => act(id, "extend", { months: 1 })}>
                {t(locale, "+ شهر", "+1 mo")}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => act(id, "extend", { months: 12 })}>
                {t(locale, "+ سنة", "+1 yr")}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => act(id, "trial", { days: 14 })}>
                {t(locale, "تجربة 14 يوم", "14-day trial")}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(open === id ? null : id)}>
                {open === id ? t(locale, "إغلاق", "Close") : t(locale, "تسجيل دفعة", "Record payment")}
              </Button>
            </div>

            {open === id && (
              <form onSubmit={(e) => submitPayment(e, id)} className="space-y-3 rounded-[length:var(--radius-md)] border border-border p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>{t(locale, "المبلغ (ج.م)", "Amount (EGP)")}</Label>
                    <Input required type="number" inputMode="numeric" min={1} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                  </div>
                  <label className="space-y-1 text-sm text-muted">
                    {t(locale, "طريقة الدفع", "Method")}
                    <select className={selectCls} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as (typeof METHODS)[number] })}>
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {methodLabel[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-1">
                    <Label>{t(locale, "مدّد بـ (شهور)", "Extend by (months)")}</Label>
                    <Input type="number" inputMode="numeric" min={0} max={36} value={pay.months} onChange={(e) => setPay({ ...pay, months: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t(locale, "رقم العملية / ملاحظة (اختياري)", "Reference / note (optional)")}</Label>
                  <Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {t(locale, "حفظ الدفعة", "Save payment")}
                </Button>
              </form>
            )}
          </Card>
        );
      })}

      <Card className="space-y-2">
        <h2 className="font-display text-xl">{t(locale, "آخر الدفعات", "Recent payments")}</h2>
        {(payments as Row[]).length === 0 && <p className="text-sm text-muted">{t(locale, "لسه مفيش دفعات.", "No payments yet.")}</p>}
        {(payments as Row[]).map((p) => (
          <div key={String(p.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-[length:var(--radius-sm)] bg-elevated p-3 text-sm">
            <span>
              {String(p.tenant_name)} · {methodLabel[String(p.method)] ?? String(p.method)}
            </span>
            <span>
              {Number(p.amount).toLocaleString("en-US")} {t(locale, "ج.م", "EGP")} · {fmtDate(p.created_at)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
