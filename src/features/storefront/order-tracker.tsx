import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { uploadPaymentProof } from "@/lib/vyro/public";
import { prepareProofImage } from "@/lib/vyro/image";
import { isTerminalStatus, orderStatusLabel, paymentStatusLabel, stepIndex, trackingSteps } from "@/lib/vyro/order-flow";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/vyro/types";

type Row = Record<string, unknown>;

export type TrackerData = { order: Row; items: Row[]; slug: string; proofCount?: number };

function safeJson<T>(text: unknown, fallback: T): T {
  try {
    return JSON.parse(String(text || "")) as T;
  } catch {
    return fallback;
  }
}

/** Live order tracking: status timeline (auto-refreshing) + proof upload while payment is open. */
export function OrderTracker({ data, token, extra }: { data: TrackerData; token: string; extra?: React.ReactNode }) {
  const locale = useLocale((s) => s.locale);
  const router = useRouter();
  const order = data.order;
  const status = String(order.status);
  const pay = String(order.payment_status);
  const fulfillment = String(order.fulfillment);
  const snapshot = safeJson<{ nameEn?: string; nameAr?: string; requiresProof?: boolean }>(order.payment_snapshot_json, {});
  const steps = trackingSteps(fulfillment);
  const idx = stepIndex(status, fulfillment);
  const cancelled = status === "CANCELLED";
  const terminal = isTerminalStatus(status as OrderStatus);
  const canUploadProof = Boolean(snapshot.requiresProof) && !cancelled && (pay === "UNPAID" || pay === "REJECTED" || pay === "PENDING_VERIFICATION");

  // Poll while the order is still moving; stop once it is completed/cancelled.
  useEffect(() => {
    if (terminal) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void router.invalidate();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [terminal, router]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">{String(order.order_number)}</h1>
        <p className="text-xs text-muted">
          {t(locale, "تتحدث الحالة تلقائياً", "Status updates automatically")}
        </p>
      </div>

      <Card className="space-y-4 p-4">
        {cancelled ? (
          <p className="flex items-center gap-2 text-sm text-danger">
            <X className="size-4" /> {orderStatusLabel(locale, "CANCELLED")}
          </p>
        ) : (
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const done = i < idx || (terminal && i <= idx);
              const current = i === idx && !terminal;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-[10px]",
                      done && "border-primary bg-primary text-primary-fg",
                      current && "border-primary text-primary",
                      !done && !current && "border-border text-subtle",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cn(current ? "font-medium text-fg" : done ? "text-fg" : "text-subtle")}>
                    {orderStatusLabel(locale, s)}
                  </span>
                  {current ? <span className="size-2 animate-pulse rounded-full bg-primary" /> : null}
                </li>
              );
            })}
          </ol>
        )}
        <div className="border-t border-border pt-3 text-sm">
          <p>
            {t(locale, "الدفع", "Payment")}: <b>{paymentStatusLabel(locale, pay)}</b>
            {snapshot.nameEn ? <span className="text-muted"> · {t(locale, snapshot.nameAr || "", snapshot.nameEn)}</span> : null}
          </p>
          <p>
            {t(locale, "الإجمالي", "Total")}: <b>{String(order.total)} {String(order.currency)}</b>
          </p>
        </div>
      </Card>

      <Card className="space-y-2 p-4 text-sm">
        {data.items.map((i, k) => (
          <p key={k} className="flex justify-between gap-3">
            <span>
              {String(i.quantity)}× {t(locale, String(i.name_ar), String(i.name_en))}
              {i.variant_en ? <span className="text-muted"> ({t(locale, String(i.variant_ar ?? ""), String(i.variant_en))})</span> : null}
            </span>
            <span className="text-muted">{String(i.line_total)}</span>
          </p>
        ))}
      </Card>

      {canUploadProof ? <ProofUpload token={token} pay={pay} onDone={() => router.invalidate()} /> : null}
      {extra}
      {data.slug ? (
        <Button asChild variant="ghost" className="w-full">
          <Link to="/r/$slug/menu" params={{ slug: data.slug }}>
            {t(locale, "العودة للمنيو", "Back to menu")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function ProofUpload({ token, pay, onDone }: { token: string; pay: string; onDone: () => void }) {
  const locale = useLocale((s) => s.locale);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function send(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const img = await prepareProofImage(file);
      await uploadPaymentProof({ data: { token, mime: img.mime, dataBase64: img.base64 } });
      toast.success(t(locale, "تم رفع الإيصال — بانتظار التحقق", "Proof uploaded — awaiting review"));
      if (input.current) input.current.value = "";
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(locale, "تعذر رفع الملف", "Upload failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-2 p-4">
      <Label htmlFor="proof">
        {pay === "REJECTED"
          ? t(locale, "الإيصال مرفوض — ارفع إيصالاً جديداً", "Proof was rejected — upload a new one")
          : pay === "PENDING_VERIFICATION"
            ? t(locale, "رفع إيصال إضافي", "Upload another proof")
            : t(locale, "ارفع إيصال الدفع", "Upload payment proof")}
      </Label>
      <Input id="proof" ref={input} type="file" accept="image/*" disabled={busy} onChange={(e) => void send(e.target.files?.[0])} />
      <p className="text-xs text-muted">{busy ? "…" : t(locale, "الصورة بتتصغّر تلقائياً قبل الرفع.", "The photo is resized automatically before upload.")}</p>
    </Card>
  );
}
