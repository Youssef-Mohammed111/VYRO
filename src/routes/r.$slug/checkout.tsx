import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { presetFor } from "@/lib/vyro/presets";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { t, useLocale } from "@/lib/vyro/locale";
import { cartTotals, useCart } from "@/lib/vyro/cart";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PaymentMethodCard } from "@/components/vyro/payment-card";
import { placeOrder, trackPublicEvent, uploadPaymentProof } from "@/lib/vyro/public";
import { prepareProofImage } from "@/lib/vyro/image";
import { isPlausiblePhone } from "@/lib/vyro/phone";
import { publicToken } from "@/lib/vyro/ids";

const parent = getRouteApi("/r/$slug");
export const Route = createFileRoute("/r/$slug/checkout")({ component: Checkout });

function Checkout() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  const lines = useCart((s) => s.lines);
  const table = useCart((s) => s.table);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const [methodId, setMethodId] = useState(tenant.paymentMethods[0]?.id ?? "");
  // Dine-in only makes sense when the customer scanned a table QR; otherwise start on pickup.
  const [fulfillment, setFulfillment] = useState<"dine_in" | "pickup" | "delivery">(table ? "dine_in" : "pickup");
  const [busy, setBusy] = useState(false);
  const isService = presetFor(tenant.templateFamily).kind === "service";
  const key = useMemo(() => publicToken(16), []);
  // The fee comes from the business's settings; the server recomputes it anyway.
  const deliveryFee = fulfillment === "delivery" ? tenant.profile.deliveryFee : 0;
  const totals = cartTotals(lines, deliveryFee);
  const minOrder = tenant.profile.minOrder;
  const belowMin = minOrder > 0 && totals.subtotal < minOrder;
  const paused = !tenant.profile.acceptingOrders;
  const method = tenant.paymentMethods.find((m) => m.id === methodId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lines.length || !method || busy) return;
    const fd = new FormData(e.currentTarget);
    if (!isPlausiblePhone(String(fd.get("phone") || ""))) {
      toast.error(t(locale, "رقم الهاتف غير صحيح", "Please enter a valid phone number"));
      return;
    }
    if (paused) {
      toast.error(t(locale, "الطلبات متوقفة مؤقتاً", "Orders are paused right now"));
      return;
    }
    if (belowMin) {
      toast.error(t(locale, `الحد الأدنى للطلب ${minOrder} ${tenant.profile.currency}`, `Minimum order is ${minOrder} ${tenant.profile.currency}`));
      return;
    }
    setBusy(true);
    try {
      void trackPublicEvent({ data: { slug: tenant.slug, event: "checkout_started" } });
      const result = await placeOrder({
        data: {
          slug: tenant.slug,
          idempotencyKey: key,
          locale,
          customerName: String(fd.get("name") || ""),
          customerPhone: String(fd.get("phone") || ""),
          customerEmail: String(fd.get("email") || ""),
          tableNumber: fulfillment === "dine_in" ? table || String(fd.get("table") || "") || undefined : undefined,
          fulfillment,
          address: fulfillment === "delivery" ? String(fd.get("address") || "") || undefined : undefined,
          notes:
            [
              isService && fd.get("when")
                ? `${locale === "ar" ? "الميعاد المفضل" : "Preferred time"}: ${String(fd.get("when"))}`
                : "",
              String(fd.get("notes") || ""),
            ]
              .filter(Boolean)
              .join("\n") || undefined,
          paymentMethodId: method.id,
          lines: lines.map((l) => ({
            itemId: l.itemId,
            variantId: l.variantId,
            quantity: l.quantity,
            modifierIds: l.modifiers.map((m) => m.id),
          })),
        },
      });
      // The order already exists at this point. A failed proof upload must NOT look like a
      // failed order (the customer would re-submit) — they can retry from the tracking page.
      const file = (fd.get("proof") as File | null) ?? null;
      if (file && file.size > 0 && result.requiresProof) {
        try {
          const img = await prepareProofImage(file);
          await uploadPaymentProof({ data: { token: result.token, mime: img.mime, dataBase64: img.base64 } });
        } catch {
          toast.warning(
            t(locale, "تم إنشاء الطلب لكن رفع الإيصال فشل — ارفعه من صفحة الطلب", "Order placed, but the proof upload failed — upload it from the order page"),
          );
        }
      }
      clear();
      await navigate({ to: "/r/$slug/order/$token", params: { slug: tenant.slug, token: result.token } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(locale, "تعذر إنشاء الطلب", "Could not place order"));
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length) {
    return <p className="p-6 text-sm text-muted">{t(locale, "أضف أصنافاً أولاً", "Add items first.")}</p>;
  }

  return (
    <form className="space-y-4 p-4" onSubmit={onSubmit}>
      <h1 className="font-display text-3xl">{isService ? t(locale, "تأكيد الحجز", "Confirm booking") : t(locale, "إتمام الطلب", "Checkout")}</h1>
      <Card className="space-y-3 p-4">
        <Field id="name" label={t(locale, "الاسم", "Name")} required />
        <Field id="phone" label={t(locale, "الهاتف", "Phone")} required type="tel" />
        <Field id="email" label={t(locale, "البريد (اختياري)", "Email optional")} type="email" />
        {table ? (
          <p className="text-sm text-primary">
            {t(locale, "طاولة", "Table")} {table}
          </p>
        ) : (
          fulfillment === "dine_in" ? <Field id="table" label={t(locale, "رقم الطاولة", "Table number")} required /> : null
        )}
        {isService ? <Field id="when" label={t(locale, "الميعاد المفضل (اليوم والساعة)", "Preferred date and time")} required type="datetime-local" /> : null}
        <div className={isService ? "hidden" : "flex gap-2"}>
          {(["dine_in", "pickup", "delivery"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFulfillment(f)}
              className={`rounded-full border px-3 py-2 text-xs ${fulfillment === f ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
            >
              {f === "dine_in" ? t(locale, "صالة", "Dine in") : f === "pickup" ? t(locale, "استلام", "Pickup") : t(locale, "توصيل", "Delivery")}
            </button>
          ))}
        </div>
        {fulfillment === "delivery" ? <Field id="address" label={t(locale, "العنوان", "Address")} required /> : null}
        <div>
          <Label htmlFor="notes">{t(locale, "ملاحظات", "Notes")}</Label>
          <Textarea id="notes" name="notes" />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        {paused ? (
          <p className="rounded-[length:var(--radius-sm)] bg-warning/15 p-3 text-sm text-warning">
            {t(locale, "الطلبات متوقفة مؤقتاً، جرّب بعد قليل.", "This business is not taking orders right now. Please try again shortly.")}
          </p>
        ) : null}
        {belowMin ? (
          <p className="text-xs text-warning">
            {t(locale, `الحد الأدنى للطلب ${minOrder} ${tenant.profile.currency}`, `Minimum order ${minOrder} ${tenant.profile.currency}`)}
          </p>
        ) : null}
        <div className="space-y-1 text-sm text-muted">
          <p className="flex justify-between"><span>{t(locale, "المجموع", "Subtotal")}</span><span>{totals.subtotal}</span></p>
          {deliveryFee ? <p className="flex justify-between"><span>{t(locale, "التوصيل", "Delivery")}</span><span>{deliveryFee}</span></p> : null}
        </div>
        <p className="font-display text-xl">
          {t(locale, "الإجمالي", "Total")} {totals.total} {tenant.profile.currency}
        </p>
        <p className="text-sm text-muted">{t(locale, "اختر طريقة الدفع", "Choose payment method")}</p>
        <div className="space-y-3">
          {tenant.paymentMethods.map((m) => (
            <PaymentMethodCard
              key={m.id}
              method={m}
              locale={locale}
              selected={methodId === m.id}
              onSelect={() => setMethodId(m.id)}
              currency={tenant.profile.currency}
              total={totals.total}
            />
          ))}
        </div>
        {method?.requiresProof ? (
          <div>
            <Label htmlFor="proof">{t(locale, "إثبات الدفع", "Payment proof")}</Label>
            <Input id="proof" name="proof" type="file" accept="image/*" />
            <p className="mt-1 text-xs text-muted">
              {t(
                locale,
                "الضغط على رابط الدفع لا يؤكد الدفع تلقائياً. ارفع الإيصال بعد التحويل.",
                "Opening the payment link does not mark the order paid. Upload proof after you pay.",
              )}
            </p>
          </div>
        ) : null}
      </Card>
      <Button type="submit" className="w-full" disabled={busy || paused || belowMin}>
        {busy ? "…" : t(locale, "تأكيد الطلب", "Place order")}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required={required} type={type} />
    </div>
  );
}
