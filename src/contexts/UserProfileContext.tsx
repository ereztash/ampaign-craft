import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { FormData, ExperienceLevel, SavedPlan } from "@/types/funnel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type UserSegment = "new-beginner" | "new-intermediate" | "new-advanced" | "returning";

export interface UserProfile {
  // Identity
  isReturningUser: boolean;
  visitCount: number;
  lastVisitDate: string | null;
  lastFormData: FormData | null;
  lastPlanSummary: { name: string; date: string } | null;
  savedPlanCount: number;

  // Current session
  currentFormData: FormData | null;
  experienceLevel: ExperienceLevel | "";

  // Device & preferences
  isMobile: boolean;
  prefersReducedMotion: boolean;

  // Derived
  userSegment: UserSegment;
  achievements: string[];
}

interface UserProfileContextType {
  profile: UserProfile;
  updateFormData: (data: FormData | null) => void;
  setExperienceLevel: (level: ExperienceLevel | "") => void;
  persistFormData: (data: FormData) => void;
  addAchievement: (id: string) => void;
  refreshSavedPlanCount: () => void;
}

// ═══════════════════════════════════════════════
// Storage Keys
// ═══════════════════════════════════════════════

const KEYS = {
  userProfile: "funnelforge-user-profile",
  lastForm: "funnelforge-last-form",
  plans: "funnelforge-plans",
  achievements: "funnelforge-achievements",
} as const;

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function safeParseJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

  // Initialize from localStorage
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

    // Persist updated visit info
    localStorage.setItem(
      KEYS.userProfile,
      JSON.stringify({ visitCount: newVisitCount, lastVisitDate: new Date().toISOString() })
    );

    // Load last form data
    const lastForm = safeParseJson<FormData | null>(KEYS.lastForm, null);
    setLastFormData(lastForm);
    if (lastForm?.experienceLevel) {
      setExperienceLevelState(lastForm.experienceLevel);
    }

    // Load saved plans
    const plans = getSavedPlans();
    setSavedPlanCount(plans.length);
    setLastPlanSummary(getLastPlanSummary(plans));

    // Load achievements
    const savedAchievements = safeParseJson<string[]>(KEYS.achievements, []);
    setAchievements(savedAchievements);
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
    localStorage.setItem(KEYS.lastForm, JSON.stringify(data));
    setLastFormData(data);
  }, []);

  const addAchievement = useCallback((id: string) => {
    setAchievements((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem(KEYS.achievements, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshSavedPlanCount = useCallback(() => {
    const plans = getSavedPlans();
    setSavedPlanCount(plans.length);
    setLastPlanSummary(getLastPlanSummary(plans));
  }, []);

  const profile: UserProfile = {
    isReturningUser,
    visitCount,
    lastVisitDate,
    lastFormData,
    lastPlanSummary,
    savedPlanCount,
    currentFormData,
    experienceLevel,
    isMobile,
    prefersReducedMotion,
    userSegment: deriveSegment(isReturningUser, experienceLevel),
    achievements,
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateFormData,
        setExperienceLevel,
        persistFormData,
        addAchievement,
        refreshSavedPlanCount,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error("useUserProfile must be used within UserProfileProvider");
  return context;
};
