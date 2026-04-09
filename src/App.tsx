import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { DataSourceProvider } from "@/contexts/DataSourceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingFallback from "@/components/LoadingFallback";
import AppShell from "@/components/AppShell";

const Index = lazy(() => import("./pages/Index"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const DataHub = lazy(() => import("./pages/DataHub"));
const StrategyCanvas = lazy(() => import("./pages/StrategyCanvas"));
const AiCoachPage = lazy(() => import("./pages/AiCoachPage"));
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

/** Old /plans/:id links → strategy canvas */
function LegacyPlanRedirect() {
  const { planId, tab } = useParams<{ planId: string; tab?: string }>();
  if (!planId) return <Navigate to="/strategy" replace />;
  return <Navigate to={tab ? `/strategy/${planId}/${tab}` : `/strategy/${planId}`} replace />;
}

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
          <Route path="/legacy" element={<Index />} />
          <Route element={<AppShell />}>
            <Route index element={<CommandCenter />} />
            <Route path="data/:sourceId?" element={<DataHub />} />
            <Route path="strategy/:planId/:focus" element={<StrategyCanvas />} />
            <Route path="strategy/:planId" element={<StrategyCanvas />} />
            <Route path="strategy" element={<StrategyCanvas />} />
            <Route path="ai" element={<AiCoachPage />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="wizard" element={<Wizard />} />
            <Route path="plans" element={<Plans />} />
            <Route path="plans/:planId/:tab" element={<LegacyPlanRedirect />} />
            <Route path="plans/:planId" element={<LegacyPlanRedirect />} />
            <Route path="differentiate" element={<Differentiate />} />
            <Route path="sales" element={<SalesEntry />} />
            <Route path="pricing" element={<PricingEntry />} />
            <Route path="retention" element={<RetentionEntry />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
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
          <DataSourceProvider>
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
          </DataSourceProvider>
        </UserProfileProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
