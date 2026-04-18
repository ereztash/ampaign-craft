import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

import { useArchetype } from "@/contexts/ArchetypeContext";
import { useArchetypeCopyTone } from "../useArchetypeCopyTone";

const mockUseArchetype = vi.mocked(useArchetype);

function makeArchetypeContext(overrides = {}) {
  return {
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    uiConfig: { ctaTone: "authority" },
    adaptationsEnabled: false,
    ...overrides,
  } as unknown as ReturnType<typeof useArchetype>;
}

describe("useArchetypeCopyTone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when confidenceTier is 'none'", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ confidenceTier: "none" }) as ReturnType<typeof useArchetype>);
    const { result } = renderHook(() => useArchetypeCopyTone());
    expect(result.current).toBeNull();
  });

  it("returns ctaTone when confidenceTier is 'tentative'", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({ confidenceTier: "tentative", uiConfig: { ctaTone: "social_proof" } }) as ReturnType<typeof useArchetype>
    );
    const { result } = renderHook(() => useArchetypeCopyTone());
    expect(result.current).toBe("social_proof");
  });

  it("returns ctaTone when confidenceTier is 'confident'", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({ confidenceTier: "confident", uiConfig: { ctaTone: "urgency" } }) as ReturnType<typeof useArchetype>
    );
    const { result } = renderHook(() => useArchetypeCopyTone());
    expect(result.current).toBe("urgency");
  });

  it("returns ctaTone when confidenceTier is 'strong'", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({ confidenceTier: "strong", uiConfig: { ctaTone: "curiosity" } }) as ReturnType<typeof useArchetype>
    );
    const { result } = renderHook(() => useArchetypeCopyTone());
    expect(result.current).toBe("curiosity");
  });

  it("reflects uiConfig.ctaTone value from context", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({ confidenceTier: "confident", uiConfig: { ctaTone: "authority" } }) as ReturnType<typeof useArchetype>
    );
    const { result } = renderHook(() => useArchetypeCopyTone());
    expect(result.current).toBe("authority");
  });
});
