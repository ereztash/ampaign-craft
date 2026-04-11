import type {
  BilingualText,
  RecommendedTier,
  OfferBonus,
  GuaranteeRecommendation,
  PricingIntelligenceResult,
} from "./pricing";

export type QuoteCurrency = "ILS" | "USD" | "EUR";
export type QuoteStatus = "draft" | "sent" | "accepted" | "expired";

export interface QuoteRecipient {
  name: string;
  company?: string;
  email?: string;
  role?: string;
}

export interface QuoteLineItem {
  id: string;
  name: BilingualText;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteDiscount {
  type: "percent" | "amount";
  value: number;
}

export interface Quote {
  id: string;
  createdAt: string;
  validUntil: string;
  status: QuoteStatus;

  recipient: QuoteRecipient;

  headline: BilingualText;
  selectedTier: RecommendedTier;
  lineItems: QuoteLineItem[];
  bonuses: OfferBonus[];
  guarantee: GuaranteeRecommendation;

  subtotal: number;
  discount?: QuoteDiscount;
  total: number;
  currency: QuoteCurrency;
  paymentTerms?: string;

  valueNarrative: BilingualText;
  discAdaptedFraming: BilingualText;
  urgencyBlock?: BilingualText;

  notes?: string;
  signatureRequested: boolean;
}

export interface QuoteAssemblyInput {
  pricingResult: PricingIntelligenceResult;
  selectedTierIndex: number;
  recipient: QuoteRecipient;
  currency?: QuoteCurrency;
  validityDays?: number;
}

export const CURRENCY_SYMBOLS: Record<QuoteCurrency, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
};

export function formatQuotePrice(amount: number, currency: QuoteCurrency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return currency === "ILS" ? `${sym}${formatted}` : `${sym}${formatted}`;
}

export function calculateQuoteTotal(
  lineItems: QuoteLineItem[],
  discount?: QuoteDiscount,
): { subtotal: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  if (!discount) return { subtotal, total: subtotal };

  const discountAmount =
    discount.type === "percent"
      ? subtotal * (discount.value / 100)
      : discount.value;

  return { subtotal, total: Math.max(0, subtotal - discountAmount) };
}
