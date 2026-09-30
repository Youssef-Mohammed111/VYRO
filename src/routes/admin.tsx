import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/features/admin/shell";

export const Route = createFileRoute("/admin")({ component: AdminShell });
