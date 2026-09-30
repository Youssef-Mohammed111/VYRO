import { createFileRoute } from "@tanstack/react-router";
import { getAnalytics } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/analytics")({
  loader: () => getAnalytics({ data: {} }),
  component: Page,
});

const FUNNEL = ["qr_scan", "page_view", "product_view", "add_to_cart", "checkout_started", "order_created", "whatsapp_click"];

function Page() {
  const { funnel } = Route.useLoaderData();
  const map = Object.fromEntries(funnel.map((r) => [r.event, r.c]));
  const max = Math.max(1, ...FUNNEL.map((key) => Number(map[key] ?? 0)));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Analytics</h1>
      <p className="text-sm text-muted">Real recorded events only. Funnel for this tenant — no simulated traffic.</p>
      <div className="space-y-2">
        {FUNNEL.map((key) => {
          const value = Number(map[key] ?? 0);
          return (
            <Card key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">{key.replaceAll("_", " ")}</span>
                <span className="font-display text-2xl tabular-nums">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div className="h-full bg-primary" style={{ width: `${Math.round((value / max) * 100)}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
