import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MonitorSmartphone, 
  Coffee, 
  LogIn, 
  LogOut, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle,
  Users
} from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useNoShows } from '@/hooks/useNoShows';
import { format, differenceInMinutes } from 'date-fns';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLateMinutes } from '@/lib/attendance';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function Attendance() {
  const { attendance, isLoading } = useAttendance();
  const { noShows, resolveNoShow } = useNoShows();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedNoShow, setSelectedNoShow] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's scheduled shifts to calculate expected staff
  const { data: todayShifts = [] } = useQuery({
    queryKey: queryKeys.shiftsToday(today),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('staff_id')
        .eq('shift_date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalExpected = todayShifts.length;
  // Staff who have clocked in (any status) are "arrived"
  const arrivedStaffIds = new Set(attendance.map(a => a.staff_id));
  const awaitingCount = todayShifts.filter(s => !arrivedStaffIds.has(s.staff_id)).length;

  const clockedIn = attendance.filter(a => a.status === 'clocked_in').length;
  const onBreak = attendance.filter(a => a.status === 'on_break').length;
  const clockedOut = attendance.filter(a => a.status === 'clocked_out').length;
  const lateCount = attendance.filter(a => a.is_late).length;
  const noShowCount = noShows?.length ?? 0;

  const getStatusBadge = (status: string, isLate?: boolean, lateMinutes?: number) => {
    if (isLate && status === 'clocked_in') {
      return (
        <Badge className="bg-warning text-warning-foreground">
          Late ({formatLateMinutes(lateMinutes ?? 0)})
        </Badge>
      );
    }
    switch (status) {
      case 'clocked_in':
        return <Badge className="bg-success text-success-foreground">Clocked In</Badge>;
      case 'on_break':
        return <Badge className="bg-warning text-warning-foreground">On Break</Badge>;
      case 'clocked_out':
        return <Badge variant="secondary">Finished</Badge>;
      default:
        return null;
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const mins = differenceInMinutes(new Date(end), new Date(start));
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const handleResolveNoShow = (noShowId: string) => {
    setSelectedNoShow(noShowId);
    setResolveNotes('');
    setResolveDialogOpen(true);
  };

  const confirmResolve = () => {
    if (selectedNoShow) {
      resolveNoShow.mutate({ noShowId: selectedNoShow, notes: resolveNotes });
      setResolveDialogOpen(false);
      setSelectedNoShow(null);
      setResolveNotes('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track clock-ins, breaks, and hours worked
          </p>
        </div>

        <Button asChild>
          <Link to="/kiosk" target="_blank">
            <MonitorSmartphone className="h-4 w-4 mr-2" />
            Open Kiosk
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{awaitingCount}<span className="text-sm font-normal text-muted-foreground">/{totalExpected}</span></p>
                <p className="text-sm text-muted-foreground">Awaiting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <LogIn className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clockedIn}</p>
                <p className="text-sm text-muted-foreground">Currently Working</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Coffee className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onBreak}</p>
                <p className="text-sm text-muted-foreground">On Break</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={lateCount > 0 ? 'border-warning' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${lateCount > 0 ? 'bg-warning/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${lateCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${lateCount > 0 ? 'text-warning' : ''}`}>{lateCount}</p>
                <p className="text-sm text-muted-foreground">Late Arrivals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={noShowCount > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${noShowCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${noShowCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${noShowCount > 0 ? 'text-destructive' : ''}`}>{noShowCount}</p>
                <p className="text-sm text-muted-foreground">No-Shows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clockedOut}</p>
                <p className="text-sm text-muted-foreground">Finished Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No-Shows Alert */}
      {noShowCount > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              No-Shows ({noShowCount})
            </CardTitle>
            <CardDescription>
              Staff who were scheduled but haven't clocked in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {noShows?.map((noShow) => (
                <div
                  key={noShow.id}
                  className="flex items-center gap-4 p-3 border border-destructive/20 rounded-lg bg-destructive/5"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={noShow.staff_profiles?.profile_photo_url ?? undefined} />
                    <AvatarFallback>
                      {noShow.staff_profiles?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{noShow.staff_profiles?.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Expected at {noShow.scheduled_start_time?.slice(0, 5)}</span>
                      <span>•</span>
                      <span className="capitalize">{noShow.shifts?.shift_type} shift</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResolveNoShow(noShow.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
          <CardDescription>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No attendance records for today</p>
              <p className="text-sm mt-1">Staff can clock in using the Kiosk</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.staff_profiles?.profile_photo_url ?? undefined} />
                    <AvatarFallback>
                      {record.staff_profiles?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{record.staff_profiles?.name}</p>
                      {getStatusBadge(record.status, record.is_late, record.late_minutes)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>In: {format(new Date(record.clock_in_time), 'h:mm a')}</span>
                      {record.scheduled_start_time && (
                        <span className="text-xs">(Scheduled: {record.scheduled_start_time.slice(0, 5)})</span>
                      )}
                      {record.clock_out_time && (
                        <span>Out: {format(new Date(record.clock_out_time), 'h:mm a')}</span>
                      )}
                      {record.break_start_time && (
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3 w-3" />
                          Break taken
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {formatDuration(record.clock_in_time, record.clock_out_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">duration</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve No-Show Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve No-Show</DialogTitle>
            <DialogDescription>
              Add notes about why this no-show is being resolved (e.g., sick call, shift swap).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Resolution notes (optional)"
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmResolve} disabled={resolveNoShow.isPending}>
              {resolveNoShow.isPending ? 'Resolving...' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
