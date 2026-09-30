import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, BellOff, Download, MessageCircle, Printer, Search } from "lucide-react";
import {
  exportOrdersCsv,
  getOrderAdmin,
  getProofImage,
  listOrders,
  reviewPayment,
  setAcceptingOrders,
  updateOrderStatus,
} from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";
import {
  ORDER_STATUSES,
  isOrderStatus,
  nextStatuses,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/vyro/order-flow";
import { orderStatusMessage, whatsappDeepLink } from "@/lib/vyro/whatsapp";
import { escapeHtml, playOrderChime, printTicket, timeAgo } from "@/lib/vyro/notify";
import type { OrderStatus } from "@/lib/vyro/types";

const dashboard = getRouteApi("/dashboard");

export const Route = createFileRoute("/dashboard/orders")({
  validateSearch: z.object({ status: z.string().optional(), q: z.string().optional() }),
  loaderDeps: ({ search }) => ({ status: search.status, q: search.q }),
  loader: ({ deps }) =>
    listOrders({ data: { status: deps.status && isOrderStatus(deps.status) ? deps.status : undefined, q: deps.q || undefined } }),
  component: OrdersPage,
});

type Item = { name_en?: string; name_ar?: string; variant_en?: string | null; variant_ar?: string | null; quantity?: number; modifiers_json?: string };
type OrderRow = Record<string, unknown> & { items: Item[] };

const ACTIVE = new Set(["PENDING", "CONFIRMED", "PREPARING", "READY"]);

function OrdersPage() {
  const orders = Route.useLoaderData() as OrderRow[];
  const { status, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const ctx = dashboard.useLoaderData() as { profile: Record<string, unknown> | null; tenant: Record<string, unknown> | null };
  const [sound, setSound] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState(q ?? "");
  const [accepting, setAccepting] = useState(ctx.profile?.accepting_orders !== false);
  const seen = useRef<Set<string> | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => {
    try {
      setSound(localStorage.getItem("vyro-order-sound") !== "off");
    } catch {
      /* private mode */
    }
  }, []);

  // Live board: refresh every 15 s while the tab is visible, and again when it regains focus.
  const refresh = useCallback(() => {
    if (document.visibilityState === "visible") void router.invalidate();
  }, [router]);
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      refresh();
    }, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  // Ring for brand-new PENDING orders (the first load only primes the "seen" set).
  useEffect(() => {
    const ids = new Set(orders.map((o) => String(o.id)));
    if (seen.current) {
      const fresh = orders.filter((o) => !seen.current!.has(String(o.id)) && o.status === "PENDING");
      if (fresh.length) {
        if (soundRef.current) playOrderChime();
        toast.success(t(locale, `طلب جديد ${String(fresh[0].order_number)}`, `New order ${String(fresh[0].order_number)}`));
      }
    }
    seen.current = ids;
  }, [orders, locale]);

  const active = orders.filter((o) => ACTIVE.has(String(o.status)));
  const money = (o: OrderRow) => `${String(o.total)} ${String(o.currency)}`;

  async function exportCsv() {
    try {
      const res = await exportOrdersCsv({ data: { days: 30 } });
      const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t(locale, `تم تصدير ${res.count} طلب`, `Exported ${res.count} orders`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{t(locale, "الطلبات", "Orders")}</h1>
          <p className="text-xs text-muted">
            {t(locale, `${active.length} طلب نشط · تحديث تلقائي كل 15 ثانية`, `${active.length} active · auto-refresh every 15s`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={accepting ? "secondary" : "danger"}
            onClick={async () => {
              const next = !accepting;
              try {
                await setAcceptingOrders({ data: { accepting: next } });
                setAccepting(next);
                toast.success(next ? t(locale, "تم استئناف الطلبات", "Orders resumed") : t(locale, "تم إيقاف الطلبات مؤقتاً", "Orders paused"));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            {accepting ? t(locale, "إيقاف الطلبات مؤقتاً", "Pause orders") : t(locale, "الطلبات متوقفة — استئناف", "Paused — resume")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t(locale, "صوت التنبيه", "Alert sound")}
            onClick={() => {
              const next = !sound;
              setSound(next);
              try {
                localStorage.setItem("vyro-order-sound", next ? "on" : "off");
              } catch {
                /* ignore */
              }
              if (next) playOrderChime();
            }}
          >
            {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download className="size-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <button
            key={s ?? "all"}
            type="button"
            onClick={() => void navigate({ search: (prev) => ({ ...prev, status: s }) })}
            className={`rounded-full border px-3 py-1.5 text-xs ${status === s || (!status && !s) ? "border-primary bg-primary text-primary-fg" : "border-border text-muted"}`}
          >
            {s ? orderStatusLabel(locale, s) : t(locale, "الكل", "All")}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: (prev) => ({ ...prev, q: search.trim() || undefined }) });
        }}
      >
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, "بحث برقم الطلب / الاسم / الهاتف", "Search order #, name or phone")} className="max-w-sm" />
        <Button type="submit" variant="secondary" size="icon" aria-label="search">
          <Search className="size-4" />
        </Button>
      </form>

      {orders.length === 0 ? <p className="text-sm text-muted">{t(locale, "لا توجد طلبات.", "No orders.")}</p> : null}
      <div className="space-y-3">
        {orders.map((o) => (
          <OrderCard key={String(o.id)} order={o} locale={locale} now={now} money={money(o)} businessName={String(ctx.profile?.[locale === "ar" ? "name_ar" : "name_en"] ?? "")} onChanged={() => router.invalidate()} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order: o,
  locale,
  now,
  money,
  businessName,
  onChanged,
}: {
  order: OrderRow;
  locale: "ar" | "en";
  now: number;
  money: string;
  businessName: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [proofs, setProofs] = useState<{ id: string; src: string }[] | null>(null);
  const status = String(o.status) as OrderStatus;
  const pay = String(o.payment_status);
  const next = nextStatuses(status);
  const forward = next.find((s) => s !== "CANCELLED");

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function showProofs() {
    try {
      const detail = await getOrderAdmin({ data: { id: String(o.id) } });
      if (!detail?.proofs.length) {
        toast.info(t(locale, "لا يوجد إثبات دفع مرفوع", "No proof uploaded"));
        return;
      }
      const loaded = await Promise.all(
        detail.proofs.map(async (p) => {
          const img = await getProofImage({ data: { proofId: p.id } });
          return img ? { id: p.id, src: `data:${img.mime};base64,${img.data_base64}` } : null;
        }),
      );
      setProofs(loaded.filter((x): x is { id: string; src: string } => Boolean(x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function notify() {
    const msg = orderStatusMessage(
      locale,
      businessName || "VYRO",
      String(o.order_number),
      orderStatusLabel(locale, status),
      `${window.location.origin}/order/${String(o.public_token)}`,
    );
    window.open(whatsappDeepLink(String(o.customer_phone), msg), "_blank", "noopener,noreferrer");
  }

  function print() {
    const rows = o.items
      .map((i) => {
        let mods: { nameEn?: string; nameAr?: string }[] = [];
        try {
          mods = JSON.parse(String(i.modifiers_json || "[]"));
        } catch {
          mods = [];
        }
        return `<div class="row"><b>${escapeHtml(i.quantity)}x</b> ${escapeHtml(locale === "ar" ? i.name_ar : i.name_en)} ${i.variant_en ? `(${escapeHtml(locale === "ar" ? i.variant_ar : i.variant_en)})` : ""}
          ${mods.map((m) => `<div class="mod">+ ${escapeHtml(locale === "ar" ? m.nameAr : m.nameEn)}</div>`).join("")}</div>`;
      })
      .join("");
    printTicket(`<!doctype html><html dir="${locale === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
      body{font-family:system-ui,Arial,sans-serif;width:72mm;margin:0;padding:4mm;font-size:13px}
      h1{font-size:20px;margin:0 0 4px}.row{margin:6px 0;font-size:15px}.mod{font-size:12px;margin-inline-start:14px}
      hr{border:0;border-top:1px dashed #000;margin:8px 0}.tot{font-size:16px;font-weight:700}
    </style></head><body>
      <h1>${escapeHtml(o.order_number)}</h1>
      <div>${escapeHtml(o.fulfillment)} ${o.table_number ? "· T" + escapeHtml(o.table_number) : ""}</div>
      <div>${escapeHtml(o.customer_name)} · ${escapeHtml(o.customer_phone)}</div>
      ${o.address ? `<div>${escapeHtml(o.address)}</div>` : ""}<hr>${rows}<hr>
      ${o.notes ? `<div><b>${locale === "ar" ? "ملاحظات" : "Notes"}:</b> ${escapeHtml(o.notes)}</div><hr>` : ""}
      <div class="tot">${escapeHtml(money)} · ${escapeHtml(paymentStatusLabel(locale, pay))}</div>
    </body></html>`);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {String(o.order_number)} <span className="text-xs text-muted">· {timeAgo(String(o.created_at), locale, now)}</span>
          </p>
          <p className="text-xs text-muted">
            {String(o.customer_name)} · {String(o.customer_phone)} · {money}
            {o.table_number ? ` · ${t(locale, "طاولة", "Table")} ${String(o.table_number)}` : ""} · {String(o.fulfillment)}
          </p>
          {o.address ? <p className="text-xs text-muted">{String(o.address)}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status === "CANCELLED" ? "danger" : status === "COMPLETED" ? "success" : "primary"}>{orderStatusLabel(locale, status)}</Badge>
          <Badge tone={pay === "PAID" ? "success" : pay === "REJECTED" ? "danger" : "warning"}>{paymentStatusLabel(locale, pay)}</Badge>
        </div>
      </div>

      {o.items.length ? (
        <ul className="space-y-1 rounded-[length:var(--radius-md)] bg-elevated p-3 text-sm">
          {o.items.map((i, idx) => (
            <li key={idx}>
              <b>{i.quantity}×</b> {locale === "ar" ? i.name_ar : i.name_en}
              {i.variant_en ? <span className="text-muted"> ({locale === "ar" ? i.variant_ar : i.variant_en})</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {o.notes ? <p className="text-xs text-warning">📝 {String(o.notes)}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {forward ? (
          <Button size="sm" disabled={busy} onClick={() => act(() => updateOrderStatus({ data: { id: String(o.id), status: forward } }))}>
            → {orderStatusLabel(locale, forward)}
          </Button>
        ) : null}
        {next.includes("CANCELLED") ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t(locale, "إلغاء هذا الطلب؟", "Cancel this order?"))) {
                void act(() => updateOrderStatus({ data: { id: String(o.id), status: "CANCELLED" } }));
              }
            }}
          >
            {t(locale, "إلغاء", "Cancel")}
          </Button>
        ) : null}
        {status !== "CANCELLED" && pay !== "PAID" ? (
          <>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => reviewPayment({ data: { orderId: String(o.id), decision: "PAID" } }), t(locale, "تم تأكيد الدفع", "Payment approved"))}>
              {t(locale, "تأكيد الدفع", "Approve pay")}
            </Button>
            {pay === "PENDING_VERIFICATION" ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => reviewPayment({ data: { orderId: String(o.id), decision: "REJECTED" } }))}>
                {t(locale, "رفض الدفع", "Reject pay")}
              </Button>
            ) : null}
          </>
        ) : null}
        {pay === "PENDING_VERIFICATION" || pay === "REJECTED" ? (
          <Button size="sm" variant="ghost" onClick={showProofs}>
            {t(locale, "عرض الإثبات", "View proof")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={notify} aria-label="whatsapp">
          <MessageCircle className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={print} aria-label="print">
          <Printer className="size-4" />
        </Button>
      </div>

      {proofs ? (
        <div className="space-y-2 rounded-[length:var(--radius-md)] border border-border p-3">
          <div className="flex flex-wrap gap-2">
            {proofs.map((p) => (
              <img key={p.id} src={p.src} alt="payment proof" className="max-h-72 rounded-[length:var(--radius-sm)] border border-border object-contain" />
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setProofs(null)}>
            {t(locale, "إخفاء", "Hide")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
