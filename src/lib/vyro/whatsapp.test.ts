import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWhatsAppOrderMessage, whatsappDeepLink } from "./whatsapp.ts";

describe("whatsapp", () => {
  it("builds a readable Arabic order and a wa.me link", () => {
    const msg = buildWhatsAppOrderMessage({
      locale: "ar",
      businessName: "RPM — Really Powerful Meals",
      orderNumber: "RPM-000001",
      table: "12",
      customerName: "Ahmed",
      customerPhone: "01012345678",
      items: [
        {
          quantity: 1,
          name: "V8 Classic",
          variant: "125 G",
          modifiers: ["جبنة إضافية"],
          lineTotal: 140,
        },
      ],
      subtotal: 140,
      discount: 0,
      fees: 0,
      total: 140,
      currency: "EGP",
      paymentName: "InstaPay",
      paymentStatus: "Pending verification",
    });
    assert.match(msg, /RPM-000001/);
    assert.match(msg, /V8 Classic/);
    assert.match(msg, /الطاولة: 12/);
    const url = whatsappDeepLink("+201275177305", msg);
    assert.ok(url.startsWith("https://wa.me/201275177305?text="));
    assert.ok(!url.includes("javascript:"));
  });
});

describe("whatsapp links", () => {
  it("converts local Egyptian numbers", async () => {
    const { whatsappDeepLink, whatsappShareLink, orderStatusMessage } = await import("./whatsapp.ts");
    assert.ok(whatsappDeepLink("01050034183", "hi").startsWith("https://wa.me/201050034183?text="));
    assert.ok(whatsappDeepLink("", "hi").startsWith("https://wa.me/?text="));
    assert.ok(whatsappShareLink("a b").endsWith("a%20b"));
    const msg = orderStatusMessage("en", "RPM", "RPM-000009", "Ready", "https://x.test/o/1");
    assert.match(msg, /RPM-000009/);
    assert.match(msg, /https:\/\/x\.test\/o\/1/);
  });
});
