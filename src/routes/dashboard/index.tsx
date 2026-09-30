import { createFileRoute, Link } from "@tanstack/react-router";
import { getTenantDashboard } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/dashboard/")({
  loader: () => getTenantDashboard({ data: {} }),
  component: Overview,
});

function Overview() {
  const data = Route.useLoaderData();
  const profile = data.profile as Record<string, unknown> | undefined;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[length:var(--radius-xl)] border border-border">
        <div className="relative h-40 bg-elevated">
          {profile?.cover_url ? (
            <img src={String(profile.cover_url)} alt="" className="h-full w-full object-cover opacity-70" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-bg to-transparent" />
          <div className="absolute bottom-4 start-4">
            <p className="text-sm text-muted">VYRO dashboard</p>
            <h1 className="font-display text-3xl">{String(profile?.name_en ?? "Business")}</h1>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total orders" value={data.kpis.orders} />
        <Kpi label="Revenue" value={`${data.kpis.revenue} EGP`} />
        <Kpi label="QR scans" value={data.kpis.qrScans} />
        <Kpi label="Page views" value={data.kpis.visits} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-sm text-muted">Orders this week</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <XAxis dataKey="d" stroke="currentColor" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="c" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-muted">Top products</p>
          <ul className="mt-3 space-y-2 text-sm">
            {data.top.map((row) => (
              <li key={row.name_en} className="flex justify-between">
                <span>{row.name_en}</span>
                <span className="text-muted">{row.c}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/dashboard/catalog">Add product</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/dashboard/offers">Create offer</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/dashboard/qr">Generate QR</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/dashboard/orders">View orders</Link>
        </Button>
      </div>
      <Card>
        <p className="text-sm text-muted">Recent orders</p>
        <ul className="mt-3 space-y-2">
          {(data.recent as Record<string, unknown>[]).map((o) => (
            <li key={String(o.id)} className="flex items-center justify-between text-sm">
              <span>{String(o.order_number)}</span>
              <Badge tone={String(o.status) === "COMPLETED" ? "success" : "warning"}>{String(o.status)}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </Card>
  );
}
