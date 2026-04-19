import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifferentiationPhaseCard from "../DifferentiationPhaseCard";
import type { PhaseQuestion, DifferentiationFormData } from "@/types/differentiation";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/engine/differentiationKnowledge", () => ({
  HIDDEN_VALUES: [],
  COMPETITOR_ARCHETYPES: [],
  BUYING_COMMITTEE_ROLES: [],
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const baseFormData: DifferentiationFormData = {
  businessName: "Test Co",
  industry: "SaaS",
  currentPositioning: "",
  topCompetitors: [],
  competitorArchetypes: [],
  buyingCommitteeMap: [],
  claimExamples: [],
  hiddenValues: [],
  primaryDifferentiator: "",
  uniqueProcess: "",
  proofPoints: "",
  targetEnemy: "",
  antiCustomer: "",
  desiredPerception: "",
} as unknown as DifferentiationFormData;

const textQuestion: PhaseQuestion = {
  id: "businessName",
  type: "text",
  label: { he: "שם עסק", en: "Business Name" },
  required: true,
} as unknown as PhaseQuestion;

const textareaQuestion: PhaseQuestion = {
  id: "currentPositioning",
  type: "textarea",
  label: { he: "מיצוב", en: "Positioning" },
  helperText: { he: "תאר", en: "Describe it" },
} as unknown as PhaseQuestion;

const selectQuestion: PhaseQuestion = {
  id: "primaryDifferentiator",
  type: "select",
  label: { he: "בידול", en: "Differentiator" },
  options: [
    { value: "speed", label: { he: "מהירות", en: "Speed" } },
    { value: "quality", label: { he: "איכות", en: "Quality" } },
  ],
} as unknown as PhaseQuestion;

describe("DifferentiationPhaseCard", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <DifferentiationPhaseCard
        questions={[textQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders a text input for text questions", () => {
    render(
      <DifferentiationPhaseCard
        questions={[textQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows the question label", () => {
    render(
      <DifferentiationPhaseCard
        questions={[textQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Business Name")).toBeTruthy();
  });

  it("shows required asterisk for required fields", () => {
    render(
      <DifferentiationPhaseCard
        questions={[textQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("*")).toBeTruthy();
  });

  it("renders a textarea for textarea questions", () => {
    render(
      <DifferentiationPhaseCard
        questions={[textareaQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByText("Describe it")).toBeTruthy();
  });

  it("renders select buttons for select questions", () => {
    render(
      <DifferentiationPhaseCard
        questions={[selectQuestion]}
        formData={baseFormData}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Speed")).toBeTruthy();
    expect(screen.getByText("Quality")).toBeTruthy();
  });

  it("calls onUpdate when a select option is clicked", () => {
    const onUpdate = vi.fn();
    render(
      <DifferentiationPhaseCard
        questions={[selectQuestion]}
        formData={baseFormData}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByText("Speed"));
    expect(onUpdate).toHaveBeenCalledWith({ primaryDifferentiator: "speed" });
  });

  it("calls onUpdate when text input changes", () => {
    const onUpdate = vi.fn();
    render(
      <DifferentiationPhaseCard
        questions={[textQuestion]}
        formData={baseFormData}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New Name" } });
    expect(onUpdate).toHaveBeenCalledWith({ businessName: "New Name" });
  });
});
