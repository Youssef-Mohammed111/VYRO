export const PAYMENT_PROVIDER_TYPES = [
  "MANUAL",
  "EXTERNAL_LINK",
  "INSTAPAY",
  "VODAFONE_CASH",
  "ORANGE_CASH",
  "ETISALAT_CASH",
  "BANK_TRANSFER",
  "CARD",
  "PAYMENT_GATEWAY",
] as const;

export type PaymentProviderType = (typeof PAYMENT_PROVIDER_TYPES)[number];

export const PAYMENT_TYPE_LABEL: Record<string, string> = {
  MANUAL: "Manual / cash",
  EXTERNAL_LINK: "External link",
  INSTAPAY: "InstaPay",
  VODAFONE_CASH: "Vodafone Cash",
  ORANGE_CASH: "Orange Cash",
  ETISALAT_CASH: "Etisalat Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  PAYMENT_GATEWAY: "Payment gateway",
};
