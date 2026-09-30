import { createFileRoute } from "@tanstack/react-router";
import { getTenantDashboard } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";

export const Route = createFileRoute("/dashboard/subscription")({
  loader: () => getTenantDashboard({ data: {} }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const sub = data.subscription as Record<string, unknown> | null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Subscription</h1>
      <p className="text-sm text-muted">Plan assigned on {PLATFORM_BRAND.name}. Activation is manual until a payment gateway adapter is connected.</p>
      <Card>
        {sub ? (
          <>
            <p className="font-display text-2xl">{String(sub.plan_name)}</p>
            <Badge className="mt-2" tone={String(sub.status) === "ACTIVE" ? "success" : "warning"}>
              {String(sub.status)}
            </Badge>
            <p className="mt-3 text-sm text-muted">
              No simulated charges. Status changes are recorded in the audit log by {PLATFORM_BRAND.name} Super Admin.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">No subscription record.</p>
        )}
      </Card>
    </div>
  );
}
