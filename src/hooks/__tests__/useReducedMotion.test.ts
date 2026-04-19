import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReducedMotion } from "../useReducedMotion";

describe("useReducedMotion", () => {
  let mockMatches = false;
  let addedHandler: ((e: MediaQueryListEvent) => void) | null = null;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMatches = false;
    addedHandler = null;

    addEventListenerSpy = vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      addedHandler = handler;
    });
    removeEventListenerSpy = vi.fn();

    Object.defineProperty(globalThis, "matchMedia", {
      value: vi.fn().mockImplementation(() => ({
        matches: mockMatches,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      })),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when prefers-reduced-motion is not set", () => {
    mockMatches = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion: reduce matches", () => {
    mockMatches = true;
    Object.defineProperty(globalThis, "matchMedia", {
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      })),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("registers a 'change' event listener on mount", () => {
    renderHook(() => useReducedMotion());
    expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates to true when media query fires with matches=true", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      addedHandler?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it("updates to false when media query fires with matches=false", () => {
    mockMatches = true;
    Object.defineProperty(globalThis, "matchMedia", {
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      })),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      addedHandler?.({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current).toBe(false);
  });

  it("queries the correct media feature", () => {
    const matchMediaSpy = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    });
    Object.defineProperty(globalThis, "matchMedia", {
      value: matchMediaSpy,
      writable: true,
      configurable: true,
    });

    renderHook(() => useReducedMotion());
    expect(matchMediaSpy).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
