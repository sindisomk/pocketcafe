import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShiftTimesSettings } from '@/components/settings/ShiftTimesSettings';
import { OvertimeSettings } from '@/components/settings/OvertimeSettings';
import { LeaveSettings } from '@/components/settings/LeaveSettings';
import { WorkHoursSettings } from '@/components/settings/WorkHoursSettings';
import { PayrollTaxSettings } from '@/components/settings/PayrollTaxSettings';
import { DepartmentBudgetSettings } from '@/components/settings/DepartmentBudgetSettings';
import { ManagerPinSettings } from '@/components/settings/ManagerPinSettings';
import { RestaurantOutletSettings } from '@/components/settings/RestaurantOutletSettings';
import { 
  Clock, 
  TrendingUp, 
  CalendarDays, 
  Timer, 
  PoundSterling, 
  Wallet, 
  KeyRound, 
  Store 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { id: 'shifts', label: 'Shift Times', icon: Clock },
  { id: 'overtime', label: 'Overtime', icon: TrendingUp },
  { id: 'leave', label: 'Leave', icon: CalendarDays },
  { id: 'hours', label: 'Work Hours', icon: Timer },
  { id: 'payroll', label: 'Payroll & Tax', icon: PoundSterling },
  { id: 'budgets', label: 'Budgets', icon: Wallet },
  { id: 'pin', label: 'Manager PIN', icon: KeyRound },
  { id: 'outlet', label: 'Outlet Details', icon: Store },
] as const;

type SettingsTab = (typeof settingsTabs)[number]['id'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('shifts');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure policies, compliance rules, and restaurant details
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {settingsTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'flex items-center gap-1.5 text-xs sm:text-sm',
                'data-[state=active]:bg-background data-[state=active]:shadow-sm'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="shifts" className="mt-0">
            <ShiftTimesSettings />
          </TabsContent>

          <TabsContent value="overtime" className="mt-0">
            <OvertimeSettings />
          </TabsContent>

          <TabsContent value="leave" className="mt-0">
            <LeaveSettings />
          </TabsContent>

          <TabsContent value="hours" className="mt-0">
            <WorkHoursSettings />
          </TabsContent>

          <TabsContent value="payroll" className="mt-0">
            <PayrollTaxSettings />
          </TabsContent>

          <TabsContent value="budgets" className="mt-0">
            <DepartmentBudgetSettings />
          </TabsContent>

          <TabsContent value="pin" className="mt-0">
            <ManagerPinSettings />
          </TabsContent>

          <TabsContent value="outlet" className="mt-0">
            <RestaurantOutletSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
