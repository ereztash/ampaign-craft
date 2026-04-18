import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MetaConnect from "../MetaConnect";
import type { MetaAdAccount } from "@/types/meta";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const defaultProps = {
  connected: false,
  loading: false,
  error: null,
  accounts: [] as MetaAdAccount[],
  selectedAccountId: null,
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onSelectAccount: vi.fn(),
  disabled: false,
};

describe("MetaConnect", () => {
  it("renders without crashing", () => {
    const { container } = render(<MetaConnect {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows Connect Meta Ads Account when not connected", () => {
    render(<MetaConnect {...defaultProps} />);
    expect(screen.getByText(/connect meta ads account/i)).toBeTruthy();
  });

  it("shows Continue with Facebook button when not connected", () => {
    render(<MetaConnect {...defaultProps} />);
    expect(screen.getByText(/continue with facebook/i)).toBeTruthy();
  });

  it("calls onConnect when Facebook button is clicked", () => {
    const onConnect = vi.fn();
    render(<MetaConnect {...defaultProps} onConnect={onConnect} />);
    fireEvent.click(screen.getByText(/continue with facebook/i));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("shows loading state", () => {
    render(<MetaConnect {...defaultProps} loading={true} />);
    expect(screen.getByText(/connecting to meta/i)).toBeTruthy();
  });

  it("shows error message when error is set", () => {
    render(<MetaConnect {...defaultProps} error="Auth failed" />);
    expect(screen.getByText("Auth failed")).toBeTruthy();
  });

  it("shows disabled state", () => {
    render(<MetaConnect {...defaultProps} disabled={true} />);
    expect(screen.getByText(/meta ads integration is currently unavailable/i)).toBeTruthy();
  });

  it("shows connected state with accounts", () => {
    const accounts: MetaAdAccount[] = [
      { id: "act_123", name: "My Ad Account", currency: "USD", status: 1, timezone: "UTC" },
    ];
    render(
      <MetaConnect
        {...defaultProps}
        connected={true}
        accounts={accounts}
      />,
    );
    expect(screen.getByText(/connected to meta ads/i)).toBeTruthy();
    expect(screen.getByText("My Ad Account")).toBeTruthy();
  });

  it("shows Disconnect button when connected", () => {
    render(<MetaConnect {...defaultProps} connected={true} />);
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeTruthy();
  });
});
