import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, Radio, ShoppingBag, LayoutGrid, Shield, Gauge } from "lucide-react";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { VyroLogo } from "@/components/vyro/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";
import { getPlatformSettings } from "@/lib/vyro/public";
import { tr, useLocale } from "@/lib/vyro/locale";
import type { UiKey } from "@/lib/vyro/locale";

export const Route = createFileRoute("/")({
  loader: () => getPlatformSettings(),
  component: Home,
});

function Home() {
  const settings = Route.useLoaderData();
  const locale = useLocale((s) => s.locale);

  const features: { icon: typeof LayoutGrid; title: UiKey; body: UiKey }[] = [
    { icon: LayoutGrid, title: "featTemplates", body: "featTemplatesBody" },
    { icon: ShoppingBag, title: "featOrdering", body: "featOrderingBody" },
    { icon: QrCode, title: "featQr", body: "featQrBody" },
    { icon: Radio, title: "featOps", body: "featOpsBody" },
    { icon: Shield, title: "featIsolation", body: "featIsolationBody" },
    { icon: Gauge, title: "featSubs", body: "featSubsBody" },
  ];

  const hierarchy: [string, string][] = [
    [PLATFORM_BRAND.name, PLATFORM_BRAND.tagline],
    [tr(locale, "hierarchyTenant"), tr(locale, "hierarchyTenantBody")],
    [tr(locale, "hierarchyRpm"), tr(locale, "hierarchyRpmBody")],
    [tr(locale, "hierarchyOrder"), tr(locale, "hierarchyOrderBody")],
  ];

  const steps: UiKey[] = ["step1", "step2", "step3", "step4"];

  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 vyro-grid opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_58%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <VyroLogo variant="lockup" to={false} imgClassName="max-w-[280px]" />
            <h1 className="mt-8 font-display text-4xl leading-[0.95] md:text-6xl">
              {settings.hero_line ?? PLATFORM_BRAND.heroLine}
            </h1>
            <p className="mt-4 text-sm tracking-[0.18em] text-silver">{PLATFORM_BRAND.slogan}</p>
            <p className="mt-5 max-w-md text-base text-muted">{tr(locale, "heroBody")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/platform">
                  {tr(locale, "explorePlatform")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/r/$slug" params={{ slug: "rpm" }}>
                  {tr(locale, "viewLiveDemo")}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/contact">{tr(locale, "requestDemo")}</Link>
              </Button>
              <Button asChild variant="ghost">
                <a href={`https://wa.me/${PLATFORM_BRAND.contact.whatsapp}`} target="_blank" rel="noreferrer">
                  {tr(locale, "whatsappVyro")}
                </a>
              </Button>
            </div>
          </div>
          <Card className="space-y-6 p-8">
            <p className="text-[11px] tracking-[0.22em] text-silver">{tr(locale, "hierarchyTitle")}</p>
            <ol className="space-y-4">
              {hierarchy.map(([title, body], i) => (
                <li key={`${title}-${i}`} className="flex gap-4">
                  <span className="font-display text-sm text-primary">0{i + 1}</span>
                  <div>
                    <p className="font-display text-xl">{title}</p>
                    <p className="text-sm text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs tracking-[0.2em] text-muted">{tr(locale, "whatVyroDoes")}</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl">{tr(locale, "whatVyroTitle")}</h2>
        <p className="mt-4 max-w-2xl text-muted">{tr(locale, "whatVyroBody")}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((item) => (
            <Card key={item.title} className="space-y-3">
              <item.icon className="size-5 text-primary" />
              <h3 className="font-display text-xl">{tr(locale, item.title)}</h3>
              <p className="text-sm text-muted">{tr(locale, item.body)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted">{tr(locale, "featuredTenant")}</p>
            <h2 className="mt-2 font-display text-4xl">RPM — Really Powerful Meals</h2>
            <p className="mt-4 text-muted">{tr(locale, "rpmBody")}</p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link to="/r/$slug" params={{ slug: "rpm" }}>
                  {tr(locale, "launchRpm")}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/demo">{tr(locale, "demoOverview")}</Link>
              </Button>
            </div>
          </div>
          <img
            src="/tenants/rpm/v8-classic.jpg"
            alt="RPM V8 Classic burger"
            className="h-80 w-full rounded-[length:var(--radius-xl)] object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl">{tr(locale, "howItWorks")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map((step, i) => (
            <Card key={step}>
              <p className="text-xs text-primary">0{i + 1}</p>
              <p className="mt-2 font-display text-xl">{tr(locale, step)}</p>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
