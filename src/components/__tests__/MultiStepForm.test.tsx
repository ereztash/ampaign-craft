import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiStepForm from "../MultiStepForm";

// Language context in English so the validation error surfaces its
// English string, which is straightforward to assert on.
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    isRTL: false,
    t: (key: string) => {
      const labels: Record<string, string> = {
        back: "Back",
        next: "Next",
        skip: "Skip",
        generateFunnel: "Generate",
        fieldFashion: "Fashion",
        fieldTech: "Tech",
        fieldFood: "Food",
        fieldServices: "Services",
        fieldEducation: "Education",
        fieldHealth: "Health",
        fieldRealEstate: "Real Estate",
        fieldTourism: "Tourism",
        fieldPersonalBrand: "Personal brand",
        fieldOther: "Other",
      };
      return labels[key] ?? key;
    },
  }),
}));

// Fresh user profile with no prior form data — form starts clean.
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({
    profile: {
      lastFormData: null,
      isReturningUser: false,
    },
    updateFormData: vi.fn(),
  }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("MultiStepForm — inline validation error surface", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not show a validation error before the user attempts Next", () => {
    render(<MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />);

    // The Next button is visible, but no alert has been surfaced yet.
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the bilingual reason when Next is clicked on an empty step", () => {
    render(<MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />);

    // Click Next without selecting anything — this should surface the
    // businessField validation error.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // The alert appears with the English reason copy.
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent?.toLowerCase()).toContain("business field");
  });

  it("marks the Next button aria-invalid after a failed attempt", () => {
    render(<MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    // After the failed click the button exposes the invalid state and
    // points to the error container via aria-describedby.
    expect(nextBtn).toHaveAttribute("aria-invalid", "true");
    expect(nextBtn).toHaveAttribute("aria-describedby", "form-validation-error");
  });

  it("does not call onComplete when the current step is invalid", () => {
    const onComplete = vi.fn();
    render(<MultiStepForm onComplete={onComplete} onBack={vi.fn()} />);

    // Clicking Next with no selection must not resolve to onComplete.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("clears the error once the user selects a valid option and clicks Next", () => {
    render(<MultiStepForm onComplete={vi.fn()} onBack={vi.fn()} />);

    // First attempt fails → error appears
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Pick a business field to satisfy the validator.
    fireEvent.click(screen.getByText("Tech"));

    // Click Next again — now the step advances and the error is gone.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
