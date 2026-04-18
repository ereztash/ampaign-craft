import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import AppTopBar from "@/components/AppTopBar";
import MobileTabBar from "@/components/MobileTabBar";
import LoadingFallback from "@/components/LoadingFallback";
import Footer from "@/components/Footer";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useOutreachEscalation } from "@/hooks/useOutreachEscalation";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { BlindSpotNudge } from "@/components/BlindSpotNudge";

// Motion transition configs per archetype preset.
// Values mirror the CSS --motion-easing / --motion-duration-multiplier tokens
// in index.css so framer-motion animations stay in sync with CSS transitions.
const MOTION_TRANSITION: Record<string, object> = {
  minimal: { duration: 0.35, ease: [0.4, 0, 0.6, 1] },
  crisp:   { duration: 0.15, ease: [0, 0, 0.2, 1] },
  playful: { duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] },
  smooth:  { duration: 0.3,  ease: [0.25, 0.46, 0.45, 0.94] },
  sharp:   { duration: 0.18, ease: [0.55, 0, 1, 0.45] },
};

const ARCHETYPE_MOTION_PRESET: Record<string, string> = {
  strategist: "minimal",
  optimizer:  "crisp",
  pioneer:    "playful",
  connector:  "smooth",
  closer:     "sharp",
};

const AppShell = () => {
  const { isRTL } = useLanguage();
  const { effectiveArchetypeId, adaptationsEnabled, confidenceTier } = useArchetype();
  // Activates all [data-archetype], [data-density], [data-field] CSS blocks in index.css
  useAdaptiveTheme();
  // Autonomous outreach when a user is "stuck" (>7d dwell) on any module.
  // Fires at most once per module per 30 days; in-app channel by default.
  useOutreachEscalation();

  const isAdapted =
    adaptationsEnabled && (confidenceTier === "confident" || confidenceTier === "strong");
  const motionPreset = isAdapted
    ? (ARCHETYPE_MOTION_PRESET[effectiveArchetypeId] ?? "smooth")
    : "smooth";
  const motionTransition = MOTION_TRANSITION[motionPreset];

  return (
    // MotionConfig `reducedMotion="user"` respects the OS-level
    // prefers-reduced-motion setting for every framer-motion child
    // without each component having to call useReducedMotion() itself.
    // `transition` is overridden per archetype preset when adaptations are on.
    <MotionConfig reducedMotion="user" transition={motionTransition}>
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": "17.5rem",
            "--sidebar-width-icon": "4rem",
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-svh w-full" dir={isRTL ? "rtl" : "ltr"}>
          {/* Skip-to-main — visible on focus for keyboard/screen-reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-primary"
          >
            {isRTL ? "דלג לתוכן הראשי" : "Skip to main content"}
          </a>
          <AppSidebar />
          <SidebarInset>
            <AppTopBar />
            <main id="main-content" className="flex flex-1 flex-col pb-20 md:pb-0">
              <Suspense fallback={<LoadingFallback />}>
                <Outlet />
              </Suspense>
              <Footer />
            </main>
            <MobileTabBar />
            <BlindSpotNudge />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MotionConfig>
  );
};

export default AppShell;
