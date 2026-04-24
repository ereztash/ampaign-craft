import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { FormData, ExperienceLevel, SavedPlan } from "@/types/funnel";
import { UnifiedProfile, fromFormData, toFormData, INITIAL_UNIFIED_PROFILE } from "@/types/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { safeStorage } from "@/lib/safeStorage";

export type UserSegment = "new-beginner" | "new-intermediate" | "new-advanced" | "returning";

export interface InvestmentMetrics {
  plansCreated: number;
  modulesCompleted: number;
  totalVisits: number;
  firstSeenDate: string | null;
  totalSessionsMinutes: number;
}

export interface UserProfile {
  isReturningUser: boolean;
  visitCount: number;
  lastVisitDate: string | null;
  lastFormData: FormData | null;
  lastPlanSummary: { name: string; date: string } | null;
  savedPlanCount: number;

  currentFormData: FormData | null;
  experienceLevel: ExperienceLevel | "";

  unifiedProfile: UnifiedProfile | null;

  isMobile: boolean;
  prefersReducedMotion: boolean;

  userSegment: UserSegment;
  achievements: string[];

  investment: InvestmentMetrics;
  milestones: OnboardingMilestones;
}

export interface OnboardingMilestones {
  formCompleted: boolean;
  firstPlanSaved: boolean;
  dataSourceConnected: boolean;
  stylomeAnalyzed: boolean;
  coachUsed: boolean;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateFormData: (data: FormData | null) => void;
  setExperienceLevel: (level: ExperienceLevel | "") => void;
  persistFormData: (data: FormData) => void;
  setUnifiedProfile: (p: UnifiedProfile) => void;
  persistUnifiedProfile: (p: UnifiedProfile) => void;
  addAchievement: (id: string) => void;
  refreshSavedPlanCount: () => void;
  completeMilestone: (key: keyof OnboardingMilestones) => void;
}

// ═══════════════════════════════════════════════
// Storage Keys
// ═══════════════════════════════════════════════

const KEYS = {
  userProfile: "funnelforge-user-profile",
  lastForm: "funnelforge-last-form",
  plans: "funnelforge-plans",
  achievements: "funnelforge-achievements",
  unifiedProfile: "funnelforge-profile",
  investment: "funnelforge-investment",
  milestones: "funnelforge-milestones",
} as const;

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function safeParseJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeStorage.getJSON<T>(key, fallback);
}

function getSavedPlans(): SavedPlan[] {
  return safeParseJson<SavedPlan[]>(KEYS.plans, []);
}

function getLastPlanSummary(plans: SavedPlan[]): { name: string; date: string } | null {
  if (plans.length === 0) return null;
  const sorted = [...plans].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  return { name: sorted[0].name, date: sorted[0].savedAt };
}

function deriveSegment(
  isReturning: boolean,
  experienceLevel: ExperienceLevel | ""
): UserSegment {
  if (isReturning) return "returning";
  switch (experienceLevel) {
    case "advanced":
      return "new-advanced";
    case "intermediate":
      return "new-intermediate";
    default:
      return "new-beginner";
  }
}

// ═══════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Hydrate from localStorage on mount
  const [visitCount, setVisitCount] = useState(1);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [lastFormData, setLastFormData] = useState<FormData | null>(null);
  const [savedPlanCount, setSavedPlanCount] = useState(0);
  const [lastPlanSummary, setLastPlanSummary] = useState<{ name: string; date: string } | null>(null);
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null);
  const [experienceLevel, setExperienceLevelState] = useState<ExperienceLevel | "">("");
  const [achievements, setAchievements] = useState<string[]>([]);
  const [unifiedProfile, setUnifiedProfileState] = useState<UnifiedProfile | null>(null);
  const [investment, setInvestment] = useState<InvestmentMetrics>({
    plansCreated: 0, modulesCompleted: 0, totalVisits: 0, firstSeenDate: null, totalSessionsMinutes: 0,
  });
  const [milestones, setMilestones] = useState<OnboardingMilestones>({
    formCompleted: false, firstPlanSaved: false, dataSourceConnected: false,
    stylomeAnalyzed: false, coachUsed: false,
  });

  useEffect(() => {
    const profileData = safeParseJson<{ visitCount: number; lastVisitDate: string | null }>(
      KEYS.userProfile,
      { visitCount: 0, lastVisitDate: null }
    );

    const newVisitCount = profileData.visitCount + 1;
    const isReturning = profileData.visitCount > 0;

    setVisitCount(newVisitCount);
    setLastVisitDate(profileData.lastVisitDate);
    setIsReturningUser(isReturning);

    safeStorage.setJSON(KEYS.userProfile, {
      visitCount: newVisitCount,
      lastVisitDate: new Date().toISOString(),
    });

    const lastForm = safeParseJson<FormData | null>(KEYS.lastForm, null);
    setLastFormData(lastForm);
    if (lastForm?.experienceLevel) {
      setExperienceLevelState(lastForm.experienceLevel);
    }

    const plans = getSavedPlans();
    setSavedPlanCount(plans.length);
    setLastPlanSummary(getLastPlanSummary(plans));

    const savedAchievements = safeParseJson<string[]>(KEYS.achievements, []);
    setAchievements(savedAchievements);

    const savedUnified = safeParseJson<UnifiedProfile | null>(KEYS.unifiedProfile, null);
    if (savedUnified) {
      setUnifiedProfileState(savedUnified);
    } else if (lastForm && lastForm.businessField) {
      const migrated = fromFormData(lastForm);
      setUnifiedProfileState(migrated);
      safeStorage.setJSON(KEYS.unifiedProfile, migrated);
    }

    const savedMilestones = safeParseJson<OnboardingMilestones>(KEYS.milestones, {
      formCompleted: false, firstPlanSaved: false, dataSourceConnected: false,
      stylomeAnalyzed: false, coachUsed: false,
    });
    setMilestones(savedMilestones);

    const hasDiff = !!safeStorage.getString("funnelforge-differentiation-result", "");
    const modulesCompleted = (hasDiff ? 1 : 0) + (plans.length > 0 ? 1 : 0);
    const prevInvestment = safeParseJson<InvestmentMetrics>(KEYS.investment, {
      plansCreated: 0, modulesCompleted: 0, totalVisits: 0, firstSeenDate: null, totalSessionsMinutes: 0,
    });
    const updatedInvestment: InvestmentMetrics = {
      plansCreated: plans.length,
      modulesCompleted,
      totalVisits: newVisitCount,
      firstSeenDate: prevInvestment.firstSeenDate || new Date().toISOString(),
      totalSessionsMinutes: prevInvestment.totalSessionsMinutes,
    };
    setInvestment(updatedInvestment);
    safeStorage.setJSON(KEYS.investment, updatedInvestment);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setInvestment((prev) => {
        const updated = { ...prev, totalSessionsMinutes: prev.totalSessionsMinutes + 1 };
        safeStorage.setJSON(KEYS.investment, updated);
        return updated;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const updateFormData = useCallback((data: FormData | null) => {
    setCurrentFormData(data);
    if (data?.experienceLevel) {
      setExperienceLevelState(data.experienceLevel);
    }
  }, []);

  const setExperienceLevel = useCallback((level: ExperienceLevel | "") => {
    setExperienceLevelState(level);
  }, []);

  const persistFormData = useCallback((data: FormData) => {
    safeStorage.setJSON(KEYS.lastForm, data);
    setLastFormData(data);
  }, []);

  const setUnifiedProfile = useCallback((p: UnifiedProfile) => {
    setUnifiedProfileState(p);
  }, []);

  const persistUnifiedProfile = useCallback((p: UnifiedProfile) => {
    setUnifiedProfileState(p);
    safeStorage.setJSON(KEYS.unifiedProfile, p);
    const fd = toFormData(p);
    safeStorage.setJSON(KEYS.lastForm, fd);
    setLastFormData(fd);
    if (p.experienceLevel) setExperienceLevelState(p.experienceLevel);
  }, []);

  const addAchievement = useCallback((id: string) => {
    setAchievements((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      safeStorage.setJSON(KEYS.achievements, updated);
      return updated;
    });
  }, []);

  const refreshSavedPlanCount = useCallback(() => {
    const plans = getSavedPlans();
    setSavedPlanCount(plans.length);
    setLastPlanSummary(getLastPlanSummary(plans));
  }, []);

  const completeMilestone = useCallback((key: keyof OnboardingMilestones) => {
    setMilestones((prev) => {
      if (prev[key]) return prev;
      const updated = { ...prev, [key]: true };
      safeStorage.setJSON(KEYS.milestones, updated);
      return updated;
    });
  }, []);

  // Freeze the profile object's identity by its component parts. Without this
  // memo, every render of UserProfileProvider (incl. the 60s session-ticker)
  // allocates a new `profile` reference and forces every downstream useMemo
  // that depends on `profile.lastFormData` (Dashboard, CommandCenter, Wizard
  // — 16+ sites) to recompute even when no content changed.
  const profile = useMemo<UserProfile>(
    () => ({
      isReturningUser,
      visitCount,
      lastVisitDate,
      lastFormData,
      lastPlanSummary,
      savedPlanCount,
      currentFormData,
      experienceLevel,
      unifiedProfile,
      isMobile,
      prefersReducedMotion,
      userSegment: deriveSegment(isReturningUser, experienceLevel),
      achievements,
      investment,
      milestones,
    }),
    [
      isReturningUser,
      visitCount,
      lastVisitDate,
      lastFormData,
      lastPlanSummary,
      savedPlanCount,
      currentFormData,
      experienceLevel,
      unifiedProfile,
      isMobile,
      prefersReducedMotion,
      achievements,
      investment,
      milestones,
    ],
  );

  // Memoize the full context value. All callbacks below are useCallback-ed
  // with stable deps, so this object only changes when `profile` does.
  const value = useMemo(
    () => ({
      profile,
      updateFormData,
      setExperienceLevel,
      persistFormData,
      setUnifiedProfile,
      persistUnifiedProfile,
      addAchievement,
      refreshSavedPlanCount,
      completeMilestone,
    }),
    [
      profile,
      updateFormData,
      setExperienceLevel,
      persistFormData,
      setUnifiedProfile,
      persistUnifiedProfile,
      addAchievement,
      refreshSavedPlanCount,
      completeMilestone,
    ],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error("useUserProfile must be used within UserProfileProvider");
  return context;
};
