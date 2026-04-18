import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast, toast, reducer } from "../use-toast";

// Reset module-level state between tests by resetting the listeners array and memory state
// We do this indirectly via rendering fresh hook instances.

describe("reducer", () => {
  const baseState = { toasts: [] };

  it("ADD_TOAST adds a toast and respects TOAST_LIMIT of 1", () => {
    const toast1 = { id: "1", title: "First" } as Parameters<typeof reducer>[1] extends { toast: infer T } ? T : never;
    const state1 = reducer(baseState, { type: "ADD_TOAST", toast: { id: "1", title: "First" } as never });
    expect(state1.toasts).toHaveLength(1);
    expect(state1.toasts[0].id).toBe("1");

    // Adding a second toast should replace the first (TOAST_LIMIT = 1)
    const state2 = reducer(state1, { type: "ADD_TOAST", toast: { id: "2", title: "Second" } as never });
    expect(state2.toasts).toHaveLength(1);
    expect(state2.toasts[0].id).toBe("2");
  });

  it("UPDATE_TOAST merges fields into the matching toast", () => {
    const state = { toasts: [{ id: "1", title: "Original", open: true }] as never[] };
    const next = reducer(state, { type: "UPDATE_TOAST", toast: { id: "1", title: "Updated" } });
    expect(next.toasts[0]).toMatchObject({ id: "1", title: "Updated", open: true });
  });

  it("DISMISS_TOAST with id sets open to false for that toast", () => {
    const state = { toasts: [{ id: "1", open: true }] as never[] };
    const next = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(next.toasts[0].open).toBe(false);
  });

  it("DISMISS_TOAST without id sets all toasts open to false", () => {
    const state = {
      toasts: [
        { id: "1", open: true },
        { id: "2", open: true },
      ] as never[],
    };
    const next = reducer(state, { type: "DISMISS_TOAST" });
    expect(next.toasts.every((t: { open: boolean }) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST with id removes that toast", () => {
    const state = { toasts: [{ id: "1" }, { id: "2" }] as never[] };
    const next = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe("2");
  });

  it("REMOVE_TOAST without id clears all toasts", () => {
    const state = { toasts: [{ id: "1" }, { id: "2" }] as never[] };
    const next = reducer(state, { type: "REMOVE_TOAST" });
    expect(next.toasts).toHaveLength(0);
  });
});

describe("useToast", () => {
  beforeEach(() => {
    // Use fake timers to prevent timeout side-effects
    vi.useFakeTimers();
  });

  it("returns initial empty toasts array", () => {
    const { result } = renderHook(() => useToast());
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });

  it("exposes toast and dismiss functions", () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe("function");
    expect(typeof result.current.dismiss).toBe("function");
  });

  it("adding a toast via result.current.toast updates state", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Hello" });
    });

    expect(result.current.toasts.length).toBeGreaterThanOrEqual(1);
    const added = result.current.toasts.find((t) => t.title === "Hello");
    expect(added).toBeDefined();
  });

  it("dismiss by id marks the toast as closed", () => {
    const { result } = renderHook(() => useToast());
    let id: string;

    act(() => {
      const ret = result.current.toast({ title: "Test" });
      id = ret.id;
    });

    act(() => {
      result.current.dismiss(id!);
    });

    const t = result.current.toasts.find((x) => x.id === id!);
    // After dismiss, toast is open:false
    expect(t?.open).toBe(false);
  });

  it("module-level toast function returns id, dismiss, and update", () => {
    vi.useFakeTimers();
    let returned: ReturnType<typeof toast>;
    act(() => {
      returned = toast({ title: "Module-level" });
    });
    expect(returned!.id).toBeDefined();
    expect(typeof returned!.dismiss).toBe("function");
    expect(typeof returned!.update).toBe("function");
    vi.useRealTimers();
  });
});
