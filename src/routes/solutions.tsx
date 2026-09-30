import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/solutions")({ component: Page });

function Page() {
  const items = [
    "Digital business websites",
    "Digital menus and catalogs",
    "Online and WhatsApp ordering",
    "QR systems and NFC destinations",
    "Payment-method presentation",
    "Order management",
    "Business dashboards and analytics",
    "Multi-branch operations",
    "Subscription-based platforms",
  ];
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-display text-5xl">Solutions</h1>
        <p className="mt-4 max-w-xl text-muted">Modules you can assign per plan and per tenant — not a pile of fake buttons.</p>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item} className="text-sm">
              {item}
            </Card>
          ))}
        </div>
      </main>
    </MarketingShell>
  );
}
