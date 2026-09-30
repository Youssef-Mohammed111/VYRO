import type { Member, Role } from "./types";

const RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  TENANT_OWNER: 80,
  TENANT_ADMIN: 60,
  BRANCH_MANAGER: 40,
  STAFF: 20,
};

export function isSuperAdmin(members: Member[]) {
  return members.some((m) => m.role === "SUPER_ADMIN");
}

/**
 * The user's strongest membership that applies to a tenant: a platform-wide
 * SUPER_ADMIN, or a membership scoped to exactly this tenant. Highest rank wins,
 * so a user who is both owner and super admin is never downgraded by list order.
 */
export function tenantMembership(members: Member[], tenantId: string): Member | null {
  let best: Member | null = null;
  for (const m of members) {
    if (m.role !== "SUPER_ADMIN" && m.tenant_id !== tenantId) continue;
    if (!best || RANK[m.role] > RANK[best.role]) best = m;
  }
  return best;
}

export function canAccessTenant(members: Member[], tenantId: string) {
  return Boolean(tenantMembership(members, tenantId));
}

export function hasRole(members: Member[], tenantId: string, min: Role): boolean {
  const m = tenantMembership(members, tenantId);
  return Boolean(m && RANK[m.role] >= RANK[min]);
}

/** Throws 403 unless the user holds at least `min` on this tenant; returns the membership. */
export function assertRole(members: Member[], tenantId: string, min: Role): Member {
  return requireRole(tenantMembership(members, tenantId), min);
}

export function roleRank(role: Role): number {
  return RANK[role];
}

export function requireRole(member: Member | null, min: Role): Member {
  if (!member) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (RANK[member.role] < RANK[min]) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return member;
}

export function scopedTenantId(members: Member[], requested?: string | null): string | null {
  if (isSuperAdmin(members)) return requested ?? members.find((m) => m.tenant_id)?.tenant_id ?? null;
  const owned = members.filter((m) => m.tenant_id);
  if (!owned.length) return null;
  if (requested) {
    // A user may belong to several tenants; they can only act inside one they belong to.
    if (!owned.some((m) => m.tenant_id === requested)) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
    return requested;
  }
  return owned[0].tenant_id;
}
