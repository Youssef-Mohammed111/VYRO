import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { acceptStaffInvite, getInvitePreview } from "@/lib/vyro/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VyroLogo } from "@/components/vyro/logo";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/join/$token")({
  loader: ({ params }) => getInvitePreview({ data: { token: params.token } }),
  component: JoinPage,
});

const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  TENANT_ADMIN: { ar: "مدير", en: "Admin" },
  BRANCH_MANAGER: { ar: "مدير فرع", en: "Branch manager" },
  STAFF: { ar: "موظف", en: "Staff" },
};

function JoinPage() {
  const invite = Route.useLoaderData();
  const { token } = Route.useParams();
  const locale = useLocale((s) => s.locale);
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      await acceptStaffInvite({ data: { token } });
      toast.success(t(locale, "تم الانضمام للفريق", "You joined the team"));
      window.location.assign("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(locale, "تعذر قبول الدعوة", "Could not accept the invite"));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 py-12 text-fg">
      <Card className="w-full max-w-md space-y-5 p-8 text-center">
        <div className="flex items-center justify-between">
          <VyroLogo variant="mark" to="/" imgClassName="h-8" />
          <LanguageToggle />
        </div>
        {invite ? (
          <>
            <h1 className="font-display text-3xl">{t(locale, "دعوة للانضمام", "You're invited")}</h1>
            <p className="text-sm text-muted">
              {t(locale, `تمت دعوتك للانضمام إلى ${invite.nameAr} بدور`, `You've been invited to join ${invite.nameEn} as`)}{" "}
              <span className="text-fg">{ROLE_LABEL[invite.role]?.[locale] ?? invite.role}</span>
            </p>
            {isPending ? null : user ? (
              <Button className="w-full" disabled={busy} onClick={accept}>
                {busy ? "…" : t(locale, "قبول الدعوة", "Accept invite")}
              </Button>
            ) : (
              <Button className="w-full" onClick={() => void navigate({ to: "/login", search: { redirect: `/join/${token}` } })}>
                {t(locale, "سجّل الدخول للقبول", "Sign in to accept")}
              </Button>
            )}
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">{t(locale, "الدعوة غير صالحة", "Invite not valid")}</h1>
            <p className="text-sm text-muted">
              {t(locale, "الرابط منتهي أو مستخدم من قبل. اطلب رابطاً جديداً من مدير النشاط.", "This link has expired or was already used. Ask the business owner for a new one.")}
            </p>
          </>
        )}
        <Link to="/" className="block text-sm text-muted">
          {t(locale, "الرئيسية", "Home")}
        </Link>
      </Card>
    </main>
  );
}
