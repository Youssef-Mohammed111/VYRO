import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/features/dashboard/shell";
import { getTenantContext } from "@/lib/vyro/admin";

export const Route = createFileRoute("/dashboard")({
  loader: () => getTenantContext(),
  component: DashboardShell,
});
