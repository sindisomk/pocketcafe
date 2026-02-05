import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { 
  PoundSterling, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Clock,
  Calendar,
  Calculator,
  Timer,
  Wallet,
  Target
} from 'lucide-react';
import { Banknote, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useStaff } from '@/hooks/useStaff';
import { useSchedule } from '@/hooks/useSchedule';
import { usePayrollData } from '@/hooks/usePayrollData';
import { useAllLeaveBalances } from '@/hooks/useLeaveBalance';
import { useBudgetSettings } from '@/hooks/useBudgetSettings';
import { generatePayrollSummary, checkRestPeriodViolations, exportPayrollCSV } from '@/lib/payroll';
import { ComplianceWarningCard } from '@/components/payroll/ComplianceWarningCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Convert hours to days (8 hours = 1 day)
const hoursTodays = (hours: number) => hours / 8;

export default function Payroll() {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const currentWeekStart = startOfWeek(
    weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset),
    { weekStartsOn: 1 }
  );
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { staff, isLoading: staffLoading } = useStaff();
  const { shifts, isLoading: shiftsLoading } = useSchedule(currentWeekStart);
  const { attendanceRecords, isLoading: attendanceLoading } = usePayrollData(
    currentWeekStart,
    currentWeekEnd
  );
  const { data: leaveBalances, isLoading: leaveLoading } = useAllLeaveBalances();
  const { settings: budgets } = useBudgetSettings();

  const isLoading = staffLoading || shiftsLoading || attendanceLoading || leaveLoading;

  // Create a map of staff ID to leave balance for quick lookup
  const leaveBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    leaveBalances?.forEach((balance) => {
      map.set(balance.staff_id, balance.accrued_hours ?? 0);
    });
    return map;
  }, [leaveBalances]);

  // Generate payroll summaries for all staff
  const payrollSummaries = useMemo(() => {
    return staff.map((s) => generatePayrollSummary(s, attendanceRecords));
  }, [staff, attendanceRecords]);

  // Check for UK compliance violations
  const complianceWarnings = useMemo(() => {
    return checkRestPeriodViolations(shifts, staff);
  }, [shifts, staff]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      hours: payrollSummaries.reduce((sum, s) => sum + s.totalHoursWorked, 0),
      overtimeHours: payrollSummaries.reduce((sum, s) => sum + s.overtimeHours, 0),
      overtimePay: payrollSummaries.reduce((sum, s) => sum + s.overtimePay, 0),
      grossPay: payrollSummaries.reduce((sum, s) => sum + s.grossPay, 0),
      holidayAccrual: payrollSummaries.reduce((sum, s) => sum + s.holidayAccrual, 0),
      incomeTax: payrollSummaries.reduce((sum, s) => sum + s.incomeTax, 0),
      employeeNIC: payrollSummaries.reduce((sum, s) => sum + s.employeeNIC, 0),
      netPay: payrollSummaries.reduce((sum, s) => sum + s.netPay, 0),
    };
  }, [payrollSummaries]);

  // Calculate budget comparison (weekly budgets)
  const budgetComparison = useMemo(() => {
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

    const totalActual = Object.values(costsByDept).reduce((sum, cost) => sum + cost, 0);
    const totalBudget = budgets.kitchen + budgets.floor + budgets.bar + budgets.management;
    const percentUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalActual,
      totalBudget,
      percentUsed: Math.min(100, percentUsed),
      overBudget: totalActual > totalBudget,
      overAmount: Math.max(0, totalActual - totalBudget),
    };
  }, [staff, attendanceRecords, budgets]);

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = exportPayrollCSV(
      payrollSummaries.filter((s) => s.totalHoursWorked > 0),
      format(currentWeekStart, 'yyyy-MM-dd'),
      format(currentWeekEnd, 'yyyy-MM-dd')
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll-${format(currentWeekStart, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate hours, pay, and holiday accrual (12.07% for zero-hour contracts)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">
              {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Compliance Warnings */}
      {complianceWarnings.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              UK Compliance Warnings
            </CardTitle>
            <CardDescription>
              The following shifts may violate UK Working Time Regulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {complianceWarnings.map((warning, index) => (
                <ComplianceWarningCard key={index} warning={warning} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.hours.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PoundSterling className="h-4 w-4" />
              Gross Pay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£{totals.grossPay.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">inc. £{totals.overtimePay.toFixed(2)} OT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              PAYE Tax
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">-£{totals.incomeTax.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">income tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Employee NIC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">-£{totals.employeeNIC.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">national insurance</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Net Pay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">£{totals.netPay.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">take-home pay</p>
          </CardContent>
        </Card>

        <Card className={cn(budgetComparison.overBudget && "border-destructive/50")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget Status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={cn(
              "text-2xl font-bold",
              budgetComparison.overBudget && "text-destructive"
            )}>
              {budgetComparison.percentUsed.toFixed(0)}%
            </p>
            <Progress 
              value={budgetComparison.percentUsed} 
              className={cn(
                "h-2",
                budgetComparison.overBudget && "[&>div]:bg-destructive"
              )}
            />
            <p className="text-xs text-muted-foreground">
              £{totals.grossPay.toFixed(0)} / £{budgetComparison.totalBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Accrued Leave
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {hoursTodays(leaveBalances?.reduce((sum, b) => sum + (b.accrued_hours ?? 0), 0) ?? 0).toFixed(1)}d
            </p>
            <p className="text-sm text-muted-foreground">days accrued</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Staff Payroll Breakdown
          </CardTitle>
          <CardDescription>
             Includes 30-minute paid break, PAYE (UK 2024/25 rates), and Employee NIC deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Tax Code</TableHead>
                  <TableHead className="text-right">PAYE Tax</TableHead>
                  <TableHead className="text-right">Employee NIC</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-right">Accrued Leave</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollSummaries
                  .filter((s) => s.totalHoursWorked > 0)
                  .map((summary) => {
                    const staffMember = staff.find((s) => s.id === summary.staffId);
                    return (
                      <TableRow key={summary.staffId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{summary.staffName}</span>
                            {staffMember?.contract_type === 'zero_rate' && (
                              <Badge variant="outline" className="text-xs">
                                Zero-hour
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {summary.totalHoursWorked.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {summary.overtimeHours > 0 ? summary.overtimeHours.toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          £{summary.grossPay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {summary.taxCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {summary.incomeTax > 0 ? `-£${summary.incomeTax.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {summary.employeeNIC > 0 ? `-£${summary.employeeNIC.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          £{summary.netPay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(() => {
                            const accruedHours = leaveBalanceMap.get(summary.staffId) ?? 0;
                            const days = hoursTodays(accruedHours);
                            return days > 0 ? `${days.toFixed(1)}d` : <span className="text-muted-foreground">—</span>;
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.hours.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {totals.overtimeHours > 0 ? totals.overtimeHours.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    £{totals.grossPay.toFixed(2)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono text-destructive">
                    -£{totals.incomeTax.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    -£{totals.employeeNIC.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">
                    £{totals.netPay.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {hoursTodays(leaveBalances?.reduce((sum, b) => sum + (b.accrued_hours ?? 0), 0) ?? 0).toFixed(1)}d
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
