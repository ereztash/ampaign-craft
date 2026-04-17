import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { DataSourceProvider } from "@/contexts/DataSourceContext";
import { ArchetypeProvider } from "@/contexts/ArchetypeContext";
import { ArchetypeThemeProvider } from "@/providers/ArchetypeThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingFallback from "@/components/LoadingFallback";
import AppShell from "@/components/AppShell";
import ConsentBanner from "@/components/ConsentBanner";
import { HIDE_INCOMPLETE } from "@/lib/validateEnv";

const Index = lazy(() => import("./pages/Index"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const DataHub = lazy(() => import("./pages/DataHub"));
const StrategyCanvas = lazy(() => import("./pages/StrategyCanvas"));
const AiCoachPage = lazy(() => import("./pages/AiCoachPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wizard = lazy(() => import("./pages/Wizard"));
const Plans = lazy(() => import("./pages/Plans"));
const Profile = lazy(() => import("./pages/Profile"));
const Differentiate = lazy(() => import("./pages/Differentiate"));
const SalesEntry = lazy(() => import("./pages/SalesEntry"));
const PricingEntry = lazy(() => import("./pages/PricingEntry"));
const RetentionEntry = lazy(() => import("./pages/RetentionEntry"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SharedQuote = lazy(() => import("./pages/SharedQuote"));
const CrmPage = lazy(() => import("./pages/CrmPage"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const ArchetypeRevealScreen = lazy(() => import("./components/ArchetypeRevealScreen"));
const AARRRDashboard = lazy(() => import("./pages/AARRRDashboard"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Support = lazy(() => import("./pages/Support"));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => logger.error("react-query", error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => logger.error("react-query-mutation", error),
  }),
});

/** Old /plans/:id links → strategy canvas */
function LegacyPlanRedirect() {
  const { planId, tab } = useParams<{ planId: string; tab?: string }>();
  if (!planId) return <Navigate to="/strategy" replace />;
  return <Navigate to={tab ? `/strategy/${planId}/${tab}` : `/strategy/${planId}`} replace />;
}

const AnimatedRoutes = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/legacy" element={<Index />} />
          <Route path="/quote/:token" element={<SharedQuote />} />
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
            <Route
              path="crm"
              element={
                HIDE_INCOMPLETE
                  ? <ComingSoon featureName={{ he: "CRM", en: "CRM" }} eta={{ he: "לאחר Beta", en: "post-Beta" }} />
                  : <CrmPage />
              }
            />
            <Route path="profile" element={<Profile />} />
            <Route path="archetype" element={<ArchetypeRevealScreen />} />
            <Route path="admin/aarrr" element={<AARRRDashboard />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="support" element={<Support />} />
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
          <ArchetypeProvider>
          <ArchetypeThemeProvider>
          <DataSourceProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <AnimatedRoutes />
                  </Suspense>
                  <ConsentBanner />
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </DataSourceProvider>
          </ArchetypeThemeProvider>
          </ArchetypeProvider>
        </UserProfileProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
