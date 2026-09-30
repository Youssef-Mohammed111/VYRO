import type { Sql } from "@/lib/db";
import { RPM_CATEGORIES, RPM_ITEMS, RPM_OFFERS } from "./catalog-data";
import { newId } from "./ids";

const FEATURES = [
  "WHATSAPP_ORDERING",
  "QR_CODES",
  "NFC",
  "ANALYTICS",
  "OFFERS",
  "PAYMENT_PROOF",
  "MULTI_BRANCH",
  "STAFF",
  "CUSTOM_DOMAIN",
  "ADVANCED_ANALYTICS",
] as const;

/**
 * `on conflict do nothing` makes the whole seed re-runnable: if a first request
 * crashed half-way (or two cold-start requests overlapped) the next pass simply
 * fills in what is missing instead of failing forever on duplicate keys.
 */
async function insert(sql: Sql, table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const params = keys.map((_, i) => `$${i + 1}`).join(", ");
  await sql.query(
    `insert into ${table} (${cols}) values (${params}) on conflict do nothing`,
    keys.map((k) => row[k]),
  );
}

const seedRef = globalThis as typeof globalThis & {
  __vyroSeeded__?: boolean;
  __vyroSeeding__?: Promise<void>;
};

/**
 * Demo orders / analytics are only useful in the local preview. On a real database
 * (DATABASE_URL set) they would show up as fake revenue and traffic in the owner's
 * dashboard, so they are skipped unless explicitly requested with VYRO_SEED_DEMO=1.
 */
function shouldSeedDemoActivity(): boolean {
  if (process.env.VYRO_SEED_DEMO === "1") return true;
  return !process.env.DATABASE_URL?.trim();
}

/** Single-flight + memoized: concurrent first requests share one seed pass. */
export function ensureSeeded(sql: Sql): Promise<void> {
  if (seedRef.__vyroSeeded__) return Promise.resolve();
  seedRef.__vyroSeeding__ ??= seedOnce(sql)
    .then(() => {
      seedRef.__vyroSeeded__ = true;
    })
    .finally(() => {
      seedRef.__vyroSeeding__ = undefined;
    });
  return seedRef.__vyroSeeding__;
}

async function seedOnce(sql: Sql) {
  const existing = await sql.query<{ id: number }>("select id from seed_meta where id = 1");
  if (existing.length) return;

  const now = new Date().toISOString();

  await insert(sql, "platform_settings", { key: "company_name", value: "VYRO" });
  await insert(sql, "platform_settings", { key: "tagline", value: "Digital Business Platform" });
  await insert(sql, "platform_settings", { key: "owner_name", value: "Eng. Youssef Mohammed" });
  await insert(sql, "platform_settings", { key: "contact_email", value: "vyro.techpro1@gmail.com" });
  await insert(sql, "platform_settings", { key: "contact_phone", value: "01050034183" });
  await insert(sql, "platform_settings", { key: "contact_phone_e164", value: "+201050034183" });
  await insert(sql, "platform_settings", { key: "contact_whatsapp", value: "201050034183" });
  await insert(sql, "platform_settings", { key: "hero_line", value: "Build Your Business Digitally." });

  const templates = [
    { id: "tmpl_rpm", slug: "rpm-performance", name_en: "RPM Performance Restaurant", name_ar: "مطعم أداء RPM", industry: "restaurant", family: "restaurant-performance" },
    { id: "tmpl_cafe", slug: "cafe-warm", name_en: "Warm Café", name_ar: "كافيه دافئ", industry: "cafe", family: "cafe" },
    { id: "tmpl_salon", slug: "salon-line", name_en: "Salon Line", name_ar: "صالون", industry: "salon", family: "salon" },
    { id: "tmpl_clinic", slug: "clinic-calm", name_en: "Clinic Calm", name_ar: "عيادة", industry: "clinic", family: "clinic" },
    { id: "tmpl_gym", slug: "gym-force", name_en: "Gym Force", name_ar: "جيم", industry: "gym", family: "gym" },
    { id: "tmpl_retail", slug: "retail-grid", name_en: "Retail Grid", name_ar: "تجزئة", industry: "retail", family: "retail" },
    { id: "tmpl_auto", slug: "auto-service", name_en: "Auto Service", name_ar: "خدمة سيارات", industry: "auto", family: "auto" },
    { id: "tmpl_hotel", slug: "hospitality", name_en: "Hospitality", name_ar: "ضيافة", industry: "hotel", family: "hotel" },
    { id: "tmpl_pro", slug: "professional", name_en: "Professional Services", name_ar: "خدمات مهنية", industry: "professional", family: "professional" },
  ];
  for (const t of templates) {
    await insert(sql, "templates", {
      ...t,
      status: "active",
      version: 1,
      layout_json: JSON.stringify({
        sections: ["hero", "categories", "featured", "offers", "location", "about", "footer"],
        editable: { heroTitle: true, heroSubtitle: true, heroImage: true, logo: true, colors: true },
      }),
      theme_json: JSON.stringify(
        t.family === "restaurant-performance"
          ? { primary: "#e10600", bg: "#050505", fg: "#f5f5f5" }
          : t.family === "cafe"
            ? { primary: "#c4a484", bg: "#1a1410", fg: "#f4efe8" }
            : { primary: "#1a8cff", bg: "#050507", fg: "#f2f4f7" },
      ),
      allowed_modules: JSON.stringify(FEATURES),
    });
  }

  const plans = [
    { id: "plan_trial", slug: "trial", name_en: "Trial", name_ar: "تجربة", sort_order: 0 },
    { id: "plan_starter", slug: "starter", name_en: "Starter", name_ar: "ستارتر", sort_order: 1 },
    { id: "plan_pro", slug: "pro", name_en: "Pro", name_ar: "برو", sort_order: 2 },
    { id: "plan_business", slug: "business", name_en: "Business", name_ar: "بيزنس", sort_order: 3 },
    { id: "plan_custom", slug: "custom", name_en: "Custom", name_ar: "مخصص", sort_order: 4 },
  ];
  for (const p of plans) await insert(sql, "plans", { ...p, status: "active" });

  const limits: Record<string, Record<string, number | null>> = {
    plan_trial: { branches: 1, products: 40, staff: 2, qr: 10 },
    plan_starter: { branches: 1, products: 80, staff: 5, qr: 25 },
    plan_pro: { branches: 3, products: 200, staff: 15, qr: 80 },
    plan_business: { branches: 10, products: 500, staff: 40, qr: 250 },
    plan_custom: { branches: null as unknown as number, products: null as unknown as number, staff: null as unknown as number, qr: null as unknown as number },
  };
  for (const [planId, feat] of Object.entries(limits)) {
    for (const key of FEATURES) {
      await insert(sql, "plan_features", {
        plan_id: planId,
        feature_key: key,
        enabled: !(planId === "plan_trial" && (key === "CUSTOM_DOMAIN" || key === "ADVANCED_ANALYTICS")),
        limit_value: null,
      });
    }
    for (const [k, v] of Object.entries(feat)) {
      await insert(sql, "plan_features", {
        plan_id: planId,
        feature_key: `LIMIT_${k.toUpperCase()}`,
        enabled: true,
        limit_value: v,
      });
    }
  }

  await insert(sql, "tenants", {
    id: "tn_rpm",
    slug: "rpm",
    name: "RPM — Really Powerful Meals",
    status: "active",
    template_id: "tmpl_rpm",
    plan_id: "plan_pro",
    industry: "restaurant",
  });
  await insert(sql, "tenants", {
    id: "tn_aurora",
    slug: "aurora-cafe",
    name: "Aurora Café",
    status: "active",
    template_id: "tmpl_cafe",
    plan_id: "plan_starter",
    industry: "cafe",
  });

  await insert(sql, "subscriptions", {
    id: "sub_rpm",
    tenant_id: "tn_rpm",
    plan_id: "plan_pro",
    status: "ACTIVE",
    start_at: now,
    end_at: null,
    renewal_at: null,
  });
  await insert(sql, "subscriptions", {
    id: "sub_aurora",
    tenant_id: "tn_aurora",
    plan_id: "plan_starter",
    status: "TRIAL",
    start_at: now,
    end_at: null,
    renewal_at: null,
  });

  const hours = JSON.stringify({
    sun: "12:00–02:00",
    mon: "12:00–02:00",
    tue: "12:00–02:00",
    wed: "12:00–02:00",
    thu: "12:00–02:00",
    fri: "12:00–02:00",
    sat: "12:00–02:00",
  });

  await insert(sql, "branches", {
    id: "br_rpm_main",
    tenant_id: "tn_rpm",
    name_en: "Badr City Walk",
    name_ar: "الممشى السياحي — مدينة بدر",
    address_en: "Tourist Walk, Badr City, Egypt",
    address_ar: "الممشى السياحي بمدينة بدر",
    phone: "+201275177305",
    whatsapp: "+201275177305",
    maps_url: "https://maps.google.com/?q=" + encodeURIComponent("الممشى السياحي بمدينة بدر"),
    hours_json: hours,
    status: "active",
    sort_order: 0,
  });
  await insert(sql, "branches", {
    id: "br_aurora",
    tenant_id: "tn_aurora",
    name_en: "Heliopolis",
    name_ar: "مصر الجديدة",
    address_en: "Heliopolis, Cairo",
    address_ar: "مصر الجديدة، القاهرة",
    phone: null,
    whatsapp: null,
    maps_url: null,
    hours_json: "{}",
    status: "active",
    sort_order: 0,
  });

  await insert(sql, "business_profiles", {
    tenant_id: "tn_rpm",
    name_en: "RPM — Really Powerful Meals",
    name_ar: "RPM — أقوى وجبات فعلاً",
    short_en: "POWER UP YOUR HUNGER",
    short_ar: "أشحن جوعك",
    desc_en:
      "Charcoal burgers, crispy chicken, and grill sandwiches built for speed. Good food. Real energy.",
    desc_ar:
      "في RPM نقدم لك وجبات قوية ومليئة بالنكهة، مصممة خصيصاً لضمان عدم الاضطرار لاستخدام أجود المكونات لتمنحك تجربة طعام لا تُنسى.",
    phone: "+201275177305",
    whatsapp: "+201275177305",
    email: null,
    address_en: "Tourist Walk, Badr City",
    address_ar: "الممشى السياحي بمدينة بدر",
    maps_url: "https://maps.google.com/?q=" + encodeURIComponent("الممشى السياحي بمدينة بدر"),
    review_url: null,
    facebook_url: null,
    instagram_url: null,
    tiktok_url: null,
    website_url: null,
    currency: "EGP",
    country: "EG",
    timezone: "Africa/Cairo",
    logo_url: "/tenants/rpm/logo.jpg",
    cover_url: "/tenants/rpm/hero.jpg",
    favicon_url: "/tenants/rpm/logo.jpg",
    hours_json: hours,
    branding_json: JSON.stringify({
      primary: "#e10600",
      bg: "#050505",
      fg: "#f5f5f5",
      heroTitleEn: "POWER UP YOUR HUNGER",
      heroTitleAr: "أقوى وجبات فعلاً",
      heroCtaEn: "Order now",
      heroCtaAr: "اطلب الآن",
    }),
    order_prefix: "RPM",
  });

  await insert(sql, "business_profiles", {
    tenant_id: "tn_aurora",
    name_en: "Aurora Café",
    name_ar: "أورورا كافيه",
    short_en: "Slow coffee. Quiet light.",
    short_ar: "قهوة هادئة",
    desc_en: "A café tenant used for isolation tests. Empty catalog.",
    desc_ar: "مستأجر كافيه لاختبارات العزل.",
    phone: null,
    whatsapp: null,
    email: null,
    address_en: "Heliopolis",
    address_ar: "مصر الجديدة",
    maps_url: null,
    review_url: null,
    facebook_url: null,
    instagram_url: null,
    tiktok_url: null,
    website_url: null,
    currency: "EGP",
    country: "EG",
    timezone: "Africa/Cairo",
    logo_url: null,
    cover_url: null,
    favicon_url: null,
    hours_json: "{}",
    branding_json: "{}",
    order_prefix: "AUR",
  });

  const catIds: Record<string, string> = {};
  let sort = 0;
  for (const c of RPM_CATEGORIES) {
    const id = `cat_${c.slug}`;
    catIds[c.slug] = id;
    await insert(sql, "categories", {
      id,
      tenant_id: "tn_rpm",
      slug: c.slug,
      name_en: c.nameEn,
      name_ar: c.nameAr,
      image_url: c.image,
      icon: c.icon,
      sort_order: sort++,
      active: true,
    });
  }

  for (const [catSlug, items] of Object.entries(RPM_ITEMS)) {
    let iSort = 0;
    for (const item of items) {
      const id = `it_${item.slug}`;
      await insert(sql, "catalog_items", {
        id,
        tenant_id: "tn_rpm",
        category_id: catIds[catSlug],
        slug: item.slug,
        kind: "product",
        name_en: item.nameEn,
        name_ar: item.nameAr,
        desc_en: item.descEn,
        desc_ar: item.descAr,
        image_url: item.image,
        price: item.price,
        compare_at: null,
        sku: item.slug.toUpperCase(),
        sort_order: iSort++,
        featured: Boolean(item.featured),
        available: true,
        visible: true,
        tags: catSlug,
        meta_json: "{}",
      });
      if (item.variants) {
        let vSort = 0;
        for (const v of item.variants) {
          await insert(sql, "catalog_variants", {
            id: `var_${item.slug}_${vSort}`,
            tenant_id: "tn_rpm",
            item_id: id,
            name_en: v.nameEn,
            name_ar: v.nameAr,
            price: v.price,
            sku: null,
            sort_order: vSort++,
            available: true,
          });
        }
      }
      const groupId = `mg_${item.slug}`;
      await insert(sql, "modifier_groups", {
        id: groupId,
        tenant_id: "tn_rpm",
        item_id: id,
        name_en: "Add-ons",
        name_ar: "إضافات",
        required: false,
        min_select: 0,
        max_select: 4,
        sort_order: 0,
      });
      await insert(sql, "modifiers", {
        id: `mod_${item.slug}_cheese`,
        tenant_id: "tn_rpm",
        group_id: groupId,
        name_en: "Extra cheese",
        name_ar: "جبنة إضافية",
        price_delta: 15,
        sort_order: 0,
        available: true,
      });
      await insert(sql, "modifiers", {
        id: `mod_${item.slug}_sauce`,
        tenant_id: "tn_rpm",
        group_id: groupId,
        name_en: "Extra sauce",
        name_ar: "صوص إضافي",
        price_delta: 10,
        sort_order: 1,
        available: true,
      });
    }
  }

  let oSort = 0;
  for (const offer of RPM_OFFERS) {
    await insert(sql, "offers", {
      id: `off_${offer.slug}`,
      tenant_id: "tn_rpm",
      slug: offer.slug,
      name_en: offer.nameEn,
      name_ar: offer.nameAr,
      desc_en: offer.descEn,
      desc_ar: offer.descAr,
      image_url: offer.image,
      kind: "offer_price",
      value: offer.price,
      price: offer.price,
      compare_at: null,
      starts_at: null,
      ends_at: null,
      active: true,
      promo_code: null,
      usage_limit: null,
      usage_count: 0,
      sort_order: oSort++,
      contents_json: JSON.stringify({ description: offer.descEn }),
    });
    await insert(sql, "catalog_items", {
      id: `it_${offer.slug}`,
      tenant_id: "tn_rpm",
      category_id: catIds.offers,
      slug: offer.slug,
      kind: "offer",
      name_en: offer.nameEn,
      name_ar: offer.nameAr,
      desc_en: offer.descEn,
      desc_ar: offer.descAr,
      image_url: offer.image,
      price: offer.price,
      compare_at: null,
      sku: offer.slug.toUpperCase(),
      sort_order: oSort,
      featured: true,
      available: true,
      visible: true,
      tags: "offers",
      meta_json: "{}",
    });
  }

  await insert(sql, "payment_methods", {
    id: "pm_rpm_cash",
    tenant_id: "tn_rpm",
    branch_id: null,
    type: "MANUAL",
    name_en: "Cash",
    name_ar: "كاش",
    desc_en: "Pay cash at the counter or on delivery.",
    desc_ar: "ادفع كاش عند الاستلام أو الكاشير.",
    payment_url: null,
    deep_link_url: null,
    account_identifier: null,
    account_name: null,
    logo_url: null,
    instructions_en: "Pay when your order is ready. No upload needed.",
    instructions_ar: "ادفع عند استلام الطلب. لا حاجة لإثبات دفع.",
    requires_proof: false,
    requires_manual_verification: false,
    enabled: true,
    sort_order: 0,
    min_amount: null,
    max_amount: null,
  });
  await insert(sql, "payment_methods", {
    id: "pm_rpm_instapay",
    tenant_id: "tn_rpm",
    branch_id: null,
    type: "INSTAPAY",
    name_en: "InstaPay",
    name_ar: "إنستاباي",
    desc_en: "Pay securely using InstaPay.",
    desc_ar: "ادفع بأمان عبر إنستاباي.",
    payment_url: "https://ipn.eg/S/youssefmohammed111/instapay/2rWOrq",
    deep_link_url: null,
    account_identifier: "youssefmohammed111",
    account_name: "InstaPay",
    logo_url: null,
    instructions_en: "Complete payment in InstaPay, then upload your proof. Staff confirm before the order is marked paid.",
    instructions_ar: "أكمل الدفع عبر إنستاباي ثم ارفع إثبات التحويل. التأكيد يتم يدوياً من المطعم.",
    requires_proof: true,
    requires_manual_verification: true,
    enabled: true,
    sort_order: 1,
    min_amount: null,
    max_amount: null,
  });
  await insert(sql, "payment_methods", {
    id: "pm_rpm_vf",
    tenant_id: "tn_rpm",
    branch_id: null,
    type: "VODAFONE_CASH",
    name_en: "Vodafone Cash",
    name_ar: "فودافون كاش",
    desc_en: "Pay using Vodafone Cash.",
    desc_ar: "ادفع عبر فودافون كاش.",
    payment_url: "http://vf.eg/vfcash?id=mt&qrId=6SWHSV",
    deep_link_url: null,
    account_identifier: "6SWHSV",
    account_name: "Vodafone Cash",
    logo_url: null,
    instructions_en: "Open Vodafone Cash, pay the order total, then upload a screenshot. Paid only after staff verify.",
    instructions_ar: "افتح فودافون كاش وادفع الإجمالي ثم ارفع صورة الإيصال. الحالة تتحول إلى مدفوع بعد المراجعة.",
    requires_proof: true,
    requires_manual_verification: true,
    enabled: true,
    sort_order: 2,
    min_amount: null,
    max_amount: null,
  });

  await insert(sql, "qr_codes", {
    id: "qr_rpm_table01",
    tenant_id: "tn_rpm",
    branch_id: "br_rpm_main",
    token: "k8Qm2nR4vL0x",
    label: "TABLE 01",
    type: "table",
    destination: "menu",
    table_number: "01",
    active: true,
    scan_count: 0,
  });
  await insert(sql, "qr_codes", {
    id: "qr_rpm_counter",
    tenant_id: "tn_rpm",
    branch_id: "br_rpm_main",
    token: "c3Np9Wd7aB2y",
    label: "COUNTER",
    type: "counter",
    destination: "menu",
    table_number: null,
    active: true,
    scan_count: 0,
  });
  await insert(sql, "qr_codes", {
    id: "qr_rpm_menu",
    tenant_id: "tn_rpm",
    branch_id: "br_rpm_main",
    token: "m5Ht1Kp8eQ6z",
    label: "MENU",
    type: "menu",
    destination: "home",
    table_number: null,
    active: true,
    scan_count: 0,
  });
  await insert(sql, "nfc_destinations", {
    id: "nfc_rpm_main",
    tenant_id: "tn_rpm",
    label: "Table stand NFC",
    token: "n7Ux4Jm0sD3p",
    destination: "menu",
  });

  await insert(sql, "order_counters", { tenant_id: "tn_rpm", last_seq: shouldSeedDemoActivity() ? 4 : 0 });
  await insert(sql, "order_counters", { tenant_id: "tn_aurora", last_seq: 0 });

  const demoActivity = shouldSeedDemoActivity();
  const sampleOrders = demoActivity ? [
    { seq: 1, status: "PREPARING", pay: "PAID", item: "V8 Classic", total: 125, minutes: 2 },
    { seq: 2, status: "CONFIRMED", pay: "PENDING_VERIFICATION", item: "Turbo Chicken", total: 120, minutes: 8 },
    { seq: 3, status: "COMPLETED", pay: "PAID", item: "Hawawshi RPM", total: 110, minutes: 15 },
    { seq: 4, status: "COMPLETED", pay: "PAID", item: "V8 Classic", total: 165, minutes: 32 },
  ] : [];
  for (const o of sampleOrders) {
    const id = `ord_rpm_${o.seq}`;
    const created = new Date(Date.now() - o.minutes * 60_000).toISOString();
    await insert(sql, "orders", {
      id,
      tenant_id: "tn_rpm",
      branch_id: "br_rpm_main",
      public_token: `trk_rpm_${o.seq}_demo`,
      order_number: `RPM-00000${o.seq}`,
      status: o.status,
      payment_status: o.pay,
      customer_name: "Walk-in",
      customer_phone: "+201275177305",
      customer_email: null,
      table_number: o.seq === 1 ? "01" : null,
      fulfillment: "dine_in",
      address: null,
      notes: null,
      payment_method_id: o.pay === "PAID" ? "pm_rpm_cash" : "pm_rpm_instapay",
      payment_snapshot_json: JSON.stringify({ nameEn: o.pay === "PAID" ? "Cash" : "InstaPay" }),
      subtotal: o.total,
      discount: 0,
      fees: 0,
      total: o.total,
      currency: "EGP",
      idempotency_key: `seed-${o.seq}`,
      locale: "ar",
      created_at: created,
      updated_at: created,
    });
    await insert(sql, "order_items", {
      id: `oi_rpm_${o.seq}`,
      order_id: id,
      tenant_id: "tn_rpm",
      item_id: null,
      name_en: o.item,
      name_ar: o.item,
      variant_en: null,
      variant_ar: null,
      unit_price: o.total,
      quantity: 1,
      modifiers_json: "[]",
      line_total: o.total,
    });
  }

  const events = (demoActivity ? [
    ["page_view", 40],
    ["qr_scan", 18],
    ["product_view", 24],
    ["add_to_cart", 12],
    ["checkout_started", 8],
    ["order_created", 4],
    ["whatsapp_click", 6],
    ["call_click", 3],
  ] : []) as readonly (readonly [string, number])[];
  for (const [event, n] of events) {
    for (let i = 0; i < n; i++) {
      await insert(sql, "analytics_events", {
        id: newId("ev"),
        tenant_id: "tn_rpm",
        event,
        path: "/r/rpm",
        item_id: null,
        qr_token: event === "qr_scan" ? "k8Qm2nR4vL0x" : null,
        branch_id: "br_rpm_main",
        table_number: event === "qr_scan" ? "01" : null,
        meta_json: "{}",
      });
    }
  }

  await insert(sql, "seed_meta", { id: 1, version: 1 });
}
