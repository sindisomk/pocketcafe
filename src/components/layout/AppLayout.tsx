import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();

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
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex" />
            <div className="flex-1" />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>

          {/* Mobile Bottom Nav */}
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
