import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/demo")({ component: Page });

function Page() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs tracking-[0.2em] text-primary">LIVE PLATFORM DEMO</p>
        <h1 className="mt-3 font-display text-5xl">RPM — Really Powerful Meals</h1>
        <p className="mt-4 max-w-2xl text-muted">
          First seeded tenant. Restaurant / burger / charcoal grill in Badr City. Open the real public experience —
          menu, cart, checkout, WhatsApp ticket, table QR.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/r/$slug" params={{ slug: "rpm" }}>
              Open RPM
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/q/$token" params={{ token: "k8Qm2nR4vL0x" }}>
              Scan table 01
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/login">Tenant dashboard</Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <img src="/tenants/rpm/hero.jpg" alt="RPM hero" className="h-56 w-full rounded-[length:var(--radius-xl)] object-cover md:col-span-2" />
          <Card>
            <p className="text-xs text-muted">What you can do</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Browse bilingual catalog</li>
              <li>Pick sizes and add-ons</li>
              <li>Checkout with InstaPay / Vodafone Cash / cash</li>
              <li>Upload payment proof</li>
              <li>Send a WhatsApp order (you press Send)</li>
            </ul>
          </Card>
        </div>
      </main>
    </MarketingShell>
  );
}
