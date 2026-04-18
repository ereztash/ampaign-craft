import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "../Profile";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
    },
    loading: false,
    tier: "free",
    setTier: vi.fn(),
    isLocalAuth: true,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: () => ({
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    uiConfig: { label: { en: "Optimizer", he: "אופטימייזר" } },
    adaptationsEnabled: false,
    setAdaptationsEnabled: vi.fn(),
    setOverride: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
  },
}));

vi.mock("@/engine/integrationEngine", () => ({
  createEmptyIntegrationState: vi.fn(() => ({})),
  getConnectedPlatforms: vi.fn(() => []),
  isConnected: vi.fn(() => false),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    auth: { getSession: vi.fn() },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

vi.mock("@/components/McpIntegrationPanel", () => ({
  McpIntegrationPanel: () => <div data-testid="mcp-integration-panel" />,
}));

describe("Profile — local auth user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the My Profile heading", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByText(/my profile/i)).toBeInTheDocument();
  });

  it("shows the email input with user email", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    const emailInput = screen.getByDisplayValue("test@example.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
  });

  it("shows the Save Changes button", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("shows the subscription tier badge", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows the Back to home button", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /back to home/i })).toBeInTheDocument();
  });
});

// Note: Profile redirects unauthenticated users via useEffect (navigate to "/")
// With local auth user mocked at module level, we only test authenticated states above.
