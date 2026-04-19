import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ReactNode } from "react";
import { UserProfileProvider, useUserProfile, UserProfileContextType } from "../UserProfileContext";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: vi.fn(() => false),
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

vi.mock("@/types/profile", () => ({
  fromFormData: vi.fn((fd: Record<string, unknown>) => ({ ...fd, source: "formData" })),
  toFormData: vi.fn((p: Record<string, unknown>) => ({ ...p, source: "toFormData" })),
  INITIAL_UNIFIED_PROFILE: {},
}));

import { safeStorage } from "@/lib/safeStorage";
const mockSafeStorage = vi.mocked(safeStorage);

// ─── Test Consumer ────────────────────────────────────────────────────────────

const TestConsumer = ({ onCtx }: { onCtx?: (ctx: UserProfileContextType) => void }) => {
  const ctx = useUserProfile();
  onCtx?.(ctx);
  return (
    <div>
      <span data-testid="segment">{ctx.profile.userSegment}</span>
      <span data-testid="visit-count">{ctx.profile.visitCount}</span>
      <span data-testid="is-returning">{String(ctx.profile.isReturningUser)}</span>
      <span data-testid="is-mobile">{String(ctx.profile.isMobile)}</span>
      <span data-testid="reduced-motion">{String(ctx.profile.prefersReducedMotion)}</span>
      <span data-testid="experience">{ctx.profile.experienceLevel}</span>
      <span data-testid="achievements">{ctx.profile.achievements.length}</span>
      <span data-testid="plan-count">{ctx.profile.savedPlanCount}</span>
      <span data-testid="milestone-form">{String(ctx.profile.milestones.formCompleted)}</span>
    </div>
  );
};

function renderWithProvider(ui: ReactNode) {
  return render(<UserProfileProvider>{ui}</UserProfileProvider>);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("UserProfileContext — defaults (first visit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No stored data
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
    mockSafeStorage.getString.mockReturnValue("");
  });

  it("renders without crashing", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("segment")).toBeDefined();
  });

  it("userSegment is 'new-beginner' for first-time user with no experience", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-user-profile") return { visitCount: 0, lastVisitDate: null };
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("segment").textContent).toBe("new-beginner");
  });

  it("isMobile reflects useIsMobile mock (false)", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("is-mobile").textContent).toBe("false");
  });

  it("prefersReducedMotion reflects useReducedMotion mock (false)", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("reduced-motion").textContent).toBe("false");
  });

  it("achievements is empty initially", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("achievements").textContent).toBe("0");
  });

  it("savedPlanCount is 0 when no plans stored", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("plan-count").textContent).toBe("0");
  });

  it("milestones all start as false", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("milestone-form").textContent).toBe("false");
  });

  it("visitCount is incremented by 1 on each mount", () => {
    // Prior visit count = 2
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-user-profile") return { visitCount: 2, lastVisitDate: "2026-01-01" };
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("visit-count").textContent).toBe("3");
  });

  it("isReturningUser is true when prior visitCount > 0", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-user-profile") return { visitCount: 1, lastVisitDate: "2026-01-01" };
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("is-returning").textContent).toBe("true");
  });

  it("isReturningUser is false on first ever visit (visitCount=0)", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-user-profile") return { visitCount: 0, lastVisitDate: null };
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("is-returning").textContent).toBe("false");
  });

  it("userSegment is 'returning' when isReturningUser is true", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-user-profile") return { visitCount: 5, lastVisitDate: "2026-01-01" };
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("segment").textContent).toBe("returning");
  });

  it("loads saved plans count from localStorage", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [{ id: "p1" }, { id: "p2" }];
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("plan-count").textContent).toBe("2");
  });

  it("loads achievements from localStorage", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-achievements") return ["first_plan", "five_plans"];
      return fallback;
    });
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("achievements").textContent).toBe("2");
  });
});

describe("UserProfileContext — actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
    mockSafeStorage.getString.mockReturnValue("");
  });

  it("updateFormData sets currentFormData", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.updateFormData({ businessField: "tech", mainGoal: "sales" } as never);
    });

    expect(ctx.profile.currentFormData?.businessField).toBe("tech");
  });

  it("updateFormData sets experienceLevel from form data", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.updateFormData({ experienceLevel: "advanced" } as never);
    });

    expect(screen.getByTestId("experience").textContent).toBe("advanced");
  });

  it("setExperienceLevel updates experienceLevel", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setExperienceLevel("intermediate");
    });

    expect(screen.getByTestId("experience").textContent).toBe("intermediate");
  });

  it("userSegment is 'new-advanced' when experienceLevel is advanced", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setExperienceLevel("advanced");
    });

    expect(screen.getByTestId("segment").textContent).toBe("new-advanced");
  });

  it("userSegment is 'new-intermediate' when experienceLevel is intermediate", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setExperienceLevel("intermediate");
    });

    expect(screen.getByTestId("segment").textContent).toBe("new-intermediate");
  });

  it("persistFormData saves to localStorage and updates lastFormData", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    const formData = { businessField: "retail" } as never;
    await act(async () => {
      ctx.persistFormData(formData);
    });

    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith("funnelforge-last-form", formData);
    expect(ctx.profile.lastFormData).toEqual(formData);
  });

  it("addAchievement adds a new achievement id", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.addAchievement("first_plan");
    });

    expect(ctx.profile.achievements).toContain("first_plan");
    expect(screen.getByTestId("achievements").textContent).toBe("1");
  });

  it("addAchievement is idempotent", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.addAchievement("first_plan");
      ctx.addAchievement("first_plan");
    });

    expect(screen.getByTestId("achievements").textContent).toBe("1");
  });

  it("completeMilestone sets milestone to true", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.completeMilestone("formCompleted");
    });

    expect(screen.getByTestId("milestone-form").textContent).toBe("true");
  });

  it("completeMilestone persists to storage", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.completeMilestone("formCompleted");
    });

    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-milestones",
      expect.objectContaining({ formCompleted: true })
    );
  });

  it("completeMilestone is idempotent", async () => {
    let ctx!: UserProfileContextType;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.completeMilestone("formCompleted");
      ctx.completeMilestone("formCompleted");
    });

    expect(screen.getByTestId("milestone-form").textContent).toBe("true");
  });

  it("refreshSavedPlanCount re-reads plans from storage", async () => {
    let ctx!: UserProfileContextType;
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [];
      return fallback;
    });

    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);
    expect(screen.getByTestId("plan-count").textContent).toBe("0");

    // Now add plans to storage
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
      return fallback;
    });

    await act(async () => {
      ctx.refreshSavedPlanCount();
    });

    expect(screen.getByTestId("plan-count").textContent).toBe("3");
  });
});

describe("UserProfileContext — useUserProfile guard", () => {
  it("throws when used outside UserProfileProvider", () => {
    const Thrower = () => {
      useUserProfile();
      return null;
    };
    expect(() => render(<Thrower />)).toThrow(
      "useUserProfile must be used within UserProfileProvider"
    );
  });
});
