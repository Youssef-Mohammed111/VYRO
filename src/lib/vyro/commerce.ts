/** Integer EGP amounts. Never use floats for money. */

export type CartModifier = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number;
};

export type CartLineInput = {
  itemId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  modifiers?: CartModifier[];
};

export type LineComputation = {
  unit: number;
  quantity: number;
  lineTotal: number;
};

/** Hard cap per cart line — enforced identically by the UI and the server. */
export const MAX_LINE_QTY = 20;

function safeInt(n: number): number {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function computeLine(input: CartLineInput): LineComputation {
  const qty = Math.max(0, safeInt(input.quantity));
  const extras = (input.modifiers ?? []).reduce((sum, m) => sum + safeInt(m.priceDelta), 0);
  // A negative modifier must never push a unit price below zero.
  const unit = Math.max(0, safeInt(input.unitPrice) + extras);
  return { unit, quantity: qty, lineTotal: unit * qty };
}

export type TotalsInput = {
  lines: LineComputation[];
  discountAmount?: number;
  discountPercent?: number;
  deliveryFee?: number;
};

export type CartTotals = {
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
};

export function computeTotals(input: TotalsInput): CartTotals {
  const subtotal = input.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let discount = Math.max(0, safeInt(input.discountAmount ?? 0));
  if (input.discountPercent && input.discountPercent > 0) {
    discount += Math.round((subtotal * input.discountPercent) / 100);
  }
  if (discount > subtotal) discount = subtotal;
  const fees = Math.max(0, safeInt(input.deliveryFee ?? 0));
  return { subtotal, discount, fees, total: subtotal - discount + fees };
}

export function isOfferLive(now: Date, start?: Date | string | null, end?: Date | string | null) {
  const t = now.getTime();
  if (start && new Date(start).getTime() > t) return false;
  if (end && new Date(end).getTime() < t) return false;
  return true;
}

export function paymentUrlIsSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
