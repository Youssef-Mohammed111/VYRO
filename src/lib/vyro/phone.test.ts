import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPlausiblePhone, toE164, toInternationalDigits } from "./phone.ts";

describe("phone", () => {
  it("converts local Egyptian numbers to international digits", () => {
    assert.equal(toInternationalDigits("01050034183"), "201050034183");
    assert.equal(toInternationalDigits("010 5003 4183"), "201050034183");
  });
  it("keeps numbers that already carry a country code", () => {
    assert.equal(toInternationalDigits("+201275177305"), "201275177305");
    assert.equal(toInternationalDigits("00201275177305"), "201275177305");
    assert.equal(toInternationalDigits("201275177305"), "201275177305");
  });
  it("handles empty / junk input", () => {
    assert.equal(toInternationalDigits(""), "");
    assert.equal(toInternationalDigits("abc"), "");
    assert.equal(toE164(""), "");
    assert.equal(toE164("01050034183"), "+201050034183");
  });
  it("checks plausibility", () => {
    assert.equal(isPlausiblePhone("01050034183"), true);
    assert.equal(isPlausiblePhone("123"), false);
    assert.equal(isPlausiblePhone("1".repeat(16)), false);
  });
});
