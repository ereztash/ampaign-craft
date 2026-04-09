import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import AppTopBar from "@/components/AppTopBar";
import MobileTabBar from "@/components/MobileTabBar";
import LoadingFallback from "@/components/LoadingFallback";

const AppShell = () => {
  const { isRTL } = useLanguage();

  return (
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
        <AppSidebar />
        <SidebarInset>
          <AppTopBar />
          <div className="flex flex-1 flex-col pb-20 md:pb-0">
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </div>
          <MobileTabBar />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppShell;
