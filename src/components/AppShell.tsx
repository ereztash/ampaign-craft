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
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { BlindSpotNudge } from "@/components/BlindSpotNudge";

const AppShell = () => {
  const { isRTL } = useLanguage();
  // Activates all [data-archetype], [data-density], [data-field] CSS blocks in index.css
  useAdaptiveTheme();

  return (
    // MotionConfig `reducedMotion="user"` respects the OS-level
    // prefers-reduced-motion setting for every framer-motion child
    // without each component having to call useReducedMotion() itself.
    <MotionConfig reducedMotion="user">
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
