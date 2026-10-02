import { Link, Outlet, useParams } from "@tanstack/react-router";
import { presetFor, themeVars } from "@/lib/vyro/presets";
import { Phone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicTenant } from "@/lib/vyro/types";
import { useCart, cartCount } from "@/lib/vyro/cart";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { t, useLocale } from "@/lib/vyro/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isOpenNow, parseHours } from "@/lib/vyro/hours";
import { toE164 } from "@/lib/vyro/phone";
import { contrastText, isHexColor } from "@/lib/vyro/validation";

export function StorefrontShell({ tenant, table }: { tenant: PublicTenant; table?: string }) {
  const { slug } = useParams({ from: "/r/$slug" });
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const lines = useCart((s) => s.lines);
  const setContext = useCart((s) => s.setContext);
  const [booting, setBooting] = useState(true);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    setContext(slug, table);
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    if (!sessionStorage.getItem("vyro-lang-picked")) setLangOpen(true);
    const tmr = window.setTimeout(() => setBooting(false), 900);
    return () => {
      window.clearTimeout(tmr);
      root.dir = "ltr";
      root.lang = "en";
    };
  }, [slug, locale, setContext, table]);

  const name = t(locale, tenant.profile.nameAr, tenant.profile.nameEn);
  const count = cartCount(lines);
  const rpm = tenant.templateFamily === "restaurant-performance";
  // Tenant brand color (validated hex only) overrides the template's primary.
  const brand = tenant.profile.branding?.primary;
  const preset = presetFor(tenant.templateFamily);
  const themeStyle = {
    ...(preset.theme ? themeVars(preset.theme) : {}),
    ...(isHexColor(brand ?? "")
      ? { "--color-primary": brand, "--color-ring": brand, "--color-primary-fg": contrastText(brand!) }
      : {}),
  } as React.CSSProperties;
  // Computed after mount so server and client HTML agree (no hydration mismatch on the clock).
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    setOpen(isOpenNow(parseHours(tenant.profile.hoursJson), new Date(), tenant.profile.timezone));
  }, [tenant.profile.hoursJson, tenant.profile.timezone]);
  const paused = !tenant.profile.acceptingOrders;

  return (
    <div className={cn("min-h-screen bg-bg text-fg", rpm && "theme-rpm")} style={themeStyle}>
      {booting && rpm ? <RpmBoot logo={tenant.profile.logoUrl} /> : null}
      {langOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-6">
          <div className="w-full max-w-sm space-y-4 text-center">
            {tenant.profile.logoUrl ? (
              <img src={tenant.profile.logoUrl} alt="" className="mx-auto h-20 object-contain" />
            ) : null}
            <p className="text-sm text-muted">اختر اللغة / Select language</p>
            <Button
              className="w-full"
              onClick={() => {
                setLocale("ar");
                sessionStorage.setItem("vyro-lang-picked", "1");
                setLangOpen(false);
              }}
            >
              العربية
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setLocale("en");
                sessionStorage.setItem("vyro-lang-picked", "1");
                setLangOpen(false);
              }}
            >
              English
            </Button>
          </div>
        </div>
      ) : null}
      {table ? (
        <div className="bg-primary py-1 text-center text-xs text-primary-fg">
          {t(locale, `طاولة ${table}`, `Table ${table}`)}
        </div>
      ) : null}
      {paused ? (
        <div className="bg-warning/20 py-1.5 text-center text-xs text-warning">
          {t(locale, "الطلبات متوقفة مؤقتاً", "Orders are paused right now")}
        </div>
      ) : open === false ? (
        <div className="bg-elevated py-1.5 text-center text-xs text-muted">
          {t(locale, `مغلق الآن — يمكنك تصفح ${preset.catalogAr}`, `Closed right now — you can still browse ${preset.catalogEn}`)}
        </div>
      ) : null}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-3">
          <Link to="/r/$slug" params={{ slug }} className="flex items-center gap-2">
            {tenant.profile.logoUrl ? (
              <img src={tenant.profile.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : null}
            <span className="font-display text-sm tracking-wide">{name}</span>
            {open !== null ? (
              <span className={cn("size-2 rounded-full", open ? "bg-success" : "bg-subtle")} title={open ? t(locale, "مفتوح", "Open") : t(locale, "مغلق", "Closed")} />
            ) : null}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle variant="icon" />
            {tenant.profile.phone ? (
              <a className="grid size-11 place-items-center text-muted" href={`tel:${toE164(tenant.profile.phone)}`}>
                <Phone className="size-4" />
              </a>
            ) : null}
            <Link to="/r/$slug/cart" params={{ slug }} className="relative grid size-11 place-items-center">
              <ShoppingBag className="size-4" />
              {count ? (
                <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-fg">
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto min-h-[70vh] max-w-lg pb-24">
        <Outlet />
        <p className="px-4 pb-6 pt-10 text-center text-[10px] tracking-[0.22em] text-subtle">{t(locale, "مدعوم بواسطة VYRO", "Powered by VYRO")}</p>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5 text-[11px] text-muted">
          <Tab to="/r/$slug" slug={slug} label={t(locale, "الرئيسية", "Home")} />
          <Tab to="/r/$slug/menu" slug={slug} label={t(locale, preset.catalogAr, preset.catalogEn)} />
          <Tab to="/r/$slug/offers" slug={slug} label={t(locale, "العروض", "Offers")} />
          <Tab to="/r/$slug/location" slug={slug} label={t(locale, "الموقع", "Location")} />
          <Tab to="/r/$slug/about" slug={slug} label={t(locale, "عنا", "About")} />
        </div>
      </nav>
    </div>
  );
}

function Tab({ to, slug, label }: { to: string; slug: string; label: string }) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="flex h-14 items-center justify-center"
      activeProps={{ className: "text-primary" }}
    >
      {label}
    </Link>
  );
}

function RpmBoot({ logo }: { logo: string | null }) {
  return (
    <div className="theme-rpm fixed inset-0 z-50 grid place-items-center bg-bg">
      <div className="text-center">
        {logo ? <img src={logo} alt="RPM" className="mx-auto h-24 object-contain" /> : null}
        <div className="relative mx-auto mt-6 size-28">
          <div className="gauge-ring absolute inset-0 rounded-full" />
          <div className="rpm-needle absolute bottom-8 left-1/2 h-10 w-0.5 -translate-x-1/2 bg-primary" />
        </div>
        <p className="mt-6 font-display text-xl tracking-widest">READY TO POWER UP?</p>
      </div>
    </div>
  );
}
