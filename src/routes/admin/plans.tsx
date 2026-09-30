import { createFileRoute } from "@tanstack/react-router";
import { listPlans } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/plans")({
  loader: () => listPlans(),
  component: Page,
});

function Page() {
  const { plans } = Route.useLoaderData();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Plans</h1>
      {(plans as Record<string, unknown>[]).map((p) => (
        <Card key={String(p.id)}>
          <p className="font-display text-xl">{String(p.name_en)}</p>
          <p className="text-xs text-muted">{String(p.slug)}</p>
        </Card>
      ))}
    </div>
  );
}
