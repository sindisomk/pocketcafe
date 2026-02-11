import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useOutletSettings } from '@/hooks/useOutletSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDays, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ProtectedLayout() {
  const location = useLocation();
  const { user, loading, isAdmin, isManager, signOut } = useAuth();
  const { settings: outletSettings } = useOutletSettings();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error('Failed to sign out');
  };

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

  // Route-level RBAC: Settings admin-only; Payroll & Reports admin or manager
  const path = location.pathname;
  if (path === '/settings' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if ((path === '/payroll' || path === '/reports') && !isAdmin && !isManager) {
    return <Navigate to="/" replace />;
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
              
              <span className="font-semibold text-foreground">
                {outletSettings?.name || 'PocketCafe'}
              </span>
            </div>
            
            <div className="flex-1" />
            
            {/* Right section: Date, Theme Toggle, Notifications, Mobile user menu */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Today's date - desktop */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>{format(new Date(), 'EEEE, d MMM yyyy')}</span>
              </div>

              <Separator orientation="vertical" className="hidden md:block h-6 mx-2" />

              <ThemeToggle />
              <NotificationBell />

              {/* Mobile: user menu with Sign out (replaces sidebar logout) */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Account menu">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        {isAdmin ? 'Admin' : isManager ? 'Manager' : 'Staff'}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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