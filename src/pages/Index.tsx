import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Calendar, AlertTriangle, PoundSterling, Coffee, ArrowRight } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useStaff } from '@/hooks/useStaff';
import { useSchedule } from '@/hooks/useSchedule';
import { useNoShows } from '@/hooks/useNoShows';
import { checkRestPeriodViolations } from '@/lib/payroll';
import { format, startOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ConnectionStatus } from '@/components/system/ConnectionStatus';
import { PageLoadingSkeleton } from '@/components/ui/loading-states';

export default function Index() {
  const { attendance, isLoading: attendanceLoading } = useAttendance();
  const { staff } = useStaff();
  const { shifts } = useSchedule(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { noShows } = useNoShows();

  const clockedIn = attendance.filter(a => a.status === 'clocked_in').length;
  const onBreak = attendance.filter(a => a.status === 'on_break').length;
  const lateCount = attendance.filter(a => a.is_late && a.status !== 'clocked_out').length;
  const noShowCount = noShows?.length ?? 0;

  // Calculate today's labor cost
  const todaysLabourCost = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = shifts.filter(s => s.shift_date === today);
    return todayShifts.reduce((total, shift) => {
      const hours = shift.shift_type === 'morning' ? 7 : 7; // Base hours
      return total + (hours * shift.staff_profiles.hourly_rate);
    }, 0);
  }, [shifts]);

  // Check for compliance warnings
  const complianceWarnings = useMemo(() => {
    // Map ShiftWithStaff to Shift for the compliance check
    const shiftsForCheck = shifts.map(s => ({
      id: s.id,
      schedule_id: s.schedule_id,
      staff_id: s.staff_id,
      shift_date: s.shift_date,
      shift_type: s.shift_type,
      start_time: s.start_time,
      end_time: s.end_time,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
    return checkRestPeriodViolations(shiftsForCheck, staff);
  }, [shifts, staff]);

  // Get current shift type based on time
  const currentHour = new Date().getHours();
  const currentShift = currentHour < 15 ? 'Morning' : 'Evening';
  const shiftTime = currentHour < 15 ? '08:00 – 15:00' : '15:00 – 22:00';

  const isLoading = attendanceLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <PageLoadingSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
               {format(new Date(), 'EEEE, MMMM d, yyyy')} • PocketCafe Management
            </p>
          </div>
          <ConnectionStatus showLastSync />
        </div>

         {/* Compliance Warnings Banner */}
         {complianceWarnings.length > 0 && (
           <Card className="border-warning bg-warning/5">
             <CardContent className="py-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-warning/10 rounded-lg">
                     <AlertTriangle className="h-5 w-5 text-warning" />
                   </div>
                   <div>
                     <p className="font-medium text-warning">UK Compliance Alert</p>
                     <p className="text-sm text-muted-foreground">
                       {complianceWarnings.length} rest period violation{complianceWarnings.length > 1 ? 's' : ''} detected in this week's schedule
                     </p>
                   </div>
                 </div>
                 <Button variant="outline" size="sm" asChild>
                   <Link to="/payroll">
                     View Details
                     <ArrowRight className="h-4 w-4 ml-2" />
                   </Link>
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}
 
        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Staff On-Site
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceLoading ? '—' : clockedIn}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clocked in now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On Break
              </CardTitle>
              <Coffee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceLoading ? '—' : onBreak}</div>
              <p className="text-xs text-muted-foreground mt-1">
                30-min paid break
              </p>
            </CardContent>
          </Card>

          <Card className={lateCount > 0 ? 'border-warning' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Late Arrivals
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${lateCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lateCount > 0 ? 'text-warning' : ''}`}>
                {attendanceLoading ? '—' : lateCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Today
              </p>
            </CardContent>
          </Card>

          <Card className={noShowCount > 0 ? 'border-destructive' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                No-Shows
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${noShowCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${noShowCount > 0 ? 'text-destructive' : ''}`}>
                {noShowCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unresolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Labour Cost
              </CardTitle>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todaysLabourCost > 0 ? `£${todaysLabourCost.toFixed(0)}` : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Today's total
              </p>
            </CardContent>
          </Card>
        </div>

         {/* Quick Links */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
           <Link to="/attendance">
             <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Clock className="h-5 w-5 text-primary" />
                   Attendance
                 </CardTitle>
                 <CardDescription>
                   View today's clock-ins and access the Kiosk
                 </CardDescription>
               </CardHeader>
             </Card>
           </Link>
 
           <Link to="/schedule">
             <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Calendar className="h-5 w-5 text-primary" />
                   Schedule
                 </CardTitle>
                 <CardDescription>
                   Manage weekly shifts and publish rotas
                 </CardDescription>
               </CardHeader>
             </Card>
           </Link>
 
           <Link to="/payroll">
             <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <PoundSterling className="h-5 w-5 text-primary" />
                   Payroll
                 </CardTitle>
                 <CardDescription>
                   Calculate hours and export for Xero/Sage
                 </CardDescription>
               </CardHeader>
             </Card>
           </Link>
         </div>
 
         {/* Operational Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Overview</CardTitle>
            <CardDescription>
               Real-time attendance and shift monitoring
            </CardDescription>
          </CardHeader>
           <CardContent>
             <div className="grid gap-4 sm:grid-cols-3">
               <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                   <span className="text-sm font-medium text-success">Live Status</span>
                 </div>
                 <p className="text-2xl font-bold">{clockedIn + onBreak}</p>
                 <p className="text-sm text-muted-foreground">staff active</p>
               </div>
 
               <div className="p-4 rounded-lg bg-muted border">
                 <div className="flex items-center gap-2 mb-2">
                   <Users className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm font-medium">Total Staff</span>
                 </div>
                 <p className="text-2xl font-bold">{staff.length}</p>
                 <p className="text-sm text-muted-foreground">registered</p>
               </div>
 
               <div className="p-4 rounded-lg bg-muted border">
                 <div className="flex items-center gap-2 mb-2">
                   <Calendar className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm font-medium">This Week</span>
                 </div>
                 <p className="text-2xl font-bold">{shifts.length}</p>
                 <p className="text-sm text-muted-foreground">shifts scheduled</p>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
