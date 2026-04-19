import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAICopy } from "../useAICopy";

vi.mock("@/services/aiCopyService", () => ({
  generateCopy: vi.fn(),
}));

import { generateCopy } from "@/services/aiCopyService";

const mockGenerateCopy = vi.mocked(generateCopy);

describe("useAICopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct initial state", () => {
    const { result } = renderHook(() => useAICopy());
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("exposes generate, reset functions", () => {
    const { result } = renderHook(() => useAICopy());
    expect(typeof result.current.generate).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });

  it("sets isGenerating true while generating and false after", async () => {
    let resolveGenerate!: (value: unknown) => void;
    mockGenerateCopy.mockReturnValue(new Promise((res) => { resolveGenerate = res; }) as never);

    const { result } = renderHook(() => useAICopy());

    act(() => {
      void result.current.generate({ prompt: "test" } as never);
    });

    expect(result.current.isGenerating).toBe(true);

    await act(async () => {
      resolveGenerate({ headline: "Hello" });
    });

    expect(result.current.isGenerating).toBe(false);
  });

  it("sets result on successful generation", async () => {
    const fakeResult = { headline: "Buy Now!", body: "..." };
    mockGenerateCopy.mockResolvedValueOnce(fakeResult as never);

    const { result } = renderHook(() => useAICopy());

    await act(async () => {
      await result.current.generate({ prompt: "test" } as never);
    });

    expect(result.current.result).toEqual(fakeResult);
    expect(result.current.error).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it("returns the result from generate call", async () => {
    const fakeResult = { headline: "Result" };
    mockGenerateCopy.mockResolvedValueOnce(fakeResult as never);

    const { result } = renderHook(() => useAICopy());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.generate({ prompt: "test" } as never);
    });

    expect(returned).toEqual(fakeResult);
  });

  it("sets error on failed generation and returns null", async () => {
    mockGenerateCopy.mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() => useAICopy());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.generate({ prompt: "fail" } as never);
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe("API error");
    expect(result.current.result).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it("handles non-Error exceptions gracefully", async () => {
    mockGenerateCopy.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => useAICopy());
    await act(async () => {
      await result.current.generate({ prompt: "fail" } as never);
    });

    expect(result.current.error).toBe("Unknown error");
  });

  it("reset clears result and error", async () => {
    mockGenerateCopy.mockRejectedValueOnce(new Error("err"));
    const { result } = renderHook(() => useAICopy());

    await act(async () => {
      await result.current.generate({ prompt: "fail" } as never);
    });

    expect(result.current.error).toBe("err");

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("clears error on new generation attempt", async () => {
    mockGenerateCopy.mockRejectedValueOnce(new Error("first error"));
    const fakeResult = { headline: "Success" };
    mockGenerateCopy.mockResolvedValueOnce(fakeResult as never);

    const { result } = renderHook(() => useAICopy());

    await act(async () => {
      await result.current.generate({ prompt: "fail" } as never);
    });
    expect(result.current.error).toBe("first error");

    await act(async () => {
      await result.current.generate({ prompt: "ok" } as never);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual(fakeResult);
  });
});
