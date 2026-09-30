import { createFileRoute } from "@tanstack/react-router";
import { listTemplates } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/templates")({
  loader: () => listTemplates(),
  component: Page,
});

function Page() {
  const templates = Route.useLoaderData() as Record<string, unknown>[];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Templates</h1>
      <p className="text-sm text-muted">Tenants receive a family. They do not edit layout or animation rules.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={String(t.id)}>
            <p className="font-display text-xl">{String(t.name_en)}</p>
            <p className="text-xs text-muted">{String(t.industry)} · v{String(t.version)}</p>
            <Badge className="mt-2">{String(t.status)}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
