import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, timeAgo } from "./notify.ts";

describe("notify helpers", () => {
  it("escapes html so customer text can't inject markup into printed tickets", () => {
    assert.equal(escapeHtml(`<img src=x onerror="alert('1')">&`), "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;");
    assert.equal(escapeHtml(null), "");
  });
  it("formats relative time in both languages", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    assert.equal(timeAgo("2026-01-01T11:59:40Z", "en", now), "just now");
    assert.equal(timeAgo("2026-01-01T11:55:00Z", "en", now), "5m ago");
    assert.equal(timeAgo("2026-01-01T09:00:00Z", "en", now), "3h ago");
    assert.equal(timeAgo("2025-12-30T12:00:00Z", "ar", now), "منذ 2 يوم");
  });
});
