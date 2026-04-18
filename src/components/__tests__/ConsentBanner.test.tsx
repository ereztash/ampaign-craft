import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConsentBanner from "../ConsentBanner";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

// Mock safeStorage to simulate no consent yet
vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn().mockReturnValue(null),
    setJSON: vi.fn(),
  },
}));

describe("ConsentBanner", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("Privacy & Terms of Service")).toBeInTheDocument();
  });

  it("shows data processing text", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    expect(
      screen.getByText(
        "We process your business and marketing information to provide personalized recommendations. Data is stored securely and not shared with third parties."
      )
    ).toBeInTheDocument();
  });

  it("shows privacy policy link", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("Privacy policy")).toBeInTheDocument();
  });

  it("shows terms link", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("Terms")).toBeInTheDocument();
  });

  it("shows accept button", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("Accept & Continue")).toBeInTheDocument();
  });

  it("shows data processing checkbox checked by default", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    );
    const checkboxes = document.querySelectorAll('[role="checkbox"]');
    // First checkbox (data processing) should be checked
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
  });

  it("calls onAccept when accept button clicked", () => {
    const onAccept = vi.fn();
    render(
      <MemoryRouter>
        <ConsentBanner onAccept={onAccept} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Accept & Continue"));
    expect(onAccept).toHaveBeenCalled();
  });
});
