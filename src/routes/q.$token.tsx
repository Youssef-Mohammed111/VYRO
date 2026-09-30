import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveQr } from "@/lib/vyro/public";

export const Route = createFileRoute("/q/$token")({
  loader: async ({ params }) => {
    const res = await resolveQr({ data: { token: params.token } });
    if (!res) throw redirect({ to: "/" });
    throw redirect({
      to: "/r/$slug/menu",
      params: { slug: res.slug },
      search: { table: res.table ?? undefined, cat: undefined },
    });
  },
  component: () => null,
});
