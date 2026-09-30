import { createFileRoute } from "@tanstack/react-router";
import { getDiagnostics } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/diagnostics")({
  loader: () => getDiagnostics(),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Diagnostics</h1>
      {data.checks.map((c) => (
        <Card key={c.name} className="flex items-start justify-between gap-3">
          <div>
            <p>{c.name}</p>
            <p className="text-sm text-muted">{c.detail}</p>
          </div>
          <Badge tone={c.ok ? "success" : "warning"}>{c.ok ? "ok" : "attention"}</Badge>
        </Card>
      ))}
    </div>
  );
}
