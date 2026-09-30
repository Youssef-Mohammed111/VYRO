import { createFileRoute } from "@tanstack/react-router";
import { getSuperDashboard } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/logs")({
  loader: () => getSuperDashboard(),
  component: Page,
});

function Page() {
  const { logs } = Route.useLoaderData();
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Audit logs</h1>
      {(logs as Record<string, unknown>[]).map((l) => (
        <Card key={String(l.id)} className="text-sm">
          <p>{String(l.action)}</p>
          <p className="text-xs text-muted">
            {String(l.resource)} {String(l.resource_id ?? "")} · {String(l.created_at)}
          </p>
        </Card>
      ))}
    </div>
  );
}
