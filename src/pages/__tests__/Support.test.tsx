import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Support from "../Support";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, tier: "free", isLocalAuth: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({ data: [], error: null })),
    })),
    auth: { getSession: vi.fn() },
  },
}));

vi.mock("@/lib/businessInfo", () => ({
  BUSINESS_INFO: {
    legalName: { he: "חברה בע\"מ", en: "Company Ltd" },
    vatIdLabel: { he: "ח.פ.", en: "Reg No." },
    vatId: "123456789",
    phone: { tel: "+972501234567", display: "050-123-4567" },
    email: "support@example.com",
    address: { full: { he: "תל אביב", en: "Tel Aviv" } },
    hours: { he: "א-ה 9-18", en: "Sun-Thu 9-18" },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

describe("Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the Business details card", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByText(/business details/i)).toBeInTheDocument();
  });

  it("shows the feedback form heading", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByText(/send us feedback/i)).toBeInTheDocument();
  });

  it("shows the Send button", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("shows the email input field", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email \(optional\)/i)).toBeInTheDocument();
  });

  it("shows the message textarea", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/your message/i)).toBeInTheDocument();
  });

  it("shows the business contact phone number", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByText("050-123-4567")).toBeInTheDocument();
  });

  it("shows the refund policy link", () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );
    expect(screen.getByText(/refund & cancellation policy/i)).toBeInTheDocument();
  });
});
