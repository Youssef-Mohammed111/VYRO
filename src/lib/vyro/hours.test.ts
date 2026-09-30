import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOpenNow, isValidRangeInput, localParts, parseHours, parseRange, todayText } from "./hours.ts";

// Cairo is UTC+2 in winter (Jan 2026 — no DST) so 10:00Z is 12:00 local.
const at = (iso: string) => new Date(iso);
const allDays = (v: string) => JSON.stringify({ sun: v, mon: v, tue: v, wed: v, thu: v, fri: v, sat: v });

describe("parseRange", () => {
  it("parses en dash, hyphen and spaced ranges", () => {
    assert.deepEqual(parseRange("12:00–02:00"), { open: 720, close: 120 });
    assert.deepEqual(parseRange("09:30 - 17:00"), { open: 570, close: 1020 });
    assert.deepEqual(parseRange("24h"), { open: 0, close: 1440 });
  });
  it("treats closed and junk as null", () => {
    assert.equal(parseRange("closed"), null);
    assert.equal(parseRange("مغلق"), null);
    assert.equal(parseRange(""), null);
    assert.equal(parseRange("soon"), null);
    assert.equal(parseRange("10:00–10:00"), null);
    assert.equal(parseRange("25:00–26:00"), null);
  });
  it("validates editor input", () => {
    assert.equal(isValidRangeInput(""), true);
    assert.equal(isValidRangeInput("closed"), true);
    assert.equal(isValidRangeInput("10:00–22:00"), true);
    assert.equal(isValidRangeInput("ten to ten"), false);
  });
});

describe("parseHours", () => {
  it("ignores unknown keys, bad JSON and non-strings", () => {
    assert.deepEqual(parseHours("nope"), {});
    assert.deepEqual(parseHours(JSON.stringify({ sun: "10:00–12:00", x: "1", mon: 5 })), { sun: "10:00–12:00" });
  });
});

describe("isOpenNow", () => {
  it("returns null when nothing is configured", () => {
    assert.equal(isOpenNow({}, at("2026-01-10T10:00:00Z")), null);
  });
  it("handles a normal day range in Cairo time", () => {
    const h = parseHours(allDays("10:00–22:00"));
    assert.equal(isOpenNow(h, at("2026-01-10T08:30:00Z")), true); // 10:30 Cairo
    assert.equal(isOpenNow(h, at("2026-01-10T07:30:00Z")), false); // 09:30 Cairo
    assert.equal(isOpenNow(h, at("2026-01-10T20:30:00Z")), false); // 22:30 Cairo
  });
  it("handles overnight ranges (12:00–02:00)", () => {
    const h = parseHours(allDays("12:00–02:00"));
    assert.equal(isOpenNow(h, at("2026-01-10T10:00:00Z")), true); // 12:00 Cairo
    assert.equal(isOpenNow(h, at("2026-01-10T22:30:00Z")), true); // 00:30 Cairo (next day, from yesterday's range)
    assert.equal(isOpenNow(h, at("2026-01-11T00:30:00Z")), false); // 02:30 Cairo
    assert.equal(isOpenNow(h, at("2026-01-10T09:00:00Z")), false); // 11:00 Cairo
  });
  it("respects closed days", () => {
    const h = parseHours(JSON.stringify({ sat: "closed", sun: "10:00–22:00" }));
    // 2026-01-10 is a Saturday
    assert.equal(isOpenNow(h, at("2026-01-10T10:00:00Z")), false);
  });
  it("reports local day/time and today's text", () => {
    const p = localParts(at("2026-01-10T22:30:00Z"), "Africa/Cairo"); // Sun 00:30 Cairo
    assert.equal(p.day, 0);
    assert.equal(p.minutes, 30);
    assert.equal(todayText({ sun: "10:00–12:00" }, at("2026-01-10T22:30:00Z")), "10:00–12:00");
  });
});

describe("local date keys", () => {
  it("buckets by local (Cairo) day, not UTC", async () => {
    const { localDateKey, lastDayKeys } = await import("./hours.ts");
    // 22:30Z on Jan 10 is 00:30 on Jan 11 in Cairo.
    assert.equal(localDateKey(new Date("2026-01-10T22:30:00Z")), "2026-01-11");
    assert.equal(localDateKey(new Date("2026-01-10T21:30:00Z")), "2026-01-10");
    const keys = lastDayKeys(new Date("2026-01-10T22:30:00Z"), 3);
    assert.deepEqual(keys, ["2026-01-09", "2026-01-10", "2026-01-11"]);
  });
});
