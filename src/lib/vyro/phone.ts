/**
 * Phone helpers (pure). Egypt-first: local numbers like 010xxxxxxxx become
 * international (2010xxxxxxxx) because wa.me links require a country code and
 * reject a leading 0.
 */

const DEFAULT_COUNTRY_CODE = "20";

/** Digits only, in international format without "+" or leading zeros. */
export function toInternationalDigits(input: string, countryCode = DEFAULT_COUNTRY_CODE): string {
  let digits = String(input ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  return digits;
}

/** True for 8–15 digit numbers (E.164 upper bound is 15). */
export function isPlausiblePhone(input: string): boolean {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/** Same as {@link toInternationalDigits} but keeps a leading "+", for display / tel: links. */
export function toE164(input: string, countryCode = DEFAULT_COUNTRY_CODE): string {
  const digits = toInternationalDigits(input, countryCode);
  return digits ? `+${digits}` : "";
}
