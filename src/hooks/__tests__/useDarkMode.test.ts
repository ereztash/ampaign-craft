import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

import { safeStorage } from "@/lib/safeStorage";
import { useDarkMode } from "../useDarkMode";

const mockSafeStorage = vi.mocked(safeStorage);

let mockMediaMatches = false;
let mockChangeHandler: ((e: { matches: boolean }) => void) | null = null;

function setupMatchMedia(matches: boolean) {
  mockMediaMatches = matches;
  Object.defineProperty(globalThis, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? mockMediaMatches : false,
      addEventListener: vi.fn((event, handler) => {
        if (event === "change") mockChangeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
}

describe("useDarkMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeHandler = null;
    mockSafeStorage.getString.mockReturnValue("");
    setupMatchMedia(false);
    // Reset document class
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("defaults to system preference when no saved value", () => {
    mockSafeStorage.getString.mockReturnValue("");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.preference).toBe("system");
  });

  it("restores saved preference 'light' from storage", () => {
    mockSafeStorage.getString.mockReturnValue("light");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.preference).toBe("light");
  });

  it("restores saved preference 'dark' from storage", () => {
    mockSafeStorage.getString.mockReturnValue("dark");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.preference).toBe("dark");
  });

  it("restores saved preference 'system' from storage", () => {
    mockSafeStorage.getString.mockReturnValue("system");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.preference).toBe("system");
  });

  it("isDark is false when preference is light", () => {
    mockSafeStorage.getString.mockReturnValue("light");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
  });

  it("isDark is true when preference is dark", () => {
    mockSafeStorage.getString.mockReturnValue("dark");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(true);
  });

  it("isDark follows system preference when mode is system", () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
  });

  it("isDark is true when system prefers dark and preference is system", () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(true);
  });

  it("setPreference updates preference and persists to storage", () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.setPreference("dark");
    });
    expect(result.current.preference).toBe("dark");
    expect(mockSafeStorage.setString).toHaveBeenCalledWith("funnelforge-dark-mode", "dark");
  });

  it("toggle switches from dark to light", () => {
    mockSafeStorage.getString.mockReturnValue("dark");
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.preference).toBe("light");
    expect(result.current.isDark).toBe(false);
  });

  it("toggle switches from light to dark", () => {
    mockSafeStorage.getString.mockReturnValue("light");
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.preference).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("adds dark class to document.documentElement when isDark is true", () => {
    mockSafeStorage.getString.mockReturnValue("dark");
    renderHook(() => useDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from document.documentElement when isDark is false", () => {
    document.documentElement.classList.add("dark");
    mockSafeStorage.getString.mockReturnValue("light");
    renderHook(() => useDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setPreference to system re-evaluates system preference", () => {
    setupMatchMedia(true);
    mockSafeStorage.getString.mockReturnValue("light");
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
    act(() => {
      result.current.setPreference("system");
    });
    expect(result.current.isDark).toBe(true);
  });
});
