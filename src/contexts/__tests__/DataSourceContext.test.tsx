import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ReactNode } from "react";
import { DataSourceProvider, useDataSources, DataSourceContextValue } from "../DataSourceContext";

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

import { safeStorage } from "@/lib/safeStorage";
const mockSafeStorage = vi.mocked(safeStorage);

// ─── Test Consumer ────────────────────────────────────────────────────────────

const TestConsumer = ({ onCtx }: { onCtx?: (ctx: DataSourceContextValue) => void }) => {
  const ctx = useDataSources();
  onCtx?.(ctx);
  return (
    <div>
      <span data-testid="source-count">{ctx.sources.length}</span>
      <span data-testid="total-records">{ctx.totalRecords}</span>
      <span data-testid="quality">{ctx.dataQualityScore}</span>
      <span data-testid="meta-status">
        {ctx.sources.find((s) => s.id === "meta")?.status ?? "none"}
      </span>
    </div>
  );
};

function renderWithProvider(ui: ReactNode) {
  return render(<DataSourceProvider>{ui}</DataSourceProvider>);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("DataSourceContext — defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null); // No stored state
  });

  it("provides 6 default sources", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("source-count").textContent).toBe("6");
  });

  it("all default sources have status=disconnected", () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);
    ctx.sources.forEach((source) => {
      expect(source.status).toBe("disconnected");
    });
  });

  it("totalRecords is 0 initially", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("total-records").textContent).toBe("0");
  });

  it("dataQualityScore is 0 initially", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("quality").textContent).toBe("0");
  });

  it("includes meta, google_ads, ga4, mailchimp, manual_import, business_profile sources", () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);
    const ids = ctx.sources.map((s) => s.id);
    expect(ids).toContain("meta");
    expect(ids).toContain("google_ads");
    expect(ids).toContain("ga4");
    expect(ids).toContain("mailchimp");
    expect(ids).toContain("manual_import");
    expect(ids).toContain("business_profile");
  });

  it("all sources have both he and en labels", () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);
    ctx.sources.forEach((source) => {
      expect(source.label.he).toBeTruthy();
      expect(source.label.en).toBeTruthy();
    });
  });
});

describe("DataSourceContext — setSourceStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("setSourceStatus changes source status to connected", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setSourceStatus("meta", "connected");
    });

    expect(screen.getByTestId("meta-status").textContent).toBe("connected");
  });

  it("setSourceStatus to 'connected' sets lastSync to current timestamp", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    const before = Date.now();
    await act(async () => {
      ctx.setSourceStatus("meta", "connected");
    });
    const after = Date.now();

    const meta = ctx.sources.find((s) => s.id === "meta");
    const syncTime = meta?.lastSync ? new Date(meta.lastSync).getTime() : 0;
    expect(syncTime).toBeGreaterThanOrEqual(before);
    expect(syncTime).toBeLessThanOrEqual(after + 100);
  });

  it("setSourceStatus with explicit lastSync uses provided value", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    const customSync = "2026-01-01T00:00:00Z";
    await act(async () => {
      ctx.setSourceStatus("ga4", "connected", customSync);
    });

    const ga4 = ctx.sources.find((s) => s.id === "ga4");
    expect(ga4?.lastSync).toBe(customSync);
  });

  it("connecting a source updates dataQualityScore above 0", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setSourceStatus("meta", "connected");
    });

    expect(ctx.dataQualityScore).toBeGreaterThan(0);
  });
});

describe("DataSourceContext — setSourceRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("setSourceRecords updates recordCount and totalRecords", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setSourceRecords("meta", 5000);
    });

    const meta = ctx.sources.find((s) => s.id === "meta");
    expect(meta?.recordCount).toBe(5000);
    expect(ctx.totalRecords).toBe(5000);
  });

  it("setSourceRecords from multiple sources accumulates totalRecords", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setSourceRecords("meta", 1000);
      ctx.setSourceRecords("ga4", 2000);
    });

    expect(ctx.totalRecords).toBe(3000);
  });
});

describe("DataSourceContext — upsertSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("upsertSource updates an existing source", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    const updatedMeta = {
      id: "meta",
      platform: "meta",
      label: { he: "מטא", en: "Meta" },
      category: "advertising" as const,
      status: "connected" as const,
      lastSync: "2026-04-01T00:00:00Z",
      recordCount: 9999,
      feeds: [],
    };

    await act(async () => {
      ctx.upsertSource(updatedMeta);
    });

    const meta = ctx.sources.find((s) => s.id === "meta");
    expect(meta?.status).toBe("connected");
    expect(meta?.recordCount).toBe(9999);
  });

  it("upsertSource adds a new source if id doesn't exist", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    const newSource = {
      id: "custom-platform",
      platform: "custom",
      label: { he: "מותאם", en: "Custom" },
      category: "manual" as const,
      status: "connected" as const,
      lastSync: null,
      recordCount: 100,
      feeds: [],
    };

    await act(async () => {
      ctx.upsertSource(newSource);
    });

    expect(ctx.sources.find((s) => s.id === "custom-platform")).toBeDefined();
    expect(ctx.sources.length).toBe(7); // 6 default + 1 new
  });
});

describe("DataSourceContext — refreshFromProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("refreshFromProfile connects business_profile source when hasFormData is true", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.refreshFromProfile(true);
    });

    const bp = ctx.sources.find((s) => s.id === "business_profile");
    expect(bp?.status).toBe("connected");
    expect(bp?.recordCount).toBe(1);
  });

  it("refreshFromProfile does nothing when hasFormData is false", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.refreshFromProfile(false);
    });

    const bp = ctx.sources.find((s) => s.id === "business_profile");
    expect(bp?.status).toBe("disconnected");
  });
});

describe("DataSourceContext — storage persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("persists state to localStorage on change", async () => {
    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setSourceStatus("meta", "connected");
    });

    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-data-sources",
      expect.objectContaining({ sources: expect.any(Array) })
    );
  });

  it("loads stored state on initialization", () => {
    const storedState = {
      sources: [
        {
          id: "meta",
          platform: "meta",
          label: { he: "מטא", en: "Meta" },
          category: "advertising",
          status: "connected",
          lastSync: "2026-01-01T00:00:00Z",
          recordCount: 500,
          feeds: [],
        },
      ],
      totalRecords: 500,
      lastGlobalSync: "2026-01-01T00:00:00Z",
      dataQualityScore: 43,
    };
    mockSafeStorage.getJSON.mockReturnValue(storedState);

    let ctx!: DataSourceContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);
    const meta = ctx.sources.find((s) => s.id === "meta");
    expect(meta?.status).toBe("connected");
    expect(ctx.totalRecords).toBe(500);
  });
});

describe("DataSourceContext — useDataSources guard", () => {
  it("throws when used outside DataSourceProvider", () => {
    const Thrower = () => {
      useDataSources();
      return null;
    };
    expect(() => render(<Thrower />)).toThrow(
      "useDataSources must be used within DataSourceProvider"
    );
  });
});
