import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DataHub from "../DataHub";

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, isRtl: false }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ sourceId: undefined }),
  };
});

vi.mock("@/contexts/DataSourceContext", () => ({
  useDataSources: () => ({
    sources: [
      { id: "meta", name: "Meta Ads", status: "disconnected", lastSync: null, recordCount: 0 },
      { id: "manual_import", name: "Manual Import", status: "disconnected", lastSync: null, recordCount: 0 },
    ],
    setSourceStatus: vi.fn(),
    setSourceRecords: vi.fn(),
    upsertSource: vi.fn(),
  }),
}));

vi.mock("@/engine/dataImportEngine", () => ({
  detectSchema: vi.fn(() => ({ columns: [], detectedType: "generic" })),
  analyzeTrends: vi.fn(() => ({ trends: [] })),
}));

vi.mock("@/components/DataSourceCard", () => ({
  default: ({ source }: { source: { name: string } }) => (
    <div data-testid="data-source-card">{source.name}</div>
  ),
}));

vi.mock("@/components/ConnectDataModal", () => ({
  default: () => <div data-testid="connect-data-modal" />,
}));

vi.mock("@/components/DataImportModal", () => ({
  default: () => <div data-testid="data-import-modal" />,
}));

vi.mock("@/components/DataSourceDetail", () => ({
  default: () => <div data-testid="data-source-detail" />,
}));

describe("DataHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <DataHub />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows main content area", () => {
    render(
      <MemoryRouter>
        <DataHub />
      </MemoryRouter>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows the Your data sources heading", () => {
    render(
      <MemoryRouter>
        <DataHub />
      </MemoryRouter>,
    );
    expect(screen.getByText(/your data sources/i)).toBeInTheDocument();
  });

  it("renders data source cards", () => {
    render(
      <MemoryRouter>
        <DataHub />
      </MemoryRouter>,
    );
    expect(screen.getAllByTestId("data-source-card").length).toBeGreaterThan(0);
  });

  it("shows the Connect new button", () => {
    render(
      <MemoryRouter>
        <DataHub />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /connect new/i })).toBeInTheDocument();
  });
});
