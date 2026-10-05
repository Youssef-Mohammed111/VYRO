import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { presetFor } from "@/lib/vyro/presets";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { loadMembers } from "./session";
import { assertRole, isSuperAdmin, roleRank, scopedTenantId } from "./authz";
import { ensureSeeded } from "./seed";
import { newId, publicToken } from "./ids";
import { paymentUrlIsSafe } from "./commerce";
import { canTransition, isOrderStatus } from "./order-flow";
import { toCsv } from "./csv";
import { isHexColor, isOptionalHttpsUrl, isSafeImageRef, isSlug } from "./validation";
import { isValidRangeInput, DAY_KEYS, lastDayKeys } from "./hours";
import { isPlausiblePhone } from "./phone";
import { PAYMENT_PROVIDER_TYPES } from "./payment-types";
import { PUBLIC_SETTING_KEYS } from "./public";
import type { Role, SqlRow } from "./types";

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

/**
 * Resolve the tenant this request acts on AND enforce a minimum role there.
 * Every tenant-scoped server function goes through this — a signed-in user with
 * no (or too low a) role on the tenant is rejected before any query runs.
 */
async function ctxTenant(userId: string, requested?: string | null, min: Role = "STAFF") {
  const members = await loadMembers(userId);
  const tenantId = scopedTenantId(members, requested);
  if (!tenantId) fail("No tenant", 403);
  const member = assertRole(members, tenantId, min);
  return { members, tenantId, member, super: isSuperAdmin(members) };
}

async function requireSuper(userId: string) {
  const members = await loadMembers(userId);
  if (!isSuperAdmin(members)) fail("Forbidden", 403);
  return members;
}

/** BRANCH_MANAGER / STAFF pinned to a branch only see that branch's orders. */
function branchScope(member: { role: Role; branch_id: string | null }): string | null {
  return (member.role === "BRANCH_MANAGER" || member.role === "STAFF") && member.branch_id ? member.branch_id : null;
}

async function audit(
  userId: string,
  tenantId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  meta?: Record<string, unknown>,
) {
  const sql = await getSql();
  await sql.query(
    "insert into audit_logs (id, actor_user_id, tenant_id, action, resource, resource_id, metadata_json) values ($1,$2,$3,$4,$5,$6,$7)",
    [newId("aud"), userId, tenantId, action, resource, resourceId ?? null, JSON.stringify(meta ?? {})],
  );
}

function uniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}


export const getTenantDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    await ensureSeeded(sql);
    const tenant = (await sql.query<SqlRow>("select * from tenants where id = $1", [tenantId]))[0];
    const profile = (await sql.query<SqlRow>("select * from business_profiles where tenant_id = $1", [tenantId]))[0];
    const tz = String(profile?.timezone || "Africa/Cairo");

    // Cancelled orders never count as revenue / sales. "Today" is the business's LOCAL
    // day (Cairo), not UTC — otherwise late-night orders land on the wrong day.
    const totals = await sql.query<{ orders: number; revenue: number; paid: number; today: number; today_revenue: number }>(
      `select
         count(*) filter (where status <> 'CANCELLED')::int as orders,
         coalesce(sum(total) filter (where status <> 'CANCELLED'), 0)::int as revenue,
         coalesce(sum(total) filter (where payment_status = 'PAID' and status <> 'CANCELLED'), 0)::int as paid,
         count(*) filter (where status <> 'CANCELLED' and (created_at at time zone $2::text)::date = (now() at time zone $2::text)::date)::int as today,
         coalesce(sum(total) filter (where status <> 'CANCELLED' and (created_at at time zone $2::text)::date = (now() at time zone $2::text)::date), 0)::int as today_revenue
       from orders where tenant_id = $1`,
      [tenantId, tz],
    );
    const scans = await sql.query<{ c: number }>("select coalesce(sum(scan_count),0)::int as c from qr_codes where tenant_id = $1", [tenantId]);
    const visits = await sql.query<{ c: number }>(
      "select count(*)::int as c from analytics_events where tenant_id = $1 and event = 'page_view'",
      [tenantId],
    );
    const daily = await sql.query<{ k: string; c: number; r: number }>(
      `select to_char((created_at at time zone $2::text)::date, 'YYYY-MM-DD') as k, count(*)::int as c, coalesce(sum(total),0)::int as r
       from orders where tenant_id = $1 and status <> 'CANCELLED' and created_at > now() - interval '9 days'
       group by 1`,
      [tenantId, tz],
    );
    const byDay = new Map(daily.map((d) => [d.k, d]));
    const series = lastDayKeys(new Date(), 7, tz).map((k) => ({
      d: new Date(`${k}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      k,
      c: byDay.get(k)?.c ?? 0,
      r: byDay.get(k)?.r ?? 0,
    }));
    // Top sellers by units sold (not by number of rows), excluding cancelled orders.
    const top = await sql.query<{ name_en: string; name_ar: string; c: number }>(
      `select oi.name_en, oi.name_ar, sum(oi.quantity)::int as c
       from order_items oi join orders o on o.id = oi.order_id
       where oi.tenant_id = $1 and o.status <> 'CANCELLED'
       group by 1,2 order by c desc limit 6`,
      [tenantId],
    );
    const recent = await sql.query<SqlRow>(
      "select id, order_number, status, payment_status, total, currency, customer_name, created_at from orders where tenant_id = $1 order by created_at desc limit 8",
      [tenantId],
    );
    const pending = await sql.query<{ c: number }>(
      "select count(*)::int as c from orders where tenant_id = $1 and status in ('PENDING','CONFIRMED','PREPARING')",
      [tenantId],
    );
    const awaitingPayment = await sql.query<{ c: number }>(
      "select count(*)::int as c from orders where tenant_id = $1 and payment_status = 'PENDING_VERIFICATION' and status <> 'CANCELLED'",
      [tenantId],
    );
    const sub = (await sql.query<SqlRow>(
      "select s.*, p.name_en as plan_name from subscriptions s join plans p on p.id = s.plan_id where s.tenant_id = $1 order by s.start_at desc limit 1",
      [tenantId],
    ))[0];
    const t = totals[0];
    return {
      tenant,
      profile,
      kpis: {
        orders: t?.orders ?? 0,
        revenue: t?.revenue ?? 0,
        paidRevenue: t?.paid ?? 0,
        today: t?.today ?? 0,
        todayRevenue: t?.today_revenue ?? 0,
        avgOrder: t?.orders ? Math.round((t.revenue ?? 0) / t.orders) : 0,
        qrScans: scans[0]?.c ?? 0,
        visits: visits[0]?.c ?? 0,
        pending: pending[0]?.c ?? 0,
        awaitingPayment: awaitingPayment[0]?.c ?? 0,
      },
      series,
      top,
      recent,
      subscription: sub ?? null,
    };
  });

export const getCatalogAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    const categories = await sql.query<SqlRow>(
      "select * from categories where tenant_id = $1 order by sort_order",
      [tenantId],
    );
    const items = await sql.query<SqlRow>(
      "select * from catalog_items where tenant_id = $1 order by sort_order",
      [tenantId],
    );
    const variants = await sql.query<SqlRow>(
      "select * from catalog_variants where tenant_id = $1 order by sort_order",
      [tenantId],
    );
    return { categories, items, variants };
  });


export const upsertCatalogItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string().optional(),
      categoryId: z.string().optional(),
      slug: z.string().min(1).max(80),
      nameEn: z.string().min(1).max(80),
      nameAr: z.string().min(1).max(80),
      descEn: z.string().max(800).optional(),
      descAr: z.string().max(800).optional(),
      price: z.number().int().min(0).max(100000),
      compareAt: z.number().int().min(0).max(100000).nullable().optional(),
      imageUrl: z.string().max(400).optional(),
      available: z.boolean(),
      featured: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (!isSlug(data.slug)) fail("Slug must be lowercase letters, numbers and dashes");
    if (!isSafeImageRef(data.imageUrl)) fail("Image must be a /path or an https URL");
    const sql = await getSql();
    if (data.categoryId) {
      const cat = await sql.query("select id from categories where id = $1 and tenant_id = $2", [data.categoryId, tenantId]);
      if (!cat[0]) fail("Unknown category");
    }
    const id = data.id ?? newId("it");
    try {
      if (data.id) {
        const owned = await sql.query<{ id: string }>("select id from catalog_items where id = $1 and tenant_id = $2", [data.id, tenantId]);
        if (!owned[0]) fail("Not found", 404);
        await sql.query(
          `update catalog_items set category_id=$1, slug=$2, name_en=$3, name_ar=$4, desc_en=$5, desc_ar=$6,
           price=$7, compare_at=$8, image_url=$9, available=$10, featured=$11 where id=$12 and tenant_id=$13`,
          [data.categoryId ?? null, data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.price, data.compareAt ?? null, data.imageUrl || null, data.available, data.featured, id, tenantId],
        );
        await audit(context.userId, tenantId, "product.update", "catalog_item", id, { price: data.price, available: data.available });
      } else {
        await sql.query(
          `insert into catalog_items (id, tenant_id, category_id, slug, kind, name_en, name_ar, desc_en, desc_ar, image_url, price, compare_at, available, featured, visible, tags, meta_json)
           values ($1,$2,$3,$4,'product',$5,$6,$7,$8,$9,$10,$11,$12,$13,true,'','{}')`,
          [id, tenantId, data.categoryId ?? null, data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.imageUrl || null, data.price, data.compareAt ?? null, data.available, data.featured],
        );
        await audit(context.userId, tenantId, "product.create", "catalog_item", id, { price: data.price });
      }
    } catch (err) {
      if (uniqueViolation(err)) fail("Another product already uses this slug", 409);
      throw err;
    }
    return { id };
  });

/** One-tap "sold out / back in stock" from the menu list. */
export const setItemAvailability = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string(), available: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const rows = await sql.query<{ id: string }>(
      "update catalog_items set available = $1 where id = $2 and tenant_id = $3 returning id",
      [data.available, data.id, tenantId],
    );
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, tenantId, data.available ? "product.in_stock" : "product.sold_out", "catalog_item", data.id);
    return { ok: true };
  });


export const deleteCatalogItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    const rows = await sql.query<{ id: string; name_en: string }>(
      "delete from catalog_items where id = $1 and tenant_id = $2 returning id, name_en",
      [data.id, tenantId],
    );
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, tenantId, "product.delete", "catalog_item", data.id, { name: rows[0].name_en });
    return { ok: true };
  });


export const listOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      status: z.string().optional(),
      q: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    if (data.status && !isOrderStatus(data.status)) fail("Unknown status");
    const sql = await getSql();
    const where = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    const branch = branchScope(member);
    if (branch) {
      params.push(branch);
      where.push(`branch_id = $${params.length}`);
    }
    if (data.status) {
      params.push(data.status);
      where.push(`status = $${params.length}`);
    }
    if (data.q?.trim()) {
      params.push(`%${data.q.trim().replace(/[\\%_]/g, "\\$&")}%`);
      where.push(`(order_number ilike $${params.length} or customer_name ilike $${params.length} or customer_phone ilike $${params.length})`);
    }
    const orders = await sql.query<SqlRow>(
      `select * from orders where ${where.join(" and ")} order by created_at desc limit 100`,
      params,
    );
    // Items in one extra query (no N+1) so the live board can show what to cook.
    const ids = orders.map((o) => String(o.id));
    const items = ids.length
      ? await sql.query<SqlRow>(
          "select order_id, name_en, name_ar, variant_en, variant_ar, quantity, modifiers_json from order_items where order_id = any($1::text[])",
          [ids],
        )
      : [];
    const byOrder = new Map<string, SqlRow[]>();
    for (const it of items) {
      const k = String(it.order_id);
      byOrder.set(k, [...(byOrder.get(k) ?? []), it]);
    }
    return orders.map((o) => ({ ...o, items: byOrder.get(String(o.id)) ?? [] }));
  });


export const getOrderAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    const order = (await sql.query<SqlRow>("select * from orders where id = $1 and tenant_id = $2", [data.id, tenantId]))[0];
    if (!order) return null;
    const branch = branchScope(member);
    if (branch && order.branch_id !== branch) return null;
    const items = await sql.query<SqlRow>("select * from order_items where order_id = $1 and tenant_id = $2", [data.id, tenantId]);
    const proofs = await sql.query<{ id: string; mime: string; created_at: string }>(
      `select pr.id, pr.mime, pr.created_at from payment_proofs pr
       join payments p on p.id = pr.payment_id
       where p.order_id = $1 and pr.tenant_id = $2 order by pr.created_at`,
      [data.id, tenantId],
    );
    return { order, items, proofs };
  });


export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string(),
      status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    const current = (await sql.query<{ status: string; branch_id: string | null; payment_status: string }>(
      "select status, branch_id, payment_status from orders where id = $1 and tenant_id = $2",
      [data.id, tenantId],
    ))[0];
    if (!current) fail("Order not found", 404);
    const branch = branchScope(member);
    if (branch && current.branch_id !== branch) fail("Forbidden", 403);
    if (current.status === data.status) return { ok: true, status: data.status };
    if (!isOrderStatus(current.status) || !canTransition(current.status, data.status)) {
      fail(`Cannot move an order from ${current.status} to ${data.status}`, 409);
    }
    // Compare-and-set: two staff tapping at once can't both apply a stale transition.
    const rows = await sql.query<{ id: string }>(
      "update orders set status = $1, updated_at = now() where id = $2 and tenant_id = $3 and status = $4 returning id",
      [data.status, data.id, tenantId, current.status],
    );
    if (!rows[0]) fail("Order changed — refresh and try again", 409);
    await audit(context.userId, tenantId, "order.status", "order", data.id, { from: current.status, to: data.status });
    return { ok: true, status: data.status };
  });


export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), orderId: z.string(), decision: z.enum(["PAID", "REJECTED"]) }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const order = (await sql.query<{ payment_status: string; status: string }>(
      "select payment_status, status from orders where id = $1 and tenant_id = $2",
      [data.orderId, tenantId],
    ))[0];
    if (!order) fail("Order not found", 404);
    if (order.status === "CANCELLED") fail("This order was cancelled", 409);
    if (order.payment_status === data.decision) return { ok: true };
    await sql.query("update orders set payment_status = $1, updated_at = now() where id = $2 and tenant_id = $3", [data.decision, data.orderId, tenantId]);
    await sql.query("update payments set status = $1 where order_id = $2 and tenant_id = $3", [data.decision, data.orderId, tenantId]);
    await audit(context.userId, tenantId, data.decision === "PAID" ? "payment.approve" : "payment.reject", "order", data.orderId, {
      from: order.payment_status,
    });
    return { ok: true };
  });

export const listPaymentMethods = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    return sql.query<SqlRow>("select * from payment_methods where tenant_id = $1 order by sort_order", [tenantId]);
  });

export const upsertPaymentMethod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string().optional(),
      type: z.string().max(40),
      nameEn: z.string().min(1).max(60),
      nameAr: z.string().min(1).max(60),
      descEn: z.string().max(200).optional(),
      descAr: z.string().max(200).optional(),
      paymentUrl: z.string().max(400).optional().or(z.literal("")),
      deepLinkUrl: z.string().max(400).optional().or(z.literal("")),
      accountIdentifier: z.string().max(80).optional(),
      accountName: z.string().max(80).optional(),
      logoUrl: z.string().max(400).optional().or(z.literal("")),
      instructionsEn: z.string().max(400).optional(),
      instructionsAr: z.string().max(400).optional(),
      requiresProof: z.boolean(),
      requiresManualVerification: z.boolean(),
      enabled: z.boolean(),
      sortOrder: z.number().int(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (!(PAYMENT_PROVIDER_TYPES as readonly string[]).includes(data.type)) fail("Unknown payment type");
    if (!isSafeImageRef(data.logoUrl)) fail("Logo must be a /path or an https URL");
    if (data.paymentUrl && !paymentUrlIsSafe(data.paymentUrl)) {
      throw Object.assign(new Error("Invalid payment URL"), { status: 400 });
    }
    if (data.deepLinkUrl && !paymentUrlIsSafe(data.deepLinkUrl)) {
      throw Object.assign(new Error("Invalid deep link URL"), { status: 400 });
    }
    const sql = await getSql();
    const id = data.id ?? newId("pm");
    if (data.id) {
      const owned = await sql.query("select id from payment_methods where id = $1 and tenant_id = $2", [data.id, tenantId]);
      if (!owned[0]) throw Object.assign(new Error("Not found"), { status: 404 });
      await sql.query(
        `update payment_methods set type=$1, name_en=$2, name_ar=$3, desc_en=$4, desc_ar=$5, payment_url=$6,
         deep_link_url=$7, account_identifier=$8, account_name=$9, logo_url=$10, instructions_en=$11, instructions_ar=$12,
         requires_proof=$13, requires_manual_verification=$14, enabled=$15, sort_order=$16, updated_at=now()
         where id=$17 and tenant_id=$18`,
        [
          data.type,
          data.nameEn,
          data.nameAr,
          data.descEn ?? null,
          data.descAr ?? null,
          data.paymentUrl || null,
          data.deepLinkUrl || null,
          data.accountIdentifier ?? null,
          data.accountName ?? null,
          data.logoUrl || null,
          data.instructionsEn ?? null,
          data.instructionsAr ?? null,
          data.requiresProof,
          data.requiresManualVerification,
          data.enabled,
          data.sortOrder,
          id,
          tenantId,
        ],
      );
    } else {
      await sql.query(
        `insert into payment_methods (id, tenant_id, type, name_en, name_ar, desc_en, desc_ar, payment_url, deep_link_url, account_identifier, account_name, logo_url, instructions_en, instructions_ar, requires_proof, requires_manual_verification, enabled, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          id,
          tenantId,
          data.type,
          data.nameEn,
          data.nameAr,
          data.descEn ?? null,
          data.descAr ?? null,
          data.paymentUrl || null,
          data.deepLinkUrl || null,
          data.accountIdentifier ?? null,
          data.accountName ?? null,
          data.logoUrl || null,
          data.instructionsEn ?? null,
          data.instructionsAr ?? null,
          data.requiresProof,
          data.requiresManualVerification,
          data.enabled,
          data.sortOrder,
        ],
      );
    }
    await audit(context.userId, tenantId, "payment_method.save", "payment_method", id);
    return { id };
  });

export const setPaymentMethodEnabled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string(), enabled: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    const owned = await sql.query("select id from payment_methods where id = $1 and tenant_id = $2", [data.id, tenantId]);
    if (!owned[0]) throw Object.assign(new Error("Not found"), { status: 404 });
    await sql.query("update payment_methods set enabled = $1, updated_at = now() where id = $2 and tenant_id = $3", [
      data.enabled,
      data.id,
      tenantId,
    ]);
    await audit(context.userId, tenantId, data.enabled ? "payment_method.enable" : "payment_method.disable", "payment_method", data.id);
    return { ok: true };
  });


export const getTenantContext = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const members = await loadMembers(context.userId);
    const superAdmin = isSuperAdmin(members);
    const tenantId = scopedTenantId(members);
    const sql = await getSql();
    await ensureSeeded(sql);
    if (!tenantId) {
      // Signed in, but not invited to any business yet.
      return { superAdmin, role: null as Role | null, tenant: null as SqlRow | null, profile: null as SqlRow | null };
    }
    const membership = assertRole(members, tenantId, "STAFF");
    const tenant = (await sql.query<SqlRow>("select * from tenants where id = $1", [tenantId]))[0] ?? null;
    const profile = (await sql.query<SqlRow>("select * from business_profiles where tenant_id = $1", [tenantId]))[0] ?? null;
    return { superAdmin, role: membership.role as Role | null, tenant, profile };
  });

export const listQr = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const codes = await sql.query<SqlRow>("select * from qr_codes where tenant_id = $1 order by created_at desc", [tenantId]);
    const nfc = await sql.query<SqlRow>("select * from nfc_destinations where tenant_id = $1", [tenantId]);
    return { codes, nfc };
  });

export const createQr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      label: z.string().min(1).max(60),
      type: z.enum(["branch", "table", "counter", "menu", "campaign", "review", "custom"]),
      destination: z.enum(["home", "menu", "offers", "checkout", "location", "review"]),
      tableNumber: z.string().max(20).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const id = newId("qr");
    const token = publicToken(12);
    await sql.query(
      `insert into qr_codes (id, tenant_id, token, label, type, destination, table_number, active, scan_count)
       values ($1,$2,$3,$4,$5,$6,$7,true,0)`,
      [id, tenantId, token, data.label, data.type, data.destination, data.tableNumber ?? null],
    );
    await audit(context.userId, tenantId, "qr.create", "qr", id);
    return { id, token };
  });

export const setQrActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string(), active: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const rows = await sql.query<{ id: string }>(
      "update qr_codes set active = $1 where id = $2 and tenant_id = $3 returning id",
      [data.active, data.id, tenantId],
    );
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, tenantId, data.active ? "qr.enable" : "qr.disable", "qr", data.id);
    return { ok: true };
  });


export const updateBusinessProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      nameEn: z.string().min(1).max(80),
      nameAr: z.string().min(1).max(80),
      shortEn: z.string().max(120).optional(),
      shortAr: z.string().max(120).optional(),
      descEn: z.string().max(1200).optional(),
      descAr: z.string().max(1200).optional(),
      phone: z.string().max(30).optional(),
      whatsapp: z.string().max(30).optional(),
      email: z.string().max(80).optional(),
      addressEn: z.string().max(200).optional(),
      addressAr: z.string().max(200).optional(),
      mapsUrl: z.string().max(400).optional(),
      reviewUrl: z.string().max(400).optional(),
      facebookUrl: z.string().max(400).optional(),
      instagramUrl: z.string().max(400).optional(),
      tiktokUrl: z.string().max(400).optional(),
      websiteUrl: z.string().max(400).optional(),
      hours: z.record(z.string(), z.string().max(30)).optional(),
      deliveryFee: z.number().int().min(0).max(1000).optional(),
      minOrder: z.number().int().min(0).max(100000).optional(),
      acceptingOrders: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    // Every link is rendered as <a href> on the public site — https only, so a
    // "javascript:" URL can never be planted in a storefront.
    for (const [label, url] of [
      ["Maps", data.mapsUrl],
      ["Review", data.reviewUrl],
      ["Facebook", data.facebookUrl],
      ["Instagram", data.instagramUrl],
      ["TikTok", data.tiktokUrl],
      ["Website", data.websiteUrl],
    ] as const) {
      if (!isOptionalHttpsUrl(url)) fail(`${label} link must start with https://`);
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fail("Invalid email");
    if (data.phone && !isPlausiblePhone(data.phone)) fail("Invalid phone number");
    if (data.whatsapp && !isPlausiblePhone(data.whatsapp)) fail("Invalid WhatsApp number");

    let hoursJson: string | null = null;
    if (data.hours) {
      const clean: Record<string, string> = {};
      for (const key of DAY_KEYS) {
        const v = (data.hours[key] ?? "").trim();
        if (!isValidRangeInput(v)) fail(`Invalid opening hours for ${key} (use 10:00–22:00 or closed)`);
        if (v) clean[key] = v;
      }
      hoursJson = JSON.stringify(clean);
    }

    const sql = await getSql();
    await sql.query(
      `update business_profiles set name_en=$1, name_ar=$2, short_en=$3, short_ar=$4, desc_en=$5, desc_ar=$6,
       phone=$7, whatsapp=$8, email=$9, address_en=$10, address_ar=$11, maps_url=$12, review_url=$13,
       facebook_url=$14, instagram_url=$15, tiktok_url=$16, website_url=$17,
       hours_json = coalesce($18, hours_json),
       delivery_fee = coalesce($19, delivery_fee),
       min_order = coalesce($20, min_order),
       accepting_orders = coalesce($21, accepting_orders)
       where tenant_id=$22`,
      [
        data.nameEn, data.nameAr, data.shortEn ?? null, data.shortAr ?? null, data.descEn ?? null, data.descAr ?? null,
        data.phone ?? null, data.whatsapp ?? null, data.email ?? null, data.addressEn ?? null, data.addressAr ?? null,
        data.mapsUrl || null, data.reviewUrl || null, data.facebookUrl || null, data.instagramUrl || null,
        data.tiktokUrl || null, data.websiteUrl || null,
        hoursJson, data.deliveryFee ?? null, data.minOrder ?? null, data.acceptingOrders ?? null,
        tenantId,
      ],
    );
    await audit(context.userId, tenantId, "settings.change", "business_profile", tenantId, {
      acceptingOrders: data.acceptingOrders,
      deliveryFee: data.deliveryFee,
      minOrder: data.minOrder,
    });
    return { ok: true };
  });

/** Big "pause orders" switch — usable by managers during a rush or after closing. */
export const setAcceptingOrders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), accepting: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    await sql.query("update business_profiles set accepting_orders = $1 where tenant_id = $2", [data.accepting, tenantId]);
    await audit(context.userId, tenantId, data.accepting ? "orders.resume" : "orders.pause", "business_profile", tenantId);
    return { ok: true };
  });

export const updateBranding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      primary: z.string().max(7).optional(),
      heroTitleEn: z.string().max(80).optional(),
      heroTitleAr: z.string().max(80).optional(),
      logoUrl: z.string().max(400).optional(),
      coverUrl: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (data.primary && !isHexColor(data.primary)) fail("Color must look like #e10600");
    if (!isSafeImageRef(data.logoUrl) || !isSafeImageRef(data.coverUrl)) fail("Images must be a /path or an https URL");
    const sql = await getSql();
    const row = (await sql.query<{ branding_json: string }>("select branding_json from business_profiles where tenant_id = $1", [tenantId]))[0];
    let branding: Record<string, string> = {};
    try {
      branding = JSON.parse(row?.branding_json || "{}");
    } catch {
      branding = {};
    }
    // Only whitelisted tokens are ever stored — tenants can theme, not inject.
    if (data.primary !== undefined) branding.primary = data.primary;
    if (data.heroTitleEn !== undefined) branding.heroTitleEn = data.heroTitleEn;
    if (data.heroTitleAr !== undefined) branding.heroTitleAr = data.heroTitleAr;
    await sql.query(
      `update business_profiles set branding_json = $1,
        logo_url = coalesce($2, logo_url), cover_url = coalesce($3, cover_url) where tenant_id = $4`,
      [JSON.stringify(branding), data.logoUrl === undefined ? null : data.logoUrl || null, data.coverUrl === undefined ? null : data.coverUrl || null, tenantId],
    );
    await audit(context.userId, tenantId, "branding.change", "business_profile", tenantId);
    return { ok: true };
  });


export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const funnel = await sql.query<{ event: string; c: number }>(
      "select event, count(*)::int as c from analytics_events where tenant_id = $1 group by event",
      [tenantId],
    );
    // Most viewed products vs most added to cart — shows what people look at but don't buy.
    const products = await sql.query<{ item_id: string; name_en: string; name_ar: string; views: number; carts: number }>(
      `select e.item_id, ci.name_en, ci.name_ar,
              count(*) filter (where e.event = 'product_view')::int as views,
              count(*) filter (where e.event = 'add_to_cart')::int as carts
       from analytics_events e join catalog_items ci on ci.id = e.item_id
       where e.tenant_id = $1 and e.item_id is not null
       group by 1,2,3 order by views desc limit 8`,
      [tenantId],
    );
    const hours = await sql.query<{ h: number; c: number }>(
      `select extract(hour from created_at at time zone 'Africa/Cairo')::int as h, count(*)::int as c
       from orders where tenant_id = $1 and status <> 'CANCELLED' group by 1 order by 1`,
      [tenantId],
    );
    return { funnel, products, hours };
  });

export const listOffers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    return sql.query<SqlRow>("select * from offers where tenant_id = $1 order by sort_order", [tenantId]);
  });


export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string().optional(),
      slug: z.string().min(1).max(80),
      nameEn: z.string().min(1).max(80),
      nameAr: z.string().min(1).max(80),
      descEn: z.string().max(800).optional(),
      descAr: z.string().max(800).optional(),
      price: z.number().int().min(0).max(100000),
      imageUrl: z.string().max(400).optional(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (!isSlug(data.slug)) fail("Slug must be lowercase letters, numbers and dashes");
    if (!isSafeImageRef(data.imageUrl)) fail("Image must be a /path or an https URL");
    const sql = await getSql();
    const id = data.id ?? newId("off");
    let previousSlug: string | null = null;
    try {
      if (data.id) {
        const old = (await sql.query<{ slug: string }>("select slug from offers where id = $1 and tenant_id = $2", [data.id, tenantId]))[0];
        if (!old) fail("Not found", 404);
        previousSlug = old.slug;
        await sql.query(
          "update offers set slug=$1, name_en=$2, name_ar=$3, desc_en=$4, desc_ar=$5, price=$6, value=$6, image_url=coalesce($7, image_url), active=$8 where id=$9 and tenant_id=$10",
          [data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.price, data.imageUrl || null, data.active, id, tenantId],
        );
      } else {
        await sql.query(
          `insert into offers (id, tenant_id, slug, name_en, name_ar, desc_en, desc_ar, image_url, kind, value, price, active, contents_json)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'offer_price',$9,$9,$10,'[]')`,
          [id, tenantId, data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.imageUrl || null, data.price, data.active],
        );
      }

      // The storefront sells an offer through a catalog item with the SAME slug (the offers
      // page links to /product/<slug> and checkout prices from catalog_items). Without this
      // mirror an offer created in the dashboard 404s and can never be ordered.
      const cat = (await sql.query<{ id: string }>("select id from categories where tenant_id = $1 and slug = 'offers'", [tenantId]))[0];
      const mirrored = await sql.query<{ id: string }>(
        `update catalog_items set slug=$1, name_en=$2, name_ar=$3, desc_en=$4, desc_ar=$5, price=$6,
           image_url=coalesce($7, image_url), visible=$8, available=$8
         where tenant_id=$9 and kind='offer' and slug=$10 returning id`,
        [data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.price, data.imageUrl || null, data.active, tenantId, previousSlug ?? data.slug],
      );
      if (!mirrored[0]) {
        await sql.query(
          `insert into catalog_items (id, tenant_id, category_id, slug, kind, name_en, name_ar, desc_en, desc_ar, image_url, price, featured, available, visible, tags, meta_json)
           values ($1,$2,$3,$4,'offer',$5,$6,$7,$8,$9,$10,true,$11,$11,'offers','{}')`,
          [newId("it"), tenantId, cat?.id ?? null, data.slug, data.nameEn, data.nameAr, data.descEn ?? null, data.descAr ?? null, data.imageUrl || null, data.price, data.active],
        );
      }
    } catch (err) {
      if (uniqueViolation(err)) fail("Another offer or product already uses this slug", 409);
      throw err;
    }
    await audit(context.userId, tenantId, "offer.save", "offer", id, { price: data.price, active: data.active });
    return { id };
  });

export const setOfferActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string(), active: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const rows = await sql.query<{ slug: string }>(
      "update offers set active = $1 where id = $2 and tenant_id = $3 returning slug",
      [data.active, data.id, tenantId],
    );
    if (!rows[0]) fail("Not found", 404);
    await sql.query(
      "update catalog_items set visible = $1, available = $1 where tenant_id = $2 and kind = 'offer' and slug = $3",
      [data.active, tenantId, rows[0].slug],
    );
    await audit(context.userId, tenantId, data.active ? "offer.enable" : "offer.disable", "offer", data.id);
    return { ok: true };
  });


export const getSupportTickets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const members = await loadMembers(context.userId);
    const sql = await getSql();
    if (isSuperAdmin(members)) {
      return sql.query<SqlRow>(
        `select t.*, b.name_en as business from support_tickets t
         left join business_profiles b on b.tenant_id = t.tenant_id order by t.created_at desc limit 100`,
      );
    }
    const tenantId = scopedTenantId(members);
    if (!tenantId) return [];
    assertRole(members, tenantId, "STAFF");
    return sql.query<SqlRow>("select * from support_tickets where tenant_id = $1 order by created_at desc limit 100", [tenantId]);
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{ id: string; tenant_id: string | null }>(
      "update support_tickets set status = $1, updated_at = now() where id = $2 returning id, tenant_id",
      [data.status, data.id],
    );
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, rows[0].tenant_id, "ticket.status", "support_ticket", data.id, { status: data.status });
    return { ok: true };
  });


export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ subject: z.string().min(3).max(120), description: z.string().min(3).max(2000), priority: z.enum(["low", "normal", "high"]).optional() }))
  .handler(async ({ context, data }) => {
    const members = await loadMembers(context.userId);
    const tenantId = members.find((m) => m.tenant_id)?.tenant_id ?? null;
    if (!tenantId && !isSuperAdmin(members)) fail("Forbidden", 403);
    const sql = await getSql();
    const id = newId("tkt");
    await sql.query(
      "insert into support_tickets (id, tenant_id, user_id, subject, description, priority, status) values ($1,$2,$3,$4,$5,$6,'OPEN')",
      [id, tenantId, context.userId, data.subject, data.description, data.priority ?? "normal"],
    );
    return { id };
  });

export const getSuperDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    await ensureSeeded(sql);
    const tenants = await sql.query<SqlRow>(
      `select t.*, p.name_en as plan_name, tmpl.name_en as template_name,
        (select count(*)::int from orders o where o.tenant_id = t.id) as orders_count,
        (select count(*)::int from members m where m.tenant_id = t.id) as members_count
       from tenants t join plans p on p.id = t.plan_id join templates tmpl on tmpl.id = t.template_id
       order by t.created_at desc`,
    );
    const kpis = await sql.query<{
      tenants: number;
      active: number;
      trial: number;
      suspended: number;
      orders: number;
      branches: number;
      scans: number;
    }>(
      `select
        (select count(*)::int from tenants) as tenants,
        (select count(*)::int from tenants where status = 'active') as active,
        (select count(*)::int from subscriptions where status = 'TRIAL') as trial,
        (select count(*)::int from tenants where status = 'suspended') as suspended,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from branches) as branches,
        (select coalesce(sum(scan_count),0)::int from qr_codes) as scans`,
    );
    const tickets = await sql.query<SqlRow>("select * from support_tickets order by created_at desc limit 6");
    const logs = await sql.query<SqlRow>("select * from audit_logs order by created_at desc limit 12");
    const demos = await sql.query<SqlRow>("select * from demo_requests order by created_at desc limit 8");
    return { tenants, kpis: kpis[0], tickets, logs, demos };
  });

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    return sql.query<SqlRow>("select * from templates order by name_en");
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const members = await loadMembers(context.userId);
    if (!isSuperAdmin(members) && !members.length) throw Object.assign(new Error("Forbidden"), { status: 403 });
    const sql = await getSql();
    const plans = await sql.query<SqlRow>("select * from plans order by sort_order");
    const features = await sql.query<SqlRow>("select * from plan_features");
    return { plans, features };
  });

export const updateTenantStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), status: z.enum(["active", "suspended", "archived", "trial"]) }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    await sql.query("update tenants set status = $1 where id = $2", [data.status, data.id]);
    await audit(context.userId, data.id, "tenant.status", "tenant", data.id);
    return { ok: true };
  });

export const assignPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string(), planId: z.string() }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    await sql.query("update tenants set plan_id = $1 where id = $2", [data.planId, data.tenantId]);
    await audit(context.userId, data.tenantId, "plan.change", "tenant", data.tenantId);
    return { ok: true };
  });

export const assignTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string(), templateId: z.string() }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    await sql.query("update tenants set template_id = $1 where id = $2", [data.templateId, data.tenantId]);
    await audit(context.userId, data.tenantId, "template.change", "tenant", data.tenantId);
    return { ok: true };
  });


export const getDiagnostics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const checks: { name: string; ok: boolean; detail: string }[] = [];
    const t = await sql.query<{ c: number }>("select count(*)::int as c from tenants");
    checks.push({ name: "Database", ok: true, detail: `${t[0]?.c ?? 0} tenants` });
    const items = await sql.query<{ c: number }>("select count(*)::int as c from catalog_items");
    checks.push({ name: "Catalog", ok: (items[0]?.c ?? 0) > 0, detail: `${items[0]?.c ?? 0} items across all tenants` });
    const qr = await sql.query<{ c: number }>("select count(*)::int as c from qr_codes where active = true");
    checks.push({ name: "QR codes", ok: true, detail: `${qr[0]?.c ?? 0} active` });
    const noPay = await sql.query<{ name: string }>(
      `select t.name from tenants t where t.status = 'active'
       and not exists (select 1 from payment_methods p where p.tenant_id = t.id and p.enabled = true)`,
    );
    checks.push({
      name: "Payment methods",
      ok: noPay.length === 0,
      detail: noPay.length ? `No enabled payment method: ${noPay.map((r) => r.name).join(", ")}` : "Every active business can take payment",
    });
    const stuck = await sql.query<{ c: number }>(
      "select count(*)::int as c from orders where status = 'PENDING' and created_at < now() - interval '30 minutes'",
    );
    checks.push({
      name: "Stuck orders",
      ok: (stuck[0]?.c ?? 0) === 0,
      detail: `${stuck[0]?.c ?? 0} order(s) pending for over 30 minutes`,
    });
    const proofs = await sql.query<{ c: number; mb: number }>(
      "select count(*)::int as c, coalesce(sum(size_bytes),0)::float / 1048576 as mb from payment_proofs",
    );
    checks.push({
      name: "Storage",
      ok: (proofs[0]?.mb ?? 0) < 200,
      detail: `${proofs[0]?.c ?? 0} proofs (${(proofs[0]?.mb ?? 0).toFixed(1)} MB) stored in the database. Move to S3/Blob before this grows.`,
    });
    checks.push({
      name: "Owner lock",
      ok: Boolean(process.env.VYRO_OWNER_EMAIL?.trim()),
      detail: process.env.VYRO_OWNER_EMAIL?.trim()
        ? "Only the configured owner email can bootstrap the platform."
        : "Set VYRO_OWNER_EMAIL so only your email can claim the platform on a fresh database.",
    });
    checks.push({ name: "Email provider", ok: false, detail: "Not configured — OTP/email sending stays disabled until a provider key is set." });
    return { checks, time: new Date().toISOString() };
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ key: z.string(), value: z.string().max(200) }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    if (!(PUBLIC_SETTING_KEYS as readonly string[]).includes(data.key)) fail("Unknown setting");
    const sql = await getSql();
    await sql.query(
      "insert into platform_settings (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value, updated_at = now()",
      [data.key, data.value],
    );
    await audit(context.userId, null, "settings.change", "platform_settings", data.key);
    return { ok: true };
  });

export const listBranches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "STAFF");
    const sql = await getSql();
    return sql.query<SqlRow>("select * from branches where tenant_id = $1 order by sort_order", [tenantId]);
  });

export const getProofImage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), proofId: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const row = (await sql.query<{ mime: string; data_base64: string }>(
      "select mime, data_base64 from payment_proofs where id = $1 and tenant_id = $2",
      [data.proofId, tenantId],
    ))[0];
    if (!row) return null;
    return row;
  });

// ───────────────────────────── staff & invitations ─────────────────────────────

const ASSIGNABLE_ROLES = ["TENANT_ADMIN", "BRANCH_MANAGER", "STAFF"] as const;

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    const staff = await sql.query<SqlRow>(
      `select m.id, m.user_id, m.role, m.branch_id, m.created_at, u."name" as name, u."email" as email
       from members m left join "user" u on u."id" = m.user_id
       where m.tenant_id = $1 order by m.created_at`,
      [tenantId],
    );
    const invites = await sql.query<SqlRow>(
      `select id, role, token, label, expires_at, created_at from staff_invites
       where tenant_id = $1 and accepted_at is null and expires_at > now() order by created_at desc`,
      [tenantId],
    );
    const branches = await sql.query<{ id: string; name_en: string; name_ar: string }>(
      "select id, name_en, name_ar from branches where tenant_id = $1 order by sort_order",
      [tenantId],
    );
    return { staff, invites, branches, me: context.userId, myRole: member.role };
  });

export const createStaffInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      role: z.enum(ASSIGNABLE_ROLES),
      label: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    // You can only hand out roles strictly below your own (an admin can't mint another admin).
    if (roleRank(data.role) >= roleRank(member.role)) fail("You can only invite roles below your own", 403);
    const sql = await getSql();
    const id = newId("inv");
    const token = publicToken(24);
    await sql.query(
      `insert into staff_invites (id, tenant_id, role, token, label, created_by, expires_at)
       values ($1,$2,$3,$4,$5,$6, now() + interval '7 days')`,
      [id, tenantId, data.role, token, data.label ?? null, context.userId],
    );
    await audit(context.userId, tenantId, "staff.invite", "staff_invite", id, { role: data.role });
    return { id, token };
  });

export const revokeStaffInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    await sql.query("delete from staff_invites where id = $1 and tenant_id = $2 and accepted_at is null", [data.id, tenantId]);
    await audit(context.userId, tenantId, "staff.invite_revoked", "staff_invite", data.id);
    return { ok: true };
  });

/** Public (no login) so the invite page can say WHO is inviting before sign-in. */
export const getInvitePreview = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const row = (await sql.query<{ role: string; name_en: string; name_ar: string }>(
      `select i.role, b.name_en, b.name_ar from staff_invites i
       join business_profiles b on b.tenant_id = i.tenant_id
       where i.token = $1 and i.accepted_at is null and i.expires_at > now()`,
      [data.token],
    ))[0];
    return row ? { role: row.role, nameEn: row.name_en, nameAr: row.name_ar } : null;
  });

export const acceptStaffInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ token: z.string().min(8).max(64) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureSeeded(sql);
    // Single-use: the UPDATE only matches an unused, unexpired invite, so two
    // people (or two tabs) can never both redeem it.
    const claimed = await sql.query<{ tenant_id: string; role: string }>(
      `update staff_invites set accepted_by = $1, accepted_at = now()
       where token = $2 and accepted_at is null and expires_at > now() returning tenant_id, role`,
      [context.userId, data.token],
    );
    const invite = claimed[0];
    if (!invite) fail("This invite is invalid, expired or already used", 410);
    const already = await sql.query("select id from members where user_id = $1 and tenant_id = $2", [context.userId, invite.tenant_id]);
    if (!already[0]) {
      await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,$3,$4)", [
        newId("mem"),
        context.userId,
        invite.tenant_id,
        invite.role,
      ]);
    }
    await audit(context.userId, invite.tenant_id, "staff.joined", "member", context.userId, { role: invite.role });
    return { ok: true, tenantId: invite.tenant_id };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      memberId: z.string(),
      role: z.enum(ASSIGNABLE_ROLES),
      branchId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "TENANT_OWNER");
    const sql = await getSql();
    const target = (await sql.query<{ user_id: string; role: Role }>(
      "select user_id, role from members where id = $1 and tenant_id = $2",
      [data.memberId, tenantId],
    ))[0];
    if (!target) fail("Not found", 404);
    if (target.role === "TENANT_OWNER" || target.role === "SUPER_ADMIN") fail("Owners can't be changed here", 403);
    if (target.user_id === context.userId) fail("You can't change your own role", 403);
    if (roleRank(data.role) >= roleRank(member.role)) fail("Forbidden", 403);
    if (data.branchId) {
      const b = await sql.query("select id from branches where id = $1 and tenant_id = $2", [data.branchId, tenantId]);
      if (!b[0]) fail("Unknown branch");
    }
    await sql.query("update members set role = $1, branch_id = $2 where id = $3 and tenant_id = $4", [
      data.role,
      data.branchId ?? null,
      data.memberId,
      tenantId,
    ]);
    await audit(context.userId, tenantId, "staff.role", "member", data.memberId, { from: target.role, to: data.role });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), memberId: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_OWNER");
    const sql = await getSql();
    const target = (await sql.query<{ user_id: string; role: Role }>(
      "select user_id, role from members where id = $1 and tenant_id = $2",
      [data.memberId, tenantId],
    ))[0];
    if (!target) fail("Not found", 404);
    if (target.role === "TENANT_OWNER" || target.role === "SUPER_ADMIN") fail("Owners can't be removed here", 403);
    await sql.query("delete from members where id = $1 and tenant_id = $2", [data.memberId, tenantId]);
    await audit(context.userId, tenantId, "staff.removed", "member", data.memberId, { role: target.role });
    return { ok: true };
  });

// ───────────────────────────── exports ─────────────────────────────

export const exportOrdersCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), days: z.number().int().min(1).max(366).default(30) }))
  .handler(async ({ context, data }) => {
    const { tenantId, member } = await ctxTenant(context.userId, data.tenantId, "BRANCH_MANAGER");
    const sql = await getSql();
    const params: unknown[] = [tenantId, data.days];
    let branchClause = "";
    const branch = branchScope(member);
    if (branch) {
      params.push(branch);
      branchClause = " and o.branch_id = $3";
    }
    const rows = await sql.query<SqlRow>(
      `select o.order_number, o.created_at, o.status, o.payment_status, o.fulfillment, o.customer_name, o.customer_phone,
              o.table_number, o.address, o.subtotal, o.discount, o.fees, o.total, o.currency,
              o.payment_snapshot_json,
              (select string_agg(oi.quantity || 'x ' || oi.name_en, ' | ' order by oi.name_en) from order_items oi where oi.order_id = o.id) as items
       from orders o
       where o.tenant_id = $1 and o.created_at > now() - ($2::int * interval '1 day')${branchClause}
       order by o.created_at desc limit 5000`,
      params,
    );
    const pay = (json: unknown) => {
      try {
        return (JSON.parse(String(json || "{}")) as { nameEn?: string }).nameEn ?? "";
      } catch {
        return "";
      }
    };
    const csv = toCsv(
      ["Order", "Date (UTC)", "Status", "Payment status", "Type", "Customer", "Phone", "Table", "Address", "Items", "Subtotal", "Discount", "Fees", "Total", "Currency", "Payment method"],
      rows.map((r) => [
        r.order_number, r.created_at, r.status, r.payment_status, r.fulfillment, r.customer_name, r.customer_phone,
        r.table_number, r.address, r.items, r.subtotal, r.discount, r.fees, r.total, r.currency, pay(r.payment_snapshot_json),
      ]),
    );
    await audit(context.userId, tenantId, "orders.export", "order", undefined, { days: data.days, rows: rows.length });
    return { filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`, csv, count: rows.length };
  });

// ───────────────────────────── categories ─────────────────────────────

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string().optional(),
      slug: z.string().min(1).max(80),
      nameEn: z.string().min(1).max(60),
      nameAr: z.string().min(1).max(60),
      imageUrl: z.string().max(400).optional(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (!isSlug(data.slug)) fail("Slug must be lowercase letters, numbers and dashes");
    if (!isSafeImageRef(data.imageUrl)) fail("Image must be a /path or an https URL");
    const sql = await getSql();
    const id = data.id ?? newId("cat");
    try {
      if (data.id) {
        const rows = await sql.query<{ id: string }>(
          `update categories set slug=$1, name_en=$2, name_ar=$3, image_url=$4, active=$5
           where id=$6 and tenant_id=$7 returning id`,
          [data.slug, data.nameEn, data.nameAr, data.imageUrl || null, data.active, id, tenantId],
        );
        if (!rows[0]) fail("Not found", 404);
      } else {
        const max = await sql.query<{ m: number }>(
          "select coalesce(max(sort_order), 0)::int as m from categories where tenant_id = $1",
          [tenantId],
        );
        await sql.query(
          `insert into categories (id, tenant_id, slug, name_en, name_ar, image_url, sort_order, active)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [id, tenantId, data.slug, data.nameEn, data.nameAr, data.imageUrl || null, (max[0]?.m ?? 0) + 10, data.active],
        );
      }
    } catch (err) {
      if (uniqueViolation(err)) fail("Another category already uses this slug", 409);
      throw err;
    }
    await audit(context.userId, tenantId, data.id ? "category.update" : "category.create", "category", id);
    return { id };
  });

/** `ids` is the full desired order; anything not listed keeps its place after them. */
export const reorderCategories = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), ids: z.array(z.string()).min(1).max(200) }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    const owned = await sql.query<{ id: string }>("select id from categories where tenant_id = $1", [tenantId]);
    const ownedIds = new Set(owned.map((r) => r.id));
    const ordered = data.ids.filter((id, i) => ownedIds.has(id) && data.ids.indexOf(id) === i);
    for (let i = 0; i < ordered.length; i++) {
      await sql.query("update categories set sort_order = $1 where id = $2 and tenant_id = $3", [(i + 1) * 10, ordered[i], tenantId]);
    }
    await audit(context.userId, tenantId, "category.reorder", "category");
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    const sql = await getSql();
    // Products in the category are kept (category becomes empty), never deleted with it.
    const rows = await sql.query<{ id: string; name_en: string }>(
      "delete from categories where id = $1 and tenant_id = $2 returning id, name_en",
      [data.id, tenantId],
    );
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, tenantId, "category.delete", "category", data.id, { name: rows[0].name_en });
    return { ok: true };
  });

// ───────────────────────────── branches ─────────────────────────────

export const upsertBranch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string().optional(),
      id: z.string().optional(),
      nameEn: z.string().min(1).max(80),
      nameAr: z.string().min(1).max(80),
      addressEn: z.string().max(200).optional(),
      addressAr: z.string().max(200).optional(),
      phone: z.string().max(30).optional(),
      whatsapp: z.string().max(30).optional(),
      mapsUrl: z.string().max(400).optional(),
      status: z.enum(["active", "inactive"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_ADMIN");
    if (!isOptionalHttpsUrl(data.mapsUrl)) fail("Maps link must start with https://");
    if (data.phone && !isPlausiblePhone(data.phone)) fail("Invalid phone number");
    if (data.whatsapp && !isPlausiblePhone(data.whatsapp)) fail("Invalid WhatsApp number");
    const sql = await getSql();
    const id = data.id ?? newId("br");
    if (data.id) {
      if (data.status === "inactive") {
        const others = await sql.query<{ c: number }>(
          "select count(*)::int as c from branches where tenant_id = $1 and status = 'active' and id <> $2",
          [tenantId, data.id],
        );
        if (!others[0]?.c) fail("At least one branch must stay active", 409);
      }
      const rows = await sql.query<{ id: string }>(
        `update branches set name_en=$1, name_ar=$2, address_en=$3, address_ar=$4, phone=$5, whatsapp=$6, maps_url=$7, status=$8
         where id=$9 and tenant_id=$10 returning id`,
        [data.nameEn, data.nameAr, data.addressEn ?? null, data.addressAr ?? null, data.phone ?? null, data.whatsapp ?? null, data.mapsUrl || null, data.status, id, tenantId],
      );
      if (!rows[0]) fail("Not found", 404);
    } else {
      const max = await sql.query<{ m: number }>(
        "select coalesce(max(sort_order), 0)::int as m from branches where tenant_id = $1",
        [tenantId],
      );
      await sql.query(
        `insert into branches (id, tenant_id, name_en, name_ar, address_en, address_ar, phone, whatsapp, maps_url, hours_json, status, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}',$10,$11)`,
        [id, tenantId, data.nameEn, data.nameAr, data.addressEn ?? null, data.addressAr ?? null, data.phone ?? null, data.whatsapp ?? null, data.mapsUrl || null, data.status, (max[0]?.m ?? 0) + 10],
      );
    }
    await audit(context.userId, tenantId, data.id ? "branch.update" : "branch.create", "branch", id);
    return { id };
  });

export const deleteBranch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tenantId: z.string().optional(), id: z.string() }))
  .handler(async ({ context, data }) => {
    const { tenantId } = await ctxTenant(context.userId, data.tenantId, "TENANT_OWNER");
    const sql = await getSql();
    const total = await sql.query<{ c: number }>("select count(*)::int as c from branches where tenant_id = $1", [tenantId]);
    if ((total[0]?.c ?? 0) <= 1) fail("You can't delete the only branch", 409);
    // Deleting would erase the branch from past orders' history — deactivate instead.
    const used = await sql.query<{ c: number }>("select count(*)::int as c from orders where branch_id = $1 and tenant_id = $2", [data.id, tenantId]);
    if (used[0]?.c) fail("This branch has orders. Deactivate it instead of deleting.", 409);
    const rows = await sql.query<{ id: string }>("delete from branches where id = $1 and tenant_id = $2 returning id", [data.id, tenantId]);
    if (!rows[0]) fail("Not found", 404);
    await audit(context.userId, tenantId, "branch.delete", "branch", data.id);
    return { ok: true };
  });

// ─────────────────── platform clients & users (super admin only) ───────────────────

const MEMBER_ROLES = ["TENANT_OWNER", "TENANT_ADMIN", "BRANCH_MANAGER", "STAFF"] as const;

export const createTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      nameAr: z.string().trim().max(80).optional(),
      slug: z.string().trim().toLowerCase(),
      templateId: z.string().min(1),
      planId: z.string().min(1),
      ownerEmail: z.string().trim().toLowerCase().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    if (!isSlug(data.slug)) fail("Invalid slug: use a-z, 0-9 and dashes only");
    const sql = await getSql();
    const taken = await sql.query<SqlRow>("select id from tenants where slug = $1", [data.slug]);
    if (taken.length) fail("This slug is already used", 409);
    const tmpl = (await sql.query<SqlRow>("select industry, family from templates where id = $1", [data.templateId]))[0];
    if (!tmpl) fail("Unknown template");
    const plan = (await sql.query<SqlRow>("select id from plans where id = $1", [data.planId]))[0];
    if (!plan) fail("Unknown plan");

    const id = newId("tn");
    const prefix = data.slug.replace(/[^a-z0-9]/g, "").slice(0, 3).toUpperCase() || "ORD";
    await sql.query(
      "insert into tenants (id, slug, name, status, template_id, plan_id, industry) values ($1,$2,$3,'trial',$4,$5,$6)",
      [id, data.slug, data.name, data.templateId, data.planId, String(tmpl.industry ?? "restaurant")],
    );
    await sql.query(
      "insert into subscriptions (id, tenant_id, plan_id, status) values ($1,$2,$3,'TRIAL')",
      [newId("sub"), id, data.planId],
    );
    await sql.query(
      `insert into business_profiles (tenant_id, name_en, name_ar, order_prefix) values ($1,$2,$3,$4)`,
      [id, data.name, data.nameAr || data.name, prefix],
    );
    await sql.query("insert into order_counters (tenant_id, last_seq) values ($1, 0) on conflict do nothing", [id]);

    // Starter catalogue so a new client never opens an empty storefront.
    const preset = presetFor(String(tmpl.family ?? ""));
    const catIds = new Map<string, string>();
    let order = 0;
    for (const c of preset.cats) {
      const cid = newId("cat");
      catIds.set(c.slug, cid);
      await sql.query(
        "insert into categories (id, tenant_id, slug, name_en, name_ar, sort_order) values ($1,$2,$3,$4,$5,$6)",
        [cid, id, c.slug, c.en, c.ar, order++],
      );
    }
    order = 0;
    for (const it of preset.items) {
      await sql.query(
        `insert into catalog_items (id, tenant_id, category_id, slug, kind, name_en, name_ar, desc_en, desc_ar, price, compare_at, featured, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          newId("itm"),
          id,
          catIds.get(it.cat) ?? null,
          it.slug,
          preset.itemKind,
          it.en,
          it.ar,
          it.descEn,
          it.descAr,
          it.price,
          it.compareAt ?? null,
          Boolean(it.featured),
          order++,
        ],
      );
    }

    let ownerLinked = false;
    if (data.ownerEmail) {
      const u = (await sql.query<SqlRow>('select id from "user" where lower("email") = $1', [data.ownerEmail]))[0];
      if (u) {
        await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,$3,'TENANT_OWNER')", [
          newId("mem"),
          String(u.id),
          id,
        ]);
        ownerLinked = true;
      }
    }
    await audit(context.userId, id, "tenant.create", "tenant", id);
    return { id, ownerLinked };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const users = await sql.query<SqlRow>(
      'select "id", "name", "email", "createdAt" as created_at from "user" order by "createdAt" desc limit 500',
    );
    const members = await sql.query<SqlRow>(
      `select m.id, m.user_id, m.tenant_id, m.role, t.name as tenant_name
       from members m left join tenants t on t.id = m.tenant_id`,
    );
    const tenants = await sql.query<SqlRow>("select id, name from tenants order by name");
    return { users, members, tenants };
  });

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8).max(100),
      tenantId: z.string().optional(),
      role: z.enum(MEMBER_ROLES).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const { auth } = await import("@/lib/auth/server");
    const authCtx = await auth.$context;
    const existing = await authCtx.internalAdapter.findUserByEmail(data.email);
    if (existing) fail("This email is already registered", 409);
    const hash = await authCtx.password.hash(data.password);
    const user = await authCtx.internalAdapter.createUser({ email: data.email, name: data.name, emailVerified: true });
    await authCtx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    const sql = await getSql();
    if (data.tenantId) {
      const t = (await sql.query<SqlRow>("select id from tenants where id = $1", [data.tenantId]))[0];
      if (!t) fail("Unknown tenant");
      await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,$3,$4)", [
        newId("mem"),
        user.id,
        data.tenantId,
        data.role ?? "STAFF",
      ]);
    }
    await audit(context.userId, data.tenantId ?? null, "user.create", "user", user.id);
    return { id: user.id };
  });

export const addMemberToTenant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string(), tenantId: z.string(), role: z.enum(MEMBER_ROLES) }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const dup = await sql.query<SqlRow>("select id from members where user_id = $1 and tenant_id = $2", [
      data.userId,
      data.tenantId,
    ]);
    if (dup.length) fail("User already belongs to this client", 409);
    await sql.query("insert into members (id, user_id, tenant_id, role) values ($1,$2,$3,$4)", [
      newId("mem"),
      data.userId,
      data.tenantId,
      data.role,
    ]);
    await audit(context.userId, data.tenantId, "member.add", "user", data.userId);
    return { ok: true };
  });

export const removeMemberById = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ memberId: z.string() }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const row = (await sql.query<SqlRow>("select user_id, tenant_id, role from members where id = $1", [data.memberId]))[0];
    if (!row) fail("Not found", 404);
    if (String(row.role) === "SUPER_ADMIN") fail("Cannot remove a platform admin here", 403);
    await sql.query("delete from members where id = $1", [data.memberId]);
    await audit(context.userId, row.tenant_id ? String(row.tenant_id) : null, "member.remove", "user", String(row.user_id));
    return { ok: true };
  });

// ─────────────────── subscriptions & billing (super admin only) ───────────────────

const PAY_METHODS = ["cash", "instapay", "vodafone_cash", "bank", "card", "other"] as const;

/** Latest subscription row for a tenant (creating a trial row when none exists). */
async function ensureSubscription(tenantId: string): Promise<string> {
  const sql = await getSql();
  const row = (
    await sql.query<SqlRow>("select id from subscriptions where tenant_id = $1 order by start_at desc limit 1", [tenantId])
  )[0];
  if (row) return String(row.id);
  const t = (await sql.query<SqlRow>("select plan_id from tenants where id = $1", [tenantId]))[0];
  if (!t) fail("Unknown client", 404);
  const id = newId("sub");
  await sql.query("insert into subscriptions (id, tenant_id, plan_id, status) values ($1,$2,$3,'TRIAL')", [
    id,
    tenantId,
    String(t.plan_id),
  ]);
  return id;
}

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const rows = await sql.query<SqlRow>(
      `select t.id, t.name, t.slug, t.status as tenant_status, t.plan_id,
              p.name_en as plan_name, p.name_ar as plan_name_ar, p.price_monthly, p.price_yearly,
              s.id as sub_id, upper(s.status) as sub_status, s.billing_cycle, s.start_at, s.end_at, s.note,
              (select max(o.created_at) from orders o where o.tenant_id = t.id) as last_order_at,
              (select count(*)::int from orders o where o.tenant_id = t.id and o.created_at > now() - interval '30 days') as orders_30d,
              (select count(*)::int from members m where m.tenant_id = t.id) as members_count,
              (select max(sp.created_at) from subscription_payments sp where sp.tenant_id = t.id) as last_payment_at,
              (select coalesce(sum(sp.amount),0)::int from subscription_payments sp where sp.tenant_id = t.id) as paid_total
       from tenants t
       join plans p on p.id = t.plan_id
       left join lateral (select * from subscriptions s2 where s2.tenant_id = t.id order by s2.start_at desc limit 1) s on true
       where t.status <> 'archived'
       order by t.created_at desc`,
    );
    const payments = await sql.query<SqlRow>(
      `select sp.id, sp.amount, sp.method, sp.reference, sp.months, sp.note, sp.created_at, t.name as tenant_name
       from subscription_payments sp join tenants t on t.id = sp.tenant_id
       order by sp.created_at desc limit 15`,
    );
    const month = await sql.query<{ total: number }>(
      "select coalesce(sum(amount),0)::int as total from subscription_payments where created_at >= date_trunc('month', now())",
    );
    return { rows, payments, collectedThisMonth: Number(month[0]?.total ?? 0) };
  });

export const subscriptionAction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string(),
      action: z.enum(["activate", "suspend", "cancel", "extend", "trial"]),
      months: z.number().int().min(1).max(36).optional(),
      days: z.number().int().min(1).max(365).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const tn = (await sql.query<SqlRow>("select status from tenants where id = $1", [data.tenantId]))[0];
    if (!tn) fail("Unknown client", 404);
    if (String(tn.status) === "archived") fail("Client is archived", 409);
    const subId = await ensureSubscription(data.tenantId);

    if (data.action === "suspend" || data.action === "cancel") {
      await sql.query("update subscriptions set status = $1, updated_at = now() where id = $2", [
        data.action === "suspend" ? "SUSPENDED" : "CANCELLED",
        subId,
      ]);
      await sql.query("update tenants set status = 'suspended' where id = $1", [data.tenantId]);
    } else {
      const months = data.months ?? 0;
      const days = data.days ?? 0;
      const status = data.action === "trial" ? "TRIAL" : "ACTIVE";
      if (data.action === "trial") {
        await sql.query(
          "update subscriptions set status = 'TRIAL', end_at = now() + make_interval(days => $1::int), updated_at = now() where id = $2",
          [days || 14, subId],
        );
      } else if (months > 0 || days > 0 || data.action === "extend") {
        await sql.query(
          `update subscriptions set status = 'ACTIVE',
             end_at = greatest(coalesce(end_at, now()), now()) + make_interval(months => $1::int, days => $2::int),
             updated_at = now() where id = $3`,
          [months, days, subId],
        );
      } else {
        // plain activation: keep a running period, open-ended subscriptions stay open-ended
        await sql.query("update subscriptions set status = $1, updated_at = now() where id = $2", [status, subId]);
      }
      await sql.query("update tenants set status = 'active' where id = $1", [data.tenantId]);
    }
    await audit(context.userId, data.tenantId, `subscription.${data.action}`, "subscription", subId, {
      months: data.months ?? null,
      days: data.days ?? null,
    });
    return { ok: true };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      tenantId: z.string(),
      amount: z.number().int().min(1).max(100000000),
      method: z.enum(PAY_METHODS),
      reference: z.string().trim().max(120).optional(),
      months: z.number().int().min(0).max(36).optional(),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const tn = (await sql.query<SqlRow>("select status from tenants where id = $1", [data.tenantId]))[0];
    if (!tn) fail("Unknown client", 404);
    const subId = await ensureSubscription(data.tenantId);
    await sql.query(
      `insert into subscription_payments (id, tenant_id, subscription_id, amount, method, reference, months, note, recorded_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        newId("pay"),
        data.tenantId,
        subId,
        data.amount,
        data.method,
        data.reference || null,
        data.months || null,
        data.note || null,
        context.userId,
      ],
    );
    if (data.months && data.months > 0 && String(tn.status) !== "archived") {
      await sql.query(
        `update subscriptions set status = 'ACTIVE',
           end_at = greatest(coalesce(end_at, now()), now()) + make_interval(months => $1::int),
           updated_at = now() where id = $2`,
        [data.months, subId],
      );
      await sql.query("update tenants set status = 'active' where id = $1", [data.tenantId]);
    }
    await audit(context.userId, data.tenantId, "payment.record", "subscription", subId, {
      amount: data.amount,
      method: data.method,
      months: data.months ?? null,
    });
    return { ok: true };
  });

export const updatePlanPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ planId: z.string(), priceMonthly: z.number().int().min(0).max(10000000), priceYearly: z.number().int().min(0).max(100000000) }))
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    await sql.query("update plans set price_monthly = $1, price_yearly = $2 where id = $3", [
      data.priceMonthly,
      data.priceYearly,
      data.planId,
    ]);
    await audit(context.userId, null, "plan.prices", "plan", data.planId, {
      monthly: data.priceMonthly,
      yearly: data.priceYearly,
    });
    return { ok: true };
  });

export const suspendExpired = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const sql = await getSql();
    const due = await sql.query<SqlRow>(
      `select t.id as tenant_id, s.id as sub_id
       from tenants t
       join lateral (select * from subscriptions s2 where s2.tenant_id = t.id order by s2.start_at desc limit 1) s on true
       where t.status in ('active','trial') and s.end_at is not null and s.end_at < now()
         and upper(s.status) in ('ACTIVE','TRIAL')`,
    );
    for (const r of due) {
      await sql.query("update subscriptions set status = 'EXPIRED', updated_at = now() where id = $1", [String(r.sub_id)]);
      await sql.query("update tenants set status = 'suspended' where id = $1", [String(r.tenant_id)]);
      await audit(context.userId, String(r.tenant_id), "subscription.expired", "subscription", String(r.sub_id));
    }
    return { suspended: due.length };
  });
