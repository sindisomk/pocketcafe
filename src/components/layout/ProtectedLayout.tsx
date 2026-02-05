import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useOutletSettings } from '@/hooks/useOutletSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Store, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { settings: outletSettings } = useOutletSettings();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar - persistent */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <SidebarInset className="flex flex-col flex-1">
          {/* Header - persistent */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex" />
            
            {/* Restaurant name */}
            <div className="hidden sm:flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {outletSettings?.name || 'PocketCafe'}
              </span>
            </div>
            
            <div className="flex-1" />
            
            {/* Right section: Date, Theme Toggle, Notifications */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Today's date */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>{format(new Date(), 'EEEE, d MMM yyyy')}</span>
              </div>
              
              {/* Separator */}
              <Separator orientation="vertical" className="hidden md:block h-6 mx-2" />
              
              {/* Theme toggle */}
              <ThemeToggle />
              
              {/* Notifications */}
              <NotificationBell />
            </div>
          </header>

          {/* Main Content - changes with route */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>

          {/* Mobile Bottom Nav - persistent */}
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
