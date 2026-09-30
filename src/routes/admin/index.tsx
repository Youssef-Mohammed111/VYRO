import { createFileRoute } from "@tanstack/react-router";
import { getSuperDashboard } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";

export const Route = createFileRoute("/admin/")({
  loader: () => getSuperDashboard(),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{PLATFORM_BRAND.name} Admin</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">Tenants</p>
          <p className="font-display text-3xl">{k.tenants}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Active</p>
          <p className="font-display text-3xl">{k.active}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Orders</p>
          <p className="font-display text-3xl">{k.orders}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">QR scans</p>
          <p className="font-display text-3xl">{k.scans}</p>
        </Card>
      </div>
      <Card>
        <p className="text-sm text-muted">Tenants</p>
        <ul className="mt-3 space-y-2">
          {(data.tenants as Record<string, unknown>[]).map((t) => (
            <li key={String(t.id)} className="flex justify-between text-sm">
              <span>{String(t.name)}</span>
              <Badge>{String(t.status)}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <p className="text-sm text-muted">Audit</p>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {(data.logs as Record<string, unknown>[]).map((l) => (
            <li key={String(l.id)}>
              {String(l.action)} · {String(l.resource)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
