import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InsightCard from "../InsightCard";

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

describe("InsightCard", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <InsightCard
        language="en"
        variant="bottleneck"
        title="Test title"
        description="Test description"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the title", () => {
    render(
      <InsightCard
        language="en"
        variant="bottleneck"
        title="My Insight Title"
        description="Description"
      />,
    );
    expect(screen.getByText("My Insight Title")).toBeTruthy();
  });

  it("shows the description", () => {
    render(
      <InsightCard
        language="en"
        variant="opportunity"
        title="Title"
        description="Insight description text"
      />,
    );
    expect(screen.getByText("Insight description text")).toBeTruthy();
  });

  it("shows bottleneck variant label", () => {
    render(
      <InsightCard
        language="en"
        variant="bottleneck"
        title="Title"
        description="Desc"
      />,
    );
    expect(screen.getByText("Bottleneck")).toBeTruthy();
  });

  it("shows opportunity variant label", () => {
    render(
      <InsightCard
        language="en"
        variant="opportunity"
        title="Title"
        description="Desc"
      />,
    );
    expect(screen.getByText("Opportunity")).toBeTruthy();
  });

  it("shows module variant label", () => {
    render(
      <InsightCard language="en" variant="module" title="Title" description="Desc" />,
    );
    expect(screen.getByText("Module tip")).toBeTruthy();
  });

  it("shows pulse variant label", () => {
    render(
      <InsightCard language="en" variant="pulse" title="Title" description="Desc" />,
    );
    expect(screen.getByText("Weekly pulse")).toBeTruthy();
  });

  it("renders as interactive when onClick is provided", () => {
    const onClick = vi.fn();
    render(
      <InsightCard
        language="en"
        variant="bottleneck"
        title="Title"
        description="Desc"
        onClick={onClick}
      />,
    );
    const card = screen.getByRole("button");
    expect(card).toBeTruthy();
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows Hebrew labels when language is he", () => {
    render(
      <InsightCard language="he" variant="bottleneck" title="כותרת" description="תיאור" />,
    );
    expect(screen.getByText("צוואר בקבוק")).toBeTruthy();
  });
});
