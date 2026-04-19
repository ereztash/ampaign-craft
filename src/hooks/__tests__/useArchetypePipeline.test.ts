import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/lib/archetypeUIConfig", () => ({
  getArchetypeUIConfig: vi.fn(),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

import { useArchetype } from "@/contexts/ArchetypeContext";
import { getArchetypeUIConfig } from "@/lib/archetypeUIConfig";
import { safeStorage } from "@/lib/safeStorage";
import { useArchetypePipeline } from "../useArchetypePipeline";

const mockUseArchetype = vi.mocked(useArchetype);
const mockGetArchetypeUIConfig = vi.mocked(getArchetypeUIConfig);
const mockSafeStorage = vi.mocked(safeStorage);

const mockPipeline = [
  { label: { he: "נתונים", en: "Data" }, route: "/data", completionKey: "funnelforge-data-sources" },
  { label: { he: "אשף", en: "Wizard" }, route: "/wizard", completionKey: "funnelforge-plans" },
  { label: { he: "בינה", en: "AI" }, route: "/ai", completionKey: "funnelforge-coach-messages" },
];

function makeArchetypeContext(overrides = {}) {
  return {
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    ...overrides,
  } as unknown as ReturnType<typeof useArchetype>;
}

function makeUIConfig(pipeline = mockPipeline) {
  return {
    personalityProfile: { pipeline },
  } as unknown as ReturnType<typeof getArchetypeUIConfig>;
}

describe("useArchetypePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArchetype.mockReturnValue(makeArchetypeContext());
    mockGetArchetypeUIConfig.mockReturnValue(makeUIConfig());
    mockSafeStorage.getString.mockReturnValue("");
    mockSafeStorage.getJSON.mockReturnValue([]);
  });

  it("returns steps matching the pipeline config", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps).toHaveLength(3);
    expect(result.current.steps[0].route).toBe("/data");
  });

  it("isActive is false when confidenceTier is 'none'", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ confidenceTier: "none" }));
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.isActive).toBe(false);
  });

  it("isActive is true when confidenceTier is not 'none'", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ confidenceTier: "confident" }));
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.isActive).toBe(true);
  });

  it("all steps are incomplete when localStorage keys are empty", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    result.current.steps.forEach((step) => {
      expect(step.completed).toBe(false);
    });
  });

  it("marks step as completed when completionKey has a truthy string value", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-data-sources") return "some-data";
      return "";
    });
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps[0].completed).toBe(true);
  });

  it("marks plan step as completed when plans array has length > 0", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-plans") return JSON.stringify([{ id: "1" }]);
      return "";
    });
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps[1].completed).toBe(true);
  });

  it("marks plan step as incomplete when plans array is empty", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-plans") return JSON.stringify([]);
      return "";
    });
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps[1].completed).toBe(false);
  });

  it("completedCount is 0 when no steps are done", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.completedCount).toBe(0);
  });

  it("completedCount increases as steps are completed", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-data-sources") return "done";
      if (key === "funnelforge-coach-messages") return "done";
      return "";
    });
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.completedCount).toBe(2);
  });

  it("progressPercent is 0 when no steps completed", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.progressPercent).toBe(0);
  });

  it("progressPercent is 100 when all steps completed", () => {
    mockSafeStorage.getString.mockImplementation(() => "done");
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.progressPercent).toBe(100);
  });

  it("nextStep is the first incomplete step", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.nextStep?.route).toBe("/data");
  });

  it("currentStepIndex is 0 when no steps completed", () => {
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("currentStepIndex advances when first step is completed", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-data-sources") return "done";
      return "";
    });
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.currentStepIndex).toBe(1);
  });

  it("handles empty pipeline gracefully", () => {
    mockGetArchetypeUIConfig.mockReturnValue(makeUIConfig([]));
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps).toHaveLength(0);
    expect(result.current.progressPercent).toBe(0);
    expect(result.current.nextStep).toBeNull();
  });

  it("step without completionKey is treated as incomplete", () => {
    mockGetArchetypeUIConfig.mockReturnValue(makeUIConfig([
      { label: { he: "א", en: "A" }, route: "/a" }, // no completionKey
    ] as typeof mockPipeline));
    const { result } = renderHook(() => useArchetypePipeline());
    expect(result.current.steps[0].completed).toBe(false);
  });
});
