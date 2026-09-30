import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Card } from "@/components/ui/card";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";

export const Route = createFileRoute("/platform")({ component: Platform });

function Platform() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs tracking-[0.2em] text-primary">PLATFORM</p>
        <h1 className="mt-3 font-display text-5xl">One core. Many businesses.</h1>
        <p className="mt-4 max-w-2xl text-muted">
          {PLATFORM_BRAND.name} is a multi-tenant digital business platform. Templates define structure. Tenants own
          content. Super Admin owns the product.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            ["Template engine", "Sections, theme tokens, allowed modules and versions. Tenants cannot rewrite layout."],
            ["Catalog", "Products, services, packages, offers — with variants, modifiers and bilingual fields."],
            ["Orders", "Immutable line snapshots. Statuses from pending to completed. Public tracking tokens."],
            ["Payments", "Configurable methods, external links, proof upload. Paid only after verification or a real gateway."],
            ["QR / NFC", "Secure tokens, printable cards, dynamic destinations so reprints are rare."],
            ["WhatsApp", "Human-readable tickets and menu shares. Deep links never auto-send."],
            ["Dashboards", "Tenant operations and VYRO Super Admin — isolated, role-scoped, audit-logged."],
            ["Subscriptions", "Plans, feature flags and limits. Manual activation until a real gateway is connected."],
          ].map(([title, body]) => (
            <Card key={title}>
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </main>
    </MarketingShell>
  );
}
