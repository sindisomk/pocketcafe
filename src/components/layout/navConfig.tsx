import { Users, LayoutDashboard, Calendar, Clock, Settings, CalendarDays, PoundSterling, BarChart3 } from 'lucide-react';

export const ALL_NAV_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] as const },
  { title: 'Staff', url: '/staff', icon: Users, roles: ['admin', 'manager', 'staff'] as const },
  { title: 'Schedule', url: '/schedule', icon: Calendar, roles: ['admin', 'manager', 'staff'] as const },
  { title: 'Attendance', url: '/attendance', icon: Clock, roles: ['admin', 'manager', 'staff'] as const },
  { title: 'Leave', url: '/leave', icon: CalendarDays, roles: ['admin', 'manager', 'staff'] as const },
  { title: 'Payroll', url: '/payroll', icon: PoundSterling, roles: ['admin', 'manager'] as const },
  { title: 'Reports', url: '/reports', icon: BarChart3, roles: ['admin', 'manager'] as const },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['admin'] as const },
] as const;

export function getNavItemsForRole(isAdmin: boolean, isManager: boolean) {
  const role: 'admin' | 'manager' | 'staff' = isAdmin ? 'admin' : isManager ? 'manager' : 'staff';
  return ALL_NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(role));
}
