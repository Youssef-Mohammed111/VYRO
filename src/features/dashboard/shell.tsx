import { useEffect } from "react";
import { Link, Outlet, getRouteApi, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Palette,
  UtensilsCrossed,
  Layers,
  Tag,
  ClipboardList,
  Building2,
  QrCode,
  Wallet,
  MessageCircle,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { AuthSlot } from "@/components/auth-slot";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { VyroLogo } from "@/components/vyro/logo";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";
import { applyDocumentLocale, t, tr, useLocale, type UiKey } from "@/lib/vyro/locale";
import { roleRank } from "@/lib/vyro/authz";
import type { Role } from "@/lib/vyro/types";

/** `min` mirrors the server-side role checks — the server is the real gate, this just hides dead links. */
const NAV: { to: string; icon: typeof LayoutDashboard; key: UiKey; min: Role }[] = [
  { to: "/dashboard", icon: LayoutDashboard, key: "overview", min: "STAFF" },
  { to: "/dashboard/orders", icon: ClipboardList, key: "orders", min: "STAFF" },
  { to: "/dashboard/catalog", icon: UtensilsCrossed, key: "catalog", min: "STAFF" },
  { to: "/dashboard/categories", icon: Layers, key: "categories", min: "STAFF" },
  { to: "/dashboard/offers", icon: Tag, key: "offers", min: "STAFF" },
  { to: "/dashboard/branches", icon: Building2, key: "branches", min: "STAFF" },
  { to: "/dashboard/qr", icon: QrCode, key: "qrNfc", min: "BRANCH_MANAGER" },
  { to: "/dashboard/analytics", icon: BarChart3, key: "analytics", min: "BRANCH_MANAGER" },
  { to: "/dashboard/profile", icon: Store, key: "businessProfile", min: "TENANT_ADMIN" },
  { to: "/dashboard/branding", icon: Palette, key: "branding", min: "TENANT_ADMIN" },
  { to: "/dashboard/payments", icon: Wallet, key: "payments", min: "TENANT_ADMIN" },
  { to: "/dashboard/whatsapp", icon: MessageCircle, key: "whatsappNav", min: "STAFF" },
  { to: "/dashboard/staff", icon: Users, key: "staff", min: "TENANT_ADMIN" },
  { to: "/dashboard/subscription", icon: CreditCard, key: "subscription", min: "TENANT_ADMIN" },
  { to: "/dashboard/settings", icon: Settings, key: "settings", min: "STAFF" },
  { to: "/dashboard/support", icon: LifeBuoy, key: "support", min: "STAFF" },
];

const dashboardRoute = getRouteApi("/dashboard");

type TenantCtx = {
  superAdmin: boolean;
  role: Role | null;
  tenant: { name?: string | number | boolean | null; slug?: string | number | boolean | null } | null;
  profile: { name_en?: string | number | boolean | null } | null;
};

export function DashboardShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const locale = useLocale((s) => s.locale);
  const ctx = dashboardRoute.useLoaderData() as TenantCtx;
  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);
  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  if (!ctx.tenant) {
    // Signed in but not a member of any business (sign-up alone grants no access).
    return <NoAccess locale={locale} superAdmin={ctx.superAdmin} />;
  }
  const business = String(ctx.tenant.name ?? ctx.profile?.name_en ?? "Business");
  const slug = String(ctx.tenant.slug ?? "");
  const rank = ctx.role ? roleRank(ctx.role) : ctx.superAdmin ? 100 : 0;
  const nav = NAV.filter((item) => rank >= roleRank(item.min));
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <VyroLogo variant="mark" to="/dashboard" imgClassName="h-7" />
          <div className="hidden min-w-0 md:block">
            <p className="text-[10px] tracking-[0.18em] text-silver">{tr(locale, "dashboard").toUpperCase()}</p>
            <p className="truncate text-xs text-muted">
              {tr(locale, "currentBusiness")}: {business}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link to="/r/$slug" params={{ slug }} className="text-xs text-muted hover:text-fg">
            {tr(locale, "viewPublic")}
          </Link>
          {ctx.superAdmin ? (
            <Link to="/admin" className="text-xs text-muted hover:text-fg">
              {PLATFORM_BRAND.name} {tr(locale, "admin")}
            </Link>
          ) : null}
          <AuthSlot />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-e border-border p-3 md:block">
          <nav className="space-y-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-[length:var(--radius-sm)] px-3 py-2 text-muted hover:bg-elevated hover:text-fg",
                  pathname === item.to && "bg-primary text-primary-fg hover:bg-primary hover:text-primary-fg",
                )}
              >
                <item.icon className="size-4" />
                {tr(locale, item.key)}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-full border border-border px-3 py-2 text-xs",
                  pathname === item.to && "border-primary bg-primary text-primary-fg",
                )}
              >
                {tr(locale, item.key)}
              </Link>
            ))}
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NoAccess({ locale, superAdmin }: { locale: "ar" | "en"; superAdmin: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-center text-fg">
      <div className="max-w-md space-y-4">
        <VyroLogo variant="mark" to="/" imgClassName="mx-auto h-10" />
        <h1 className="font-display text-3xl">{t(locale, "لسه مفيش نشاط مرتبط بحسابك", "No business linked to your account yet")}</h1>
        <p className="text-sm text-muted">
          {t(
            locale,
            "إنشاء حساب لوحده مبيدّيش صلاحية. اطلب من مالك النشاط يبعتلك رابط دعوة وافتحه وأنت مسجّل دخول.",
            "Creating an account doesn't grant access on its own. Ask the business owner for an invite link and open it while signed in.",
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <LanguageToggle />
          <AuthSlot />
        </div>
        {superAdmin ? (
          <Link to="/admin" className="text-sm text-primary">
            {t(locale, "فتح لوحة المنصة", "Open the platform console")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
