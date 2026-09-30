import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { t, useLocale } from "@/lib/vyro/locale";
import { cartTotals, useCart } from "@/lib/vyro/cart";
import { Button } from "@/components/ui/button";

const parent = getRouteApi("/r/$slug");
export const Route = createFileRoute("/r/$slug/cart")({ component: Cart });

function Cart() {
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const totals = cartTotals(lines);
  return (
    <div className="p-4">
      <h1 className="font-display text-3xl">{t(locale, "سلة الطلبات", "Cart")}</h1>
      {lines.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t(locale, "السلة فارغة", "Your cart is empty.")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="flex gap-3 rounded-[length:var(--radius-lg)] bg-surface p-3">
              {l.imageUrl ? <img src={l.imageUrl} alt="" className="size-16 rounded-[length:var(--radius-sm)] object-cover" /> : null}
              <div className="flex-1">
                <p className="text-sm">{t(locale, l.nameAr, l.nameEn)}</p>
                {l.variantEn ? (
                  <p className="text-xs text-muted">{t(locale, l.variantAr || "", l.variantEn)}</p>
                ) : null}
                {l.modifiers.map((m) => (
                  <p key={m.id} className="text-xs text-muted">
                    + {t(locale, m.nameAr, m.nameEn)}
                  </p>
                ))}
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <button type="button" onClick={() => setQty(l.key, l.quantity - 1)}>
                    −
                  </button>
                  {l.quantity}
                  <button type="button" onClick={() => setQty(l.key, l.quantity + 1)}>
                    +
                  </button>
                </div>
              </div>
              <p className="text-sm">
                {(l.unitPrice + l.modifiers.reduce((s, m) => s + m.priceDelta, 0)) * l.quantity}
              </p>
            </div>
          ))}
          <div className="space-y-1 text-sm">
            <Row k={t(locale, "المجموع الفرعي", "Subtotal")} v={totals.subtotal} />
            <Row k={t(locale, "الإجمالي", "Total")} v={totals.total} />
          </div>
          <Button asChild className="w-full">
            <Link to="/r/$slug/checkout" params={{ slug: tenant.slug }}>
              {t(locale, "إتمام الطلب", "Checkout")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}
