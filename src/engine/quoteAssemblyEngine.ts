import type { FormData, FunnelResult } from "@/types/funnel";
import type { BilingualText, PricingIntelligenceResult } from "@/types/pricing";
import type {
  Quote,
  QuoteRecipient,
  QuoteLineItem,
  QuoteCurrency,
  QuoteAssemblyInput,
} from "@/types/quote";
import { calculateQuoteTotal } from "@/types/quote";
import type { UserKnowledgeGraph } from "./userKnowledgeGraph";
import type { DISCProfile } from "./discProfileEngine";
import type { HormoziValueResult } from "@/types/funnel";
import type { CostOfInaction } from "./costOfInactionEngine";
import { generatePricingIntelligence } from "./pricingIntelligenceEngine";
import { calculateValueScore } from "./hormoziValueEngine";
import { calculateCostOfInaction } from "./costOfInactionEngine";
import { inferDISCProfile } from "./discProfileEngine";
import { applyCharmPricing } from "./pricingKnowledge";

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `Q-${ts}-${rand}`.toUpperCase();
}

function tierToLineItems(
  tier: PricingIntelligenceResult["tierStructure"]["tiers"][number],
): QuoteLineItem[] {
  return tier.features.map((feat, i) => ({
    id: `li-${i}`,
    name: feat,
    quantity: 1,
    unitPrice: 0,
    total: 0,
  }));
}

function buildValueNarrative(
  hormozi: HormoziValueResult | null,
  coi: CostOfInaction | null,
  lang: "he" | "en",
): BilingualText {
  const hormoziLine = hormozi
    ? {
        he: `ציון ערך ההצעה: ${hormozi.overallScore}/100 (${hormozi.offerGrade === "irresistible" ? "בלתי ניתן לסירוב" : hormozi.offerGrade === "strong" ? "חזק" : hormozi.offerGrade === "average" ? "ממוצע" : "חלש"})`,
        en: `Offer value score: ${hormozi.overallScore}/100 (${hormozi.offerGrade})`,
      }
    : { he: "", en: "" };

  const coiLine = coi
    ? {
        he: `${coi.lossFramedMessage.he} ${coi.comparisonMessage.he}`,
        en: `${coi.lossFramedMessage.en} ${coi.comparisonMessage.en}`,
      }
    : { he: "", en: "" };

  return {
    he: [hormoziLine.he, coiLine.he].filter(Boolean).join("\n"),
    en: [hormoziLine.en, coiLine.en].filter(Boolean).join("\n"),
  };
}

const DISC_FRAMING: Record<"D" | "I" | "S" | "C", BilingualText> = {
  D: {
    he: "הצעה זו ממוקדת בתוצאות מדידות ו-ROI ישיר — מיועדת למקבלי החלטות שרוצים לראות מספרים ברורים.",
    en: "This proposal focuses on measurable results and direct ROI — built for decision-makers who want clear numbers.",
  },
  I: {
    he: "הצעה זו מציגה את החזון והפוטנציאל — כיצד נשנה יחד את התמונה הגדולה.",
    en: "This proposal presents the vision and potential — how we'll transform the bigger picture together.",
  },
  S: {
    he: "הצעה זו בנויה על יציבות ואמון — תהליך מובנה עם ערבות מלאה ותמיכה לאורך כל הדרך.",
    en: "This proposal is built on stability and trust — a structured process with full guarantee and ongoing support.",
  },
  C: {
    he: "הצעה זו מגובה בנתונים ובניתוח מעמיק — כל מספר מבוסס על מתודולוגיה מוכחת.",
    en: "This proposal is backed by data and deep analysis — every number is grounded in proven methodology.",
  },
};

export function assembleQuote(
  formData: FormData,
  graph: UserKnowledgeGraph,
  funnelResult: FunnelResult | null,
  input: QuoteAssemblyInput,
): Quote {
  const { pricingResult, selectedTierIndex, recipient, currency = "ILS", validityDays = 14 } = input;

  const tier = pricingResult.tierStructure.tiers[selectedTierIndex] ?? pricingResult.tierStructure.tiers[0];
  const isB2B = formData.audienceType === "b2b" || formData.audienceType === "both";

  const lineItems = tierToLineItems(tier);
  const mainItem: QuoteLineItem = {
    id: "li-main",
    name: tier.name,
    description: undefined,
    quantity: 1,
    unitPrice: applyCharmPricing(tier.price, isB2B),
    total: applyCharmPricing(tier.price, isB2B),
  };
  const allLineItems = [mainItem, ...lineItems];

  const { subtotal, total } = calculateQuoteTotal(allLineItems);

  let hormozi: HormoziValueResult | null = null;
  try { hormozi = calculateValueScore(formData, graph); } catch { /* graceful */ }

  let coi: CostOfInaction | null = null;
  if (funnelResult) {
    try { coi = calculateCostOfInaction(funnelResult); } catch { /* graceful */ }
  }

  let disc: DISCProfile | null = null;
  try { disc = inferDISCProfile(formData, graph); } catch { /* graceful */ }

  const valueNarrative = buildValueNarrative(hormozi, coi, "he");
  const discAdaptedFraming = disc ? DISC_FRAMING[disc.primary] : DISC_FRAMING.D;

  const urgencyBlock: BilingualText | undefined = coi
    ? { he: coi.urgencyMessage.he, en: coi.urgencyMessage.en }
    : undefined;

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + validityDays);

  const proposalScript = pricingResult.priceFramingScripts.find(s => s.context === "proposal");
  const headline: BilingualText = proposalScript
    ? proposalScript.label
    : { he: "הצעת מחיר", en: "Price Proposal" };

  return {
    id: generateId(),
    createdAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    status: "draft",
    recipient,
    headline,
    selectedTier: tier,
    lineItems: allLineItems,
    bonuses: pricingResult.offerStack.bonuses,
    guarantee: pricingResult.guarantee,
    subtotal,
    total,
    currency,
    paymentTerms: undefined,
    discount: undefined,
    valueNarrative,
    discAdaptedFraming,
    urgencyBlock,
    notes: undefined,
    signatureRequested: false,
  };
}

export function generateQuoteFromScratch(
  formData: FormData,
  graph: UserKnowledgeGraph,
  funnelResult: FunnelResult | null,
  recipient: QuoteRecipient,
  selectedTierIndex?: number,
): Quote {
  const pricingResult = generatePricingIntelligence(formData, graph);
  const tierIdx = selectedTierIndex ?? pricingResult.tierStructure.highlightedTierIndex;

  return assembleQuote(formData, graph, funnelResult, {
    pricingResult,
    selectedTierIndex: tierIdx,
    recipient,
  });
}
