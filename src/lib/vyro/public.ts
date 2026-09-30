import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { ensureSeeded } from "./seed";
import { computeLine, computeTotals, paymentUrlIsSafe, MAX_LINE_QTY } from "./commerce";
import { validateSelections, selectionErrorMessage } from "./order-flow";
import { base64ByteSize, detectImageMime, isOptionalHttpsUrl } from "./validation";
import { isPlausiblePhone } from "./phone";
import { newId, orderNumber, publicToken } from "./ids";
import { buildWhatsAppOrderMessage, whatsappDeepLink } from "./whatsapp";
import type {
  PublicCategory,
  PublicItem,
  PublicModifierGroup,
  PublicOffer,
  PublicPaymentMethod,
  PublicTenant,
  PublicVariant,
  SqlRow,
} from "./types";

async function track(
  tenantId: string,
  event: string,
  extra: { path?: string; itemId?: string; qrToken?: string; branchId?: string; table?: string } = {},
) {
  const sql = await getSql();
  await sql.query(
    `insert into analytics_events (id, tenant_id, event, path, item_id, qr_token, branch_id, table_number, meta_json)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'{}')`,
    [newId("ev"), tenantId, event, extra.path ?? null, extra.itemId ?? null, extra.qrToken ?? null, extra.branchId ?? null, extra.table ?? null],
  );
}

const httpsOrNull = (v: unknown): string | null => {
  const str = typeof v === "string" ? v.trim() : "";
  return str && isOptionalHttpsUrl(str) ? str : null;
};

/** Cheap id lookup for hot paths (analytics) — avoids loading the whole catalog. */
async function tenantIdBySlug(slug: string): Promise<string | null> {
  const sql = await getSql();
  await ensureSeeded(sql);
  const rows = await sql.query<{ id: string }>(
    "select id from tenants where slug = $1 and status not in ('archived','suspended')",
    [slug],
  );
  return rows[0]?.id ?? null;
}

export async function loadPublicTenant(slug: string): Promise<PublicTenant | null> {
  const sql = await getSql();
  await ensureSeeded(sql);
  const tenants = await sql.query<{
    id: string;
    slug: string;
    status: string;
    industry: string;
    family: string;
    theme_json: string;
  }>(
    `select t.id, t.slug, t.status, t.industry, tmpl.family, tmpl.theme_json
     from tenants t join templates tmpl on tmpl.id = t.template_id
     where t.slug = $1`,
    [slug],
  );
  const tenant = tenants[0];
  if (!tenant || tenant.status === "archived") return null;

  const profiles = await sql.query<SqlRow>(
    "select * from business_profiles where tenant_id = $1",
    [tenant.id],
  );
  const p = profiles[0];
  if (!p) return null;

  const cats = await sql.query<{
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    image_url: string | null;
    icon: string | null;
    sort_order: number;
  }>("select * from categories where tenant_id = $1 and active = true order by sort_order", [tenant.id]);

  const items = await sql.query<{
    id: string;
    slug: string;
    kind: string;
    category_id: string | null;
    name_en: string;
    name_ar: string;
    desc_en: string | null;
    desc_ar: string | null;
    image_url: string | null;
    price: number;
    compare_at: number | null;
    featured: boolean;
    available: boolean;
  }>("select * from catalog_items where tenant_id = $1 and visible = true order by sort_order", [tenant.id]);

  const variants = await sql.query<{
    id: string;
    item_id: string;
    name_en: string;
    name_ar: string;
    price: number;
    available: boolean;
  }>("select * from catalog_variants where tenant_id = $1 order by sort_order", [tenant.id]);

  const groups = await sql.query<{
    id: string;
    item_id: string | null;
    name_en: string;
    name_ar: string;
    required: boolean;
    min_select: number;
    max_select: number;
  }>("select * from modifier_groups where tenant_id = $1 order by sort_order", [tenant.id]);

  const mods = await sql.query<{
    id: string;
    group_id: string;
    name_en: string;
    name_ar: string;
    price_delta: number;
  }>("select * from modifiers where tenant_id = $1 and available = true order by sort_order", [tenant.id]);

  const offers = await sql.query<{
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    desc_en: string | null;
    desc_ar: string | null;
    image_url: string | null;
    price: number | null;
    compare_at: number | null;
    contents_json: string;
  }>("select * from offers where tenant_id = $1 and active = true order by sort_order", [tenant.id]);

  const methods = await sql.query<{
    id: string;
    type: string;
    name_en: string;
    name_ar: string;
    desc_en: string | null;
    desc_ar: string | null;
    payment_url: string | null;
    account_identifier: string | null;
    account_name: string | null;
    instructions_en: string | null;
    instructions_ar: string | null;
    requires_proof: boolean;
    requires_manual_verification: boolean;
    logo_url: string | null;
  }>("select * from payment_methods where tenant_id = $1 and enabled = true order by sort_order", [tenant.id]);

  const branches = await sql.query<{
    id: string;
    name_en: string;
    name_ar: string;
    address_en: string | null;
    address_ar: string | null;
    phone: string | null;
    whatsapp: string | null;
    maps_url: string | null;
    hours_json: string;
  }>("select * from branches where tenant_id = $1 and status = 'active' order by sort_order", [tenant.id]);

  const grouped: PublicItem[] = items.map((item) => {
    const itemGroups: PublicModifierGroup[] = groups
      .filter((g) => g.item_id === item.id)
      .map((g) => ({
        id: g.id,
        nameEn: g.name_en,
        nameAr: g.name_ar,
        required: g.required,
        minSelect: g.min_select,
        maxSelect: g.max_select,
        modifiers: mods
          .filter((m) => m.group_id === g.id)
          .map((m) => ({
            id: m.id,
            nameEn: m.name_en,
            nameAr: m.name_ar,
            priceDelta: m.price_delta,
          })),
      }));
    const itemVariants: PublicVariant[] = variants
      .filter((v) => v.item_id === item.id)
      .map((v) => ({
        id: v.id,
        nameEn: v.name_en,
        nameAr: v.name_ar,
        price: v.price,
        available: v.available,
      }));
    return {
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      categoryId: item.category_id,
      nameEn: item.name_en,
      nameAr: item.name_ar,
      descEn: item.desc_en,
      descAr: item.desc_ar,
      imageUrl: item.image_url,
      price: item.price,
      compareAt: item.compare_at,
      featured: item.featured,
      available: item.available,
      variants: itemVariants,
      modifierGroups: itemGroups,
    };
  });

  const categories: PublicCategory[] = cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameEn: c.name_en,
    nameAr: c.name_ar,
    imageUrl: c.image_url,
    icon: c.icon,
    sortOrder: c.sort_order,
  }));

  const publicOffers: PublicOffer[] = offers.map((o) => ({
    id: o.id,
    slug: o.slug,
    nameEn: o.name_en,
    nameAr: o.name_ar,
    descEn: o.desc_en,
    descAr: o.desc_ar,
    imageUrl: o.image_url,
    price: o.price,
    compareAt: o.compare_at,
    contents: o.contents_json,
  }));

  const paymentMethods: PublicPaymentMethod[] = methods.map((m) => ({
    id: m.id,
    type: m.type,
    nameEn: m.name_en,
    nameAr: m.name_ar,
    descEn: m.desc_en,
    descAr: m.desc_ar,
    paymentUrl: m.payment_url && paymentUrlIsSafe(m.payment_url) ? m.payment_url : null,
    accountIdentifier: m.account_identifier,
    accountName: m.account_name,
    instructionsEn: m.instructions_en,
    instructionsAr: m.instructions_ar,
    requiresProof: m.requires_proof,
    requiresManualVerification: m.requires_manual_verification,
    logoUrl: m.logo_url,
  }));

  let branding: Record<string, string> = {};
  try {
    branding = JSON.parse(String(p.branding_json || "{}")) as Record<string, string>;
  } catch {
    branding = {};
  }

  return {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    industry: tenant.industry,
    templateFamily: tenant.family,
    templateTheme: (() => {
      try {
        return JSON.parse(tenant.theme_json) as Record<string, string>;
      } catch {
        return {};
      }
    })(),
    profile: {
      nameEn: String(p.name_en),
      nameAr: String(p.name_ar),
      shortEn: (p.short_en as string) ?? null,
      shortAr: (p.short_ar as string) ?? null,
      descEn: (p.desc_en as string) ?? null,
      descAr: (p.desc_ar as string) ?? null,
      phone: (p.phone as string) ?? null,
      whatsapp: (p.whatsapp as string) ?? null,
      email: (p.email as string) ?? null,
      addressEn: (p.address_en as string) ?? null,
      addressAr: (p.address_ar as string) ?? null,
      mapsUrl: httpsOrNull(p.maps_url),
      reviewUrl: httpsOrNull(p.review_url),
      facebookUrl: httpsOrNull(p.facebook_url),
      instagramUrl: httpsOrNull(p.instagram_url),
      tiktokUrl: httpsOrNull(p.tiktok_url),
      websiteUrl: httpsOrNull(p.website_url),
      currency: String(p.currency),
      logoUrl: (p.logo_url as string) ?? null,
      coverUrl: (p.cover_url as string) ?? null,
      hoursJson: String(p.hours_json || "{}"),
      branding,
      timezone: String(p.timezone || "Africa/Cairo"),
      deliveryFee: Number(p.delivery_fee ?? 30),
      minOrder: Number(p.min_order ?? 0),
      acceptingOrders: p.accepting_orders !== false,
    },
    categories,
    items: grouped,
    offers: publicOffers,
    paymentMethods,
    branches: branches.map((b) => ({
      id: b.id,
      nameEn: b.name_en,
      nameAr: b.name_ar,
      addressEn: b.address_en,
      addressAr: b.address_ar,
      phone: b.phone,
      whatsapp: b.whatsapp,
      mapsUrl: httpsOrNull(b.maps_url),
      hoursJson: b.hours_json,
    })),
  };
}

export const getPublicTenant = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => loadPublicTenant(data.slug));

const PUBLIC_EVENTS = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "call_click",
  "whatsapp_click",
  "map_click",
] as const;

export const trackPublicEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: z.string().max(80),
      event: z.enum(PUBLIC_EVENTS),
      path: z.string().max(200).optional(),
      itemId: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }) => {
    // Analytics must never break the storefront or be a spam vector.
    if (!rateLimit(`ev:${data.slug}`, 240, 60_000)) return { ok: false };
    try {
      const tenantId = await tenantIdBySlug(data.slug);
      if (!tenantId) return { ok: false };
      await track(tenantId, data.event, { path: data.path, itemId: data.itemId });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const resolveQr = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(4).max(64) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureSeeded(sql);
    const rows = await sql.query<{
      id: string;
      tenant_id: string;
      token: string;
      type: string;
      destination: string;
      table_number: string | null;
      active: boolean;
      slug: string;
    }>(
      `select q.id, q.tenant_id, q.token, q.type, q.destination, q.table_number, q.active, t.slug
       from qr_codes q join tenants t on t.id = q.tenant_id
       where q.token = $1 and t.status not in ('archived','suspended')`,
      [data.token],
    );
    const qr = rows[0];
    if (!qr || !qr.active) return null;
    await sql.query("update qr_codes set scan_count = scan_count + 1 where id = $1", [qr.id]);
    await sql.query(
      "insert into qr_scans (id, qr_id, tenant_id, source, meta_json) values ($1,$2,$3,$4,$5)",
      [newId("scn"), qr.id, qr.tenant_id, "public", "{}"],
    );
    await track(qr.tenant_id, "qr_scan", { qrToken: qr.token, table: qr.table_number ?? undefined });
    const DEST: Record<string, string> = {
      home: "",
      menu: "/menu",
      offers: "/offers",
      checkout: "/checkout",
      location: "/location",
    };
    const dest = `/r/${qr.slug}${DEST[qr.destination] ?? "/menu"}`;
    return {
      path: dest,
      table: qr.table_number,
      slug: qr.slug,
      type: qr.type,
    };
  });

const PlaceOrderSchema = z.object({
  slug: z.string(),
  idempotencyKey: z.string().min(8).max(80),
  locale: z.enum(["ar", "en"]),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(8).max(20).refine(isPlausiblePhone, "Invalid phone number"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  branchId: z.string().optional(),
  tableNumber: z.string().max(20).optional(),
  fulfillment: z.enum(["dine_in", "pickup", "delivery"]),
  address: z.string().max(200).optional(),
  notes: z.string().max(400).optional(),
  paymentMethodId: z.string(),
  deliveryFee: z.number().int().min(0).max(1000).optional(), // ignored: the business sets the fee
  lines: z
    .array(
      z.object({
        itemId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().min(1).max(MAX_LINE_QTY),
        modifierIds: z.array(z.string()).max(12),
      }),
    )
    .min(1)
    .max(40),
});

const orderRate = new Map<string, number[]>();
let lastSweep = 0;

/**
 * Best-effort in-memory limiter (per server instance). Old keys are swept so the
 * map cannot grow without bound. For strict global limits put a shared store
 * (Redis / Upstash) behind this same function.
 */
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, times] of orderRate) {
      if (!times.length || now - times[times.length - 1] > 3_600_000) orderRate.delete(k);
    }
  }
  const hits = (orderRate.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  orderRate.set(key, hits);
  return true;
}

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

export const placeOrder = createServerFn({ method: "POST" })
  .validator(PlaceOrderSchema)
  .handler(async ({ data }) => {
    const phoneKey = data.customerPhone.replace(/[^\d]/g, "");
    if (!rateLimit(`order:${phoneKey}`, 8, 10 * 60_000) || !rateLimit(`order-slug:${data.slug}`, 120, 10 * 60_000)) {
      fail("Too many orders. Try again shortly.", 429);
    }
    const tenant = await loadPublicTenant(data.slug);
    if (!tenant || tenant.status === "suspended") fail("Store unavailable", 404);
    if (!tenant.profile.acceptingOrders) {
      fail(data.locale === "ar" ? "الطلبات متوقفة مؤقتاً" : "This business is not accepting orders right now", 409);
    }
    const sql = await getSql();
    const existing = await sql.query<{ id: string; public_token: string; order_number: string }>(
      "select id, public_token, order_number from orders where tenant_id = $1 and idempotency_key = $2",
      [tenant.id, data.idempotencyKey],
    );
    if (existing[0]) {
      return { orderId: existing[0].id, token: existing[0].public_token, orderNumber: existing[0].order_number, duplicate: true };
    }

    const method = tenant.paymentMethods.find((m) => m.id === data.paymentMethodId);
    if (!method) fail("Invalid payment method");

    if (data.fulfillment === "delivery" && !(data.address && data.address.trim().length >= 6)) {
      fail(data.locale === "ar" ? "العنوان مطلوب للتوصيل" : "A delivery address is required");
    }
    // A branch id from the client must belong to THIS tenant.
    if (data.branchId && !tenant.branches.some((b) => b.id === data.branchId)) fail("Invalid branch");

    const computedLines = [];
    for (const line of data.lines) {
      const item = tenant.items.find((i) => i.id === line.itemId);
      if (!item) fail("Item unavailable");
      const picked = validateSelections(item, line.variantId, line.modifierIds);
      if (!picked.ok) {
        fail(selectionErrorMessage(data.locale, picked.error, data.locale === "ar" ? item.nameAr : item.nameEn));
      }
      const variant = picked.variantId ? item.variants.find((v) => v.id === picked.variantId) : undefined;
      const unitPrice = variant ? variant.price : item.price;
      const mods = item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => picked.modifierIds.includes(m.id));
      const calc = computeLine({
        itemId: item.id,
        variantId: variant?.id,
        quantity: line.quantity,
        unitPrice,
        modifiers: mods,
      });
      computedLines.push({ item, variant, mods, ...calc });
    }
    // Prices, fees and totals are always computed here — never trusted from the client.
    const totals = computeTotals({
      lines: computedLines,
      deliveryFee: data.fulfillment === "delivery" ? tenant.profile.deliveryFee : 0,
    });
    const itemsSubtotal = totals.subtotal;
    if (tenant.profile.minOrder > 0 && itemsSubtotal < tenant.profile.minOrder) {
      fail(
        data.locale === "ar"
          ? `الحد الأدنى للطلب ${tenant.profile.minOrder} ${tenant.profile.currency}`
          : `Minimum order is ${tenant.profile.minOrder} ${tenant.profile.currency}`,
        409,
      );
    }
    if (data.fulfillment !== "dine_in" && data.tableNumber) data.tableNumber = undefined;

    const seqRows = await sql.query<{ last_seq: number }>(
      "update order_counters set last_seq = last_seq + 1 where tenant_id = $1 returning last_seq",
      [tenant.id],
    );
    const seq = seqRows[0]?.last_seq ?? 1;
    const prefix = tenant.slug === "rpm" ? "RPM" : tenant.slug.toUpperCase().slice(0, 4);
    const number = orderNumber(prefix, seq);
    const token = publicToken(14);
    const orderId = newId("ord");
    const paymentStatus = "UNPAID"; // becomes PAID only after staff review of a proof (or a gateway webhook)
    const snapshot = {
      id: method.id,
      type: method.type,
      nameEn: method.nameEn,
      nameAr: method.nameAr,
      requiresProof: method.requiresProof,
    };

    await sql.query(
      `insert into orders (
        id, tenant_id, branch_id, public_token, order_number, status, payment_status,
        customer_name, customer_phone, customer_email, table_number, fulfillment, address, notes,
        payment_method_id, payment_snapshot_json, subtotal, discount, fees, total, currency,
        idempotency_key, locale
      ) values ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        orderId,
        tenant.id,
        data.branchId || tenant.branches[0]?.id || null,
        token,
        number,
        paymentStatus,
        data.customerName,
        data.customerPhone,
        data.customerEmail || null,
        data.tableNumber || null,
        data.fulfillment,
        data.address || null,
        data.notes || null,
        method.id,
        JSON.stringify(snapshot),
        totals.subtotal,
        totals.discount,
        totals.fees,
        totals.total,
        tenant.profile.currency,
        data.idempotencyKey,
        data.locale,
      ],
    );

    for (const line of computedLines) {
      await sql.query(
        `insert into order_items (
          id, order_id, tenant_id, item_id, name_en, name_ar, variant_en, variant_ar,
          unit_price, quantity, modifiers_json, line_total
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          newId("oi"),
          orderId,
          tenant.id,
          line.item.id,
          line.item.nameEn,
          line.item.nameAr,
          line.variant?.nameEn ?? null,
          line.variant?.nameAr ?? null,
          line.unit,
          line.quantity,
          JSON.stringify(line.mods.map((m) => ({ id: m.id, nameEn: m.nameEn, nameAr: m.nameAr, priceDelta: m.priceDelta }))),
          line.lineTotal,
        ],
      );
    }

    const paymentId = newId("pay");
    await sql.query(
      "insert into payments (id, order_id, tenant_id, method_id, status, amount) values ($1,$2,$3,$4,$5,$6)",
      [paymentId, orderId, tenant.id, method.id, paymentStatus, totals.total],
    );

    await track(tenant.id, "order_created", { path: `/r/${tenant.slug}/checkout` });
    await sql.query(
      "insert into notifications (id, tenant_id, type, title, body) values ($1,$2,$3,$4,$5)",
      [newId("nt"), tenant.id, "order", "New order", `${number} · ${totals.total} ${tenant.profile.currency}`],
    );
    await sql.query(
      "insert into audit_logs (id, actor_user_id, tenant_id, action, resource, resource_id, metadata_json) values ($1,null,$2,$3,$4,$5,$6)",
      [newId("aud"), tenant.id, "order.created", "order", orderId, JSON.stringify({ number })],
    );

    const msg = buildWhatsAppOrderMessage({
      locale: data.locale,
      businessName: data.locale === "ar" ? tenant.profile.nameAr : tenant.profile.nameEn,
      orderNumber: number,
      branch: tenant.branches[0] ? (data.locale === "ar" ? tenant.branches[0].nameAr : tenant.branches[0].nameEn) : null,
      table: data.tableNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items: computedLines.map((l) => ({
        quantity: l.quantity,
        name: data.locale === "ar" ? l.item.nameAr : l.item.nameEn,
        variant: l.variant ? (data.locale === "ar" ? l.variant.nameAr : l.variant.nameEn) : null,
        modifiers: l.mods.map((m) => (data.locale === "ar" ? m.nameAr : m.nameEn)),
        lineTotal: l.lineTotal,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      fees: totals.fees,
      total: totals.total,
      currency: tenant.profile.currency,
      paymentName: data.locale === "ar" ? method.nameAr : method.nameEn,
      paymentStatus: method.requiresProof ? (data.locale === "ar" ? "بانتظار التحقق" : "Pending verification") : (data.locale === "ar" ? "غير مدفوع" : "Unpaid"),
      notes: data.notes,
      fulfillment: data.fulfillment,
      address: data.address,
    });
    const wa = tenant.profile.whatsapp ? whatsappDeepLink(tenant.profile.whatsapp, msg) : null;

    return {
      orderId,
      token,
      orderNumber: number,
      total: totals.total,
      currency: tenant.profile.currency,
      payment: method,
      whatsappUrl: wa,
      message: msg,
      requiresProof: method.requiresProof,
      duplicate: false,
    };
  });

export const getPublicOrder = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureSeeded(sql);
    // Explicit columns: the public tracking page must not receive tenant ids,
    // idempotency keys or anything else internal.
    const orders = await sql.query<SqlRow>(
      `select id, tenant_id, order_number, status, payment_status, customer_name, customer_phone,
              table_number, fulfillment, address, notes, payment_snapshot_json,
              subtotal, discount, fees, total, currency, locale, created_at, updated_at
       from orders where public_token = $1`,
      [data.token],
    );
    const order = orders[0];
    if (!order) return null;
    const items = await sql.query<SqlRow>(
      `select name_en, name_ar, variant_en, variant_ar, unit_price, quantity, modifiers_json, line_total
       from order_items where order_id = $1`,
      [order.id],
    );
    const tenant = await sql.query<{ slug: string }>("select slug from tenants where id = $1", [order.tenant_id]);
    const proofs = await sql.query<{ c: number }>(
      `select count(*)::int as c from payment_proofs pr join payments p on p.id = pr.payment_id where p.order_id = $1`,
      [order.id],
    );
    const { tenant_id: _t, id: _i, ...publicOrder } = order;
    void _t;
    void _i;
    return { order: publicOrder, items, slug: tenant[0]?.slug ?? "", proofCount: proofs[0]?.c ?? 0 };
  });

const ProofSchema = z.object({
  token: z.string(),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(32).max(2_100_000),
});

const MAX_PROOFS_PER_ORDER = 5;
const MAX_PROOF_BYTES = 1_500_000;

export const uploadPaymentProof = createServerFn({ method: "POST" })
  .validator(ProofSchema)
  .handler(async ({ data }) => {
    if (data.dataBase64.startsWith("data:")) fail("Send raw base64 only");
    if (!rateLimit(`proof:${data.token}`, 6, 60 * 60_000)) fail("Too many uploads. Try again later.", 429);

    // The declared mime is not trusted — the bytes must really be a JPEG / PNG / WebP.
    const realMime = detectImageMime(data.dataBase64);
    if (!realMime) fail("File must be a JPEG, PNG or WebP image");
    const size = base64ByteSize(data.dataBase64);
    if (size > MAX_PROOF_BYTES) fail("File too large (max 1.5 MB)");

    const sql = await getSql();
    const orders = await sql.query<{ id: string; tenant_id: string; total: number; payment_status: string; status: string }>(
      "select id, tenant_id, total, payment_status, status from orders where public_token = $1",
      [data.token],
    );
    const order = orders[0];
    if (!order) fail("Order not found", 404);
    // Once staff approved (or the order is closed) a customer link must not be able to reopen payment.
    if (order.payment_status === "PAID") fail("This order is already paid", 409);
    if (order.status === "CANCELLED") fail("This order was cancelled", 409);

    const pays = await sql.query<{ id: string }>("select id from payments where order_id = $1 order by created_at desc limit 1", [order.id]);
    const paymentId = pays[0]?.id ?? newId("pay");
    if (!pays[0]) {
      await sql.query(
        "insert into payments (id, order_id, tenant_id, method_id, status, amount) values ($1,$2,$3,null,$4,$5)",
        [paymentId, order.id, order.tenant_id, "PENDING_VERIFICATION", order.total],
      );
    }
    const count = await sql.query<{ c: number }>(
      "select count(*)::int as c from payment_proofs where payment_id = $1",
      [paymentId],
    );
    if ((count[0]?.c ?? 0) >= MAX_PROOFS_PER_ORDER) fail("Too many proofs for this order", 409);

    await sql.query(
      "insert into payment_proofs (id, payment_id, tenant_id, mime, size_bytes, data_base64) values ($1,$2,$3,$4,$5,$6)",
      [newId("prf"), paymentId, order.tenant_id, realMime, size, data.dataBase64],
    );
    await sql.query("update payments set status = 'PENDING_VERIFICATION' where id = $1", [paymentId]);
    await sql.query("update orders set payment_status = 'PENDING_VERIFICATION', updated_at = now() where id = $1", [order.id]);
    await sql.query(
      "insert into notifications (id, tenant_id, type, title, body) values ($1,$2,$3,$4,$5)",
      [newId("nt"), order.tenant_id, "payment", "Payment proof uploaded", order.id],
    );
    return { ok: true };
  });

export const PUBLIC_SETTING_KEYS = [
  "company_name",
  "tagline",
  "owner_name",
  "contact_email",
  "contact_phone",
  "contact_phone_e164",
  "contact_whatsapp",
  "hero_line",
] as const;

export const getPlatformSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await ensureSeeded(sql);
  // Public endpoint: only brand / contact keys — internal flags (e.g. bootstrap_owner) never leave the server.
  const rows = await sql.query<{ key: string; value: string }>(
    "select key, value from platform_settings where key = any($1::text[])",
    [PUBLIC_SETTING_KEYS as unknown as string[]],
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
});

export const submitDemoRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(80),
      email: z.string().email(),
      phone: z.string().max(20).optional(),
      business: z.string().max(80).optional(),
      message: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!rateLimit(`demo:${data.email}`, 5, 60 * 60_000)) {
      throw Object.assign(new Error("Too many requests"), { status: 429 });
    }
    const sql = await getSql();
    await ensureSeeded(sql);
    await sql.query(
      "insert into demo_requests (id, name, email, phone, business, message) values ($1,$2,$3,$4,$5,$6)",
      [newId("demo"), data.name, data.email, data.phone ?? null, data.business ?? null, data.message ?? null],
    );
    return { ok: true };
  });
