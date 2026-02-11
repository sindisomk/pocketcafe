import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { RouteFallback } from "@/components/ui/loading-states";
import { ErrorBoundary } from "./components/system/ErrorBoundary";

// Eager-load entry points (small, critical path)
import Login from "./pages/Login";
import Kiosk from "./pages/Kiosk";

// Lazy-load protected and secondary pages (smaller initial bundle, faster mobile load)
const Index = lazy(() => import("./pages/Index"));
const Staff = lazy(() => import("./pages/Staff"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Leave = lazy(() => import("./pages/Leave"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Build version for cache verification (set VITE_APP_VERSION in .env for releases)
const BUILD_VERSION = import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || "dev";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes
      gcTime: 1000 * 60 * 30,        // 30 minutes garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,    // Refetch when tab becomes active
      refetchOnReconnect: true,      // Refetch on network reconnect
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});

const App = () => {
  // Global error handlers to catch unhandled rejections and errors
  useEffect(() => {
    console.log("[App] Booted", { buildVersion: BUILD_VERSION });

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[App] Unhandled Promise Rejection:", {
        type: typeof event.reason,
        message: event.reason?.message,
        stack: event.reason?.stack,
        reason: event.reason,
      });
      toast.error("An unexpected error occurred", {
        description: event.reason?.message || "Unknown error",
      });
    };

    const handleError = (event: ErrorEvent) => {
      console.error("[App] Uncaught Error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
      toast.error("An error occurred", {
        description: event.message || "Unknown error",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/kiosk" element={<Kiosk />} />
                
                {/* Protected routes with shared persistent layout */}
                <Route element={<ProtectedLayout />}>
                  <Route index element={<Suspense fallback={<RouteFallback />}><Index /></Suspense>} />
                  <Route path="staff" element={<Suspense fallback={<RouteFallback />}><Staff /></Suspense>} />
                  <Route path="schedule" element={<Suspense fallback={<RouteFallback />}><Schedule /></Suspense>} />
                  <Route path="attendance" element={<Suspense fallback={<RouteFallback />}><Attendance /></Suspense>} />
                  <Route path="leave" element={<Suspense fallback={<RouteFallback />}><Leave /></Suspense>} />
                  <Route path="payroll" element={<Suspense fallback={<RouteFallback />}><Payroll /></Suspense>} />
                  <Route path="settings" element={<Suspense fallback={<RouteFallback />}><Settings /></Suspense>} />
                  <Route path="reports" element={<Suspense fallback={<RouteFallback />}><Reports /></Suspense>} />
                </Route>

                <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFound /></Suspense>} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </RealtimeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
