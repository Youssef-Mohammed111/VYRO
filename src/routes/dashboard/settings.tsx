import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/settings")({ component: Page });

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Settings</h1>
      <Card className="space-y-2 text-sm text-muted">
        <p>Business content lives under Profile, Branding, Payments and WhatsApp.</p>
        <p>You cannot edit template structure, inject HTML, or access other tenants.</p>
        <Link to="/dashboard/profile" className="text-primary">
          Open business profile
        </Link>
      </Card>
    </div>
  );
}
