export type SeedVariant = { nameEn: string; nameAr: string; price: number };

export type SeedItem = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  image: string;
  price: number;
  featured?: boolean;
  variants?: SeedVariant[];
};

const img = (name: string) => `/tenants/rpm/${name}`;

export const RPM_CATEGORIES = [
  { slug: "beef-burgers", nameEn: "Beef Burgers", nameAr: "بيف برجر ساندوتش", icon: "burger", image: img("v8-classic.jpg") },
  { slug: "chicken-sandwiches", nameEn: "Chicken Sandwiches", nameAr: "تشكن ساندوتش", icon: "chicken", image: img("turbo-chicken.jpg") },
  { slug: "grill", nameEn: "Charcoal Grill", nameAr: "ساندوتش ع الفحم", icon: "flame", image: img("hawawshi.jpg") },
  { slug: "meals", nameEn: "Meals", nameAr: "الوجبات", icon: "meals", image: img("strips.jpg") },
  { slug: "sides", nameEn: "Add-ons", nameAr: "مكملات", icon: "fries", image: img("fries.jpg") },
  { slug: "offers", nameEn: "Special Offers", nameAr: "العروض الخاصة", icon: "offers", image: img("offer-box.jpg") },
] as const;

const beefDesc = (en: string, ar: string) => ({ descEn: en, descAr: ar });

export const RPM_ITEMS: Record<string, SeedItem[]> = {
  "beef-burgers": [
    {
      slug: "v8-classic",
      nameEn: "V8 Classic",
      nameAr: "V8 Classic",
      ...beefDesc(
        "Charcoal-grilled beef burger with fresh lettuce, tomato and onion, BBQ sauce and tasty sauce.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش (خس - طماطم - بصل) مع صوص الباربكيو وصوص التيستي.",
      ),
      image: img("v8-classic.jpg"),
      price: 125,
      featured: true,
      variants: [
        { nameEn: "125 G", nameAr: "125 جم", price: 125 },
        { nameEn: "200 G", nameAr: "200 جم", price: 165 },
      ],
    },
    {
      slug: "full-rpm",
      nameEn: "Full RPM",
      nameAr: "Full RPM",
      ...beefDesc(
        "Charcoal beef with bacon, mozzarella sticks, tasty sauce, cheese sauce and BBQ. Served with fries and a drink.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش والبيكون وموتزاريلا ستيكس وصوص تيستي وصوص جبنة وصوص الباربكيو ويُقدم مع باكت بطاطس ومشروب.",
      ),
      image: img("full-rpm.jpg"),
      price: 230,
      featured: true,
      variants: [{ nameEn: "200 G combo", nameAr: "200 جم كومبو", price: 230 }],
    },
    {
      slug: "nitrous-beef",
      nameEn: "Nitrous Beef",
      nameAr: "Nitrous Beef",
      ...beefDesc(
        "Charcoal beef with mozzarella sticks, bacon, cheese sauce and tasty sauce.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش وأصابع الموتزاريلا والبيكون وصوص الجبنة وصوص التيستي.",
      ),
      image: img("nitrous-beef.jpg"),
      price: 145,
      featured: true,
      variants: [
        { nameEn: "125 G", nameAr: "125 جم", price: 145 },
        { nameEn: "200 G", nameAr: "200 جم", price: 195 },
      ],
    },
    {
      slug: "drift-mode",
      nameEn: "Drift Mode",
      nameAr: "Drift Mode",
      ...beefDesc(
        "Charcoal beef with onion rings, bacon, BBQ sauce and Thousand Island.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش وحلقات البصل والبيكون وصوص الباربكيو وصوص ثاوزند آيلاند.",
      ),
      image: img("drift-mode.jpg"),
      price: 135,
      variants: [
        { nameEn: "125 G", nameAr: "125 جم", price: 135 },
        { nameEn: "200 G", nameAr: "200 جم", price: 185 },
      ],
    },
    {
      slug: "dynamo",
      nameEn: "Dynamo",
      nameAr: "Dynamo",
      ...beefDesc(
        "Charcoal beef with onion, mushrooms, bacon, BBQ sauce and tasty sauce.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش والبصل والمشروم والبيكون وصوص الباربكيو وصوص التيستي.",
      ),
      image: img("dynamo.jpg"),
      price: 145,
      variants: [
        { nameEn: "125 G", nameAr: "125 جم", price: 145 },
        { nameEn: "200 G", nameAr: "200 جم", price: 195 },
      ],
    },
    {
      slug: "redline",
      nameEn: "Redline",
      nameAr: "Redline",
      ...beefDesc(
        "Charcoal beef with hot buffalo sauce, jalapeño, mozzarella sticks and tasty sauce.",
        "بيف برجر مشوي على الفحم مع الخضار الفريش وصوص البافلو الحار وقطع الهالابينو وأصابع الموتزاريلا وصوص التيستي.",
      ),
      image: img("redline.jpg"),
      price: 145,
      featured: true,
      variants: [
        { nameEn: "125 G", nameAr: "125 جم", price: 145 },
        { nameEn: "200 G", nameAr: "200 جم", price: 195 },
      ],
    },
  ],
  "chicken-sandwiches": [
    {
      slug: "turbo-chicken",
      nameEn: "Turbo Chicken",
      nameAr: "Turbo Chicken",
      ...beefDesc(
        "Crispy strips with fresh lettuce, tomato and cucumber, BBQ sauce and ranch.",
        "قطع الاستربس المقرمشة مع الخضار الفريش (خس - طماطم - خيار) مع صوص الباربكيو وصوص الرانش.",
      ),
      image: img("turbo-chicken.jpg"),
      price: 120,
      featured: true,
      variants: [
        { nameEn: "2 PIC", nameAr: "2 قطعة", price: 120 },
        { nameEn: "4 PIC", nameAr: "4 قطعة", price: 170 },
      ],
    },
    {
      slug: "overdrive",
      nameEn: "Overdrive",
      nameAr: "Overdrive",
      ...beefDesc(
        "Crispy strips with Turkish cheese, mozzarella sticks, ranch and BBQ. Served with fries and a drink.",
        "قطع الاستربس المقرمشة مع الخضار الفريش والجبنة التركي وأصابع الموتزاريلا وصوص الرانش وصوص الباربكيو ويُقدم مع بطاطس ومشروب.",
      ),
      image: img("overdrive.jpg"),
      price: 230,
      featured: true,
      variants: [{ nameEn: "4 PIC combo", nameAr: "4 قطع كومبو", price: 230 }],
    },
    {
      slug: "nitro-crispy",
      nameEn: "Nitro Crispy",
      nameAr: "Nitro Crispy",
      ...beefDesc(
        "Crispy strips with mozzarella sticks, Turkish cheese, cheese sauce and ranch.",
        "قطع الاستربس المقرمشة مع الخضار الفريش وأصابع الموتزاريلا والجبنة التركي وصوص الجبنة وصوص الرانش.",
      ),
      image: img("nitro-crispy.jpg"),
      price: 145,
      variants: [
        { nameEn: "2 PIC", nameAr: "2 قطعة", price: 145 },
        { nameEn: "4 PIC", nameAr: "4 قطعة", price: 195 },
      ],
    },
    {
      slug: "drift-chicken",
      nameEn: "Drift Chicken",
      nameAr: "Drift Chicken",
      ...beefDesc(
        "Crispy strips with onion rings, Turkish cheese, BBQ sauce and Thousand Island.",
        "قطع الاستربس المقرمشة مع الخضار الفريش وحلقات البصل والجبنة التركي وصوص الباربكيو وصوص ثاوزند آيلاند.",
      ),
      image: img("drift-chicken.jpg"),
      price: 145,
      variants: [
        { nameEn: "2 PIC", nameAr: "2 قطعة", price: 145 },
        { nameEn: "4 PIC", nameAr: "4 قطعة", price: 195 },
      ],
    },
    {
      slug: "track-fire",
      nameEn: "Track Fire",
      nameAr: "Track Fire",
      ...beefDesc(
        "Crispy strips with hot buffalo sauce, jalapeño, mozzarella sticks and ranch.",
        "قطع الاستربس المقرمشة مع الخضار الفريش وصوص البافلو الحار وقطع الهالابينو وأصابع الموتزاريلا وصوص الرانش.",
      ),
      image: img("track-fire.jpg"),
      price: 145,
      variants: [
        { nameEn: "2 PIC", nameAr: "2 قطعة", price: 145 },
        { nameEn: "4 PIC", nameAr: "4 قطعة", price: 195 },
      ],
    },
  ],
  grill: [
    {
      slug: "shish-tawook",
      nameEn: "Shish Tawook",
      nameAr: "شيش طاووق",
      ...beefDesc(
        "Grilled chicken shish with grilled vegetables and ranch sauce.",
        "قطع الشيش مع الخضار المشوي وصوص الرانش.",
      ),
      image: img("shish.jpg"),
      price: 80,
      variants: [
        { nameEn: "Regular", nameAr: "عادي", price: 80 },
        { nameEn: "Large", nameAr: "كبير", price: 120 },
      ],
    },
    {
      slug: "kofta",
      nameEn: "Kofta",
      nameAr: "كفتة",
      ...beefDesc(
        "Charcoal kofta with RPM marinade and signature tahini sauce.",
        "كفتة مشوية على الفحم بتتبيلة RPM المميزة مع صوص الطحينة المميز.",
      ),
      image: img("kofta.jpg"),
      price: 60,
      variants: [
        { nameEn: "Regular", nameAr: "عادي", price: 60 },
        { nameEn: "Large", nameAr: "كبير", price: 90 },
      ],
    },
    {
      slug: "hawawshi-plain",
      nameEn: "Hawawshi Plain",
      nameAr: "حواوشي ساده",
      ...beefDesc(
        "Charcoal hawawshi with RPM marinade and tahini sauce.",
        "حواوشي مشوي على الفحم بتتبيلة RPM المميزة مع صوص الطحينة المميز.",
      ),
      image: img("hawawshi.jpg"),
      price: 50,
      variants: [
        { nameEn: "Regular", nameAr: "عادي", price: 50 },
        { nameEn: "Large", nameAr: "كبير", price: 70 },
      ],
    },
    {
      slug: "hawawshi-mozzarella",
      nameEn: "Hawawshi Mozzarella",
      nameAr: "حواوشي موزاريلا",
      ...beefDesc(
        "Charcoal hawawshi with RPM marinade and mozzarella.",
        "حواوشي مشوي على الفحم بتتبيلة RPM المميزة مع الجبنة الموتزاريلا.",
      ),
      image: img("hawawshi.jpg"),
      price: 60,
      variants: [
        { nameEn: "Regular", nameAr: "عادي", price: 60 },
        { nameEn: "Large", nameAr: "كبير", price: 85 },
      ],
    },
    {
      slug: "hawawshi-rpm",
      nameEn: "Hawawshi RPM",
      nameAr: "حواوشي RPM",
      ...beefDesc(
        "Charcoal hawawshi with RPM marinade, mozzarella, Turkish cheese, smoked bacon and tahini.",
        "حواوشي مشوي على الفحم بتتبيلة RPM المميزة مع الجبنة الموتزاريلا والتركي المدخن والبيكون وصوص الطحينة المميز.",
      ),
      image: img("hawawshi.jpg"),
      price: 110,
      featured: true,
      variants: [{ nameEn: "Signature", nameAr: "سينيجر", price: 110 }],
    },
  ],
  meals: [
    {
      slug: "strips-3",
      nameEn: "3 Strips",
      nameAr: "3 قطع استربس",
      ...beefDesc("3 crispy strips + bread + fries + sauce.", "عدد 3 قطع استربس + عيش + بطاطس + صوص."),
      image: img("strips.jpg"),
      price: 140,
    },
    {
      slug: "strips-7",
      nameEn: "7 Strips",
      nameAr: "7 قطع استربس",
      ...beefDesc("7 crispy strips + 2 bread + fries + 2 sauces.", "عدد 7 قطع استربس + 2 عيش + بطاطس + 2 صوص."),
      image: img("strips.jpg"),
      price: 290,
    },
    {
      slug: "strips-10",
      nameEn: "10 Strips",
      nameAr: "10 قطع استربس",
      ...beefDesc("10 crispy strips + 3 bread + fries + 3 sauces.", "عدد 10 قطع استربس + 3 عيش + بطاطس + 3 صوص."),
      image: img("strips.jpg"),
      price: 380,
    },
  ],
  sides: [
    { slug: "fries", nameEn: "Fries", nameAr: "فرايز", ...beefDesc("Crispy fries with house seasoning.", "بطاطس محمرة بالتوابل الخاصة."), image: img("fries.jpg"), price: 30 },
    { slug: "cheese-fries", nameEn: "Cheese Fries", nameAr: "تشيز فرايز", ...beefDesc("Fries covered in cheese sauce.", "بطاطس محمرة مغطاة بصوص الجبنة."), image: img("cheese-fries.jpg"), price: 45 },
    { slug: "mushroom-fries", nameEn: "Mushroom Fries", nameAr: "مشروم فرايز", ...beefDesc("Fries with mushroom and BBQ sauce.", "بطاطس محمرة مغطاة بصوص المشروم وصوص الباربكيو."), image: img("fries.jpg"), price: 55 },
    { slug: "chicken-fries", nameEn: "Chicken Fries", nameAr: "تشكن فرايز", ...beefDesc("Fries with cheese sauce and chicken pieces.", "بطاطس محمرة مغطاة بصوص الجبنة مع قطع الفراخ."), image: img("strips.jpg"), price: 75 },
    { slug: "vip-box", nameEn: "VIP Box", nameAr: "VIP Box", ...beefDesc("Fries + 2 mozzarella + 2 onion rings + 2 mozzarella sticks.", "بطاطس + 2 موتزاريلا + 2 اونيون رينج + 2 موتزاريلا ستيكس."), image: img("combo.jpg"), price: 80 },
    { slug: "combo", nameEn: "Combo", nameAr: "Combo", ...beefDesc("Fries and a drink add-on.", "إضافة بطاطس ومشروب."), image: img("combo.jpg"), price: 40 },
    { slug: "maxi-cola", nameEn: "Maxi Cola", nameAr: "ماكسي كولا", ...beefDesc("Chilled cola.", "كولا."), image: img("overdrive.jpg"), price: 15 },
    { slug: "water", nameEn: "Small Water", nameAr: "مياه صغيره", ...beefDesc("Bottled water.", "مياه صغيرة."), image: img("overdrive.jpg"), price: 10 },
  ],
};

export const RPM_OFFERS = [
  {
    slug: "2000-cc",
    nameEn: "2000 CC",
    nameAr: "2000 CC",
    descEn: "2 large sandwiches of your choice (beef or chicken) + fries + 2 colas.",
    descAr: "عدد 2 ساندوتش كبير من اختيارك (بيف أو تشكن) + بطاطس + 2 كولا.",
    image: img("offer-box.jpg"),
    price: 340,
  },
  {
    slug: "1300-cc",
    nameEn: "1300 CC",
    nameAr: "1300 CC",
    descEn: "2 medium sandwiches of your choice (beef or chicken) + fries + 2 colas.",
    descAr: "عدد 2 ساندوتش وسط من اختيارك (بيف أو تشكن) + بطاطس + 2 كولا.",
    image: img("offer-box.jpg"),
    price: 250,
  },
  {
    slug: "full-horsepower",
    nameEn: "Full Horsepower",
    nameAr: "FULL HORSEPOWER",
    descEn: "4 large sandwiches of your choice (beef or chicken) + fries + 1 liter cola.",
    descAr: "عدد 4 ساندوتش كبير من اختيارك (بيف أو تشكن) + بطاطس + لتر كولا.",
    image: img("offer-box.jpg"),
    price: 650,
  },
  {
    slug: "full-options",
    nameEn: "Full Options",
    nameAr: "FULL OPTIONS",
    descEn: "4 medium sandwiches of your choice (beef or chicken) + fries + 1 liter cola.",
    descAr: "عدد 4 ساندوتش وسط من اختيارك (بيف أو تشكن) + بطاطس + لتر كولا.",
    image: img("offer-box.jpg"),
    price: 480,
  },
  {
    slug: "six-cylinder",
    nameEn: "6 Cylinder",
    nameAr: "6 سليندر",
    descEn: "2 kofta + 2 shish + 1 hawawshi + fries.",
    descAr: "2 كفتة + 2 شيش + 1 حواوشي + بطاطس.",
    image: img("hawawshi.jpg"),
    price: 299,
  },
];
