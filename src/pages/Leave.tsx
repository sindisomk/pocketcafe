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
import { useAllLeaveBalances } from '@/hooks/useLeaveBalance';
import { useAuth } from '@/hooks/useAuth';
import { LeaveRequestDialog } from '@/components/leave/LeaveRequestDialog';
import { LeaveConflictBadge } from '@/components/leave/LeaveConflictBadge';

export default function Leave() {
  const { leaveRequests, isLoading, updateLeaveStatus, getConflicts } = useLeaveRequests();
  const { data: leaveBalances, isLoading: balancesLoading } = useAllLeaveBalances();
  const { isAdmin, isManager } = useAuth();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
 
  const pendingRequests = leaveRequests.filter((r) => r.status === 'pending');
  const approvedRequests = leaveRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = leaveRequests.filter((r) => r.status === 'rejected');
  // History: all requests, most recent first (by created_at)
  const historyRequests = [...leaveRequests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleApprove = async (id: string) => {
    await updateLeaveStatus.mutateAsync({ id, status: 'approved' });
  };

  const handleReject = async (id: string) => {
    await updateLeaveStatus.mutateAsync({ id, status: 'rejected' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const renderRequestCard = (request: typeof leaveRequests[0], showActions = false) => {
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
            {getStatusBadge(request.status)}
            {conflicts.length > 0 && request.status === 'pending' && (
              <LeaveConflictBadge count={conflicts.length} />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {format(new Date(request.start_date), 'MMM d')} -{' '}
              {format(new Date(request.end_date), 'MMM d, yyyy')}
            </span>
            <span>•</span>
            <span>{duration} day{duration > 1 ? 's' : ''}</span>
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
            <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage staff holiday and absence requests
            </p>
          </div>

          <Button onClick={() => setShowRequestDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

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
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
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
                              <span>{available.toFixed(1)}h remaining</span>
                              <span>{(balance.used_hours ?? 0).toFixed(1)}h used</span>
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
                    {approvedRequests.map((request) => renderRequestCard(request))}
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
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : historyRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No leave requests yet</p>
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
      </div>

      <LeaveRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />
    </>
  );
}
