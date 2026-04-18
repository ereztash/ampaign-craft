import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProcessingScreen from "../ProcessingScreen";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (_obj: Record<string, string>, lang: string) =>
    lang === "he" ? _obj.he : _obj.en,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    rect: ({ children, ...props }: any) => <rect {...props}>{children}</rect>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("ProcessingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const onComplete = vi.fn();

  it("renders without crashing", () => {
    expect(() => render(<ProcessingScreen onComplete={onComplete} />)).not.toThrow();
  });

  it("shows processingTitle translation key", () => {
    render(<ProcessingScreen onComplete={onComplete} />);
    expect(screen.getByText("processingTitle")).toBeInTheDocument();
  });

  it("shows a progressbar with aria-valuemin and aria-valuemax", () => {
    render(<ProcessingScreen onComplete={onComplete} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows contextual messages when formData is provided", () => {
    render(
      <ProcessingScreen
        onComplete={onComplete}
        formData={{ businessField: "tech", budgetRange: "low", experienceLevel: "beginner" } as any}
      />,
    );
    expect(screen.getByText(/tech/i)).toBeInTheDocument();
  });

  it("advances progress over time", () => {
    render(<ProcessingScreen onComplete={onComplete} />);
    const progressbar = screen.getByRole("progressbar");
    const initialValue = progressbar.getAttribute("aria-valuenow");
    vi.advanceTimersByTime(200);
    const laterValue = progressbar.getAttribute("aria-valuenow");
    expect(Number(laterValue)).toBeGreaterThanOrEqual(Number(initialValue));
  });
});
