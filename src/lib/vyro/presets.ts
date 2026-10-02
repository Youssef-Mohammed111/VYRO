// Industry presets: each template family maps to a storefront layout, a theme,
// the vocabulary of that business, and starter content for new clients.

export type StoreKind = "food" | "retail" | "service" | "showcase";

export type Theme = {
  bg: string;
  surface: string;
  elevated: string;
  fg: string;
  muted: string;
  subtle: string;
  border: string;
  primary: string;
  primaryFg: string;
};

type Cat = { slug: string; ar: string; en: string };
type Item = {
  cat: string;
  slug: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  price: number;
  compareAt?: number;
  featured?: boolean;
};

export type Preset = {
  kind: StoreKind;
  labelAr: string;
  labelEn: string;
  theme: Theme | null;
  catalogAr: string;
  catalogEn: string;
  ctaAr: string;
  ctaEn: string;
  addAr: string;
  addEn: string;
  featuredAr: string;
  featuredEn: string;
  itemKind: "product" | "service" | "listing";
  cats: Cat[];
  items: Item[];
};

const light = (primary: string, bg: string, fg: string, primaryFg = "#ffffff"): Theme => ({
  bg,
  surface: "#ffffff",
  elevated: "#eef1f4",
  fg,
  muted: "#5b6572",
  subtle: "#8a93a0",
  border: "#dde2e8",
  primary,
  primaryFg,
});

const dark = (primary: string, bg: string, primaryFg = "#ffffff"): Theme => ({
  bg,
  surface: "#14161b",
  elevated: "#1d2027",
  fg: "#f3f4f6",
  muted: "#a0a7b4",
  subtle: "#6f7685",
  border: "#262a33",
  primary,
  primaryFg,
});

const FOOD = {
  kind: "food" as const,
  labelAr: "مطاعم وكافيهات",
  labelEn: "Food & drink",
  catalogAr: "المنيو",
  catalogEn: "Menu",
  ctaAr: "اطلب الآن",
  ctaEn: "Order now",
  addAr: "أضف إلى السلة",
  addEn: "Add to cart",
  featuredAr: "الأكثر طلباً",
  featuredEn: "Featured",
  itemKind: "product" as const,
};
const RETAIL = {
  kind: "retail" as const,
  labelAr: "تجزئة وسوبر ماركت",
  labelEn: "Retail & grocery",
  catalogAr: "المنتجات",
  catalogEn: "Products",
  ctaAr: "تسوق الآن",
  ctaEn: "Shop now",
  addAr: "أضف إلى السلة",
  addEn: "Add to cart",
  featuredAr: "الأكثر مبيعاً",
  featuredEn: "Best sellers",
  itemKind: "product" as const,
};
const SERVICE = {
  kind: "service" as const,
  labelAr: "خدمات بحجز",
  labelEn: "Booking services",
  catalogAr: "الخدمات",
  catalogEn: "Services",
  ctaAr: "احجز الآن",
  ctaEn: "Book now",
  addAr: "أضف إلى الحجز",
  addEn: "Add to booking",
  featuredAr: "خدمات مميزة",
  featuredEn: "Popular services",
  itemKind: "service" as const,
};
const SHOWCASE = {
  kind: "showcase" as const,
  labelAr: "عرض وتواصل",
  labelEn: "Showcase & leads",
  ctaAr: "تواصل معنا",
  ctaEn: "Contact us",
  addAr: "تواصل واتساب",
  addEn: "WhatsApp us",
  featuredAr: "مختارات",
  featuredEn: "Featured",
  itemKind: "listing" as const,
};

export const PRESETS: Record<string, Preset> = {
  "restaurant-performance": {
    ...FOOD,
    theme: null,
    cats: [
      { slug: "mains", ar: "الأطباق الرئيسية", en: "Mains" },
      { slug: "sides", ar: "الإضافات", en: "Sides" },
      { slug: "drinks", ar: "المشروبات", en: "Drinks" },
    ],
    items: [
      { cat: "mains", slug: "classic-burger", ar: "برجر كلاسيك", en: "Classic burger", descAr: "لحم بقري مشوي مع جبنة وخضار", descEn: "Grilled beef with cheese and greens", price: 140, featured: true },
      { cat: "mains", slug: "chicken-wrap", ar: "راب دجاج", en: "Chicken wrap", descAr: "دجاج مشوي مع صوص خاص", descEn: "Grilled chicken with house sauce", price: 110, featured: true },
      { cat: "mains", slug: "grilled-plate", ar: "طبق مشويات", en: "Grilled plate", descAr: "تشكيلة مشويات مع أرز وسلطة", descEn: "Mixed grill with rice and salad", price: 220 },
      { cat: "sides", slug: "fries", ar: "بطاطس مقلية", en: "French fries", descAr: "مقرمشة وساخنة", descEn: "Hot and crispy", price: 45 },
      { cat: "drinks", slug: "soft-drink", ar: "مشروب غازي", en: "Soft drink", descAr: "علبة 330 مل", descEn: "330 ml can", price: 25 },
      { cat: "drinks", slug: "fresh-orange", ar: "عصير برتقال طازج", en: "Fresh orange juice", descAr: "عصير طبيعي", descEn: "Freshly squeezed", price: 50 },
    ],
  },
  restaurant: {
    ...FOOD,
    theme: dark("#e8590c", "#0f0d0b"),
    cats: [
      { slug: "mains", ar: "الأطباق الرئيسية", en: "Mains" },
      { slug: "starters", ar: "المقبلات", en: "Starters" },
      { slug: "drinks", ar: "المشروبات", en: "Drinks" },
    ],
    items: [
      { cat: "mains", slug: "grilled-chicken", ar: "فراخ مشوية", en: "Grilled chicken", descAr: "نص فرخة مع أرز وسلطة", descEn: "Half chicken with rice and salad", price: 180, featured: true },
      { cat: "mains", slug: "kofta-plate", ar: "طبق كفتة", en: "Kofta plate", descAr: "كفتة مشوية مع طحينة وخبز", descEn: "Grilled kofta with tahini and bread", price: 190, featured: true },
      { cat: "mains", slug: "pasta-alfredo", ar: "مكرونة ألفريدو", en: "Pasta alfredo", descAr: "صوص كريمي مع دجاج", descEn: "Creamy sauce with chicken", price: 150 },
      { cat: "starters", slug: "hummus", ar: "حمص", en: "Hummus", descAr: "حمص بالطحينة وزيت الزيتون", descEn: "Hummus with tahini and olive oil", price: 60 },
      { cat: "starters", slug: "caesar-salad", ar: "سلطة سيزر", en: "Caesar salad", descAr: "خس وجبنة بارميزان وكروتون", descEn: "Lettuce, parmesan and croutons", price: 95 },
      { cat: "drinks", slug: "lemon-mint", ar: "ليمون بالنعناع", en: "Lemon mint", descAr: "منعش وبارد", descEn: "Cold and refreshing", price: 45 },
    ],
  },
  cafe: {
    ...FOOD,
    theme: light("#8a5a2b", "#f7f1e8", "#2b1d12"),
    cats: [
      { slug: "hot", ar: "مشروبات ساخنة", en: "Hot drinks" },
      { slug: "cold", ar: "مشروبات باردة", en: "Cold drinks" },
      { slug: "dessert", ar: "حلويات", en: "Desserts" },
    ],
    items: [
      { cat: "hot", slug: "espresso", ar: "إسبريسو", en: "Espresso", descAr: "شوت مركّز", descEn: "A concentrated shot", price: 45 },
      { cat: "hot", slug: "cappuccino", ar: "كابتشينو", en: "Cappuccino", descAr: "إسبريسو مع رغوة حليب", descEn: "Espresso with milk foam", price: 65, featured: true },
      { cat: "hot", slug: "latte", ar: "لاتيه", en: "Latte", descAr: "ناعم وكريمي", descEn: "Smooth and creamy", price: 70, featured: true },
      { cat: "cold", slug: "iced-latte", ar: "آيس لاتيه", en: "Iced latte", descAr: "قهوة باردة بالحليب", descEn: "Cold coffee with milk", price: 75 },
      { cat: "cold", slug: "lemon-mint", ar: "ليمون بالنعناع", en: "Lemon mint", descAr: "منعش", descEn: "Refreshing", price: 55 },
      { cat: "dessert", slug: "cheesecake", ar: "تشيز كيك", en: "Cheesecake", descAr: "شريحة بصوص التوت", descEn: "A slice with berry sauce", price: 95, featured: true },
      { cat: "dessert", slug: "brownie", ar: "براوني", en: "Brownie", descAr: "شوكولاتة دافئة", descEn: "Warm chocolate", price: 80 },
    ],
  },
  supermarket: {
    ...RETAIL,
    theme: light("#1f9d55", "#f3f7f2", "#14231a"),
    cats: [
      { slug: "produce", ar: "خضار وفاكهة", en: "Fruit & veg" },
      { slug: "dairy", ar: "ألبان وأجبان", en: "Dairy" },
      { slug: "pantry", ar: "بقالة", en: "Pantry" },
      { slug: "cleaning", ar: "منظفات", en: "Cleaning" },
    ],
    items: [
      { cat: "produce", slug: "tomato", ar: "طماطم (1 كجم)", en: "Tomatoes (1 kg)", descAr: "طازجة", descEn: "Fresh", price: 25, featured: true },
      { cat: "produce", slug: "banana", ar: "موز (1 كجم)", en: "Bananas (1 kg)", descAr: "موز محلي", descEn: "Local bananas", price: 40, compareAt: 48, featured: true },
      { cat: "dairy", slug: "milk", ar: "لبن (1 لتر)", en: "Milk (1 L)", descAr: "لبن كامل الدسم", descEn: "Full-fat milk", price: 38 },
      { cat: "dairy", slug: "white-cheese", ar: "جبنة بيضاء (500 جم)", en: "White cheese (500 g)", descAr: "جبنة بيضاء طازجة", descEn: "Fresh white cheese", price: 65, featured: true },
      { cat: "pantry", slug: "rice", ar: "أرز (1 كجم)", en: "Rice (1 kg)", descAr: "أرز مصري", descEn: "Egyptian rice", price: 38 },
      { cat: "pantry", slug: "oil", ar: "زيت (1 لتر)", en: "Cooking oil (1 L)", descAr: "زيت عباد الشمس", descEn: "Sunflower oil", price: 95, compareAt: 110 },
      { cat: "cleaning", slug: "detergent", ar: "مسحوق غسيل (2 كجم)", en: "Laundry powder (2 kg)", descAr: "للغسالات الأوتوماتيك", descEn: "For automatic machines", price: 140 },
    ],
  },
  retail: {
    ...RETAIL,
    theme: light("#111827", "#f6f6f4", "#111827"),
    cats: [
      { slug: "new", ar: "وصل حديثاً", en: "New in" },
      { slug: "offers", ar: "عروض", en: "Offers" },
    ],
    items: [
      { cat: "new", slug: "cotton-tee", ar: "تيشيرت قطن", en: "Cotton tee", descAr: "قطن 100% بعدة ألوان", descEn: "100% cotton in several colors", price: 249, compareAt: 299, featured: true },
      { cat: "new", slug: "shoulder-bag", ar: "حقيبة كتف", en: "Shoulder bag", descAr: "جلد صناعي متين", descEn: "Durable faux leather", price: 399, featured: true },
      { cat: "offers", slug: "wireless-earbuds", ar: "سماعات لاسلكية", en: "Wireless earbuds", descAr: "بطارية تدوم 20 ساعة", descEn: "20-hour battery", price: 599, compareAt: 799, featured: true },
      { cat: "offers", slug: "wrist-watch", ar: "ساعة يد", en: "Wrist watch", descAr: "ستانلس ستيل", descEn: "Stainless steel", price: 899, compareAt: 1099 },
    ],
  },
  salon: {
    ...SERVICE,
    theme: light("#b5527a", "#fbf4f2", "#2b1a22"),
    cats: [
      { slug: "hair", ar: "الشعر", en: "Hair" },
      { slug: "skin", ar: "العناية بالبشرة", en: "Skin care" },
      { slug: "nails", ar: "الأظافر", en: "Nails" },
    ],
    items: [
      { cat: "hair", slug: "haircut", ar: "قص شعر", en: "Haircut", descAr: "المدة 45 دقيقة", descEn: "45 minutes", price: 150, featured: true },
      { cat: "hair", slug: "full-color", ar: "صبغة كاملة", en: "Full color", descAr: "المدة 2 ساعة", descEn: "2 hours", price: 600, featured: true },
      { cat: "hair", slug: "blow-dry", ar: "سشوار", en: "Blow dry", descAr: "المدة 30 دقيقة", descEn: "30 minutes", price: 120 },
      { cat: "skin", slug: "facial", ar: "تنظيف بشرة", en: "Facial cleanse", descAr: "المدة 60 دقيقة", descEn: "60 minutes", price: 350, featured: true },
      { cat: "nails", slug: "manicure", ar: "مانيكير", en: "Manicure", descAr: "المدة 40 دقيقة", descEn: "40 minutes", price: 150 },
      { cat: "nails", slug: "pedicure", ar: "باديكير", en: "Pedicure", descAr: "المدة 50 دقيقة", descEn: "50 minutes", price: 200 },
    ],
  },
  clinic: {
    ...SERVICE,
    theme: light("#1b7fc4", "#f2f8fc", "#0f2433"),
    cats: [
      { slug: "visits", ar: "الكشف والاستشارات", en: "Visits" },
      { slug: "dental", ar: "الأسنان", en: "Dental" },
    ],
    items: [
      { cat: "visits", slug: "new-visit", ar: "كشف جديد", en: "New visit", descAr: "المدة 30 دقيقة", descEn: "30 minutes", price: 300, featured: true },
      { cat: "visits", slug: "follow-up", ar: "إعادة كشف", en: "Follow-up visit", descAr: "خلال 14 يوم من الكشف", descEn: "Within 14 days of the visit", price: 150 },
      { cat: "visits", slug: "online-consult", ar: "استشارة أونلاين", en: "Online consultation", descAr: "مكالمة فيديو 20 دقيقة", descEn: "20-minute video call", price: 200, featured: true },
      { cat: "dental", slug: "cleaning", ar: "تنظيف أسنان", en: "Teeth cleaning", descAr: "المدة 40 دقيقة", descEn: "40 minutes", price: 400 },
      { cat: "dental", slug: "whitening", ar: "تبييض أسنان", en: "Teeth whitening", descAr: "المدة 60 دقيقة", descEn: "60 minutes", price: 1500, featured: true },
    ],
  },
  gym: {
    ...SERVICE,
    theme: dark("#c6f432", "#0a0a0b", "#0a0a0b"),
    featuredAr: "الأكثر اشتراكاً",
    featuredEn: "Most popular",
    cats: [
      { slug: "plans", ar: "الاشتراكات", en: "Memberships" },
      { slug: "training", ar: "التدريب الشخصي", en: "Personal training" },
    ],
    items: [
      { cat: "plans", slug: "monthly", ar: "اشتراك شهري", en: "Monthly", descAr: "دخول مفتوح طوال الشهر", descEn: "Unlimited access for a month", price: 500, featured: true },
      { cat: "plans", slug: "quarterly", ar: "اشتراك 3 شهور", en: "3 months", descAr: "وفّر 200 جنيه", descEn: "Save 200", price: 1300, compareAt: 1500, featured: true },
      { cat: "plans", slug: "yearly", ar: "اشتراك سنوي", en: "Yearly", descAr: "أفضل سعر", descEn: "Best value", price: 4500, compareAt: 6000, featured: true },
      { cat: "training", slug: "pt-session", ar: "حصة تدريب شخصي", en: "Personal training session", descAr: "60 دقيقة مع مدرب", descEn: "60 minutes with a coach", price: 250 },
      { cat: "training", slug: "pt-10", ar: "باقة 10 حصص", en: "10-session pack", descAr: "صالحة لمدة 3 شهور", descEn: "Valid for 3 months", price: 2000, compareAt: 2500 },
    ],
  },
  realestate: {
    ...SHOWCASE,
    theme: light("#0f766e", "#f3f6f6", "#102a2a"),
    catalogAr: "العقارات",
    catalogEn: "Listings",
    featuredAr: "عقارات مميزة",
    featuredEn: "Featured properties",
    ctaAr: "اسأل عن عقار",
    ctaEn: "Ask about a property",
    cats: [
      { slug: "sale", ar: "للبيع", en: "For sale" },
      { slug: "rent", ar: "للإيجار", en: "For rent" },
    ],
    items: [
      { cat: "sale", slug: "apt-150-new-cairo", ar: "شقة 150 م² - التجمع الخامس", en: "150 m² apartment, New Cairo", descAr: "3 غرف، 2 حمام، تشطيب سوبر لوكس", descEn: "3 bedrooms, 2 baths, super lux finishing", price: 3200000, featured: true },
      { cat: "sale", slug: "apt-120-madinaty", ar: "شقة 120 م² - مدينتي", en: "120 m² apartment, Madinaty", descAr: "غرفتان، حمامان، دور مرتفع", descEn: "2 bedrooms, 2 baths, high floor", price: 2400000, featured: true },
      { cat: "sale", slug: "villa-300-zayed", ar: "فيلا 300 م² - الشيخ زايد", en: "300 m² villa, Sheikh Zayed", descAr: "4 غرف مع حديقة خاصة", descEn: "4 bedrooms with a private garden", price: 9500000, featured: true },
      { cat: "rent", slug: "furnished-nasr-city", ar: "شقة مفروشة - مدينة نصر", en: "Furnished apartment, Nasr City", descAr: "إيجار شهري، غرفتان", descEn: "Monthly rent, 2 bedrooms", price: 12000 },
      { cat: "rent", slug: "office-80", ar: "مكتب إداري 80 م²", en: "80 m² office", descAr: "إيجار شهري، موقع مميز", descEn: "Monthly rent, prime location", price: 18000 },
    ],
  },
  auto: {
    ...SHOWCASE,
    theme: dark("#ff8a00", "#0b0e12", "#111111"),
    catalogAr: "الخدمات",
    catalogEn: "Services",
    featuredAr: "باقات مميزة",
    featuredEn: "Popular packages",
    ctaAr: "احجز موعد",
    ctaEn: "Book a slot",
    itemKind: "service",
    cats: [
      { slug: "maintenance", ar: "الصيانة", en: "Maintenance" },
      { slug: "wash", ar: "الغسيل والتلميع", en: "Wash & polish" },
    ],
    items: [
      { cat: "maintenance", slug: "oil-change", ar: "تغيير زيت وفلتر", en: "Oil & filter change", descAr: "زيت ومرشح حسب نوع السيارة", descEn: "Oil and filter for your car", price: 450, featured: true },
      { cat: "maintenance", slug: "computer-scan", ar: "فحص كمبيوتر شامل", en: "Full computer scan", descAr: "تقرير بالأعطال", descEn: "Fault report", price: 300, featured: true },
      { cat: "maintenance", slug: "alignment", ar: "ضبط زوايا وترصيص", en: "Wheel alignment", descAr: "ضبط كامل", descEn: "Full alignment", price: 400 },
      { cat: "wash", slug: "full-wash", ar: "غسيل خارجي وداخلي", en: "Interior & exterior wash", descAr: "غسيل شامل", descEn: "Complete wash", price: 150 },
      { cat: "wash", slug: "ceramic", ar: "تلميع سيراميك", en: "Ceramic coating", descAr: "حماية تدوم طويلاً", descEn: "Long-lasting protection", price: 3500, featured: true },
    ],
  },
  professional: {
    ...SHOWCASE,
    theme: light("#1e3a8a", "#f4f6fa", "#0f172a"),
    catalogAr: "خدماتنا",
    catalogEn: "Our services",
    featuredAr: "خدمات مميزة",
    featuredEn: "Key services",
    ctaAr: "اطلب استشارة",
    ctaEn: "Request a consultation",
    itemKind: "service",
    cats: [
      { slug: "consulting", ar: "الاستشارات", en: "Consulting" },
      { slug: "packages", ar: "الباقات", en: "Packages" },
    ],
    items: [
      { cat: "consulting", slug: "first-consult", ar: "استشارة أولية", en: "Initial consultation", descAr: "30 دقيقة لفهم احتياجك", descEn: "30 minutes to understand your needs", price: 400, featured: true },
      { cat: "consulting", slug: "deep-session", ar: "جلسة استشارية", en: "Consulting session", descAr: "60 دقيقة مع خبير", descEn: "60 minutes with an expert", price: 700, featured: true },
      { cat: "packages", slug: "doc-review", ar: "مراجعة مستندات", en: "Document review", descAr: "مراجعة وتقرير مكتوب", descEn: "Review with a written report", price: 900 },
      { cat: "packages", slug: "monthly-retainer", ar: "باقة شهرية", en: "Monthly retainer", descAr: "متابعة مستمرة لمدة شهر", descEn: "Ongoing support for a month", price: 3500, featured: true },
    ],
  },
  hotel: {
    ...SHOWCASE,
    theme: dark("#c9a45c", "#100e0b", "#1a1405"),
    catalogAr: "الغرف والخدمات",
    catalogEn: "Rooms & services",
    featuredAr: "غرف مميزة",
    featuredEn: "Featured rooms",
    ctaAr: "احجز إقامتك",
    ctaEn: "Book your stay",
    cats: [
      { slug: "rooms", ar: "الغرف", en: "Rooms" },
      { slug: "extras", ar: "خدمات إضافية", en: "Extras" },
    ],
    items: [
      { cat: "rooms", slug: "double", ar: "غرفة مزدوجة", en: "Double room", descAr: "السعر لليلة، شامل الإفطار", descEn: "Per night, breakfast included", price: 1800, featured: true },
      { cat: "rooms", slug: "suite", ar: "جناح", en: "Suite", descAr: "السعر لليلة، إطلالة مميزة", descEn: "Per night, with a view", price: 3500, featured: true },
      { cat: "extras", slug: "airport-transfer", ar: "توصيل من المطار", en: "Airport transfer", descAr: "سيارة خاصة", descEn: "Private car", price: 600 },
      { cat: "extras", slug: "spa", ar: "جلسة سبا", en: "Spa session", descAr: "60 دقيقة", descEn: "60 minutes", price: 900 },
    ],
  },
};

const FALLBACK: Preset = { ...PRESETS.retail, theme: null, kind: "food", ...FOOD, cats: [], items: [] };

export function presetFor(family: string | null | undefined): Preset {
  return (family && PRESETS[family]) || FALLBACK;
}

export function themeVars(theme: Theme): Record<string, string> {
  return {
    "--color-bg": theme.bg,
    "--color-surface": theme.surface,
    "--color-elevated": theme.elevated,
    "--color-fg": theme.fg,
    "--color-muted": theme.muted,
    "--color-subtle": theme.subtle,
    "--color-border": theme.border,
    "--color-primary": theme.primary,
    "--color-primary-fg": theme.primaryFg,
    "--color-ring": theme.primary,
  };
}
