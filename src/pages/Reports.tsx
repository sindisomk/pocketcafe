import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart3, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStaff } from '@/hooks/useStaff';
import { usePayrollData } from '@/hooks/usePayrollData';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { generatePayrollSummary } from '@/lib/payroll';
import { DEPARTMENT_LABELS, StaffRole } from '@/types/staff';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Reports() {
  const [monthOffset, setMonthOffset] = useState(0);
  
  const currentMonth = subMonths(new Date(), -monthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { staff } = useStaff();
  const { attendanceRecords } = usePayrollData(monthStart, monthEnd);
  const { leaveRequests } = useLeaveRequests();

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
      department: DEPARTMENT_LABELS[dept as StaffRole] || dept,
      cost: Math.round(cost * 100) / 100,
    }));
  }, [staff, attendanceRecords]);

  // Calculate weekly labor cost trends
  const weeklyLaborTrends = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    
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
        week: format(weekStart, 'MMM d'),
        cost: Math.round(totalCost * 100) / 100,
      };
    });
  }, [monthStart, monthEnd, attendanceRecords, staff]);

  // Leave statistics
  const leaveStats = useMemo(() => {
    const monthRequests = leaveRequests.filter((r) => {
      const start = new Date(r.start_date);
      return start >= monthStart && start <= monthEnd;
    });

    const byStatus = {
      pending: monthRequests.filter((r) => r.status === 'pending').length,
      approved: monthRequests.filter((r) => r.status === 'approved').length,
      rejected: monthRequests.filter((r) => r.status === 'rejected').length,
    };

    return [
      { name: 'Pending', value: byStatus.pending },
      { name: 'Approved', value: byStatus.approved },
      { name: 'Rejected', value: byStatus.rejected },
    ];
  }, [leaveRequests, monthStart, monthEnd]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Labor costs, leave, and attendance trends by department
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonthOffset((prev) => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonthOffset((prev) => prev + 1)}
            disabled={monthOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
            <p className="text-sm text-muted-foreground">this month</p>
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
            <p className="text-sm text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="labor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="labor">Labor Costs</TabsTrigger>
          <TabsTrigger value="leave">Leave Trends</TabsTrigger>
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
                  Total wages paid per department this month
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
                  Weekly Labor Cost Trend
                </CardTitle>
                <CardDescription>
                  Labor spend per week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyLaborTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
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
                Distribution of leave requests this month
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
