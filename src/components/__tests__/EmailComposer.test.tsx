import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailComposer } from "../EmailComposer";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("EmailComposer", () => {
  it("renders without crashing", () => {
    const { container } = render(<EmailComposer body="Hello world" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows Send via Email trigger button by default", () => {
    render(<EmailComposer body="Hello world" />);
    expect(screen.getByText(/send via email/i)).toBeTruthy();
  });

  it("accepts custom label prop", () => {
    render(<EmailComposer body="Hello" label="Custom Label" />);
    expect(screen.getByText("Custom Label")).toBeTruthy();
  });

  it("opens dialog when trigger button is clicked", () => {
    render(<EmailComposer body="Hello world" subject="Test Subject" />);
    fireEvent.click(screen.getByText(/send via email/i));
    expect(screen.getByText(/compose email/i)).toBeTruthy();
  });

  it("shows To, Subject, and Body fields in dialog", () => {
    render(<EmailComposer body="Hello world" subject="Test Subject" />);
    fireEvent.click(screen.getByText(/send via email/i));
    expect(screen.getByLabelText(/to/i)).toBeTruthy();
    expect(screen.getByLabelText(/subject/i)).toBeTruthy();
    expect(screen.getByLabelText(/body/i)).toBeTruthy();
  });

  it("pre-fills body with provided body prop", () => {
    render(<EmailComposer body="Pre-filled body text" />);
    fireEvent.click(screen.getByText(/send via email/i));
    const textarea = screen.getByLabelText(/body/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Pre-filled body text");
  });

  it("shows Open in Mail App and Gmail buttons", () => {
    render(<EmailComposer body="Hello" />);
    fireEvent.click(screen.getByText(/send via email/i));
    expect(screen.getByText(/open in mail app/i)).toBeTruthy();
    expect(screen.getByText("Gmail")).toBeTruthy();
  });

  it("shows Copy button in dialog", () => {
    render(<EmailComposer body="Hello" />);
    fireEvent.click(screen.getByText(/send via email/i));
    expect(screen.getByText(/copy/i)).toBeTruthy();
  });
});
