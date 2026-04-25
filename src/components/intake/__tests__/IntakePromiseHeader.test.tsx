// ═══════════════════════════════════════════════
// Tests for IntakePromiseHeader — the Phase-2 surface that shows the
// promised opening at the top of each module entry.
//
// All three short-circuit conditions are exercised:
//   1. No signal → null
//   2. Signal target ≠ moduleTarget → null
//   3. suppress=true → null
// And the happy path (signal matches, no suppress).
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IntakePromiseHeader from "../IntakePromiseHeader";
import { setIntakeSignal } from "@/engine/intake/intakeSignal";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe("IntakePromiseHeader", () => {
  it("renders nothing when no intake signal exists", () => {
    const { container } = render(<IntakePromiseHeader moduleTarget="/sales" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signal target differs from moduleTarget", () => {
    setIntakeSignal("time", "product"); // → /differentiate
    const { container } = render(<IntakePromiseHeader moduleTarget="/sales" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when suppress=true even if signal matches", () => {
    setIntakeSignal("time", "sales"); // → /sales
    const { container } = render(
      <IntakePromiseHeader moduleTarget="/sales" suppress />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders headline + kicker + minutes when signal matches moduleTarget", () => {
    setIntakeSignal("time", "sales"); // → /sales, 20-min promise
    render(<IntakePromiseHeader moduleTarget="/sales" />);
    // Headline (English, since useLanguage mocked to "en")
    expect(screen.getByText(/sales script/i)).toBeInTheDocument();
    // Kicker
    expect(screen.getByText(/one script that fits/i)).toBeInTheDocument();
    // Minutes badge
    expect(screen.getByText(/~20 min/i)).toBeInTheDocument();
  });

  it("renders different content for different needs (tone differentiation)", () => {
    setIntakeSignal("attention", "marketing"); // → /wizard, attention tone
    render(<IntakePromiseHeader moduleTarget="/wizard" />);
    expect(screen.getByText(/hook that stops the right people/i)).toBeInTheDocument();
  });
});
