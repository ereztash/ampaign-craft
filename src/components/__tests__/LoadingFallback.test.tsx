import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingFallback from "../LoadingFallback";

describe("LoadingFallback", () => {
  it("renders without crashing", () => {
    const { container } = render(<LoadingFallback />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the F brand letter", () => {
    render(<LoadingFallback />);
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("renders a full-screen container", () => {
    const { container } = render(<LoadingFallback />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("min-h-screen");
  });

  it("renders a loading spinner element", () => {
    const { container } = render(<LoadingFallback />);
    // The Loader2 SVG should be present
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
