import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { addMemberToTenant, createUserAccount, listUsers, removeMemberById } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { t, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/admin/users")({
  loader: () => listUsers(),
  component: Page,
});

type Row = Record<string, unknown>;
const ROLES = ["TENANT_OWNER", "TENANT_ADMIN", "BRANCH_MANAGER", "STAFF"] as const;
type MemberRole = (typeof ROLES)[number];

function Page() {
  const { users, members, tenants } = Route.useLoaderData();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string; tenantId: string; role: MemberRole }>({
    name: "",
    email: "",
    password: "",
    tenantId: "",
    role: "STAFF",
  });
  const [link, setLink] = useState<Record<string, { tenantId: string; role: MemberRole }>>({});

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: t(locale, "مدير المنصة", "Platform admin"),
    TENANT_OWNER: t(locale, "مالك", "Owner"),
    TENANT_ADMIN: t(locale, "مدير", "Admin"),
    BRANCH_MANAGER: t(locale, "مدير فرع", "Branch manager"),
    STAFF: t(locale, "موظف", "Staff"),
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (users as Row[]).filter((u) => !needle || `${u.name} ${u.email}`.toLowerCase().includes(needle));
  }, [users, q]);

  async function guarded(action: () => Promise<unknown>, okMsg?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      if (okMsg) setMsg(okMsg);
      await router.invalidate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t(locale, "حصل خطأ", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    void guarded(async () => {
      await createUserAccount({
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          tenantId: form.tenantId || undefined,
          role: form.tenantId ? form.role : undefined,
        },
      });
      setForm({ name: "", email: "", password: "", tenantId: "", role: "STAFF" });
    }, t(locale, "تم إنشاء المستخدم ✅ اديله الإيميل والباسورد.", "User created ✅ share the email and password with them."));
  }

  const selectCls = "h-12 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-base text-fg";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">{t(locale, "المستخدمون", "Users")}</h1>
        <div className="flex items-center gap-2">
          <Badge>{rows.length}</Badge>
          <Button onClick={() => setShowNew((v) => !v)}>
            {showNew ? t(locale, "إغلاق", "Close") : t(locale, "+ مستخدم جديد", "+ New user")}
          </Button>
        </div>
      </div>

      {msg && (
        <Card>
          <p className="text-sm">{msg}</p>
        </Card>
      )}

      {showNew && (
        <Card>
          <form onSubmit={submitNew} className="space-y-3">
            <div className="space-y-1">
              <Label>{t(locale, "الاسم", "Name")}</Label>
              <Input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t(locale, "الإيميل", "Email")}</Label>
              <Input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t(locale, "الباسورد (8 حروف على الأقل)", "Password (min 8 characters)")}</Label>
              <Input required minLength={8} type="text" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "العميل (اختياري)", "Client (optional)")}
                <select className={selectCls} value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                  <option value="">{t(locale, "— بدون ربط —", "— none —")}</option>
                  {(tenants as Row[]).map((tn) => (
                    <option key={String(tn.id)} value={String(tn.id)}>
                      {String(tn.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-muted">
                {t(locale, "الصلاحية", "Role")}
                <select
                  className={selectCls}
                  value={form.role}
                  disabled={!form.tenantId}
                  onChange={(e) => setForm({ ...form, role: e.target.value as MemberRole })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {t(locale, "إنشاء المستخدم", "Create user")}
            </Button>
          </form>
        </Card>
      )}

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(locale, "ابحث بالاسم أو الإيميل…", "Search by name or email…")} />

      {rows.map((u) => {
        const uid = String(u.id);
        const mine = (members as Row[]).filter((m) => String(m.user_id) === uid);
        const draft = link[uid] ?? { tenantId: "", role: "STAFF" as MemberRole };
        return (
          <Card key={uid} className="space-y-3">
            <div>
              <p className="text-lg font-medium">{String(u.name)}</p>
              <p className="text-sm text-muted" dir="ltr">
                {String(u.email)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {mine.length === 0 && <Badge>{t(locale, "غير مربوط بأي عميل", "No client")}</Badge>}
              {mine.map((m) => (
                <span key={String(m.id)} className="inline-flex items-center gap-2 rounded-[length:var(--radius-sm)] bg-elevated px-3 py-2 text-sm">
                  {String(m.tenant_name ?? t(locale, "المنصة", "Platform"))} · {roleLabel[String(m.role)] ?? String(m.role)}
                  {String(m.role) !== "SUPER_ADMIN" && (
                    <button
                      type="button"
                      className="text-danger"
                      aria-label="remove"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t(locale, "إزالة الربط ده؟", "Remove this link?"))) {
                          void guarded(() => removeMemberById({ data: { memberId: String(m.id) } }));
                        }
                      }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <select
                className={selectCls}
                value={draft.tenantId}
                onChange={(e) => setLink({ ...link, [uid]: { ...draft, tenantId: e.target.value } })}
              >
                <option value="">{t(locale, "اربطه بعميل…", "Link to a client…")}</option>
                {(tenants as Row[]).map((tn) => (
                  <option key={String(tn.id)} value={String(tn.id)}>
                    {String(tn.name)}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={draft.role}
                onChange={(e) => setLink({ ...link, [uid]: { ...draft, role: e.target.value as MemberRole } })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                disabled={busy || !draft.tenantId}
                onClick={() =>
                  void guarded(() => addMemberToTenant({ data: { userId: uid, tenantId: draft.tenantId, role: draft.role } }))
                }
              >
                {t(locale, "ربط", "Link")}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
