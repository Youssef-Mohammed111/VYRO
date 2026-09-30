import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  base64ByteSize,
  detectImageMime,
  isHexColor,
  isHttpsUrl,
  isOptionalHttpsUrl,
  isSafeImageRef,
  safeRedirectPath,
} from "./validation.ts";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const WEBP = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

describe("urls", () => {
  it("accepts only https for public links", () => {
    assert.equal(isHttpsUrl("https://maps.google.com/?q=x"), true);
    assert.equal(isHttpsUrl("http://example.com"), false);
    assert.equal(isHttpsUrl("javascript:alert(1)"), false);
    assert.equal(isHttpsUrl("not a url"), false);
    assert.equal(isOptionalHttpsUrl(""), true);
    assert.equal(isOptionalHttpsUrl("  "), true);
    assert.equal(isOptionalHttpsUrl("javascript:alert(1)"), false);
  });
  it("validates image refs", () => {
    assert.equal(isSafeImageRef(""), true);
    assert.equal(isSafeImageRef("/tenants/rpm/logo.jpg"), true);
    assert.equal(isSafeImageRef("https://cdn.example.com/a.png"), true);
    assert.equal(isSafeImageRef("//evil.com/a.png"), false);
    assert.equal(isSafeImageRef("data:image/svg+xml;base64,AAAA"), false);
    assert.equal(isSafeImageRef("http://example.com/a.png"), false);
  });
  it("validates hex colors", () => {
    assert.equal(isHexColor("#e10600"), true);
    assert.equal(isHexColor("e10600"), false);
    assert.equal(isHexColor("#fff"), false);
    assert.equal(isHexColor("red;background:url(x)"), false);
  });
  it("only allows same-site redirect paths", () => {
    assert.equal(safeRedirectPath("/dashboard/orders"), "/dashboard/orders");
    assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("https://evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("/\\evil.com"), "/dashboard");
    assert.equal(safeRedirectPath(undefined, "/x"), "/x");
  });
});

describe("image sniffing", () => {
  it("detects real image types from magic bytes", () => {
    assert.equal(detectImageMime(PNG), "image/png");
    assert.equal(detectImageMime(JPEG), "image/jpeg");
    assert.equal(detectImageMime(WEBP), "image/webp");
  });
  it("rejects non-images and bad base64", () => {
    assert.equal(detectImageMime(btoa("<html><script>alert(1)</script></html>")), null);
    assert.equal(detectImageMime(btoa("GIF89a....................")), null);
    assert.equal(detectImageMime("not base64!!"), null);
    assert.equal(detectImageMime("data:image/png;base64,AAAA"), null);
  });
  it("computes decoded size", () => {
    assert.equal(base64ByteSize(btoa("abc")), 3);
    assert.equal(base64ByteSize(btoa("ab")), 2);
    assert.equal(base64ByteSize(btoa("a")), 1);
  });
});

describe("misc", () => {
  it("picks readable text for brand colors", async () => {
    const { contrastText, isSlug } = await import("./validation.ts");
    assert.equal(contrastText("#e10600"), "#ffffff");
    assert.equal(contrastText("#ffd60a"), "#000000");
    assert.equal(contrastText("nope"), "#ffffff");
    assert.equal(isSlug("v8-classic"), true);
    assert.equal(isSlug("2000-cc"), true);
    assert.equal(isSlug("Bad Slug"), false);
    assert.equal(isSlug("-x"), false);
    assert.equal(isSlug("a--b"), false);
  });
});
