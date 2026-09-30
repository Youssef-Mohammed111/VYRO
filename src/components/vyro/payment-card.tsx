import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Banknote, Building2, CreditCard, ExternalLink, Smartphone, Wallet } from "lucide-react";
import type { Locale } from "@/lib/vyro/types";
import type { PublicPaymentMethod } from "@/lib/vyro/types";
import { t } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Wallet> = {
  MANUAL: Banknote,
  EXTERNAL_LINK: ExternalLink,
  INSTAPAY: Wallet,
  VODAFONE_CASH: Smartphone,
  ORANGE_CASH: Smartphone,
  ETISALAT_CASH: Smartphone,
  BANK_TRANSFER: Building2,
  CARD: CreditCard,
  PAYMENT_GATEWAY: CreditCard,
};

export function PaymentMethodCard({
  method,
  locale,
  selected,
  onSelect,
  currency,
  total,
}: {
  method: PublicPaymentMethod;
  locale: Locale;
  selected: boolean;
  onSelect: () => void;
  currency: string;
  total: number;
}) {
  const Icon = ICONS[method.type] ?? Wallet;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || !method.paymentUrl) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(method.paymentUrl, { margin: 1, width: 200 }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, method.paymentUrl]);

  return (
    <div
      className={cn(
        "rounded-[length:var(--radius-lg)] border transition-colors duration-[var(--motion-quick)]",
        selected ? "border-primary bg-elevated" : "border-border bg-surface",
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 p-4 text-start">
        {method.logoUrl ? (
          <img src={method.logoUrl} alt="" className="size-10 rounded-[length:var(--radius-sm)] object-contain" />
        ) : (
          <span className="grid size-10 place-items-center rounded-[length:var(--radius-sm)] bg-elevated text-primary">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t(locale, method.nameAr, method.nameEn)}</p>
          <p className="mt-0.5 text-xs text-muted">{t(locale, method.descAr || "", method.descEn || "")}</p>
        </div>
      </button>
      {selected ? (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          <p className="text-sm text-muted">
            {t(locale, "الإجمالي", "Total")}{" "}
            <span className="font-display text-lg text-fg">
              {total} {currency}
            </span>
          </p>
          {method.instructionsEn || method.instructionsAr ? (
            <p className="text-xs text-muted">{t(locale, method.instructionsAr || "", method.instructionsEn || "")}</p>
          ) : null}
          {method.accountIdentifier ? (
            <p className="text-xs text-muted">
              {t(locale, "الحساب", "Account")}: {method.accountName ? `${method.accountName} · ` : ""}
              {method.accountIdentifier}
            </p>
          ) : null}
          {method.paymentUrl ? (
            <>
              <Button asChild className="w-full">
                <a href={method.paymentUrl} target="_blank" rel="noreferrer">
                  {t(locale, `ادفع عبر ${method.nameAr}`, `Pay with ${method.nameEn}`)}
                </a>
              </Button>
              {qr ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-[10px] tracking-[0.2em] text-muted">{t(locale, "امسح للدفع", "SCAN TO PAY")}</p>
                  <img src={qr} alt="" className="size-36 rounded-[length:var(--radius-sm)] bg-fg p-1" />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
