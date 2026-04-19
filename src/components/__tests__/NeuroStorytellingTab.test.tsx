import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NeuroStorytellingTab from "../NeuroStorytellingTab";
import type { NeuroStorytellingData } from "@/types/funnel";

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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

const mockData: NeuroStorytellingData = {
  axiom: { he: "ציר כלשהו", en: "Some axiom text" },
  vectors: [
    {
      id: "cortisol",
      emoji: "🔴",
      name: { he: "קורטיזול", en: "Cortisol" },
      biologicalFunction: { he: "תגובת לחץ", en: "Stress response" },
      copyApplication: { he: "מתח ורגש", en: "Tension and emotion" },
      intensityTips: [{ he: "עצה 1", en: "Tip 1" }],
    },
  ],
  promptTemplates: [
    {
      stage: "awareness",
      stageName: { he: "מודעות", en: "Awareness" },
      vectors: ["cortisol"],
      template: { he: "תבנית עברית", en: "English template" },
    },
  ],
  entropyGuide: {
    definition: { he: "הגדרה", en: "Definition of entropy" },
    overloadSigns: [{ he: "עומס רב", en: "Too much noise" }],
    collapseSigns: [{ he: "ריק", en: "Too empty" }],
    balanceTips: [{ he: "איזון", en: "Balance things" }],
  },
};

describe("NeuroStorytellingTab", () => {
  it("renders without crashing", () => {
    expect(() => render(<NeuroStorytellingTab data={mockData} />)).not.toThrow();
  });

  it("shows the axiom text", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("Some axiom text")).toBeInTheDocument();
  });

  it("shows the neuroAxiom label key", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("neuroAxiom")).toBeInTheDocument();
  });

  it("shows the Cortisol vector card", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("Cortisol")).toBeInTheDocument();
  });

  it("shows the prompt generator section", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("neuroPromptGenerator")).toBeInTheDocument();
  });

  it("shows the Awareness stage button", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getAllByText("Awareness")[0]).toBeInTheDocument();
  });

  it("shows the entropy guide definition", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("Definition of entropy")).toBeInTheDocument();
  });

  it("shows overload and collapse signs", () => {
    render(<NeuroStorytellingTab data={mockData} />);
    expect(screen.getByText("• Too much noise")).toBeInTheDocument();
    expect(screen.getByText("• Too empty")).toBeInTheDocument();
  });
});
