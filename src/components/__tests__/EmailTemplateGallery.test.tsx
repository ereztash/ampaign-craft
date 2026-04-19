import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailTemplateGallery } from "../EmailTemplateGallery";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/engine/exportEngine", () => ({
  downloadExport: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_csv: vi.fn(() => "csv,data"),
  },
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("EmailTemplateGallery", () => {
  it("renders without crashing", () => {
    const { container } = render(<EmailTemplateGallery />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the gallery title", () => {
    render(<EmailTemplateGallery />);
    expect(screen.getByText(/email template gallery/i)).toBeTruthy();
  });

  it("renders tabs for each template category", () => {
    render(<EmailTemplateGallery />);
    expect(screen.getByRole("tab", { name: /welcome series/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /cart abandonment/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /re-engagement/i })).toBeTruthy();
  });

  it("shows welcome series content by default", () => {
    render(<EmailTemplateGallery />);
    // Welcome series has 4 steps, starting at Day 0
    expect(screen.getAllByText(/day 0/i).length).toBeGreaterThan(0);
  });

  it("shows Copy all button for the active template", () => {
    render(<EmailTemplateGallery />);
    expect(screen.getByText(/copy all/i)).toBeTruthy();
  });

  it("switches template on tab click", () => {
    render(<EmailTemplateGallery />);
    fireEvent.click(screen.getByRole("tab", { name: /cart abandonment/i }));
    // Cart abandonment has a "Forgot something?" subject
    expect(screen.getByText(/forgot something/i)).toBeTruthy();
  });

  it("shows Mailchimp and HubSpot export buttons", () => {
    render(<EmailTemplateGallery />);
    expect(screen.getByText("Mailchimp")).toBeTruthy();
    expect(screen.getByText("HubSpot")).toBeTruthy();
  });

  it("shows individual email step copy buttons", () => {
    render(<EmailTemplateGallery />);
    // Each step has a copy button (ghost button with Copy icon)
    const copyButtons = screen.getAllByRole("button");
    expect(copyButtons.length).toBeGreaterThan(1);
  });
});
