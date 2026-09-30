import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listPlans } from "@/lib/vyro/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/pricing")({
  component: Page,
});

const FALLBACK = [
  { slug: "trial", name_en: "Trial", blurb: "Launch a tenant and learn the dashboard." },
  { slug: "starter", name_en: "Starter", blurb: "One branch, core ordering, QR." },
  { slug: "pro", name_en: "Pro", blurb: "Multi-branch, analytics, offers." },
  { slug: "business", name_en: "Business", blurb: "Higher limits and staff seats." },
  { slug: "custom", name_en: "Custom", blurb: "Negotiated modules and support." },
];

function Page() {
  const { user, isPending } = useCurrentUserState();
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-display text-5xl">Plans</h1>
        <p className="mt-4 max-w-xl text-muted">
          Names and limits are configurable by Super Admin. No hardcoded public prices — commercial terms are set per
          engagement.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FALLBACK.map((p) => (
            <Card key={p.slug} className="flex flex-col">
              <p className="text-xs text-primary">{p.slug}</p>
              <h2 className="mt-2 font-display text-3xl">{p.name_en}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{p.blurb}</p>
              <Button asChild className="mt-6" variant="secondary">
                <Link to="/contact">Talk to VYRO</Link>
              </Button>
            </Card>
          ))}
        </div>
        {!isPending && user ? (
          <p className="mt-8 text-sm text-muted">Signed in — plan details also live under Subscription in the dashboard.</p>
        ) : null}
      </main>
    </MarketingShell>
  );
}

void listPlans;
