import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessTenant, scopedTenantId } from "./authz.ts";
import type { Member } from "./types.ts";

const a: Member = { id: "1", user_id: "u1", tenant_id: "tn_a", role: "TENANT_OWNER", branch_id: null };
const b: Member = { id: "2", user_id: "u2", tenant_id: "tn_b", role: "STAFF", branch_id: null };
const sa: Member = { id: "3", user_id: "u3", tenant_id: null, role: "SUPER_ADMIN", branch_id: null };

describe("tenant isolation helpers", () => {
  it("blocks cross-tenant access for tenant users", () => {
    assert.equal(canAccessTenant([a], "tn_a"), true);
    assert.equal(canAccessTenant([a], "tn_b"), false);
    assert.equal(canAccessTenant([b], "tn_a"), false);
  });

  it("lets super admin view any tenant", () => {
    assert.equal(canAccessTenant([sa], "tn_b"), true);
    assert.equal(scopedTenantId([sa], "tn_b"), "tn_b");
  });

  it("throws when a tenant user requests another tenant", () => {
    assert.throws(() => scopedTenantId([a], "tn_b"));
    assert.equal(scopedTenantId([a], "tn_a"), "tn_a");
  });
});

describe("roles", () => {
  it("picks the strongest membership regardless of order", async () => {
    const { tenantMembership, hasRole, assertRole } = await import("./authz.ts");
    const owner: Member = { id: "4", user_id: "u", tenant_id: "tn_a", role: "TENANT_OWNER", branch_id: null };
    const staff: Member = { id: "5", user_id: "u", tenant_id: "tn_a", role: "STAFF", branch_id: null };
    assert.equal(tenantMembership([staff, owner], "tn_a")?.role, "TENANT_OWNER");
    assert.equal(tenantMembership([owner, sa], "tn_a")?.role, "SUPER_ADMIN");
    assert.equal(hasRole([staff], "tn_a", "TENANT_ADMIN"), false);
    assert.equal(hasRole([staff], "tn_a", "STAFF"), true);
    assert.equal(hasRole([staff], "tn_b", "STAFF"), false);
    assert.throws(() => assertRole([staff], "tn_a", "BRANCH_MANAGER"), /Forbidden/);
    assert.equal(assertRole([owner], "tn_a", "TENANT_ADMIN").role, "TENANT_OWNER");
  });
  it("lets a multi-tenant user pick any tenant they belong to", () => {
    const x: Member = { id: "6", user_id: "u", tenant_id: "tn_x", role: "STAFF", branch_id: null };
    const y: Member = { id: "7", user_id: "u", tenant_id: "tn_y", role: "STAFF", branch_id: null };
    assert.equal(scopedTenantId([x, y], "tn_y"), "tn_y");
    assert.equal(scopedTenantId([x, y]), "tn_x");
    assert.throws(() => scopedTenantId([x, y], "tn_z"));
  });
});
