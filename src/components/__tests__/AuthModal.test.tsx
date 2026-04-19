import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthModal from "../AuthModal";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    tier: "free",
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
  }),
}));

describe("AuthModal", () => {
  it("renders without crashing when open", () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Sign in to FunnelForge")).toBeInTheDocument();
  });

  it("shows login and register tabs", () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("shows email and password fields", () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("At least 6 characters")).toBeInTheDocument();
  });

  it("shows sign in button", () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows optional guest usage message", () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    expect(
      screen.getByText("Optional — you can use the app as a guest too")
    ).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<AuthModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Sign in to FunnelForge")).not.toBeInTheDocument();
  });

  it("shows validation error on empty submit", async () => {
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Sign In"));
    const error = await screen.findByText(
      "Please fill in email and password"
    );
    expect(error).toBeInTheDocument();
  });
});
