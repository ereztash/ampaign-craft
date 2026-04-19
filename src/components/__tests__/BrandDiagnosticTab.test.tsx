import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrandDiagnosticTab from "../BrandDiagnosticTab";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/lib/colorSemantics", () => ({
  getDiagnosticTierColor: () => ({ bg: "bg-green-100", text: "text-green-800", border: "border-green-200" }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("BrandDiagnosticTab", () => {
  it("renders without crashing", () => {
    render(<BrandDiagnosticTab />);
    expect(screen.getByText("Brand DNA Assessment")).toBeInTheDocument();
  });

  it("shows section tabs", () => {
    render(<BrandDiagnosticTab />);
    expect(screen.getByText("Positioning Clarity")).toBeInTheDocument();
    expect(screen.getByText("Competitive Landscape")).toBeInTheDocument();
    expect(screen.getByText("Signal Strength")).toBeInTheDocument();
    expect(screen.getByText("Authenticity & Network")).toBeInTheDocument();
  });

  it("shows questions for the positioning section", () => {
    render(<BrandDiagnosticTab />);
    expect(
      screen.getByText("Can you describe your niche in one sentence?")
    ).toBeInTheDocument();
  });

  it("shows progress bar", () => {
    render(<BrandDiagnosticTab />);
    expect(screen.getByText(/0\/16/)).toBeInTheDocument();
  });

  it("shows Next button", () => {
    render(<BrandDiagnosticTab />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("disables Previous button on first section", () => {
    render(<BrandDiagnosticTab />);
    const prevBtn = screen.getByText("Previous");
    expect(prevBtn.closest("button")).toBeDisabled();
  });

  it("navigates to next section on Next click", () => {
    render(<BrandDiagnosticTab />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Are you operating in a Blue Ocean (unique market) or Red Ocean (saturated)?")).toBeInTheDocument();
  });

  it("shows Calculate Score button on last section", () => {
    render(<BrandDiagnosticTab />);
    fireEvent.click(screen.getByText("Next")); // → competitive
    fireEvent.click(screen.getByText("Next")); // → signals
    fireEvent.click(screen.getByText("Next")); // → authenticity
    expect(screen.getByText("Calculate Score")).toBeInTheDocument();
  });
});
