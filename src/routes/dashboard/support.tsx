import { createFileRoute } from "@tanstack/react-router";
import { createSupportTicket, getSupportTickets } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/support")({
  loader: () => getSupportTickets(),
  component: Page,
});

function Page() {
  const tickets = Route.useLoaderData() as Record<string, unknown>[];
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createSupportTicket({ data: { subject: String(fd.get("subject")), description: String(fd.get("description")) } });
    window.location.reload();
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Support</h1>
      <Card>
        <form className="space-y-3" onSubmit={send}>
          <Input name="subject" placeholder="Subject" required />
          <Textarea name="description" placeholder="Describe the issue" required />
          <Button type="submit">Open ticket</Button>
        </form>
      </Card>
      {tickets.map((t) => (
        <Card key={String(t.id)} className="flex items-center justify-between">
          <div>
            <p>{String(t.subject)}</p>
            <p className="text-xs text-muted">{String(t.description)}</p>
          </div>
          <Badge>{String(t.status)}</Badge>
        </Card>
      ))}
    </div>
  );
}
