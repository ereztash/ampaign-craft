import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NeuroClosingCard } from "../NeuroClosingCard";
import type { NeuroClosingStrategy } from "@/engine/neuroClosingEngine";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockStrategy: NeuroClosingStrategy = {
  closingStyle: { he: "ישיר", en: "Direct" },
  objectionHandlers: [
    {
      objection: { he: "יקר מדי", en: "Too expensive" },
      response: { he: "ערך מעל למחיר", en: "Value exceeds price" },
      technique: "reframe",
    },
  ],
  pricePresentation: {
    strategy: { he: "ערך", en: "Value" },
    anchor: { he: "₪5000", en: "₪5000" },
    framing: { he: "השקעה", en: "Investment" },
  },
  followUpSequence: [
    {
      day: 1,
      channel: "email",
      action: { he: "שלח מייל", en: "Send email" },
      template: { he: "שלום!", en: "Hello!" },
    },
  ],
  urgencyTactics: [
    { he: "מחיר מוגבל לזמן", en: "Limited time price" },
  ],
  trustSignals: [
    { he: "100 לקוחות מרוצים", en: "100 happy clients" },
  ],
};

describe("NeuroClosingCard", () => {
  it("renders without crashing", () => {
    expect(() => render(<NeuroClosingCard strategy={mockStrategy} />)).not.toThrow();
  });

  it("shows the Neuro-Closing Strategy title", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Neuro-Closing Strategy")).toBeInTheDocument();
  });

  it("shows the closing style badge", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Direct")).toBeInTheDocument();
  });

  it("shows Price Presentation section", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Price Presentation")).toBeInTheDocument();
  });

  it("shows Urgency Tactics and Trust Signals sections", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Urgency Tactics")).toBeInTheDocument();
    expect(screen.getByText("Trust Signals")).toBeInTheDocument();
  });

  it("shows objection handlers collapsible trigger", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Objection Handlers")).toBeInTheDocument();
  });

  it("shows follow-up sequence items", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("Follow-Up Sequence")).toBeInTheDocument();
    expect(screen.getByText("Day 1")).toBeInTheDocument();
  });

  it("shows urgency tactic text content", () => {
    render(<NeuroClosingCard strategy={mockStrategy} />);
    expect(screen.getByText("• Limited time price")).toBeInTheDocument();
  });
});
