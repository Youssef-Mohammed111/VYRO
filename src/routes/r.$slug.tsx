import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { getPublicTenant, trackPublicEvent } from "@/lib/vyro/public";
import { StorefrontShell } from "@/features/storefront/shell";

export const Route = createFileRoute("/r/$slug")({
  validateSearch: z.object({ table: z.string().optional() }),
  loader: async ({ params }) => {
    const tenant = await getPublicTenant({ data: { slug: params.slug } });
    if (!tenant) throw notFound();
    void trackPublicEvent({ data: { slug: params.slug, event: "page_view", path: `/r/${params.slug}` } });
    return tenant;
  },
  component: () => {
    const tenant = Route.useLoaderData();
    const { table } = Route.useSearch();
    return <StorefrontShell tenant={tenant} table={table} />;
  },
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-bg text-fg">
      <p>Business not found.</p>
    </main>
  ),
});
