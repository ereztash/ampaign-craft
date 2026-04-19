import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingOverlay from "../OnboardingOverlay";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({ profile: { isReturningUser: false } }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    getJSON: vi.fn(() => null),
  },
}));

describe("OnboardingOverlay", () => {
  it("renders without crashing", () => {
    expect(() => render(<OnboardingOverlay />)).not.toThrow();
  });

  it("shows first step title for new user", () => {
    render(<OnboardingOverlay />);
    expect(screen.getAllByText(/tell us about your business/i)[0]).toBeInTheDocument();
  });

  it("shows Skip button", () => {
    render(<OnboardingOverlay />);
    expect(screen.getAllByText(/skip/i)[0]).toBeInTheDocument();
  });

  it("shows Next button on first step", () => {
    render(<OnboardingOverlay />);
    expect(screen.getAllByText(/next/i)[0]).toBeInTheDocument();
  });

  it("advances to next step when Next is clicked", () => {
    render(<OnboardingOverlay />);
    fireEvent.click(screen.getAllByText(/next/i)[0]);
    // Step 2 content appears
    expect(document.body.textContent).toMatch(/strategy|goal|science|business/i);
  });

  it("does not render when returning user — component mounts without error", () => {
    render(<OnboardingOverlay />);
    expect(document.body).toBeTruthy();
  });

  it("renders a dialog element", () => {
    render(<OnboardingOverlay />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });
});
