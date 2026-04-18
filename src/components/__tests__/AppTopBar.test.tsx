import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppTopBar from "../AppTopBar";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (k: string) => k,
    isRTL: false,
    setLanguage: vi.fn(),
  }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "user" },
    tier: "pro",
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useDarkMode", () => ({
  useDarkMode: () => ({ isDark: false, toggle: vi.fn() }),
}));

vi.mock("@/components/AuthModal", () => ({
  default: () => <div data-testid="auth-modal" />,
}));

vi.mock("@/components/AchievementBadgesPanel", () => ({
  default: () => <div data-testid="achievements-panel" />,
}));

vi.mock("@/components/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock("@/components/AdminArchetypeDebugPanel", () => ({
  default: () => <div data-testid="admin-debug-panel" />,
}));

describe("AppTopBar", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <AppTopBar />
      </MemoryRouter>
    );
    expect(screen.getByText("navCommandCenter")).toBeInTheDocument();
  });

  it("shows language toggle button", () => {
    render(
      <MemoryRouter>
        <AppTopBar />
      </MemoryRouter>
    );
    expect(screen.getByText("עב")).toBeInTheDocument();
  });

  it("shows user menu button when logged in", () => {
    render(
      <MemoryRouter>
        <AppTopBar />
      </MemoryRouter>
    );
    const userMenuBtn = screen.getByLabelText("User menu");
    expect(userMenuBtn).toBeInTheDocument();
  });

  it("shows custom title when title prop provided", () => {
    render(
      <MemoryRouter>
        <AppTopBar title="Custom Page Title" />
      </MemoryRouter>
    );
    expect(screen.getByText("Custom Page Title")).toBeInTheDocument();
  });

  it("renders notification center", () => {
    render(
      <MemoryRouter>
        <AppTopBar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("notification-center")).toBeInTheDocument();
  });

  it("does not show admin button for regular user", () => {
    render(
      <MemoryRouter>
        <AppTopBar />
      </MemoryRouter>
    );
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
