import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

describe("useIsMobile", () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let changeHandler: ((e: { matches: boolean }) => void) | null = null;

  beforeEach(() => {
    addEventListenerSpy = vi.fn((event, handler) => {
      if (event === "change") changeHandler = handler;
    });
    removeEventListenerSpy = vi.fn();

    Object.defineProperty(globalThis, "matchMedia", {
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      }),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    changeHandler = null;
    vi.restoreAllMocks();
  });

  it("returns false when window.innerWidth is >= 768", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 1024, writable: true, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true when window.innerWidth is < 768", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 375, writable: true, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when window.innerWidth is exactly 768", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 768, writable: true, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("registers a change listener on the matchMedia query", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 1024, writable: true, configurable: true });
    renderHook(() => useIsMobile());
    expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates when the media query fires a change event to mobile", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 1024, writable: true, configurable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(globalThis, "innerWidth", { value: 375, writable: true, configurable: true });
      changeHandler?.({ matches: true });
    });

    expect(result.current).toBe(true);
  });

  it("removes the listener on unmount", () => {
    Object.defineProperty(globalThis, "innerWidth", { value: 1024, writable: true, configurable: true });
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
