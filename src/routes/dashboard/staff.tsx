import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { createStaffInvite, listStaff, removeMember, revokeStaffInvite, updateMemberRole } from "@/lib/vyro/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";
import { roleRank } from "@/lib/vyro/authz";
import type { Role } from "@/lib/vyro/types";

export const Route = createFileRoute("/dashboard/staff")({
  loader: () => listStaff({ data: {} }),
  component: Page,
});

const ROLES = ["TENANT_ADMIN", "BRANCH_MANAGER", "STAFF"] as const;
const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير المنصة", en: "Super admin" },
  TENANT_OWNER: { ar: "المالك", en: "Owner" },
  TENANT_ADMIN: { ar: "مدير", en: "Admin" },
  BRANCH_MANAGER: { ar: "مدير فرع", en: "Branch manager" },
  STAFF: { ar: "موظف", en: "Staff" },
};

function Page() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [role, setRole] = useState<(typeof ROLES)[number]>("STAFF");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const myRank = roleRank(data.myRole as Role);
  const invitable = ROLES.filter((r) => roleRank(r) < myRank);
  const isOwner = myRank >= roleRank("TENANT_OWNER");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(`${origin}/join/${token}`);
    toast.success(t(locale, "تم نسخ رابط الدعوة", "Invite link copied"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{t(locale, "الموظفون", "Staff")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            locale,
            "الحساب الجديد مبيدخلش على أي نشاط إلا بدعوة. ابعت الرابط للموظف وهو يفتحه وهو مسجّل دخول.",
            "New accounts get no access until invited. Send the link to your teammate and they open it while signed in.",
          )}
        </p>
      </div>

      <Card className="space-y-3">
        <p className="text-sm font-medium">{t(locale, "دعوة عضو جديد", "Invite a teammate")}</p>
        {invitable.length === 0 ? (
          <p className="text-sm text-muted">{t(locale, "دورك لا يسمح بالدعوات.", "Your role can't invite others.")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-52" placeholder={t(locale, "اسم/ملاحظة (اختياري)", "Name / note (optional)")} value={label} onChange={(e) => setLabel(e.target.value)} />
            <select
              className="h-11 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            >
              {invitable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r][locale]}
                </option>
              ))}
            </select>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await createStaffInvite({ data: { role: invitable.includes(role) ? role : invitable[0], label: label || undefined } });
                  await navigator.clipboard.writeText(`${origin}/join/${res.token}`).catch(() => undefined);
                  setLabel("");
                }, t(locale, "تم إنشاء الدعوة ونسخ الرابط", "Invite created — link copied"))
              }
            >
              {t(locale, "إنشاء رابط دعوة", "Create invite link")}
            </Button>
          </div>
        )}
      </Card>

      {data.invites.length ? (
        <div className="space-y-2">
          <h2 className="font-display text-xl">{t(locale, "دعوات معلّقة", "Pending invites")}</h2>
          {data.invites.map((i) => (
            <Card key={String(i.id)} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="text-sm">
                <Badge>{ROLE_LABEL[String(i.role)]?.[locale] ?? String(i.role)}</Badge>
                <span className="ms-2 text-muted">{String(i.label ?? "")}</span>
                <p className="mt-1 text-xs text-subtle">
                  {t(locale, "تنتهي", "Expires")} {new Date(String(i.expires_at)).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => copy(String(i.token))}>
                  <Copy className="size-3.5" /> {t(locale, "نسخ", "Copy")}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => revokeStaffInvite({ data: { id: String(i.id) } }), t(locale, "تم إلغاء الدعوة", "Invite revoked"))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="font-display text-xl">{t(locale, "الفريق", "Team")}</h2>
        {data.staff.map((m) => {
          const mine = m.user_id === data.me;
          const locked = m.role === "TENANT_OWNER" || m.role === "SUPER_ADMIN" || mine || !isOwner;
          return (
            <Card key={String(m.id)} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {String(m.name ?? m.email ?? m.user_id)} {mine ? <span className="text-xs text-muted">({t(locale, "أنت", "you")})</span> : null}
                </p>
                <p className="truncate text-xs text-muted">{String(m.email ?? "")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {locked ? (
                  <Badge tone={m.role === "TENANT_OWNER" ? "primary" : "muted"}>{ROLE_LABEL[String(m.role)]?.[locale] ?? String(m.role)}</Badge>
                ) : (
                  <>
                    <select
                      className="h-9 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-2 text-xs"
                      defaultValue={String(m.role)}
                      onChange={(e) =>
                        run(
                          () => updateMemberRole({ data: { memberId: String(m.id), role: e.target.value as (typeof ROLES)[number], branchId: (m.branch_id as string) ?? null } }),
                          t(locale, "تم تحديث الدور", "Role updated"),
                        )
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r][locale]}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-2 text-xs"
                      defaultValue={String(m.branch_id ?? "")}
                      onChange={(e) =>
                        run(
                          () => updateMemberRole({ data: { memberId: String(m.id), role: String(m.role) as (typeof ROLES)[number], branchId: e.target.value || null } }),
                          t(locale, "تم تحديث الفرع", "Branch updated"),
                        )
                      }
                    >
                      <option value="">{t(locale, "كل الفروع", "All branches")}</option>
                      {data.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {t(locale, b.name_ar, b.name_en)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t(locale, "إزالة هذا العضو؟", "Remove this member?"))) {
                          void run(() => removeMember({ data: { memberId: String(m.id) } }), t(locale, "تمت الإزالة", "Removed"));
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
