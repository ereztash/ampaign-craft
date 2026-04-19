import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OutputFeedback } from "../OutputFeedback";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/engine/trainingDataEngine", () => ({
  updateFeedback: vi.fn(() => Promise.resolve(true)),
}));

describe("OutputFeedback", () => {
  it("renders without crashing", () => {
    expect(() => render(<OutputFeedback pairId="pair-1" />)).not.toThrow();
  });

  it("shows helpful prompt text", () => {
    render(<OutputFeedback pairId="pair-1" />);
    expect(screen.getByText("Helpful?")).toBeInTheDocument();
  });

  it("shows thumbs up and thumbs down buttons", () => {
    render(<OutputFeedback pairId="pair-1" />);
    expect(screen.getByLabelText("Positive feedback")).toBeInTheDocument();
    expect(screen.getByLabelText("Negative feedback")).toBeInTheDocument();
  });

  it("shows negative feedback form when thumbs down is clicked", () => {
    render(<OutputFeedback pairId="pair-1" />);
    fireEvent.click(screen.getByLabelText("Negative feedback"));
    expect(screen.getByPlaceholderText("What was missing? (optional)")).toBeInTheDocument();
  });

  it("shows cancel button in negative form", () => {
    render(<OutputFeedback pairId="pair-1" />);
    fireEvent.click(screen.getByLabelText("Negative feedback"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("returns to initial state when Cancel is clicked", () => {
    render(<OutputFeedback pairId="pair-1" />);
    fireEvent.click(screen.getByLabelText("Negative feedback"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Helpful?")).toBeInTheDocument();
  });

  it("shows thanks message after positive feedback with null pairId", async () => {
    render(<OutputFeedback pairId={null} />);
    fireEvent.click(screen.getByLabelText("Positive feedback"));
    expect(await screen.findByText("Thanks for the feedback!")).toBeInTheDocument();
  });

  it("renders in compact mode without margin class issues", () => {
    const { container } = render(<OutputFeedback pairId="pair-1" compact />);
    expect(container.firstChild).toBeTruthy();
  });
});
