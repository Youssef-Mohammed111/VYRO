import { toInternationalDigits } from "./phone.ts";

export type WhatsAppOrderInput = {
  locale: "ar" | "en";
  businessName: string;
  orderNumber: string;
  branch?: string | null;
  table?: string | null;
  customerName: string;
  customerPhone: string;
  items: {
    quantity: number;
    name: string;
    variant?: string | null;
    modifiers?: string[];
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
  currency: string;
  paymentName: string;
  paymentStatus: string;
  notes?: string | null;
  fulfillment?: string | null;
  address?: string | null;
};

export function buildWhatsAppOrderMessage(input: WhatsAppOrderInput): string {
  const ar = input.locale === "ar";
  const lines: string[] = [];
  lines.push("-------------------------");
  lines.push(ar ? "طلب جديد" : "NEW ORDER");
  lines.push("-------------------------");
  lines.push("");
  lines.push(`${ar ? "النشاط" : "Business"}: ${input.businessName}`);
  lines.push(`${ar ? "رقم الطلب" : "Order"}: #${input.orderNumber}`);
  if (input.branch) lines.push(`${ar ? "الفرع" : "Branch"}: ${input.branch}`);
  if (input.table) lines.push(`${ar ? "الطاولة" : "Table"}: ${input.table}`);
  lines.push("");
  lines.push(`${ar ? "العميل" : "Customer"}: ${input.customerName}`);
  lines.push(`${ar ? "الهاتف" : "Phone"}: ${input.customerPhone}`);
  if (input.fulfillment) {
    lines.push(`${ar ? "نوع الطلب" : "Type"}: ${input.fulfillment}`);
  }
  if (input.address) lines.push(`${ar ? "العنوان" : "Address"}: ${input.address}`);
  lines.push("");
  lines.push(ar ? "الأصناف:" : "Items:");
  lines.push("");
  for (const item of input.items) {
    lines.push(`${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`);
    for (const mod of item.modifiers ?? []) {
      lines.push(`   ${ar ? "إضافة" : "Add-on"}: ${mod}`);
    }
    lines.push(`   ${item.lineTotal} ${input.currency}`);
    lines.push("");
  }
  lines.push(`${ar ? "المجموع الفرعي" : "Subtotal"}: ${input.subtotal} ${input.currency}`);
  if (input.discount) {
    lines.push(`${ar ? "الخصم" : "Discount"}: ${input.discount} ${input.currency}`);
  }
  if (input.fees) {
    lines.push(`${ar ? "رسوم التوصيل" : "Delivery"}: ${input.fees} ${input.currency}`);
  }
  lines.push(`${ar ? "الإجمالي" : "TOTAL"}: ${input.total} ${input.currency}`);
  lines.push("");
  lines.push(`${ar ? "الدفع" : "Payment"}: ${input.paymentName}`);
  lines.push(`${ar ? "حالة الدفع" : "Payment status"}: ${input.paymentStatus}`);
  if (input.notes) {
    lines.push("");
    lines.push(`${ar ? "ملاحظات" : "Notes"}: ${input.notes}`);
  }
  lines.push("");
  lines.push("-------------------------");
  return lines.join("\n");
}

/**
 * Chat link to a specific number. Local Egyptian numbers (010…) are converted to
 * international format — wa.me rejects a leading 0. With no usable number it falls
 * back to the generic share link so the button never opens a dead URL.
 */
export function whatsappDeepLink(phone: string, message: string): string {
  const digits = toInternationalDigits(phone);
  if (!digits) return whatsappShareLink(message);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp's contact picker with the message prefilled (no fixed recipient). */
export function whatsappShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Message staff send a customer when the order moves (used by the "notify" button). */
export function orderStatusMessage(
  locale: "ar" | "en",
  business: string,
  orderNumber: string,
  statusText: string,
  trackUrl?: string,
): string {
  const head =
    locale === "ar"
      ? `${business} — طلبك #${orderNumber}: ${statusText}`
      : `${business} — your order #${orderNumber}: ${statusText}`;
  if (!trackUrl) return head;
  return `${head}\n${locale === "ar" ? "تابع طلبك" : "Track your order"}: ${trackUrl}`;
}

export function menuShareMessage(locale: "ar" | "en", business: string, url: string) {
  if (locale === "ar") return `شاهد منيو ${business}: ${url}`;
  return `View the ${business} menu: ${url}`;
}
