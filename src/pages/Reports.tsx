import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear, 
  subMonths, 
  subWeeks,
  subQuarters,
  subYears,
  addMonths,
  addWeeks,
  addQuarters,
  addYears,
  eachWeekOfInterval, 
  eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import { BarChart3, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight, Wallet, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useStaff } from '@/hooks/useStaff';
import { usePayrollData } from '@/hooks/usePayrollData';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAllLeaveBalances } from '@/hooks/useLeaveBalance';
import { useBudgetSettings } from '@/hooks/useBudgetSettings';
import { generatePayrollSummary } from '@/lib/payroll';
import { DEPARTMENT_LABELS, StaffRole } from '@/types/staff';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

// Convert hours to days (8 hours = 1 day)
const hoursTodays = (hours: number) => hours / 8;

export default function Reports() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [offset, setOffset] = useState(0);

  // Calculate date range based on period type and offset
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (periodType) {
      case 'week':
        const baseWeek = offset === 0 ? now : (offset < 0 ? subWeeks(now, Math.abs(offset)) : addWeeks(now, offset));
        start = startOfWeek(baseWeek, { weekStartsOn: 1 });
        end = endOfWeek(baseWeek, { weekStartsOn: 1 });
        label = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        break;
      case 'month':
        const baseMonth = offset === 0 ? now : (offset < 0 ? subMonths(now, Math.abs(offset)) : addMonths(now, offset));
        start = startOfMonth(baseMonth);
        end = endOfMonth(baseMonth);
        label = format(baseMonth, 'MMMM yyyy');
        break;
      case 'quarter':
        const baseQuarter = offset === 0 ? now : (offset < 0 ? subQuarters(now, Math.abs(offset)) : addQuarters(now, offset));
        start = startOfQuarter(baseQuarter);
        end = endOfQuarter(baseQuarter);
        label = `Q${Math.floor(start.getMonth() / 3) + 1} ${format(start, 'yyyy')}`;
        break;
      case 'year':
        const baseYear = offset === 0 ? now : (offset < 0 ? subYears(now, Math.abs(offset)) : addYears(now, offset));
        start = startOfYear(baseYear);
        end = endOfYear(baseYear);
        label = format(baseYear, 'yyyy');
        break;
    }

    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [periodType, offset]);

  // Reset offset when period type changes
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriodType(newPeriod);
    setOffset(0);
  };

  const { staff } = useStaff();
  const { attendanceRecords } = usePayrollData(periodStart, periodEnd);
  const { leaveRequests } = useLeaveRequests();
  const { data: leaveBalances } = useAllLeaveBalances();
  const { settings: budgets } = useBudgetSettings();

  // Calculate labor costs by department
  const laborCostsByDepartment = useMemo(() => {
    const costsByDept: Record<string, number> = {
      floor: 0,
      kitchen: 0,
      bar: 0,
      management: 0,
    };

    staff.forEach((s) => {
      const summary = generatePayrollSummary(s, attendanceRecords);
      if (costsByDept[s.role] !== undefined) {
        costsByDept[s.role] += summary.grossPay;
      }
    });

    return Object.entries(costsByDept).map(([dept, cost]) => ({
      key: dept,
      department: DEPARTMENT_LABELS[dept as StaffRole] || dept,
      cost: Math.round(cost * 100) / 100,
    }));
  }, [staff, attendanceRecords]);

  // Calculate budget comparison
  const budgetComparison = useMemo(() => {
    // Scale budgets based on period type (budgets are weekly)
    const scaleFactor = periodType === 'week' ? 1 : 
                        periodType === 'month' ? 4.33 : 
                        periodType === 'quarter' ? 13 : 52;
    
    return laborCostsByDepartment.map((deptCost) => {
      const weeklyBudget = budgets[deptCost.key as keyof typeof budgets] ?? 0;
      const scaledBudget = weeklyBudget * scaleFactor;
      const percentUsed = scaledBudget > 0 ? (deptCost.cost / scaledBudget) * 100 : 0;
      return {
        department: deptCost.department,
        key: deptCost.key,
        actual: deptCost.cost,
        budget: Math.round(scaledBudget),
        percentUsed: Math.min(percentUsed, 100),
        overBudget: deptCost.cost > scaledBudget,
        overAmount: Math.max(0, deptCost.cost - scaledBudget),
      };
    });
  }, [laborCostsByDepartment, budgets, periodType]);

  // Calculate trend data based on period
  const trendData = useMemo(() => {
    if (periodType === 'week') {
      // Daily granularity for week
      const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
      return days.map((day) => {
        const dayRecords = attendanceRecords.filter((r) => {
          const clockIn = new Date(r.clock_in_time);
          return format(clockIn, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });

        let totalCost = 0;
        staff.forEach((s) => {
          const summary = generatePayrollSummary(s, dayRecords);
          totalCost += summary.grossPay;
        });

        return {
          label: format(day, 'EEE'),
          cost: Math.round(totalCost * 100) / 100,
        };
      });
    } else if (periodType === 'month') {
      // Weekly granularity for month
      const weeks = eachWeekOfInterval({ start: periodStart, end: periodEnd }, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekRecords = attendanceRecords.filter((r) => {
          const clockIn = new Date(r.clock_in_time);
          return clockIn >= weekStart && clockIn <= weekEnd;
        });

        let totalCost = 0;
        staff.forEach((s) => {
          const summary = generatePayrollSummary(s, weekRecords);
          totalCost += summary.grossPay;
        });

        return {
          label: format(weekStart, 'MMM d'),
          cost: Math.round(totalCost * 100) / 100,
        };
      });
    } else {
      // Monthly granularity for quarter/year
      const months = eachMonthOfInterval({ start: periodStart, end: periodEnd });
      return months.map((month) => {
        const monthEnd = endOfMonth(month);
        const monthRecords = attendanceRecords.filter((r) => {
          const clockIn = new Date(r.clock_in_time);
          return clockIn >= month && clockIn <= monthEnd;
        });

        let totalCost = 0;
        staff.forEach((s) => {
          const summary = generatePayrollSummary(s, monthRecords);
          totalCost += summary.grossPay;
        });

        return {
          label: format(month, periodType === 'quarter' ? 'MMM' : 'MMM'),
          cost: Math.round(totalCost * 100) / 100,
        };
      });
    }
  }, [periodType, periodStart, periodEnd, attendanceRecords, staff]);

  // Leave statistics
  const leaveStats = useMemo(() => {
    const periodRequests = leaveRequests.filter((r) => {
      const start = new Date(r.start_date);
      return start >= periodStart && start <= periodEnd;
    });

    const byStatus = {
      pending: periodRequests.filter((r) => r.status === 'pending').length,
      approved: periodRequests.filter((r) => r.status === 'approved').length,
      rejected: periodRequests.filter((r) => r.status === 'rejected').length,
    };

    return [
      { name: 'Pending', value: byStatus.pending },
      { name: 'Approved', value: byStatus.approved },
      { name: 'Rejected', value: byStatus.rejected },
    ];
  }, [leaveRequests, periodStart, periodEnd]);

  // Leave balance data for chart
  const leaveBalanceData = useMemo(() => {
    if (!leaveBalances) return [];

    return leaveBalances.map((balance) => {
      const staffMember = staff.find((s) => s.id === balance.staff_id);
      const accrued = balance.accrued_hours ?? 0;
      const used = balance.used_hours ?? 0;
      const available = Math.max(0, accrued - used);
      
      return {
        name: staffMember?.name?.split(' ')[0] ?? 'Unknown',
        fullName: staffMember?.name ?? 'Unknown',
        used: hoursTodays(used),
        available: hoursTodays(available),
        total: hoursTodays(accrued),
      };
    }).sort((a, b) => b.total - a.total);
  }, [leaveBalances, staff]);

  // Attendance statistics by department
  const attendanceByDept = useMemo(() => {
    const deptStats: Record<string, { clockedIn: number; totalShifts: number }> = {};

    staff.forEach((s) => {
      if (!deptStats[s.role]) {
        deptStats[s.role] = { clockedIn: 0, totalShifts: 0 };
      }
      const staffRecords = attendanceRecords.filter((r) => r.staff_id === s.id);
      deptStats[s.role].totalShifts += staffRecords.length;
      deptStats[s.role].clockedIn += staffRecords.filter((r) => r.clock_out_time).length;
    });

    return Object.entries(deptStats).map(([dept, stats]) => ({
      department: DEPARTMENT_LABELS[dept as StaffRole] || dept,
      completed: stats.clockedIn,
      total: stats.totalShifts,
    }));
  }, [staff, attendanceRecords]);

  const totalLaborCost = laborCostsByDepartment.reduce((sum, d) => sum + d.cost, 0);
  const totalBudget = budgetComparison.reduce((sum, d) => sum + d.budget, 0);
  const totalBudgetPercent = totalBudget > 0 ? (totalLaborCost / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Labor costs, leave, and attendance trends by department
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Type Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((period) => (
              <Button
                key={period}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3",
                  periodType === period && "bg-background shadow-sm"
                )}
                onClick={() => handlePeriodChange(period)}
              >
                {PERIOD_LABELS[period]}
              </Button>
            ))}
          </div>

          {/* Period Navigation */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOffset((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium min-w-[120px] text-center">
              {periodLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOffset((prev) => prev + 1)}
              disabled={offset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Budget vs Actual Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {budgetComparison.map((dept) => (
          <Card key={dept.key} className={cn(dept.overBudget && "border-destructive/50")}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {dept.department}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "text-2xl font-bold",
                  dept.overBudget && "text-destructive"
                )}>
                  £{dept.actual.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / £{dept.budget.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={dept.percentUsed} 
                className={cn(
                  "h-2",
                  dept.overBudget && "[&>div]:bg-destructive"
                )}
              />
              {dept.overBudget && (
                <p className="text-xs text-destructive">
                  Over by £{dept.overAmount.toFixed(0)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Total Budget Card */}
        <Card className={cn(totalBudgetPercent > 100 && "border-destructive/50")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Budget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className={cn(
                "text-2xl font-bold",
                totalBudgetPercent > 100 && "text-destructive"
              )}>
                {Math.min(100, totalBudgetPercent).toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground">utilized</span>
            </div>
            <Progress 
              value={Math.min(100, totalBudgetPercent)} 
              className={cn(
                "h-2",
                totalBudgetPercent > 100 && "[&>div]:bg-destructive"
              )}
            />
            <p className="text-xs text-muted-foreground">
              £{totalLaborCost.toFixed(0)} of £{totalBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Labor Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£{totalLaborCost.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">this {periodType}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{staff.length}</p>
            <p className="text-sm text-muted-foreground">active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leave Requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{leaveStats.reduce((sum, s) => sum + s.value, 0)}</p>
            <p className="text-sm text-muted-foreground">this {periodType}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="labor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="labor">Labor Costs</TabsTrigger>
          <TabsTrigger value="leave">Leave Trends</TabsTrigger>
          <TabsTrigger value="leave-balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="labor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Labor Costs by Department
                </CardTitle>
                <CardDescription>
                  Total wages paid per department this {periodType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={laborCostsByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="department" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip 
                        formatter={(value: number) => [`£${value.toFixed(2)}`, 'Cost']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Labor Cost Trend
                </CardTitle>
                <CardDescription>
                  Labor spend over time ({periodType === 'week' ? 'daily' : periodType === 'month' ? 'weekly' : 'monthly'})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [`£${value.toFixed(2)}`, 'Cost']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Requests by Status
              </CardTitle>
              <CardDescription>
                Distribution of leave requests this {periodType}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leaveStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave-balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Staff Leave Balances
              </CardTitle>
              <CardDescription>
                Used vs available leave days per staff member (8 hours = 1 day)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaveBalanceData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No leave balance data available
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveBalanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(value) => `${value}d`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }} 
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(1)} days`,
                          name === 'used' ? 'Used' : 'Available'
                        ]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                      />
                      <Legend />
                      <Bar 
                        dataKey="used" 
                        name="Used" 
                        stackId="a" 
                        fill="hsl(var(--chart-2))" 
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar 
                        dataKey="available" 
                        name="Available" 
                        stackId="a" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Balance Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Accrued</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {leaveBalanceData.reduce((sum, d) => sum + d.total, 0).toFixed(1)}d
                </p>
                <p className="text-sm text-muted-foreground">across all staff</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Used</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-2">
                  {leaveBalanceData.reduce((sum, d) => sum + d.used, 0).toFixed(1)}d
                </p>
                <p className="text-sm text-muted-foreground">leave taken</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Available</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {leaveBalanceData.reduce((sum, d) => sum + d.available, 0).toFixed(1)}d
                </p>
                <p className="text-sm text-muted-foreground">remaining</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendance by Department
              </CardTitle>
              <CardDescription>
                Completed shifts vs total shifts per department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceByDept}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="completed" name="Completed Shifts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total Shifts" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
