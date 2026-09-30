import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/industries")({ component: Page });

const industries = [
  ["Restaurant", "Charcoal, burgers, menus, table QR."],
  ["Café", "Boards, hours, slow catalog."],
  ["Salon / Barber", "Services, duration, booking-ready fields."],
  ["Clinic", "Calm services and location."],
  ["Gym", "Memberships and schedules."],
  ["Retail", "Catalog and offers."],
  ["Auto service", "Packages and workshop branches."],
  ["Hotel", "Hospitality catalog."],
  ["Professional", "Service lists without a kitchen."],
];

function Page() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-display text-5xl">Industries</h1>
        <p className="mt-4 max-w-xl text-muted">VYRO is not a restaurant-only product. Each template family has its own visual language.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {industries.map(([title, body]) => (
            <Card key={title}>
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Card>
          ))}
        </div>
        <Button asChild className="mt-10">
          <Link to="/r/$slug" params={{ slug: "rpm" }}>
            See restaurant template live
          </Link>
        </Button>
      </main>
    </MarketingShell>
  );
}
