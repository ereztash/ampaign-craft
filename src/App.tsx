import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingFallback from "@/components/LoadingFallback";

const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wizard = lazy(() => import("./pages/Wizard"));
const Plans = lazy(() => import("./pages/Plans"));
const PlanView = lazy(() => import("./pages/PlanView"));
const Profile = lazy(() => import("./pages/Profile"));
const Differentiate = lazy(() => import("./pages/Differentiate"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/wizard" element={<Wizard />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/plans/:planId" element={<PlanView />} />
                  <Route path="/plans/:planId/:tab" element={<PlanView />} />
                  <Route path="/differentiate" element={<Differentiate />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
