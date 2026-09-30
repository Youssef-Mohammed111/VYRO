import { createFileRoute } from "@tanstack/react-router";
import { getPublicOrder } from "@/lib/vyro/public";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { OrderTracker } from "@/features/storefront/order-tracker";
import { buildWhatsAppOrderMessage, whatsappDeepLink } from "@/lib/vyro/whatsapp";
import { getRouteApi } from "@tanstack/react-router";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/order/$token")({
  loader: ({ params }) => getPublicOrder({ data: { token: params.token } }),
  component: OrderPage,
});

function OrderPage() {
  const data = Route.useLoaderData();
  const tenant = parent.useLoaderData();
  const locale = useLocale((s) => s.locale);
  if (!data) return <p className="p-6">{t(locale, "الطلب غير موجود", "Order not found")}</p>;
  const { token } = Route.useParams();
  const order = data.order as Record<string, unknown>;
  const items = data.items as Record<string, unknown>[];
  let snapshot: { nameEn?: string; nameAr?: string } = {};
  try {
    snapshot = JSON.parse(String(order.payment_snapshot_json || "{}"));
  } catch {
    snapshot = {};
  }
  const msg = buildWhatsAppOrderMessage({
    locale,
    businessName: t(locale, tenant.profile.nameAr, tenant.profile.nameEn),
    orderNumber: String(order.order_number),
    table: (order.table_number as string) || null,
    customerName: String(order.customer_name),
    customerPhone: String(order.customer_phone),
    items: items.map((i) => ({
      quantity: Number(i.quantity),
      name: t(locale, String(i.name_ar), String(i.name_en)),
      variant: (i.variant_en as string) || null,
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    fees: Number(order.fees),
    total: Number(order.total),
    currency: String(order.currency),
    paymentName: t(locale, snapshot.nameAr || "", snapshot.nameEn || ""),
    paymentStatus: String(order.payment_status),
    notes: (order.notes as string) || null,
  });
  const wa = tenant.profile.whatsapp ? whatsappDeepLink(tenant.profile.whatsapp, msg) : null;
  return (
    <div className="p-4">
      <OrderTracker
        data={data as never}
        token={token}
        extra={
          <>
            {wa ? (
              <Button asChild className="w-full">
                <a href={wa} target="_blank" rel="noreferrer">
                  {t(locale, "إرسال الطلب عبر واتساب", "Send order on WhatsApp")}
                </a>
              </Button>
            ) : null}
            <p className="text-xs text-muted">
              {t(locale, "واتساب لا يرسل الرسالة تلقائياً — اضغط إرسال.", "WhatsApp will not auto-send. You press Send.")}
            </p>
            {tenant.profile.reviewUrl ? (
              <Button asChild variant="secondary" className="w-full">
                <a href={tenant.profile.reviewUrl} target="_blank" rel="noreferrer">
                  {t(locale, "قيّم تجربتك", "Leave a review")}
                </a>
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
