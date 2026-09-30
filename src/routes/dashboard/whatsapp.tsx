import { createFileRoute } from "@tanstack/react-router";
import { getTenantDashboard } from "@/lib/vyro/admin";
import { Card } from "@/components/ui/card";
import { menuShareMessage, whatsappDeepLink } from "@/lib/vyro/whatsapp";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/whatsapp")({
  loader: () => getTenantDashboard({ data: {} }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const p = (data.profile ?? {}) as Record<string, unknown>;
  const phone = String(p.whatsapp ?? "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const tenant = data.tenant as Record<string, unknown>;
  const menuUrl = `${origin}/r/${String(tenant.slug)}`;
  const share = phone ? whatsappDeepLink(phone, menuShareMessage("ar", String(p.name_ar), menuUrl)) : null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">WhatsApp</h1>
      <Card className="space-y-3">
        <p className="text-sm">Ordering number: {phone || "not set"}</p>
        <p className="text-sm text-muted">
          Orders generate a prefilled message. The customer still presses Send. WhatsApp Business API can be added later as an adapter — it is not simulated.
        </p>
        {share ? (
          <Button asChild>
            <a href={share} target="_blank" rel="noreferrer">
              Share menu via WhatsApp
            </a>
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
