import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureSeeded } from "./seed";
import { newId } from "./ids";
import type { Member } from "./types";

/** The tenant the very first platform user becomes owner of (the seeded RPM restaurant). */
const BOOTSTRAP_TENANT_ID = "tn_rpm";

const SELECT_MEMBERS = "select id, user_id, tenant_id, role, branch_id from members where user_id = $1";

/**
 * Memberships for a signed-in user.
 *
 * SECURITY: signing up does NOT grant access to anything. Only the very first
 * account on a brand-new platform is bootstrapped (Super Admin + owner of the
 * seeded tenant). Everyone after that must be invited by a tenant owner/admin
 * (see `createStaffInvite` / `acceptStaffInvite`), otherwise anybody who could
 * open /login would get admin rights over a real business's orders and payments.
 *
 * Optional hardening: set VYRO_OWNER_EMAIL to only allow that email to bootstrap.
 */
export async function loadMembers(userId: string): Promise<Member[]> {
  const sql = await getSql();
  await ensureSeeded(sql);
  const rows = await sql.query<Member>(SELECT_MEMBERS, [userId]);
  if (rows.length) return rows;

  const supers = await sql.query<{ c: number }>("select count(*)::int as c from members where role = 'SUPER_ADMIN'");
  if (supers[0]?.c) return []; // platform already has an owner — newcomers need an invite

  const ownerEmail = process.env.VYRO_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail) {
    const u = await sql.query<{ email: string }>('select "email" from "user" where "id" = $1', [userId]);
    if (u[0]?.email?.toLowerCase() !== ownerEmail) return [];
  }

  // Atomic claim: if two first sign-ups race, exactly one wins the insert below.
  const claim = await sql.query<{ key: string }>(
    "insert into platform_settings (key, value) values ('bootstrap_owner', $1) on conflict (key) do nothing returning key",
    [userId],
  );
  if (!claim.length) return sql.query<Member>(SELECT_MEMBERS, [userId]);

  try {
    await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,null,'SUPER_ADMIN')", [
      newId("mem"),
      userId,
    ]);
    await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,$3,'TENANT_OWNER')", [
      newId("mem"),
      userId,
      BOOTSTRAP_TENANT_ID,
    ]);
    await sql.query(
      "insert into audit_logs (id, actor_user_id, tenant_id, action, resource, resource_id, metadata_json) values ($1,$2,$3,$4,$5,$6,$7)",
      [newId("aud"), userId, BOOTSTRAP_TENANT_ID, "bootstrap_owner", "member", userId, "{}"],
    );
  } catch (err) {
    // Release the claim so a retry (or another user) is not locked out forever.
    await sql.query("delete from platform_settings where key = 'bootstrap_owner'");
    throw err;
  }
  return sql.query<Member>(SELECT_MEMBERS, [userId]);
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const members = await loadMembers(context.userId);
    return {
      userId: context.userId,
      members,
      isSuperAdmin: members.some((m) => m.role === "SUPER_ADMIN"),
      tenantIds: members.map((m) => m.tenant_id).filter(Boolean) as string[],
    };
  });
