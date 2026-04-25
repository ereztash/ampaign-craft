// ═══════════════════════════════════════════════
// Tests for the /intake 2-question wizard.
//
// Strategy: render with MemoryRouter + a controllable navigate spy.
// The matrix logic is already tested in intakeMatrix.test.ts —
// this file only verifies wiring (step transitions, signal write,
// route target).
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Intake from "../Intake";

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

beforeEach(() => {
  localStorage.clear();
  navigateSpy.mockReset();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Intake />
    </MemoryRouter>,
  );

describe("Intake wizard", () => {
  it("starts on the need step", () => {
    renderPage();
    expect(screen.getByText("What's missing most right now?")).toBeInTheDocument();
    expect(screen.getByTestId("intake-need-time")).toBeInTheDocument();
    expect(screen.getByTestId("intake-need-money")).toBeInTheDocument();
    expect(screen.getByTestId("intake-need-attention")).toBeInTheDocument();
  });

  it("advances to pain step after picking a need", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("intake-need-time"));
    expect(await screen.findByTestId("intake-pain-product")).toBeInTheDocument();
  });

  it("advances to confirm step after picking pain, showing the resolved promise", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("intake-need-time"));
    fireEvent.click(await screen.findByTestId("intake-pain-product"));
    // time × product → 10-min differentiation promise
    expect(await screen.findByTestId("intake-confirm")).toBeInTheDocument();
    expect(screen.getByText(/10 minutes/i)).toBeInTheDocument();
  });

  it("on confirm: persists the signal and navigates to the routing target", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("intake-need-money"));
    fireEvent.click(await screen.findByTestId("intake-pain-sales"));
    fireEvent.click(await screen.findByTestId("intake-confirm"));

    // Persistence
    const stored = localStorage.getItem("funnelforge-intake-signal");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.need).toBe("money");
    expect(parsed.pain).toBe("sales");
    expect(parsed.routing.target).toBe("/sales");

    // Navigation
    expect(navigateSpy).toHaveBeenCalledWith("/sales");
  });

  it.each([
    ["finance", "/pricing"],
    ["product", "/differentiate"],
    ["sales", "/sales"],
    ["marketing", "/wizard"],
  ])("pain=%s routes to %s on confirm", async (pain, expected) => {
    navigateSpy.mockReset();
    localStorage.clear();
    renderPage();
    fireEvent.click(screen.getByTestId("intake-need-time"));
    fireEvent.click(await screen.findByTestId(`intake-pain-${pain}`));
    fireEvent.click(await screen.findByTestId("intake-confirm"));
    expect(navigateSpy).toHaveBeenCalledWith(expected);
  });
});
