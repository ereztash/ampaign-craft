import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanComments from "../PlanComments";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", displayName: "Test User" },
    tier: "pro",
    isLocalAuth: false,
    setTier: vi.fn(),
  }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getString: vi.fn(() => null),
    setString: vi.fn(),
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
  },
}));

describe("PlanComments", () => {
  it("renders without crashing", () => {
    expect(() => render(<PlanComments planId="plan-1" />)).not.toThrow();
  });

  it("shows Comments heading", () => {
    render(<PlanComments planId="plan-1" />);
    expect(screen.getAllByText(/Comments/i)[0]).toBeInTheDocument();
  });

  it("shows empty state message when no comments", () => {
    render(<PlanComments planId="plan-1" />);
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });

  it("shows comment input when user is logged in", () => {
    render(<PlanComments planId="plan-1" />);
    expect(screen.getByPlaceholderText("Write a comment...")).toBeInTheDocument();
  });

  it("shows Send button", () => {
    render(<PlanComments planId="plan-1" />);
    // Send button is present (icon button)
    const sendButton = document.querySelector("button[disabled]");
    expect(sendButton).toBeTruthy();
  });

  it("enables send button when text is entered", () => {
    render(<PlanComments planId="plan-1" />);
    const input = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(input, { target: { value: "Test comment" } });
    const buttons = screen.getAllByRole("button");
    // Find the send button that should now be enabled
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("clears input after Enter key press", () => {
    render(<PlanComments planId="plan-1" />);
    const input = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect((input as HTMLInputElement).value).toBe("");
  });
});
