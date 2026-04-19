import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextualInsight from "../ContextualInsight";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const defaultProps = {
  title: { he: "כותרת", en: "Insight Title" },
  content: { he: "תוכן", en: "Insight content text" },
};

describe("ContextualInsight", () => {
  it("renders without crashing", () => {
    render(<ContextualInsight {...defaultProps} />);
    expect(screen.getByText("Insight Title")).toBeInTheDocument();
  });

  it("shows title text", () => {
    render(<ContextualInsight {...defaultProps} />);
    expect(screen.getByText("Insight Title")).toBeInTheDocument();
  });

  it("content is not visible initially", () => {
    render(<ContextualInsight {...defaultProps} />);
    expect(screen.queryByText("Insight content text")).not.toBeInTheDocument();
  });

  it("shows content after clicking trigger", () => {
    render(<ContextualInsight {...defaultProps} />);
    fireEvent.click(screen.getByText("Insight Title"));
    expect(screen.getByText("Insight content text")).toBeInTheDocument();
  });

  it("renders info variant by default", () => {
    render(<ContextualInsight {...defaultProps} />);
    const trigger = screen.getByText("Insight Title").closest("button");
    expect(trigger).toHaveClass("bg-primary/5");
  });

  it("renders suggestion variant with accent styles", () => {
    render(<ContextualInsight {...defaultProps} variant="suggestion" />);
    const trigger = screen.getByText("Insight Title").closest("button");
    expect(trigger).toHaveClass("bg-accent/5");
  });

  it("renders warning variant with amber styles", () => {
    render(<ContextualInsight {...defaultProps} variant="warning" />);
    const trigger = screen.getByText("Insight Title").closest("button");
    expect(trigger).toHaveClass("bg-amber-500/5");
  });

  it("applies custom className", () => {
    render(<ContextualInsight {...defaultProps} className="my-custom-class" />);
    const trigger = screen.getByText("Insight Title").closest("button");
    expect(trigger).toHaveClass("my-custom-class");
  });
});
