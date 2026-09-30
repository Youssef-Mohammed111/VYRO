import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./types";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
};

export const useLocale = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "ar",
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === "ar" ? "en" : "ar" }),
    }),
    { name: "vyro-locale" },
  ),
);

export function t(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
}

export const ui = {
  // Nav
  home: { ar: "الرئيسية", en: "Home" },
  platform: { ar: "المنصة", en: "Platform" },
  solutions: { ar: "الحلول", en: "Solutions" },
  industries: { ar: "القطاعات", en: "Industries" },
  liveDemo: { ar: "تجربة حية", en: "Live Demo" },
  pricing: { ar: "الأسعار", en: "Pricing" },
  about: { ar: "عنا", en: "About" },
  contact: { ar: "تواصل", en: "Contact" },
  requestDemo: { ar: "اطلب عرضًا", en: "Request a Demo" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  language: { ar: "اللغة", en: "Language" },
  arabic: { ar: "عربي", en: "Arabic" },
  english: { ar: "English", en: "English" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  call: { ar: "اتصال", en: "Call" },
  email: { ar: "إيميل", en: "Email" },
  footerBlurb: {
    ar: "منصة تقنية للحضور الرقمي والطلبات وQR/NFC والتشغيل — بدون تسليم الكود المصدري للنشاط.",
    en: "Technology platform for digital presence, ordering, QR/NFC and operations — without handing businesses the source code.",
  },
  product: { ar: "المنتج", en: "Product" },
  company: { ar: "الشركة", en: "Company" },
  contactCta: { ar: "تواصل", en: "Contact" },

  // Home hero
  heroBody: {
    ar: "مواقع رقمية، كتالوج، طلبات، QR/NFC، تذاكر واتساب وتشغيل — منصة واحدة، مستأجرون كثر، وقوالب تحت سيطرتك.",
    en: "Digital websites, catalogs, ordering, QR/NFC, WhatsApp tickets and operations — one core platform, many tenants, templates you control.",
  },
  explorePlatform: { ar: "استكشف المنصة", en: "Explore Platform" },
  viewLiveDemo: { ar: "شاهد التجربة الحية", en: "View Live Demo" },
  whatsappVyro: { ar: "واتساب VYRO", en: "WhatsApp VYRO" },
  hierarchyTitle: { ar: "تسلسل المنصة", en: "PLATFORM HIERARCHY" },
  hierarchyTenant: { ar: "النشاط / المستأجر", en: "Business / Tenant" },
  hierarchyTenantBody: { ar: "تجربة عامة بهوية النشاط", en: "Branded public experience" },
  hierarchyRpm: { ar: "RPM — وجبات قوية فعلاً", en: "RPM — Really Powerful Meals" },
  hierarchyRpmBody: { ar: "أول مستأجر مطعم", en: "First restaurant tenant" },
  hierarchyOrder: { ar: "طلب العميل", en: "Customer ordering" },
  hierarchyOrderBody: { ar: "منيو، QR، واتساب، ومدفوعات", en: "Menu, QR, WhatsApp, payments" },
  whatVyroDoes: { ar: "ماذا تفعل VYRO", en: "WHAT VYRO DOES" },
  whatVyroTitle: {
    ar: "طبقة تشغيل رقمية للأنشطة الحقيقية.",
    en: "A digital operating layer for real businesses.",
  },
  whatVyroBody: {
    ar: "VYRO ليست منشئ مواقع بالسحب والإفلات. المستأجر يعدّل المحتوى المسموح به. الهيكل والقوالب وقواعد المنصة تبقى مع VYRO.",
    en: "VYRO is not a drag-and-drop website builder. Tenants edit the content we allow. Structure, templates and platform rules stay with VYRO.",
  },
  featTemplates: { ar: "قوالب حسب القطاع", en: "Industry templates" },
  featTemplatesBody: {
    ar: "مطعم، كافيه، صالون، عيادة، جيم، تجزئة والمزيد — كل قالب بلغة تصميمه.",
    en: "Restaurant, café, salon, clinic, gym, retail and more — each with its own layout language.",
  },
  featOrdering: { ar: "طلبات تُغلق فعليًا", en: "Ordering that closes" },
  featOrderingBody: {
    ar: "كتالوج، سلة، دفع، مراجعة إثبات، وتذكرة واتساب.",
    en: "Catalog, cart, checkout, payment methods, proof review and WhatsApp order tickets.",
  },
  featQr: { ar: "QR وNFC تدوم", en: "QR & NFC that last" },
  featQrBody: {
    ar: "الأكواد المطبوعة تفضل شغالة حتى لو تغيّر القالب. الوجهة ديناميكية.",
    en: "Printed codes stay valid when the template changes. Destinations are dynamic.",
  },
  featOps: { ar: "لوحة تشغيل", en: "Operations dashboard" },
  featOpsBody: {
    ar: "طلبات، موظفين، فروع، تحليلات ودعم — دائمًا داخل مستأجر واحد.",
    en: "Orders, staff, branches, analytics and support — scoped to one tenant, always.",
  },
  featIsolation: { ar: "عزل المستأجرين", en: "Tenant isolation" },
  featIsolationBody: {
    ar: "عزل على السيرفر. مفيش اعتماد على فلترة الواجهة كحماية.",
    en: "Server-side tenancy. No frontend filtering as a security boundary.",
  },
  featSubs: { ar: "اشتراكات تناسبك", en: "Subscriptions that fit" },
  featSubsBody: {
    ar: "باقات وميزات وحدود قابلة للضبط. تفعيل يدوي لحد ربط بوابة دفع.",
    en: "Configurable plans, feature flags and limits. Manual activation until a gateway is connected.",
  },
  featuredTenant: { ar: "مستأجر مميز", en: "FEATURED TENANT" },
  rpmBody: {
    ar: "أول مطعم على VYRO. تصفّح منيو الفحم، أضف V8 Classic، ادفع، وأنشئ تذكرة واتساب. عربي وإنجليزي — تجربة حية مش صور.",
    en: "First restaurant tenant on VYRO. Browse the charcoal menu, add a V8 Classic, checkout, generate a WhatsApp ticket. Arabic and English. This is the live tenant — not a screenshot gallery.",
  },
  launchRpm: { ar: "افتح RPM", en: "Launch RPM" },
  demoOverview: { ar: "نظرة على التجربة", en: "Demo overview" },
  howItWorks: { ar: "كيف تعمل", en: "How it works" },
  step1: { ar: "تعرّف على VYRO", en: "Discover VYRO" },
  step2: { ar: "نجهّز المستأجر", en: "We configure the tenant" },
  step3: { ar: "النشاط يعدّل المحتوى", en: "Business edits content" },
  step4: { ar: "العملاء يطلبون", en: "Customers order" },

  // Login
  loginTitle: { ar: "دخول لوحة التحكم", en: "Enter the platform" },
  createAccountTitle: { ar: "إنشاء حساب", en: "Create account" },
  loginSubtitle: {
    ar: "لوحة Super Admin ولوحة المستأجر بنفس تسجيل الدخول الآمن.",
    en: "Super Admin and tenant dashboards use the same secure sign-in.",
  },
  emailLabel: { ar: "البريد الإلكتروني", en: "Email" },
  passwordLabel: { ar: "كلمة المرور", en: "Password" },
  nameLabel: { ar: "الاسم", en: "Name" },
  createAccount: { ar: "إنشاء حساب", en: "Create account" },
  needAccount: { ar: "محتاج حساب؟ أنشئ واحد", en: "Need an account? Create one" },
  haveAccount: { ar: "عندك حساب؟ سجّل دخول", en: "Have an account? Sign in" },
  pleaseWait: { ar: "انتظر…", en: "Please wait…" },
  orEmail: { ar: "أو بالإيميل", en: "or email" },
  continueWith: { ar: "متابعة عبر", en: "Continue with" },
  signInDisabled: { ar: "تسجيل الدخول معطّل.", en: "Sign-in is disabled." },
  backHome: { ar: "العودة للرئيسية", en: "Back to home" },

  // Dashboard / admin
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  currentBusiness: { ar: "النشاط الحالي", en: "Current business" },
  viewPublic: { ar: "الموقع العام", en: "View public site" },
  overview: { ar: "نظرة عامة", en: "Overview" },
  businessProfile: { ar: "ملف النشاط", en: "Business Profile" },
  branding: { ar: "الهوية", en: "Branding" },
  catalog: { ar: "الكتالوج / المنيو", en: "Catalog / Menu" },
  categories: { ar: "التصنيفات", en: "Categories" },
  offers: { ar: "العروض", en: "Offers" },
  orders: { ar: "الطلبات", en: "Orders" },
  branches: { ar: "الفروع", en: "Branches" },
  qrNfc: { ar: "QR / NFC", en: "QR / NFC" },
  payments: { ar: "المدفوعات", en: "Payments" },
  whatsappNav: { ar: "واتساب", en: "WhatsApp" },
  analytics: { ar: "التحليلات", en: "Analytics" },
  staff: { ar: "الموظفون", en: "Staff" },
  subscription: { ar: "الاشتراك", en: "Subscription" },
  settings: { ar: "الإعدادات", en: "Settings" },
  support: { ar: "الدعم", en: "Support" },
  admin: { ar: "إدارة المنصة", en: "Admin" },
  tenants: { ar: "المستأجرون", en: "Tenants" },
  templates: { ar: "القوالب", en: "Templates" },
  plans: { ar: "الباقات", en: "Plans" },
  auditLogs: { ar: "سجل المراجعة", en: "Audit logs" },
  diagnostics: { ar: "التشخيص", en: "Diagnostics" },
  tenantLink: { ar: "لوحة المستأجر", en: "Tenant" },
  menu: { ar: "المنيو", en: "Menu" },
  location: { ar: "الموقع", en: "Location" },
  cart: { ar: "السلة", en: "Cart" },
  poweredBy: { ar: "مدعوم بواسطة VYRO", en: "Powered by VYRO" },
} as const;

export type UiKey = keyof typeof ui;

export function tr(locale: Locale, key: UiKey): string {
  const entry = ui[key];
  return locale === "ar" ? entry.ar : entry.en;
}
