import { useEffect } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthSlot } from "@/components/auth-slot";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { VyroLogo } from "@/components/vyro/logo";
import { PLATFORM_BRAND } from "@/lib/vyro/brand";
import { applyDocumentLocale, tr, useLocale, type UiKey } from "@/lib/vyro/locale";
import { cn } from "@/lib/utils";

const NAV: { to: string; key: UiKey }[] = [
  { to: "/admin", key: "dashboard" },
  { to: "/admin/tenants", key: "tenants" },
  { to: "/admin/users", key: "users" },
  { to: "/admin/templates", key: "templates" },
  { to: "/admin/plans", key: "plans" },
  { to: "/admin/support", key: "support" },
  { to: "/admin/logs", key: "auditLogs" },
  { to: "/admin/diagnostics", key: "diagnostics" },
  { to: "/admin/settings", key: "settings" },
];

export function AdminShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const locale = useLocale((s) => s.locale);
  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);
  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (!user) return <RedirectToSignIn />;
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <VyroLogo variant="mark" to="/admin" imgClassName="h-7" />
          <span className="text-[10px] tracking-[0.2em] text-silver">
            {PLATFORM_BRAND.name} {tr(locale, "admin").toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <LanguageToggle />
          <Link to="/dashboard" className="text-muted hover:text-fg">
            {tr(locale, "tenantLink")}
          </Link>
          <AuthSlot />
        </div>
      </header>
      <nav className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "shrink-0 rounded-[length:var(--radius-sm)] px-4 py-2 text-sm text-muted",
              pathname === item.to && "bg-primary text-primary-fg",
            )}
          >
            {tr(locale, item.key)}
          </Link>
        ))}
      </nav>
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-52 border-e border-border p-3 md:block">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "block rounded-[length:var(--radius-sm)] px-4 py-3 text-base text-muted hover:bg-elevated",
                pathname === item.to && "bg-primary text-primary-fg",
              )}
            >
              {tr(locale, item.key)}
            </Link>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
