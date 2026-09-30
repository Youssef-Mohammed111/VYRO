import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { VyroLogo } from "@/components/vyro/logo";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";

export const Route = createFileRoute("/about")({ component: Page });

function Page() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-4 py-16">
        <VyroLogo variant="lockup" to={false} imgClassName="max-w-[240px]" />
        <h1 className="mt-10 font-display text-5xl">About {PLATFORM_BRAND.name}</h1>
        <p className="mt-6 text-muted">
          {PLATFORM_BRAND.name} is built by {PLATFORM_BRAND.owner} as a digital business platform for operators who need
          a serious customer experience without owning engineering.
        </p>
        <p className="mt-4 text-muted">
          Businesses join {PLATFORM_BRAND.name}. They receive a templated, bilingual presence, ordering, QR/NFC and a
          dashboard. They do not receive the source code, a page builder, or access to other tenants.
        </p>
        <p className="mt-4 text-muted">
          RPM — Really Powerful Meals is the first restaurant tenant. {PLATFORM_BRAND.name} remains the platform
          underneath.
        </p>
      </main>
    </MarketingShell>
  );
}
