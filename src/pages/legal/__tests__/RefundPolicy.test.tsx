import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RefundPolicy from "../RefundPolicy";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
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

describe("RefundPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the Refund & Cancellation Policy heading", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/refund & cancellation policy/i)).toBeInTheDocument();
  });

  it("shows the last updated date", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-18/)).toBeInTheDocument();
  });

  it("shows the cancellation contact card", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/cancellation contact/i)).toBeInTheDocument();
  });

  it("shows the business name in the contact card", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/company ltd/i)).toBeInTheDocument();
  });

  it("shows the business phone in the contact card", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("050-123-4567")[0]).toBeInTheDocument();
  });

  it("shows the Right to cancel section", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/right to cancel/i)).toBeInTheDocument();
  });

  it("shows the How to cancel section", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/how to cancel/i)).toBeInTheDocument();
  });

  it("shows the Refunds section", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/^5\. refunds$/i)).toBeInTheDocument();
  });

  it("shows the Exceptions to cancellation section", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/exceptions to cancellation/i)).toBeInTheDocument();
  });

  it("shows the Governing law section", () => {
    render(
      <MemoryRouter>
        <RefundPolicy />
      </MemoryRouter>,
    );
    expect(screen.getByText(/governing law/i)).toBeInTheDocument();
  });
});
