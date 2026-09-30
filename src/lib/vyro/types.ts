export type Locale = "ar" | "en";

/** JSON-serializable row from SQL (no Date / unknown). */
export type SqlRow = { [key: string]: string | number | boolean | null };

export type Role =
  | "SUPER_ADMIN"
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "BRANCH_MANAGER"
  | "STAFF";

export type TenantStatus = "active" | "trial" | "suspended" | "archived";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "REJECTED"
  | "REFUNDED";

export type Member = {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: Role;
  branch_id: string | null;
};

export type PublicVariant = {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  available: boolean;
};

export type PublicModifier = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number;
};

export type PublicModifierGroup = {
  id: string;
  nameEn: string;
  nameAr: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: PublicModifier[];
};

export type PublicItem = {
  id: string;
  slug: string;
  kind: string;
  categoryId: string | null;
  nameEn: string;
  nameAr: string;
  descEn: string | null;
  descAr: string | null;
  imageUrl: string | null;
  price: number;
  compareAt: number | null;
  featured: boolean;
  available: boolean;
  variants: PublicVariant[];
  modifierGroups: PublicModifierGroup[];
};

export type PublicCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string | null;
  icon: string | null;
  sortOrder: number;
};

export type PublicOffer = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string | null;
  descAr: string | null;
  imageUrl: string | null;
  price: number | null;
  compareAt: number | null;
  contents: string;
};

export type PublicPaymentMethod = {
  id: string;
  type: string;
  nameEn: string;
  nameAr: string;
  descEn: string | null;
  descAr: string | null;
  paymentUrl: string | null;
  accountIdentifier: string | null;
  accountName: string | null;
  instructionsEn: string | null;
  instructionsAr: string | null;
  requiresProof: boolean;
  requiresManualVerification: boolean;
  logoUrl: string | null;
};

export type PublicBranch = {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  hoursJson: string;
};

export type PublicProfile = {
  nameEn: string;
  nameAr: string;
  shortEn: string | null;
  shortAr: string | null;
  descEn: string | null;
  descAr: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  addressEn: string | null;
  addressAr: string | null;
  mapsUrl: string | null;
  reviewUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  websiteUrl: string | null;
  currency: string;
  logoUrl: string | null;
  coverUrl: string | null;
  hoursJson: string;
  branding: Record<string, string>;
  timezone: string;
  deliveryFee: number;
  minOrder: number;
  acceptingOrders: boolean;
};

export type PublicTenant = {
  id: string;
  slug: string;
  status: string;
  industry: string;
  templateFamily: string;
  templateTheme: Record<string, string>;
  profile: PublicProfile;
  categories: PublicCategory[];
  items: PublicItem[];
  offers: PublicOffer[];
  paymentMethods: PublicPaymentMethod[];
  branches: PublicBranch[];
};
