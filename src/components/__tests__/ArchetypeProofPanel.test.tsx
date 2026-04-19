import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchetypeProofPanel } from "../ArchetypeProofPanel";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    profile: {
      archetypeId: "strategist",
      confidence: 0.85,
      confidenceTier: "strong",
    },
  }),
}));

vi.mock("@/lib/archetypeUIConfig", () => ({
  getArchetypeUIConfig: (id: string) => ({
    defaultTab: id === "strategist" ? "analytics" : "content",
    ctaTone: id === "strategist" ? "analytical" : "urgency",
    informationDensity: id === "strategist" ? "high" : "low",
    prominentModules: id === "strategist" ? ["analytics", "data"] : ["content", "retention"],
    personalityProfile: {
      regulatoryFocus: id === "strategist" ? "promotion" : "prevention",
      processingStyle: id === "strategist" ? "systematic" : "heuristic",
    },
    adaptationDescription: {
      he: `תיאור ${id}`,
      en: `Description for ${id}`,
    },
    modulesOrder: id === "strategist"
      ? ["differentiate", "wizard", "sales"]
      : ["retention", "sales", "differentiate"],
  }),
}));

describe("ArchetypeProofPanel", () => {
  it("renders without crashing", () => {
    render(<ArchetypeProofPanel />);
    expect(
      screen.getByText("Proof: Your archetype changes recommendations, not just styling")
    ).toBeInTheDocument();
  });

  it("shows compare with label", () => {
    render(<ArchetypeProofPanel />);
    expect(screen.getByText("Compare with:")).toBeInTheDocument();
  });

  it("shows contrast archetype buttons", () => {
    render(<ArchetypeProofPanel />);
    // For strategist, contrast options are optimizer, pioneer, connector, closer
    expect(screen.getByText(/The Optimizer/)).toBeInTheDocument();
    expect(screen.getByText(/The Pioneer/)).toBeInTheDocument();
  });

  it("shows All and Different tabs", () => {
    render(<ArchetypeProofPanel />);
    expect(screen.getByText(/All/)).toBeInTheDocument();
    expect(screen.getByText(/Different/)).toBeInTheDocument();
  });

  it("shows parameter table headers", () => {
    render(<ArchetypeProofPanel />);
    expect(screen.getByText("Parameter")).toBeInTheDocument();
  });

  it("shows confidence badge", () => {
    render(<ArchetypeProofPanel />);
    expect(screen.getByText("Classification confidence:")).toBeInTheDocument();
  });

  it("changes contrast archetype on button click", () => {
    render(<ArchetypeProofPanel />);
    const pioneerBtn = screen.getByText(/The Pioneer/);
    fireEvent.click(pioneerBtn);
    // Panel should still be visible
    expect(screen.getByText("Parameter")).toBeInTheDocument();
  });
});
