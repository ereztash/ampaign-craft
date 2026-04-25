// ═══════════════════════════════════════════════
// Tests for IntakeReframeBanner — Phase-3 gated surface that offers
// re-take when stated need diverges from observed behavior.
// Two activation gates exercised:
//   1. VITE_INTAKE_FEEDBACK_ENABLED off  → null
//   2. detectBehaviorMismatch() returns no mismatch → null
//   3. Both conditions met → renders + dismiss works
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IntakeReframeBanner from "../IntakeReframeBanner";
import { setIntakeSignal } from "@/engine/intake/intakeSignal";
import { recordRouteVisit } from "@/engine/intake/feedbackLoop";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const renderBanner = () =>
  render(
    <MemoryRouter>
      <IntakeReframeBanner />
    </MemoryRouter>,
  );

describe("IntakeReframeBanner", () => {
  it("renders nothing when feature flag is off", () => {
    vi.stubEnv("VITE_INTAKE_FEEDBACK_ENABLED", "");
    setIntakeSignal("time", "sales");
    // create a clear mismatch
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when flag on but no mismatch", () => {
    vi.stubEnv("VITE_INTAKE_FEEDBACK_ENABLED", "true");
    setIntakeSignal("time", "sales");
    recordRouteVisit("/sales");
    recordRouteVisit("/sales");
    recordRouteVisit("/sales");
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders banner when flag on AND mismatch detected", () => {
    vi.stubEnv("VITE_INTAKE_FEEDBACK_ENABLED", "true");
    setIntakeSignal("time", "sales");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    renderBanner();
    expect(screen.getByTestId("intake-reframe-retake")).toBeInTheDocument();
    expect(screen.getByTestId("intake-reframe-dismiss")).toBeInTheDocument();
  });

  it("hides on dismiss click", () => {
    vi.stubEnv("VITE_INTAKE_FEEDBACK_ENABLED", "true");
    setIntakeSignal("time", "sales");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    recordRouteVisit("/differentiate");
    renderBanner();
    fireEvent.click(screen.getByTestId("intake-reframe-dismiss"));
    expect(screen.queryByTestId("intake-reframe-retake")).not.toBeInTheDocument();
  });
});
