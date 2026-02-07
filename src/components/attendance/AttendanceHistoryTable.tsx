import { format, differenceInMinutes } from 'date-fns';
import { Coffee, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceRecordWithStaff } from '@/types/attendance';
import { formatLateMinutes } from '@/lib/attendance';

interface AttendanceHistoryTableProps {
  records: AttendanceRecordWithStaff[];
  isLoading: boolean;
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'h:mm a');
}

function formatDuration(start: string, end: string | null) {
  if (!end) return '—';
  const mins = differenceInMinutes(new Date(end), new Date(start));
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function getStatusBadge(status: string, isLate?: boolean | null, lateMinutes?: number | null) {
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
}

export default function AttendanceHistoryTable({ records, isLoading }: AttendanceHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No attendance records for this period</p>
      </div>
    );
  }

  // Group by date
  const grouped = records.reduce<Record<string, AttendanceRecordWithStaff[]>>((acc, record) => {
    const day = format(new Date(record.clock_in_time), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(record);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, dayRecords]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead className="hidden sm:table-cell">Break Start</TableHead>
                  <TableHead className="hidden sm:table-cell">Break End</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={record.staff_profiles?.profile_photo_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {record.staff_profiles?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{record.staff_profiles?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.status, record.is_late, record.late_minutes)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {formatTime(record.clock_in_time)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-mono">
                      {record.break_start_time ? (
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3 w-3 text-warning" />
                          {formatTime(record.break_start_time)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-mono">
                      {formatTime(record.break_end_time)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {formatTime(record.clock_out_time)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {formatDuration(record.clock_in_time, record.clock_out_time)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
