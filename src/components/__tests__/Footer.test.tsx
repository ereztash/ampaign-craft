import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../Footer";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/lib/businessInfo", () => ({
  BUSINESS_INFO: {
    brandName: "FunnelForge",
    legalName: { he: "שם משפטי", en: "Legal Business Name" },
    vatId: "123456789",
    vatIdLabel: { he: "ע.מ.", en: "Business ID" },
    address: {
      full: { he: "כתובת בעברית", en: "HaTna'im 5, Ramat Gan, Israel" },
    },
    phone: { display: "052-454-5963", tel: "+972524545963" },
    email: "test@example.com",
  },
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("Footer", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows brand name", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("FunnelForge").length).toBeGreaterThan(0);
  });

  it("shows phone number", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText("052-454-5963")).toBeTruthy();
  });

  it("shows email address", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("shows legal links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText(/refund/i)).toBeTruthy();
    expect(screen.getByText(/terms of service/i)).toBeTruthy();
    expect(screen.getByText(/privacy policy/i)).toBeTruthy();
  });

  it("shows Contact section heading", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText("Contact")).toBeTruthy();
  });

  it("shows Legal section heading", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText("Legal")).toBeTruthy();
  });

  it("has contentinfo role", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});
