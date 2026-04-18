import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CrmPage from "../CrmPage";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
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
    localStorage.clear();
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

  it("shows the Lead Management heading", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/lead management/i)).toBeInTheDocument();
  });

  it("shows empty state with no leads", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no leads yet/i)).toBeInTheDocument();
  });

  it("shows search input", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it("shows New Lead button", () => {
    render(
      <MemoryRouter>
        <CrmPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button", { name: /new lead/i }).length).toBeGreaterThan(0);
  });
});
