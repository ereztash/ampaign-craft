import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../Header";

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
    user: { id: "u1", email: "test@example.com" },
    signOut: vi.fn(),
    tier: "pro",
    isLocalAuth: false,
  }),
}));

vi.mock("@/hooks/useDarkMode", () => ({
  useDarkMode: () => ({ isDark: false, toggle: vi.fn() }),
}));

vi.mock("@/components/AuthModal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal">AuthModal</div> : null,
}));

vi.mock("@/components/AchievementBadgesPanel", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="badges-panel">Badges</div> : null,
}));

vi.mock("@/components/ModuleProgressStrip", () => ({
  default: () => <div data-testid="module-progress-strip" />,
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("Header", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows app name from translation key", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    // t("appName") returns "appName" from mock
    expect(screen.getByText("appName")).toBeTruthy();
  });

  it("shows language toggle button", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    // language is "en", so button shows "עב"
    expect(screen.getByText("עב")).toBeTruthy();
  });

  it("shows user menu when user is logged in", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    // User is logged in, so dropdown trigger (UserCircle) button should appear
    const userButtons = screen.getAllByRole("button");
    expect(userButtons.length).toBeGreaterThan(1);
  });

  it("renders ModuleProgressStrip", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("module-progress-strip")).toBeTruthy();
  });

  it("has accessible home button label", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /FunnelForge Home/i })).toBeTruthy();
  });
});
