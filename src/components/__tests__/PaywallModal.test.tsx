import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PaywallModal from "../PaywallModal";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (key: string) => key, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    setTier: vi.fn(),
    isLocalAuth: true,
  }),
}));

describe("PaywallModal", () => {
  it("shows feature name and required tier when open", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={() => {}}
        feature="aiCoachMessages"
        requiredTier="pro"
      />
    );
    expect(screen.getByText("Upgrade Your Account")).toBeInTheDocument();
    expect(screen.getByText(/AI Marketing Coach is available in the Pro plan/)).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <PaywallModal
        open={false}
        onOpenChange={() => {}}
        feature="aiCoachMessages"
        requiredTier="pro"
      />
    );
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });

  it("shows business tier for business features", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={() => {}}
        feature="campaignCockpit"
        requiredTier="business"
      />
    );
    expect(screen.getByText("Upgrade to Business")).toBeInTheDocument();
    expect(screen.getByText("₪249/month")).toBeInTheDocument();
  });

  it("shows cancel anytime text", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={() => {}}
        feature="pdfExport"
        requiredTier="pro"
      />
    );
    expect(screen.getByText("Cancel anytime")).toBeInTheDocument();
  });
});
