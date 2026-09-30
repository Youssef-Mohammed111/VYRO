import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeLine, computeTotals, paymentUrlIsSafe } from "./commerce.ts";

describe("computeLine", () => {
  it("adds modifier deltas and multiplies quantity", () => {
    const line = computeLine({
      itemId: "a",
      unitPrice: 125,
      quantity: 2,
      modifiers: [
        { id: "c", nameEn: "Cheese", nameAr: "جبنة", priceDelta: 15 },
        { id: "s", nameEn: "Sauce", nameAr: "صوص", priceDelta: 10 },
      ],
    });
    assert.equal(line.unit, 150);
    assert.equal(line.lineTotal, 300);
  });

  it("floors quantity and ignores negative qty", () => {
    const line = computeLine({ itemId: "a", unitPrice: 30, quantity: -2 });
    assert.equal(line.quantity, 0);
    assert.equal(line.lineTotal, 0);
  });
});

describe("computeTotals", () => {
  it("applies amount + percent discount and delivery", () => {
    const totals = computeTotals({
      lines: [{ unit: 100, quantity: 2, lineTotal: 200 }],
      discountAmount: 10,
      discountPercent: 10,
      deliveryFee: 30,
    });
    assert.equal(totals.subtotal, 200);
    assert.equal(totals.discount, 30);
    assert.equal(totals.fees, 30);
    assert.equal(totals.total, 200);
  });

  it("never discounts below zero", () => {
    const totals = computeTotals({
      lines: [{ unit: 50, quantity: 1, lineTotal: 50 }],
      discountAmount: 80,
    });
    assert.equal(totals.discount, 50);
    assert.equal(totals.total, 0);
  });
});

describe("paymentUrlIsSafe", () => {
  it("allows http(s) and rejects javascript", () => {
    assert.equal(paymentUrlIsSafe("https://ipn.eg/S/demo"), true);
    assert.equal(paymentUrlIsSafe("http://vf.eg/vfcash?id=1"), true);
    assert.equal(paymentUrlIsSafe("javascript:alert(1)"), false);
    assert.equal(paymentUrlIsSafe("data:text/html,hi"), false);
  });
});

describe("hardening", () => {
  it("treats NaN quantity and negative modifiers safely", () => {
    const nan = computeLine({ itemId: "a", unitPrice: 50, quantity: Number.NaN });
    assert.equal(nan.quantity, 0);
    assert.equal(nan.lineTotal, 0);
    const neg = computeLine({
      itemId: "a",
      unitPrice: 10,
      quantity: 2,
      modifiers: [{ id: "x", nameEn: "x", nameAr: "x", priceDelta: -50 }],
    });
    assert.equal(neg.unit, 0);
    assert.equal(neg.lineTotal, 0);
  });
});
