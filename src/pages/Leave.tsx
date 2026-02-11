import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CalendarDays, AlertTriangle, Check, X, Loader2, Plus, Clock, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAllLeaveBalances, useDeductLeaveForStaff, useCreditLeaveForStaff } from '@/hooks/useLeaveBalance';
import { useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LeaveRequestDialog } from '@/components/leave/LeaveRequestDialog';
import { LeaveConflictBadge } from '@/components/leave/LeaveConflictBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatLeaveHoursAsDays, formatLeaveTimeRange, getLeaveRequestHours } from '@/lib/leave';

export default function Leave() {
  const { leaveRequests, isLoading, updateLeaveStatus, updateLeaveRequest, getConflicts } = useLeaveRequests();
  const { data: leaveBalances, isLoading: balancesLoading } = useAllLeaveBalances();
  const { staff } = useStaff();
  const { isAdmin, isManager, loading: authLoading, user, role } = useAuth();
  // Wait for role to be resolved when user is logged in (avoids showing Pending first due to auth watchdog)
  const tabsReady = !authLoading && (user === null || role !== null);
  const deductLeaveForStaff = useDeductLeaveForStaff();
  const creditLeaveForStaff = useCreditLeaveForStaff();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<(typeof leaveRequests)[0] | null>(null);
  const [historyStaffFilter, setHistoryStaffFilter] = useState<string>('all');
  const [deductingRequestId, setDeductingRequestId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
 
  const pendingRequests = leaveRequests.filter((r) => r.status === 'pending');
  const approvedRequests = leaveRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = leaveRequests.filter((r) => r.status === 'rejected');
  // History: all requests, most recent first (by created_at), optionally filtered by employee
  const historyRequests = [...leaveRequests]
    .filter((r) => historyStaffFilter === 'all' || r.staff_id === historyStaffFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleApprove = async (id: string) => {
    const request = leaveRequests.find((r) => r.id === id);
    await updateLeaveStatus.mutateAsync({ id, status: 'approved' });
    if (request) {
      const hours = getLeaveRequestHours(
        request.start_date,
        request.end_date,
        request.start_time ?? null,
        request.end_time ?? null
      );
      try {
        await deductLeaveForStaff.mutateAsync({
          staffId: request.staff_id,
          hours,
          leaveRequestId: request.id,
        });
        toast.success(`Leave approved and ${hours}h deducted from balance`);
      } catch {
        toast.error('Leave approved but balance deduction failed. Use "Deduct from balance" on the request.');
      }
    }
  };

  const handleDeductFromBalance = async (request: (typeof leaveRequests)[0]) => {
    const hours = getLeaveRequestHours(
      request.start_date,
      request.end_date,
      request.start_time ?? null,
      request.end_time ?? null
    );
    setDeductingRequestId(request.id);
    try {
      await deductLeaveForStaff.mutateAsync({
        staffId: request.staff_id,
        hours,
        leaveRequestId: request.id,
      });
      toast.success(`${hours}h deducted from ${request.staff_profiles?.name ?? 'staff'} balance`);
    } finally {
      setDeductingRequestId(null);
    }
  };

  const handleCancelLeave = async (request: (typeof leaveRequests)[0]) => {
    const hours = getLeaveRequestHours(
      request.start_date,
      request.end_date,
      request.start_time ?? null,
      request.end_time ?? null
    );
    if (request.deducted_at) {
      try {
        await creditLeaveForStaff.mutateAsync({ staffId: request.staff_id, hours });
      } catch {
        toast.error('Could not credit hours back. Leave was not cancelled.');
        setCancelConfirmId(null);
        return;
      }
    }
    await updateLeaveStatus.mutateAsync({ id: request.id, status: 'cancelled' });
    toast.success('Leave cancelled' + (request.deducted_at ? ' and hours credited back' : ''));
    setCancelConfirmId(null);
  };

  const handleReject = async (id: string) => {
    await updateLeaveStatus.mutateAsync({ id, status: 'rejected' });
  };

  const handleEditSave = async (
    id: string,
    payload: {
      startDate: string;
      endDate: string;
      startTime: string | null;
      endTime: string | null;
      leaveType: string | null;
      reason: string | null;
    }
  ) => {
    const request = leaveRequests.find((r) => r.id === id);
    if (!request) return;
    setSavingEditId(id);
    try {
      const oldHours = getLeaveRequestHours(
        request.start_date,
        request.end_date,
        request.start_time ?? null,
        request.end_time ?? null
      );
      const newHours = getLeaveRequestHours(
        payload.startDate,
        payload.endDate,
        payload.startTime,
        payload.endTime
      );
      if (request.deducted_at) {
        await creditLeaveForStaff.mutateAsync({ staffId: request.staff_id, hours: oldHours });
        await updateLeaveRequest.mutateAsync({
          id,
          startDate: payload.startDate,
          endDate: payload.endDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          leaveType: payload.leaveType,
          reason: payload.reason,
        });
        await deductLeaveForStaff.mutateAsync({
          staffId: request.staff_id,
          hours: newHours,
          leaveRequestId: id,
          adjustOnly: true,
        });
        toast.success('Leave updated and balance adjusted.');
      } else {
        await updateLeaveRequest.mutateAsync({
          id,
          startDate: payload.startDate,
          endDate: payload.endDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          leaveType: payload.leaveType,
          reason: payload.reason,
        });
      }
      setEditingRequest(null);
    } finally {
      setSavingEditId(null);
    }
  };

  const getStatusBadge = (status: string, deductedAt?: string | null) => {
    switch (status) {
      case 'approved':
        return deductedAt ? (
          <Badge className="bg-success/80 text-success-foreground">Approved · Applied to balance</Badge>
        ) : (
          <Badge className="bg-success text-success-foreground">Approved</Badge>
        );
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const renderRequestCard = (
    request: typeof leaveRequests[0],
    showActions = false,
    showDeductUi = false
  ) => {
    const duration = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
    const conflicts = getConflicts(request.start_date, request.end_date).filter(
      (c) => c.id !== request.id
    );

    return (
      <div
        key={request.id}
        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={request.staff_profiles?.profile_photo_url ?? undefined} />
          <AvatarFallback>
            {request.staff_profiles?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{request.staff_profiles?.name}</p>
            {getStatusBadge(request.status, request.deducted_at)}
            {conflicts.length > 0 && request.status === 'pending' && (
              <LeaveConflictBadge count={conflicts.length} />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span>
              {format(new Date(request.start_date), 'MMM d')} -{' '}
              {format(new Date(request.end_date), 'MMM d, yyyy')}
            </span>
            <span>•</span>
            <span>{duration} day{duration > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{formatLeaveTimeRange(request.start_time ?? null, request.end_time ?? null)}</span>
            {(request.start_time ?? request.end_time) && (
              <span className="text-xs">
                ({getLeaveRequestHours(request.start_date, request.end_date, request.start_time ?? null, request.end_time ?? null)}h total)
              </span>
            )}
            {request.leave_type && (
              <>
                <span>•</span>
                <span>{request.leave_type}</span>
              </>
            )}
          </div>

          {request.reason && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {request.reason}
            </p>
          )}

          {showDeductUi && request.status === 'approved' && (isAdmin || isManager) && (
            request.deducted_at ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-md border border-border bg-muted/50 px-2 py-1 font-medium text-muted-foreground">
                  Deducted
                </span>
                <span className="text-muted-foreground">
                  ({getLeaveRequestHours(request.start_date, request.end_date, request.start_time ?? null, request.end_time ?? null)}h applied)
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => handleDeductFromBalance(request)}
                disabled={deductLeaveForStaff.isPending && deductingRequestId === request.id}
              >
                {deductLeaveForStaff.isPending && deductingRequestId === request.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Deduct from balance
                ({getLeaveRequestHours(request.start_date, request.end_date, request.start_time ?? null, request.end_time ?? null)}h)
              </Button>
            )
          )}
          {showDeductUi && request.status === 'approved' && (isAdmin || isManager) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setEditingRequest(request)}
                disabled={updateLeaveStatus.isPending}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setCancelConfirmId(request.id)}
                disabled={updateLeaveStatus.isPending}
              >
                Cancel leave
              </Button>
            </div>
          )}
        </div>

        {showActions && (isAdmin || isManager) && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-success hover:text-success hover:bg-success/10"
              onClick={() => handleApprove(request.id)}
              disabled={updateLeaveStatus.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleReject(request.id)}
              disabled={updateLeaveStatus.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage staff holiday and absence requests
            </p>
          </div>

          <Button onClick={() => setShowRequestDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {!tabsReady ? (
          <Card className="mt-4">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
        <Tabs defaultValue={isAdmin || isManager ? 'balances' : 'pending'}>
          <TabsList>
            {(isAdmin || isManager) && (
              <TabsTrigger value="balances" className="gap-2">
                <Clock className="h-4 w-4" />
                Leave Balances
                {leaveBalances && leaveBalances.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {leaveBalances.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="history">
              History
            </TabsTrigger>
          </TabsList>

          {(isAdmin || isManager) && (
            <TabsContent value="balances" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    Staff Leave Balances
                  </CardTitle>
                  <CardDescription>
                    Salaried staff have 28 days statutory leave; zero-hour staff accrue leave from hours worked (12.07%). Open a staff profile to set up or refresh their balance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {balancesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !leaveBalances || leaveBalances.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No leave balances yet</p>
                      <p className="text-sm mt-1">
                        Open a staff profile to set up 28 days for salaried staff or sync accrual for zero-hour staff.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {leaveBalances.map((balance: any) => {
                        const total = (balance.total_entitlement_hours ?? 0) + (balance.accrued_hours ?? 0);
                        const available = total - (balance.used_hours ?? 0);
                        const usedPercent = total > 0 ? ((balance.used_hours ?? 0) / total) * 100 : 0;
                        return (
                          <div key={balance.id} className="p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={balance.staff_profiles?.profile_photo_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {balance.staff_profiles?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium truncate">
                                {balance.staff_profiles?.name}
                              </span>
                            </div>
                            <Progress value={usedPercent} className="h-2 mb-1" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{formatLeaveHoursAsDays(available)} remaining</span>
                              <span>{formatLeaveHoursAsDays(balance.used_hours ?? 0)} used</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Pending Requests
                </CardTitle>
                <CardDescription>
                  Review and approve or reject leave requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => renderRequestCard(request, true))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {approvedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No approved requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvedRequests.map((request) => renderRequestCard(request, false, true))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {rejectedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No rejected requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rejectedRequests.map((request) => renderRequestCard(request))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Leave History
                </CardTitle>
                <CardDescription>
                  All leave requests, most recent first
                </CardDescription>
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">Filter by employee</Label>
                  <Select value={historyStaffFilter} onValueChange={setHistoryStaffFilter}>
                    <SelectTrigger className="w-full sm:w-[220px] mt-1">
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All staff</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : historyRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>
                      {historyStaffFilter === 'all' ? 'No leave requests yet' : 'No leave requests for this employee'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyRequests.map((request) => renderRequestCard(request))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>

      <LeaveRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />

      <LeaveRequestDialog
        open={!!editingRequest}
        onOpenChange={(open) => !open && setEditingRequest(null)}
        editRequest={editingRequest ?? undefined}
        onUpdate={handleEditSave}
        isUpdating={!!savingEditId}
      />

      <AlertDialog open={!!cancelConfirmId} onOpenChange={(open) => !open && setCancelConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this leave?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelConfirmId && (() => {
                const req = leaveRequests.find((r) => r.id === cancelConfirmId);
                if (!req) return null;
                const hours = getLeaveRequestHours(req.start_date, req.end_date, req.start_time ?? null, req.end_time ?? null);
                return (
                  <>
                    This will cancel the approved leave for {req.staff_profiles?.name}.
                    {req.deducted_at && (
                      <> The {hours}h that was deducted will be credited back to their leave balance.</>
                    )}
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep leave</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const request = cancelConfirmId ? leaveRequests.find((r) => r.id === cancelConfirmId) : null;
                if (request) handleCancelLeave(request);
              }}
            >
              Cancel leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
