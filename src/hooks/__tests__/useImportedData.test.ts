import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/engine/dataImportEngine", () => ({
  analyzeTrends: vi.fn(() => ({
    trends: [],
    summary: "No trends",
    topColumn: null,
  })),
}));

import { safeStorage } from "@/lib/safeStorage";
import { analyzeTrends } from "@/engine/dataImportEngine";
import { useImportedData } from "../useImportedData";
import type { ImportedDataset } from "@/types/importedData";

const mockSafeStorage = vi.mocked(safeStorage);
const mockAnalyzeTrends = vi.mocked(analyzeTrends);

function makeDataset(overrides = {}): ImportedDataset {
  return {
    id: "ds-1",
    name: "Test Dataset",
    uploadedAt: new Date().toISOString(),
    rowCount: 100,
    schema: { columns: [] },
    preview: [],
    ...overrides,
  } as unknown as ImportedDataset;
}

describe("useImportedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
  });

  it("starts with empty datasets", () => {
    const { result } = renderHook(() => useImportedData());
    expect(result.current.datasets).toEqual([]);
  });

  it("loads datasets from storage on mount", () => {
    const stored = [makeDataset({ id: "stored-1" })];
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-imported-data") return stored;
      return fallback;
    });

    const { result } = renderHook(() => useImportedData());
    expect(result.current.datasets).toHaveLength(1);
    expect(result.current.datasets[0].id).toBe("stored-1");
  });

  it("exposes importDataset, deleteDataset, getAnalysis, linkDatasetToPlan functions", () => {
    const { result } = renderHook(() => useImportedData());
    expect(typeof result.current.importDataset).toBe("function");
    expect(typeof result.current.deleteDataset).toBe("function");
    expect(typeof result.current.getAnalysis).toBe("function");
    expect(typeof result.current.linkDatasetToPlan).toBe("function");
  });

  it("importDataset prepends dataset to the list", () => {
    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset();
    act(() => {
      result.current.importDataset(ds);
    });
    expect(result.current.datasets).toHaveLength(1);
    expect(result.current.datasets[0].id).toBe("ds-1");
  });

  it("importDataset limits to MAX_DATASETS (10)", () => {
    const initial = Array.from({ length: 10 }, (_, i) => makeDataset({ id: `ds-${i}` }));
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-imported-data") return initial;
      return fallback;
    });

    const { result } = renderHook(() => useImportedData());
    const newDs = makeDataset({ id: "ds-new" });
    act(() => {
      result.current.importDataset(newDs);
    });
    // Should still be 10 (capped)
    expect(result.current.datasets).toHaveLength(10);
    expect(result.current.datasets[0].id).toBe("ds-new");
  });

  it("importDataset persists to storage", () => {
    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset();
    act(() => {
      result.current.importDataset(ds);
    });
    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-imported-data",
      expect.arrayContaining([expect.objectContaining({ id: "ds-1" })])
    );
  });

  it("deleteDataset removes dataset by id", () => {
    const ds1 = makeDataset({ id: "ds-1" });
    const ds2 = makeDataset({ id: "ds-2" });
    const { result } = renderHook(() => useImportedData());
    act(() => { result.current.importDataset(ds1); });
    act(() => { result.current.importDataset(ds2); });
    act(() => { result.current.deleteDataset("ds-1"); });
    expect(result.current.datasets.find((d) => d.id === "ds-1")).toBeUndefined();
    expect(result.current.datasets.find((d) => d.id === "ds-2")).toBeDefined();
  });

  it("deleteDataset also removes cached analysis", () => {
    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset({ id: "ds-1" });
    act(() => { result.current.importDataset(ds); });
    // First call populates cache
    act(() => { result.current.getAnalysis("ds-1"); });
    // Delete clears cache
    act(() => { result.current.deleteDataset("ds-1"); });
    // getAnalysis returns null now (dataset gone)
    const analysis = result.current.getAnalysis("ds-1");
    expect(analysis).toBeNull();
  });

  it("getAnalysis returns null for unknown dataset", () => {
    const { result } = renderHook(() => useImportedData());
    expect(result.current.getAnalysis("nonexistent")).toBeNull();
  });

  it("getAnalysis calls analyzeTrends and returns result", () => {
    const mockAnalysis = { trends: [{ column: "revenue", direction: "up" }], summary: "Good" };
    mockAnalyzeTrends.mockReturnValue(mockAnalysis as ReturnType<typeof analyzeTrends>);

    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset({ id: "ds-1" });
    act(() => { result.current.importDataset(ds); });

    let analysis: ReturnType<typeof result.current.getAnalysis>;
    act(() => {
      analysis = result.current.getAnalysis("ds-1");
    });

    expect(mockAnalyzeTrends).toHaveBeenCalledWith(ds);
    expect(analysis).toEqual(mockAnalysis);
  });

  it("getAnalysis uses cache on second call", () => {
    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset({ id: "ds-1" });
    act(() => { result.current.importDataset(ds); });

    act(() => { result.current.getAnalysis("ds-1"); });
    act(() => { result.current.getAnalysis("ds-1"); });

    // analyzeTrends should only be called once (cached)
    expect(mockAnalyzeTrends).toHaveBeenCalledTimes(1);
  });

  it("linkDatasetToPlan updates linkedPlanId on the dataset", () => {
    const { result } = renderHook(() => useImportedData());
    const ds = makeDataset({ id: "ds-1" });
    act(() => { result.current.importDataset(ds); });
    act(() => { result.current.linkDatasetToPlan("ds-1", "plan-99"); });
    const linked = result.current.datasets.find((d) => d.id === "ds-1");
    expect(linked?.linkedPlanId).toBe("plan-99");
  });
});
