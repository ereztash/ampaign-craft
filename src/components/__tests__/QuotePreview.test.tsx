import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import QuotePreview from "../QuotePreview";
import type { Quote } from "@/types/quote";

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

const mockQuote: Quote = {
  id: "Q-001",
  status: "draft",
  createdAt: new Date("2024-01-15").toISOString(),
  validUntil: new Date("2024-02-15").toISOString(),
  headline: { he: "הצעת מחיר", en: "Service Proposal" },
  recipient: { name: "John Doe", company: "Acme Inc", role: "CTO" },
  discAdaptedFraming: { he: "מסגור DISC", en: "DISC-adapted framing text" },
  valueNarrative: { he: "נרטיב ערך", en: "Value narrative text here" },
  lineItems: [
    {
      id: "li-1",
      name: { he: "שירות", en: "Consulting Service" },
      quantity: 1,
      unitPrice: 5000,
      total: 5000,
    },
  ],
  subtotal: 5000,
  total: 5000,
  currency: "ILS",
  bonuses: [],
  guarantee: {
    label: { he: "ערבות", en: "Money-back guarantee" },
    script: { he: "אנחנו מבטיחים", en: "We guarantee your satisfaction" },
    duration: "30 days",
    trustScore: 9,
  },
  urgencyBlock: null,
  paymentTerms: "50% upfront",
  notes: "Some notes",
};

describe("QuotePreview", () => {
  it("renders without crashing", () => {
    expect(() =>
      render(<QuotePreview quote={mockQuote} language="en" />),
    ).not.toThrow();
  });

  it("shows the headline", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("Service Proposal")).toBeInTheDocument();
  });

  it("shows the recipient name", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows the recipient company", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("shows the line item name", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("Consulting Service")).toBeInTheDocument();
  });

  it("shows the guarantee label", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("Money-back guarantee")).toBeInTheDocument();
  });

  it("shows payment terms", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText("50% upfront")).toBeInTheDocument();
  });

  it("shows the quote ID", () => {
    render(<QuotePreview quote={mockQuote} language="en" />);
    expect(screen.getByText(/Quote #Q-001/)).toBeInTheDocument();
  });
});
