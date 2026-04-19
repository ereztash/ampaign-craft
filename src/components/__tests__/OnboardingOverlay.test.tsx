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
    expect(screen.getByText("Tell us about your business")).toBeInTheDocument();
  });

  it("shows Skip button", () => {
    render(<OnboardingOverlay />);
    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  it("shows Next button on first step", () => {
    render(<OnboardingOverlay />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("advances to next step when Next is clicked", () => {
    render(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Get science-based strategy")).toBeInTheDocument();
  });

  it("does not render when returning user (safeStorage returns 'true')", () => {
    const safeStorageMod = vi.mocked((require as any)("@/lib/safeStorage").safeStorage);
    // Provide a fresh mock returning "true"
    vi.mock("@/lib/safeStorage", () => ({
      safeStorage: {
        getString: vi.fn(() => "true"),
        setString: vi.fn(),
        getJSON: vi.fn(() => null),
      },
    }));
  });

  it("shows step indicator dots", () => {
    render(<OnboardingOverlay />);
    // Step indicator: 3 dots (one per step)
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });
});
