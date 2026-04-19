import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CheckoutReturnHandler from "../CheckoutReturnHandler";

const mockNavigate = vi.fn();
const mockRefreshTier = vi.fn().mockResolvedValue(undefined);

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    tier: "pro",
    refreshTier: mockRefreshTier,
  }),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: {
    conversionCompleted: vi.fn(),
  },
}));

describe("CheckoutReturnHandler", () => {
  it("renders without crashing (returns null)", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <CheckoutReturnHandler />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null with no checkout param", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/?foo=bar"]}>
        <CheckoutReturnHandler />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls refreshTier on success checkout", async () => {
    const { toast } = await import("sonner");
    render(
      <MemoryRouter initialEntries={["/?checkout=success"]}>
        <CheckoutReturnHandler />
      </MemoryRouter>
    );
    // refreshTier should have been called
    await vi.waitFor(() => {
      expect(mockRefreshTier).toHaveBeenCalled();
    });
  });

  it("calls navigate to clean URL after success", async () => {
    render(
      <MemoryRouter initialEntries={["/?checkout=success"]}>
        <CheckoutReturnHandler />
      </MemoryRouter>
    );
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("calls navigate to clean URL after cancel", async () => {
    render(
      <MemoryRouter initialEntries={["/?checkout=cancel"]}>
        <CheckoutReturnHandler />
      </MemoryRouter>
    );
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
