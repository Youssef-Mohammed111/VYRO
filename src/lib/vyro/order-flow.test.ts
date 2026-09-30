import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  isTerminalStatus,
  nextStatuses,
  orderStatusLabel,
  stepIndex,
  trackingSteps,
  validateSelections,
  type SelectableItem,
} from "./order-flow.ts";

const item: SelectableItem = {
  available: true,
  variants: [
    { id: "v1", available: false },
    { id: "v2", available: true },
  ],
  modifierGroups: [
    { id: "g1", required: false, minSelect: 0, maxSelect: 2, modifiers: [{ id: "m1" }, { id: "m2" }, { id: "m3" }] },
    { id: "g2", required: true, minSelect: 1, maxSelect: 1, modifiers: [{ id: "s1" }, { id: "s2" }] },
  ],
};

describe("status flow", () => {
  it("allows forward moves and cancellation, locks terminal states", () => {
    assert.equal(canTransition("PENDING", "CONFIRMED"), true);
    assert.equal(canTransition("PENDING", "COMPLETED"), false);
    assert.equal(canTransition("PREPARING", "CANCELLED"), true);
    assert.equal(canTransition("COMPLETED", "PENDING"), false);
    assert.equal(canTransition("CANCELLED", "CONFIRMED"), false);
    assert.deepEqual(nextStatuses("COMPLETED"), []);
    assert.equal(isTerminalStatus("CANCELLED"), true);
    assert.equal(isTerminalStatus("READY"), false);
  });
  it("maps steps per fulfillment", () => {
    assert.equal(trackingSteps("dine_in").at(-1), "SERVED");
    assert.equal(trackingSteps("delivery").at(-1), "COMPLETED");
    assert.equal(stepIndex("PREPARING", "pickup"), 2);
    assert.equal(stepIndex("COMPLETED", "dine_in"), 4);
    assert.equal(stepIndex("CANCELLED", "dine_in"), -1);
  });
  it("labels in both languages and falls back to the raw value", () => {
    assert.equal(orderStatusLabel("ar", "PREPARING"), "قيد التحضير");
    assert.equal(orderStatusLabel("en", "PREPARING"), "Preparing");
    assert.equal(orderStatusLabel("en", "WEIRD"), "WEIRD");
  });
});

describe("validateSelections", () => {
  it("rejects unavailable items", () => {
    const r = validateSelections({ ...item, available: false }, "v2", ["s1"]);
    assert.deepEqual(r, { ok: false, error: { code: "item_unavailable" } });
  });
  it("defaults to the first AVAILABLE variant", () => {
    const r = validateSelections(item, undefined, ["s1"]);
    assert.equal(r.ok && r.variantId, "v2");
  });
  it("rejects unknown or unavailable variants", () => {
    assert.equal(validateSelections(item, "nope", ["s1"]).ok, false);
    const r = validateSelections(item, "v1", ["s1"]);
    assert.deepEqual(r, { ok: false, error: { code: "variant_unavailable" } });
  });
  it("rejects a variant on an item that has none", () => {
    const plain: SelectableItem = { available: true, variants: [], modifierGroups: [] };
    assert.equal(validateSelections(plain, "v9", []).ok, false);
    assert.equal(validateSelections(plain, undefined, []).ok, true);
  });
  it("rejects modifiers that are not part of the item", () => {
    const r = validateSelections(item, "v2", ["s1", "zzz"]);
    assert.deepEqual(r, { ok: false, error: { code: "invalid_modifier" } });
  });
  it("enforces max and required groups", () => {
    const tooMany = validateSelections(item, "v2", ["s1", "m1", "m2", "m3"]);
    assert.deepEqual(tooMany, { ok: false, error: { code: "too_many", groupId: "g1", max: 2 } });
    const missing = validateSelections(item, "v2", ["m1"]);
    assert.deepEqual(missing, { ok: false, error: { code: "too_few", groupId: "g2", min: 1 } });
    const two = validateSelections(item, "v2", ["s1", "s2"]);
    assert.deepEqual(two, { ok: false, error: { code: "too_many", groupId: "g2", max: 1 } });
  });
  it("dedupes repeated modifier ids", () => {
    const r = validateSelections(item, "v2", ["s1", "s1", "m1", "m1"]);
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok && r.modifierIds, ["s1", "m1"]);
  });
});
