import { Users, LayoutDashboard, Calendar, Clock, Settings, CalendarDays, PoundSterling } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Staff', url: '/staff', icon: Users },
  { title: 'Schedule', url: '/schedule', icon: Calendar },
  { title: 'Attendance', url: '/attendance', icon: Clock },
  { title: 'Leave', url: '/leave', icon: CalendarDays },
  { title: 'Payroll', url: '/payroll', icon: PoundSterling },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
