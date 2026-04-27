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
    remove: vi.fn(),
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
      </MemoryRouter>,
    );
    expect(screen.getByText("Privacy & Consent")).toBeInTheDocument();
  });

  it("shows accept-all and reject-all buttons (Planet49 / GDPR symmetric choice)", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    expect(screen.getByText("Accept all")).toBeInTheDocument();
    expect(screen.getByText("Reject all")).toBeInTheDocument();
    expect(screen.getByText("Customize")).toBeInTheDocument();
  });

  it("shows privacy policy and subprocessors links", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    expect(screen.getByText("Privacy policy")).toBeInTheDocument();
    expect(screen.getByText("Subprocessors")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
  });

  it("does NOT pre-tick any checkbox (Planet49 compliance)", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Customize"));
    const checkboxes = document.querySelectorAll('[role="checkbox"]');
    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute("aria-checked", "false");
    });
  });

  it("calls onAccept when Accept all is clicked", () => {
    const onAccept = vi.fn();
    render(
      <MemoryRouter>
        <ConsentBanner onAccept={onAccept} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Accept all"));
    expect(onAccept).toHaveBeenCalled();
  });

  it("calls onAccept when Reject all is clicked", () => {
    const onAccept = vi.fn();
    render(
      <MemoryRouter>
        <ConsentBanner onAccept={onAccept} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Reject all"));
    expect(onAccept).toHaveBeenCalled();
  });

  it("toggles to detailed view via Customize", () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Customize"));
    expect(screen.getByText("Save selection")).toBeInTheDocument();
    expect(screen.getByText("Necessary processing")).toBeInTheDocument();
    // The granular AI/marketing toggles are rendered.
    expect(screen.getByText("AI improvement")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });
});
