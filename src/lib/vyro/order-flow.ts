/**
 * Order lifecycle + cart selection rules (pure — shared by client UI and server
 * functions so both always agree).
 */
import type { Locale, OrderStatus, PaymentStatus } from "./types";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
];

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "COMPLETED", "CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return NEXT[status] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (NEXT[from] ?? []).includes(to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, { ar: string; en: string }> = {
  PENDING: { ar: "قيد الانتظار", en: "Pending" },
  CONFIRMED: { ar: "تم التأكيد", en: "Confirmed" },
  PREPARING: { ar: "قيد التحضير", en: "Preparing" },
  READY: { ar: "جاهز", en: "Ready" },
  SERVED: { ar: "تم التقديم", en: "Served" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, { ar: string; en: string }> = {
  UNPAID: { ar: "غير مدفوع", en: "Unpaid" },
  PENDING_VERIFICATION: { ar: "بانتظار التحقق", en: "Pending verification" },
  PAID: { ar: "مدفوع", en: "Paid" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  REFUNDED: { ar: "مسترد", en: "Refunded" },
};

export function orderStatusLabel(locale: Locale, status: string): string {
  const l = ORDER_STATUS_LABEL[status as OrderStatus];
  return l ? l[locale] : status;
}

export function paymentStatusLabel(locale: Locale, status: string): string {
  const l = PAYMENT_STATUS_LABEL[status as PaymentStatus];
  return l ? l[locale] : status;
}

/** Steps shown on the customer's tracking page. */
export function trackingSteps(fulfillment: string): OrderStatus[] {
  return fulfillment === "dine_in"
    ? ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"]
    : ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
}

/** Index of the current step, or -1 for cancelled orders. */
export function stepIndex(status: string, fulfillment: string): number {
  if (status === "CANCELLED") return -1;
  const steps = trackingSteps(fulfillment);
  if (status === "COMPLETED") return steps.length - 1;
  const idx = steps.indexOf(status as OrderStatus);
  return idx === -1 ? 0 : idx;
}

// ───────────────────────── selection rules ─────────────────────────

export type SelectableItem = {
  available: boolean;
  variants: { id: string; available: boolean }[];
  modifierGroups: {
    id: string;
    nameEn?: string;
    nameAr?: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    modifiers: { id: string }[];
  }[];
};

export type SelectionError =
  | { code: "item_unavailable" }
  | { code: "invalid_variant" }
  | { code: "variant_unavailable" }
  | { code: "invalid_modifier" }
  | { code: "too_many"; groupId: string; max: number }
  | { code: "too_few"; groupId: string; min: number };

export type SelectionResult =
  | { ok: true; variantId: string | undefined; modifierIds: string[] }
  | { ok: false; error: SelectionError };

/**
 * Validate a customer's choices against the item definition: availability, a real
 * (available) variant, only modifiers that belong to the item, and each group's
 * required / min / max rules.
 */
export function validateSelections(
  item: SelectableItem,
  variantId: string | null | undefined,
  modifierIds: string[],
): SelectionResult {
  if (!item.available) return { ok: false, error: { code: "item_unavailable" } };

  let chosenVariant: string | undefined;
  if (item.variants.length) {
    if (variantId) {
      const v = item.variants.find((x) => x.id === variantId);
      if (!v) return { ok: false, error: { code: "invalid_variant" } };
      if (!v.available) return { ok: false, error: { code: "variant_unavailable" } };
      chosenVariant = v.id;
    } else {
      const first = item.variants.find((x) => x.available);
      if (!first) return { ok: false, error: { code: "variant_unavailable" } };
      chosenVariant = first.id;
    }
  } else if (variantId) {
    return { ok: false, error: { code: "invalid_variant" } };
  }

  const unique = [...new Set(modifierIds)];
  const known = new Map<string, string>(); // modifierId -> groupId
  for (const g of item.modifierGroups) for (const m of g.modifiers) known.set(m.id, g.id);
  for (const id of unique) {
    if (!known.has(id)) return { ok: false, error: { code: "invalid_modifier" } };
  }

  for (const g of item.modifierGroups) {
    const count = unique.filter((id) => known.get(id) === g.id).length;
    if (g.maxSelect > 0 && count > g.maxSelect) {
      return { ok: false, error: { code: "too_many", groupId: g.id, max: g.maxSelect } };
    }
    const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
    if (count < min && (g.required || count > 0)) {
      return { ok: false, error: { code: "too_few", groupId: g.id, min } };
    }
  }

  return { ok: true, variantId: chosenVariant, modifierIds: unique };
}

export function selectionErrorMessage(locale: Locale, err: SelectionError, itemName = ""): string {
  const who = itemName ? `${itemName}: ` : "";
  switch (err.code) {
    case "item_unavailable":
      return who + (locale === "ar" ? "الصنف غير متاح حالياً" : "This item is currently unavailable");
    case "invalid_variant":
      return who + (locale === "ar" ? "الحجم المختار غير صحيح" : "Invalid size selected");
    case "variant_unavailable":
      return who + (locale === "ar" ? "الحجم المختار غير متاح" : "Selected size is unavailable");
    case "invalid_modifier":
      return who + (locale === "ar" ? "إضافة غير صحيحة" : "Invalid add-on");
    case "too_many":
      return who + (locale === "ar" ? `الحد الأقصى ${err.max} اختيارات` : `Choose at most ${err.max}`);
    case "too_few":
      return who + (locale === "ar" ? `اختر ${err.min} على الأقل` : `Choose at least ${err.min}`);
  }
}
