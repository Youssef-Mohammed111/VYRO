/**
 * Opening hours (pure). Stored as JSON: { sun: "12:00–02:00", mon: "closed", ... }.
 * Ranges may cross midnight (12:00–02:00 means open until 2 AM the next day).
 */

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type HoursMap = Partial<Record<DayKey, string>>;

export const DAY_LABEL: Record<DayKey, { ar: string; en: string }> = {
  sun: { ar: "الأحد", en: "Sunday" },
  mon: { ar: "الإثنين", en: "Monday" },
  tue: { ar: "الثلاثاء", en: "Tuesday" },
  wed: { ar: "الأربعاء", en: "Wednesday" },
  thu: { ar: "الخميس", en: "Thursday" },
  fri: { ar: "الجمعة", en: "Friday" },
  sat: { ar: "السبت", en: "Saturday" },
};

export function parseHours(json: string | null | undefined): HoursMap {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "{}");
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const out: HoursMap = {};
  for (const key of DAY_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v.trim();
  }
  return out;
}

const CLOSED = new Set(["closed", "off", "مغلق", "اجازة", "إجازة"]);

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59 || h > 24 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

export type Range = { open: number; close: number };

/** null = closed all day (or unparseable). close may be < open for overnight ranges. */
export function parseRange(text: string | undefined): Range | null {
  const t = (text ?? "").trim().toLowerCase();
  if (!t || CLOSED.has(t)) return null;
  if (t === "24h" || t === "24/7" || t === "24 hours") return { open: 0, close: 1440 };
  const parts = t.split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return null;
  const open = toMinutes(parts[0]);
  const close = toMinutes(parts[1]);
  if (open === null || close === null || open === close) return null;
  return { open, close };
}

/** Day index (0 = Sunday) and minutes since midnight in the given IANA time zone. */
export function localParts(now: Date, timeZone = "Africa/Cairo"): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { day: dayIdx < 0 ? 0 : dayIdx, minutes: hour * 60 + minute };
}

/**
 * true / false, or null when no hours are configured at all (unknown — don't claim
 * "closed" for a business that never filled the schedule in).
 */
export function isOpenNow(hours: HoursMap, now: Date, timeZone = "Africa/Cairo"): boolean | null {
  const configured = DAY_KEYS.some((k) => (hours[k] ?? "") !== "");
  if (!configured) return null;
  const { day, minutes } = localParts(now, timeZone);
  const today = parseRange(hours[DAY_KEYS[day]]);
  if (today) {
    if (today.close > today.open) {
      if (minutes >= today.open && minutes < today.close) return true;
    } else if (minutes >= today.open) {
      return true; // overnight range, evening part
    }
  }
  const yesterday = parseRange(hours[DAY_KEYS[(day + 6) % 7]]);
  if (yesterday && yesterday.close < yesterday.open && minutes < yesterday.close) return true;
  return false;
}

export function todayText(hours: HoursMap, now: Date, timeZone = "Africa/Cairo"): string | null {
  const { day } = localParts(now, timeZone);
  const v = hours[DAY_KEYS[day]];
  return v ? v : null;
}

/** Validate a user-entered range for the editor ("" = leave unset, "closed" allowed). */
export function isValidRangeInput(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t === "" || CLOSED.has(t) || t === "24h") return true;
  return parseRange(t) !== null;
}

/** YYYY-MM-DD for an instant in the given IANA time zone (used to bucket orders by local day). */
export function localDateKey(date: Date, timeZone = "Africa/Cairo"): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** The last `days` local day keys ending today, oldest first. */
export function lastDayKeys(now: Date, days: number, timeZone = "Africa/Cairo"): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Step back by whole 24h periods, then read the local date; DST shifts of an hour can
    // never move a noon-anchored instant across a day boundary.
    const anchor = new Date(now.getTime() - i * 86_400_000);
    out.push(localDateKey(anchor, timeZone));
  }
  return out;
}
