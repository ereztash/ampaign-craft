import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingFallback from "@/components/LoadingFallback";

const ModuleHub = lazy(() => import("./pages/ModuleHub"));
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wizard = lazy(() => import("./pages/Wizard"));
const Plans = lazy(() => import("./pages/Plans"));
const PlanView = lazy(() => import("./pages/PlanView"));
const Profile = lazy(() => import("./pages/Profile"));
const Differentiate = lazy(() => import("./pages/Differentiate"));
const SalesEntry = lazy(() => import("./pages/SalesEntry"));
const PricingEntry = lazy(() => import("./pages/PricingEntry"));
const RetentionEntry = lazy(() => import("./pages/RetentionEntry"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={prefersReducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/" element={<ModuleHub />} />
          <Route path="/legacy" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wizard" element={<Wizard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:planId" element={<PlanView />} />
          <Route path="/plans/:planId/:tab" element={<PlanView />} />
          <Route path="/differentiate" element={<Differentiate />} />
          <Route path="/sales" element={<SalesEntry />} />
          <Route path="/pricing" element={<PricingEntry />} />
          <Route path="/retention" element={<RetentionEntry />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <LanguageProvider>
      <UserProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <AnimatedRoutes />
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </UserProfileProvider>
    </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
