import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Contact from "../Contact";

// Contact is an alias for Support — mock the same deps Support needs.
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, tier: "free", isLocalAuth: false }),
}));

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

vi.mock("@/components/BackToHub", () => ({
  default: () => <div data-testid="back-to-hub" />,
}));

describe("Contact", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows the main element", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the feedback form", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });
});
