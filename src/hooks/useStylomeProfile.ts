// useStylomeProfile — persist the user's writing-style fingerprint.
//
// The fingerprint is computed once from 3-5 writing samples via
// stylomeEngine.analyzeSamples(), then stored in safeStorage.
// Once stored, every aiCopyService.generateCopy() call auto-injects
// the profile.systemPrompt — Claude matches the user's voice by default.
//
// Flow:
//   1. User pastes 3+ writing samples (emails, past ads, social posts)
//   2. analyzeSamples() computes metrics + systemPrompt
//   3. Profile stored locally (privacy-preserving — text never leaves device)
//   4. Every copy generation auto-loads and injects

import { useState, useEffect, useCallback } from "react";
import { safeStorage } from "@/lib/safeStorage";
import { analyzeSamples, type StylomeProfile, type StylomeSample } from "@/engine/stylomeEngine";

const STORAGE_KEY = "funnelforge-stylome-profile-v1";

export interface UseStylomeProfileResult {
  profile: StylomeProfile | null;
  isLoading: boolean;
  saveFromSamples: (samples: StylomeSample[]) => StylomeProfile | null;
  clear: () => void;
}

/** Read the persisted stylome profile (sync, no network). */
export function getStoredStylomeProfile(): StylomeProfile | null {
  return safeStorage.getJSON<StylomeProfile | null>(STORAGE_KEY, null);
}

/** Get only the systemPrompt — the string injected into Claude calls. */
export function getStoredStylomePrompt(): string | undefined {
  const profile = getStoredStylomeProfile();
  return profile?.systemPrompt;
}

export function useStylomeProfile(): UseStylomeProfileResult {
  const [profile, setProfile] = useState<StylomeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProfile(getStoredStylomeProfile());
    setIsLoading(false);
  }, []);

  const saveFromSamples = useCallback((samples: StylomeSample[]): StylomeProfile | null => {
    if (samples.length < 2) return null;
    const analyzed = analyzeSamples(samples);
    safeStorage.setJSON(STORAGE_KEY, analyzed);
    setProfile(analyzed);
    return analyzed;
  }, []);

  const clear = useCallback(() => {
    safeStorage.remove(STORAGE_KEY);
    setProfile(null);
  }, []);

  return { profile, isLoading, saveFromSamples, clear };
}
