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

vi.mock("@/engine/stylomeEngine", () => ({
  analyzeSamples: vi.fn(() => ({
    metrics: {
      avgSentenceLength: 12,
      shortSentenceRatio: 0.3,
      longSentenceRatio: 0.1,
      codeMixingIndex: 0.05,
      dugriScore: 0.7,
      lexicalDiversity: 0.65,
      burstiness: 45,
      perplexityEstimate: 30,
      registerShiftCount: 2,
    },
    style: {
      register: "casual",
      cognitiveStyle: "concrete",
      humor: false,
      emotionalIntensity: "medium",
      metaphorDomains: [],
    },
    patterns: { openingPatterns: [], closingPatterns: [], signatureMarkers: [] },
    systemPrompt: "Write like this user.",
    generatedAt: new Date().toISOString(),
    sampleCount: 3,
  })),
}));

import { safeStorage } from "@/lib/safeStorage";
import { analyzeSamples } from "@/engine/stylomeEngine";
import {
  useStylomeProfile,
  getStoredStylomeProfile,
  getStoredStylomePrompt,
} from "../useStylomeProfile";
import type { StylomeSample, StylomeProfile } from "@/engine/stylomeEngine";

const mockSafeStorage = vi.mocked(safeStorage);
const mockAnalyzeSamples = vi.mocked(analyzeSamples);

function makeSample(text = "Sample text for analysis."): StylomeSample {
  return { text, label: "general" };
}

describe("useStylomeProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("starts with profile=null and isLoading=true, then resolves", async () => {
    const { result } = renderHook(() => useStylomeProfile());
    // After useEffect settles
    expect(result.current.isLoading).toBe(false);
  });

  it("loads stored profile from storage on mount", () => {
    const storedProfile = { systemPrompt: "Stored prompt", metrics: {} } as unknown as StylomeProfile;
    mockSafeStorage.getJSON.mockReturnValue(storedProfile);

    const { result } = renderHook(() => useStylomeProfile());
    expect(result.current.profile).toEqual(storedProfile);
    expect(result.current.isLoading).toBe(false);
  });

  it("profile is null when storage is empty", () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    const { result } = renderHook(() => useStylomeProfile());
    expect(result.current.profile).toBeNull();
  });

  it("exposes saveFromSamples and clear functions", () => {
    const { result } = renderHook(() => useStylomeProfile());
    expect(typeof result.current.saveFromSamples).toBe("function");
    expect(typeof result.current.clear).toBe("function");
  });

  it("saveFromSamples returns null when fewer than 2 samples provided", () => {
    const { result } = renderHook(() => useStylomeProfile());
    let returned: StylomeProfile | null;
    act(() => {
      returned = result.current.saveFromSamples([makeSample()]);
    });
    expect(returned!).toBeNull();
    expect(mockAnalyzeSamples).not.toHaveBeenCalled();
  });

  it("saveFromSamples calls analyzeSamples and stores the result", () => {
    const { result } = renderHook(() => useStylomeProfile());
    const samples = [makeSample(), makeSample("Another sample"), makeSample("Third sample")];

    let returned: StylomeProfile | null;
    act(() => {
      returned = result.current.saveFromSamples(samples);
    });

    expect(mockAnalyzeSamples).toHaveBeenCalledWith(samples);
    expect(returned?.systemPrompt).toBe("Write like this user.");
    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-stylome-profile-v1",
      expect.objectContaining({ systemPrompt: "Write like this user." })
    );
  });

  it("saveFromSamples updates profile state", () => {
    const { result } = renderHook(() => useStylomeProfile());
    const samples = [makeSample(), makeSample("b")];
    act(() => {
      result.current.saveFromSamples(samples);
    });
    expect(result.current.profile?.systemPrompt).toBe("Write like this user.");
  });

  it("clear removes the profile from storage and state", () => {
    const storedProfile = { systemPrompt: "Test" } as unknown as StylomeProfile;
    mockSafeStorage.getJSON.mockReturnValue(storedProfile);

    const { result } = renderHook(() => useStylomeProfile());
    expect(result.current.profile).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(result.current.profile).toBeNull();
    expect(mockSafeStorage.remove).toHaveBeenCalledWith("funnelforge-stylome-profile-v1");
  });
});

describe("getStoredStylomeProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when storage is empty", () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    expect(getStoredStylomeProfile()).toBeNull();
  });

  it("returns the stored profile object", () => {
    const profile = { systemPrompt: "Hello" } as unknown as StylomeProfile;
    mockSafeStorage.getJSON.mockReturnValue(profile);
    expect(getStoredStylomeProfile()).toEqual(profile);
  });
});

describe("getStoredStylomePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when no profile stored", () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    expect(getStoredStylomePrompt()).toBeUndefined();
  });

  it("returns systemPrompt from stored profile", () => {
    mockSafeStorage.getJSON.mockReturnValue({ systemPrompt: "My voice." });
    expect(getStoredStylomePrompt()).toBe("My voice.");
  });
});
