import { createFileRoute } from "@tanstack/react-router";
import { getSuperDashboard, updateTenantStatus } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/tenants")({
  loader: () => getSuperDashboard(),
  component: Page,
});

function Page() {
  const { tenants } = Route.useLoaderData();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Tenants</h1>
      {(tenants as Record<string, unknown>[]).map((t) => (
        <Card key={String(t.id)} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p>{String(t.name)}</p>
            <p className="text-xs text-muted">
              /r/{String(t.slug)} · {String(t.template_name)} · {String(t.plan_name)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{String(t.status)}</Badge>
            <Button size="sm" variant="secondary" onClick={() => updateTenantStatus({ data: { id: String(t.id), status: "suspended" } })}>
              Suspend
            </Button>
            <Button size="sm" onClick={() => updateTenantStatus({ data: { id: String(t.id), status: "active" } })}>
              Activate
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
