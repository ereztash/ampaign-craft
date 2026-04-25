import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CrmPage from "../CrmPage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false, isRTL: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-1", email: "u@example.com" } }),
}));

vi.mock("@/services/leadsService", () => ({
  listLeads: vi.fn(() => Promise.resolve([])),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: {
    firstLeadLogged: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

vi.mock("@/components/WhatsAppSendButton", () => ({
  WhatsAppSendButton: () => <button>WhatsApp</button>,
}));

vi.mock("@/components/EmailComposer", () => ({
  EmailComposer: () => <button>Email</button>,
}));

describe("CrmPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the main content area", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the Lead Management heading", async () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/lead management/i)).toBeInTheDocument();
    });
  });

  it("shows empty state with no leads", async () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/no leads yet/i)).toBeInTheDocument();
    });
  });

  it("shows search input", async () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    });
  });

  it("shows New Lead button", async () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /new lead/i }).length).toBeGreaterThan(0);
    });
  });
});
