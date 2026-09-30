import { createFileRoute } from "@tanstack/react-router";
import { getPublicOrder } from "@/lib/vyro/public";
import { OrderTracker } from "@/features/storefront/order-tracker";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/order/$token")({
  loader: ({ params }) => getPublicOrder({ data: { token: params.token } }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  const locale = useLocale((s) => s.locale);
  return (
    <main className="min-h-screen bg-bg text-fg" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-lg p-4">
        {data ? (
          <OrderTracker data={data as never} token={token} />
        ) : (
          <p className="grid min-h-[50vh] place-items-center text-sm text-muted">{t(locale, "الطلب غير موجود", "Order not found")}</p>
        )}
      </div>
    </main>
  );
}
