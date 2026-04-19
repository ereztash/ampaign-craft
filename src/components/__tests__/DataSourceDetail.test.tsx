import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DataSourceDetail from "../DataSourceDetail";
import type { DataSource } from "@/contexts/DataSourceContext";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRTL: false }),
}));

vi.mock("@/i18n/tx", () => ({
  tx: (obj: { he: string; en: string }, lang: string) => (lang === "he" ? obj.he : obj.en),
}));

vi.mock("@/contexts/DataSourceContext", () => ({
  useDataSources: () => ({
    setSourceStatus: vi.fn(),
    setSourceRecords: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMetaAuth", () => ({
  useMetaAuth: () => ({
    auth: null,
    loading: false,
    error: null,
    accounts: [],
    connect: vi.fn(),
    disconnect: vi.fn(),
    disabled: false,
  }),
}));

vi.mock("@/components/MetaConnect", () => ({
  default: () => <div data-testid="meta-connect">MetaConnect</div>,
}));

const metaSource: DataSource = {
  id: "meta",
  platform: "meta",
  label: { he: "מטא", en: "Meta Ads" },
  category: "advertising",
  status: "disconnected",
  lastSync: null,
  recordCount: 0,
  feeds: [{ he: "קמפיינים", en: "Campaigns" }, { he: "מודעות", en: "Ads" }],
};

const nonMetaSource: DataSource = {
  ...metaSource,
  id: "ga4",
  label: { he: "GA4", en: "GA4 Analytics" },
  feeds: [{ he: "ביקורים", en: "Visits" }],
};

describe("DataSourceDetail", () => {
  it("renders nothing when source is null", () => {
    const { container } = render(
      <DataSourceDetail source={null} open={true} onOpenChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders without crashing when source is provided and open", () => {
    render(<DataSourceDetail source={metaSource} open={true} onOpenChange={vi.fn()} />);
    // Sheet renders into a portal outside container; verify via document.body
    expect(document.body.textContent).toBeTruthy();
  });

  it("shows feed items for the source", () => {
    render(<DataSourceDetail source={metaSource} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Campaigns")).toBeTruthy();
    expect(screen.getByText("Ads")).toBeTruthy();
  });

  it("renders MetaConnect for meta source", () => {
    render(<DataSourceDetail source={metaSource} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("meta-connect")).toBeTruthy();
  });

  it("shows fallback text for non-meta source", () => {
    render(<DataSourceDetail source={nonMetaSource} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Use Connect/i)).toBeTruthy();
  });

  it("shows source label as sheet title", () => {
    render(<DataSourceDetail source={metaSource} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Meta Ads")).toBeTruthy();
  });
});
