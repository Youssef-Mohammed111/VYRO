/** Small pure validators shared by server functions and forms. */

/** Only absolute https URLs — for links customers will click (maps, reviews, social). */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** "" / undefined pass (field is optional); anything else must be an https URL. */
export function isOptionalHttpsUrl(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return v === "" || isHttpsUrl(v);
}

/** Site-relative image paths (/tenants/x.jpg) or https URLs. */
export function isSafeImageRef(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (v === "") return true;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  return isHttpsUrl(v);
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Path-only redirect targets (open-redirect guard for ?redirect=). */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function isBase64(value: string): boolean {
  return value.length % 4 === 0 && B64.test(value);
}

/**
 * Sniff the real image type from the first bytes of a base64 payload. Never trust
 * the client-declared mime — proofs are shown to staff, so they must be real images.
 */
export function detectImageMime(base64: string): ImageMime | null {
  if (!isBase64(base64)) return null;
  let head: Uint8Array;
  try {
    const bin = atob(base64.slice(0, 32));
    head = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (
    head.length >= 8 &&
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    head.length >= 12 &&
    String.fromCharCode(head[0], head[1], head[2], head[3]) === "RIFF" &&
    String.fromCharCode(head[8], head[9], head[10], head[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Decoded byte size of a base64 string (exact, accounts for padding). */
export function base64ByteSize(base64: string): number {
  const pad = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - pad;
}

/** Readable foreground (#000 / #fff) for a hex background — used for tenant brand colors. */
export function contrastText(hex: string): "#000000" | "#ffffff" {
  if (!isHexColor(hex)) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (Rec. 601).
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isSlug(value: string): boolean {
  return value.length >= 1 && value.length <= 80 && SLUG_RE.test(value);
}
