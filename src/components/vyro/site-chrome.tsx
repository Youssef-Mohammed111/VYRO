import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AuthSlot } from "@/components/auth-slot";
import { Button } from "@/components/ui/button";
import { VyroLogo } from "@/components/vyro/logo";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";
import { applyDocumentLocale, tr, useLocale } from "@/lib/vyro/locale";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "home" as const },
  { to: "/platform", key: "platform" as const },
  { to: "/solutions", key: "solutions" as const },
  { to: "/industries", key: "industries" as const },
  { to: "/demo", key: "liveDemo" as const },
  { to: "/pricing", key: "pricing" as const },
  { to: "/about", key: "about" as const },
  { to: "/contact", key: "contact" as const },
] as const;

export function VyroMark({ className }: { className?: string }) {
  return <VyroLogo variant="mark" className={className} />;
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const locale = useLocale((s) => s.locale);
  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <VyroMark />
        <nav className="hidden items-center gap-5 text-sm text-muted lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn("hover:text-fg", pathname === item.to && "text-fg")}
            >
              {tr(locale, item.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <AuthSlot />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/contact">{tr(locale, "requestDemo")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { email, phone, phoneE164, whatsapp } = PLATFORM_BRAND.contact;
  const locale = useLocale((s) => s.locale);
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <VyroMark />
          <p className="mt-1 text-[11px] tracking-[0.22em] text-silver">{PLATFORM_BRAND.tagline.toUpperCase()}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{tr(locale, "footerBlurb")}</p>
          <p className="mt-4 text-sm text-muted">{PLATFORM_BRAND.owner}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs tracking-[0.18em] text-silver">{tr(locale, "product")}</p>
          {NAV.slice(0, 5).map((item) => (
            <Link key={item.to} to={item.to} className="block text-muted hover:text-fg">
              {tr(locale, item.key)}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.18em] text-silver">{tr(locale, "contactCta")}</p>
          <Button asChild variant="secondary">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              {tr(locale, "whatsapp")}
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`tel:${phoneE164}`}>{tr(locale, "call")}</a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`mailto:${email}`}>{tr(locale, "email")}</a>
          </Button>
          <p className="pt-2 text-xs text-subtle">{phone}</p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-subtle">
        {PLATFORM_BRAND.name} · {PLATFORM_BRAND.tagline}
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
