/** Central VYRO platform identity. Never confuse with tenant branding (e.g. RPM). */

export const PLATFORM_BRAND = {
  name: "VYRO",
  tagline: "Digital Business Platform",
  slogan: "One platform. Every business.",
  heroLine: "Build Your Business Digitally.",
  owner: "Eng. Youssef Mohammed",
  logoUrl: "/brands/vyro/logo.png",
  markUrl: "/brands/vyro/mark.png",
  iconUrl: "/brands/vyro/icon.png",
  faviconUrl: "/favicon.svg",
  primaryColor: "#1A8CFF",
  accentColor: "#1A8CFF",
  backgroundColor: "#050507",
  foregroundColor: "#F2F4F7",
  silverColor: "#C8D0DC",
  contact: {
    email: "vyro.techpro1@gmail.com",
    phone: "01050034183",
    phoneE164: "+201050034183",
    whatsapp: "201050034183",
  },
} as const;

export type PlatformBrand = typeof PLATFORM_BRAND;
