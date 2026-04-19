import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataSourceCard from "../DataSourceCard";
import type { DataSource } from "@/contexts/DataSourceContext";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/lib/utils", () => ({ cn: (...c: string[]) => c.filter(Boolean).join(" ") }));

const baseSource: DataSource = {
  id: "meta",
  platform: "meta",
  label: { he: "מטא", en: "Meta Ads" },
  category: "advertising",
  status: "disconnected",
  lastSync: null,
  recordCount: 0,
  feeds: [{ he: "פרסומות", en: "Ads" }],
};

describe("DataSourceCard", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <DataSourceCard source={baseSource} onOpen={vi.fn()} onConnect={vi.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the source label", () => {
    render(<DataSourceCard source={baseSource} onOpen={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText("Meta Ads")).toBeTruthy();
  });

  it("shows 'Not connected' when lastSync is null", () => {
    render(<DataSourceCard source={baseSource} onOpen={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText("Not connected")).toBeTruthy();
  });

  it("shows 'Connect' button when disconnected", () => {
    render(<DataSourceCard source={baseSource} onOpen={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText("Connect")).toBeTruthy();
  });

  it("calls onOpen when body button is clicked", () => {
    const onOpen = vi.fn();
    render(<DataSourceCard source={baseSource} onOpen={onOpen} onConnect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("shows 'Configure' and Sync button when status is connected", () => {
    const connectedSource: DataSource = {
      ...baseSource,
      status: "connected",
      lastSync: new Date().toISOString(),
      recordCount: 500,
    };
    render(<DataSourceCard source={connectedSource} onOpen={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText("Configure")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sync/i })).toBeTruthy();
  });

  it("displays record count", () => {
    const source: DataSource = { ...baseSource, recordCount: 1234 };
    render(<DataSourceCard source={source} onOpen={vi.fn()} onConnect={vi.fn()} />);
    expect(screen.getByText(/1,234/)).toBeTruthy();
  });

  it("calls onConnect when Connect button is clicked", () => {
    const onConnect = vi.fn();
    render(<DataSourceCard source={baseSource} onOpen={vi.fn()} onConnect={onConnect} />);
    fireEvent.click(screen.getByText("Connect"));
    expect(onConnect).toHaveBeenCalledOnce();
  });
});
