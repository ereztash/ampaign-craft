import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const { language, setLanguage } = useLanguage();
  const isHe = language === "he";
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppSidebar />
      <SidebarInset>
        {/* Minimal top bar — breadcrumb area + language toggle */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ms-1" />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(isHe ? "en" : "he")}
              className="h-8 gap-1 text-xs"
            >
              <Globe className="h-3.5 w-3.5" />
              {isHe ? "EN" : "עב"}
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <div className={`flex-1 ${isMobile ? "pb-16" : ""}`}>
          {children}
        </div>
      </SidebarInset>

      {/* Mobile bottom tab bar */}
      {isMobile && <MobileTabBar />}
    </SidebarProvider>
  );
};

export default AppShell;
