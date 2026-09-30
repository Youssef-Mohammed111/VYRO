import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = "EGP") {
  return `${amount.toLocaleString("en-EG")} ${currency}`;
}

export function formatMoneyAr(amount: number, currency = "EGP") {
  return `${amount.toLocaleString("ar-EG")} ${currency}`;
}

export function pickLocale<T>(locale: "ar" | "en", ar: T, en: T): T {
  return locale === "ar" ? ar : en;
}
