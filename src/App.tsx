import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Staff from "./pages/Staff";
import Schedule from "./pages/Schedule";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import Kiosk from "./pages/Kiosk";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/system/ErrorBoundary";

// Build version for cache verification
const BUILD_VERSION = "2026-02-05-v5";

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
                  <Route index element={<Index />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="schedule" element={<Schedule />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="leave" element={<Leave />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="reports" element={<Reports />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
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
