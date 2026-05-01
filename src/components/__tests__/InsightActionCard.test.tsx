import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InsightActionCard } from "../InsightActionCard";
import type { InsightActionCardProps } from "../InsightActionCard";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" as const, t: (k: string) => k, isRTL: false }),
}));
vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));
vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const BASE_PROPS: InsightActionCardProps = {
  module: { he: "מכירות", en: "Sales" },
  answer: { he: "תשובה בעברית", en: "The answer in English" },
  why: { he: "למה בעברית", en: "Because of data X" },
  confidence: "stable",
  confidenceReason: { he: "בטוח", en: "Based on stable data" },
  checkOptions: [
    { label: { he: "מדויק", en: "Accurate" }, action: "accept" },
    { label: { he: "לא מדויק", en: "Needs work" }, action: "reject" },
    { label: { he: "חד יותר", en: "Sharpen" }, action: "refine" },
  ],
  onCheck: vi.fn(),
};

describe("InsightActionCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<InsightActionCard {...BASE_PROPS} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the answer text", () => {
    render(<InsightActionCard {...BASE_PROPS} />);
    expect(screen.getByText("The answer in English")).toBeTruthy();
  });

  it("shows the why text", () => {
    render(<InsightActionCard {...BASE_PROPS} />);
    expect(screen.getByText("Because of data X")).toBeTruthy();
  });

  it("shows confidence badge when userState is not confused", () => {
    render(<InsightActionCard {...BASE_PROPS} userState="ready" />);
    expect(screen.getByText("Stable")).toBeTruthy();
  });

  it("hides confidence badge when userState is confused", () => {
    render(<InsightActionCard {...BASE_PROPS} userState="confused" />);
    expect(screen.queryByText("Stable")).toBeNull();
  });

  it("calls onCheck with correct action when a CHECK button is clicked", () => {
    const onCheck = vi.fn();
    render(<InsightActionCard {...BASE_PROPS} onCheck={onCheck} />);
    fireEvent.click(screen.getByText("Accurate"));
    expect(onCheck).toHaveBeenCalledWith("accept");
    fireEvent.click(screen.getByText("Needs work"));
    expect(onCheck).toHaveBeenCalledWith("reject");
    fireEvent.click(screen.getByText("Sharpen"));
    expect(onCheck).toHaveBeenCalledWith("refine");
  });

  it("prefixes answer with 'What if:' when userState is resistant", () => {
    render(<InsightActionCard {...BASE_PROPS} userState="resistant" />);
    expect(screen.getByText(/What if:/)).toBeTruthy();
  });

  it("renders copy items with their labels when useItCopy is provided", () => {
    render(
      <InsightActionCard
        {...BASE_PROPS}
        useItCopy={[
          { label: { he: "חתימה", en: "Email signature" }, text: { he: "טקסט", en: "Copy text" } },
        ]}
      />,
    );
    expect(screen.getByText("Email signature")).toBeTruthy();
    expect(screen.getByText("Copy")).toBeTruthy();
  });

  it("renders useItNarrative when provided", () => {
    render(
      <InsightActionCard
        {...BASE_PROPS}
        useItNarrative={{ he: "בצע פעולה א", en: "Take action A" }}
      />,
    );
    expect(screen.getByText("Take action A")).toBeTruthy();
  });

  it("renders drillDown content when provided", () => {
    render(
      <InsightActionCard
        {...BASE_PROPS}
        drillDown={<div>Drill down content</div>}
      />,
    );
    expect(screen.getByText("Drill down content")).toBeTruthy();
  });

  it("shows correct CHECK prompt per userState", () => {
    const { rerender } = render(<InsightActionCard {...BASE_PROPS} userState="ready" />);
    expect(screen.getByText("Ready to go?")).toBeTruthy();

    rerender(<InsightActionCard {...BASE_PROPS} userState="confused" />);
    expect(screen.getByText("Does this feel right?")).toBeTruthy();

    rerender(<InsightActionCard {...BASE_PROPS} userState="resistant" />);
    expect(screen.getByText("What feels off?")).toBeTruthy();

    rerender(<InsightActionCard {...BASE_PROPS} userState="disbelieving" />);
    expect(screen.getByText("What would need to be true?")).toBeTruthy();
  });
});

// ─── Crash safety ─────────────────────────────────────────────────────────────

describe("InsightActionCard — crash safety", () => {
  it("renders without crashing when optional props are omitted", () => {
    expect(() =>
      render(<InsightActionCard {...BASE_PROPS} />),
    ).not.toThrow();
  });

  it("renders without crashing with empty checkOptions", () => {
    expect(() =>
      render(<InsightActionCard {...BASE_PROPS} checkOptions={[]} />),
    ).not.toThrow();
  });
});
