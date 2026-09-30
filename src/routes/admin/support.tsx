import { createFileRoute } from "@tanstack/react-router";
import { getSupportTickets } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/support")({
  loader: () => getSupportTickets(),
  component: Page,
});

function Page() {
  const tickets = Route.useLoaderData() as Record<string, unknown>[];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Support</h1>
      {tickets.length === 0 ? <p className="text-sm text-muted">No tickets.</p> : null}
      {tickets.map((t) => (
        <Card key={String(t.id)}>
          <div className="flex justify-between">
            <p>{String(t.subject)}</p>
            <Badge>{String(t.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{String(t.description)}</p>
        </Card>
      ))}
    </div>
  );
}
