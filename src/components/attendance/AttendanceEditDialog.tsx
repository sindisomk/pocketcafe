import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AttendanceRecordWithStaff, AttendanceStatus } from '@/types/attendance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AttendanceEditDialogProps {
  record: AttendanceRecordWithStaff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toTimeInput(dateStr: string | null): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'HH:mm');
}

function applyTimeToDate(baseDate: string, timeStr: string): string | null {
  if (!timeStr) return null;
  const base = new Date(baseDate);
  const [h, m] = timeStr.split(':').map(Number);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function deriveStatus(clockOut: string, breakStart: string, breakEnd: string): AttendanceStatus {
  if (clockOut) return 'clocked_out';
  if (breakStart && !breakEnd) return 'on_break';
  return 'clocked_in';
}

export default function AttendanceEditDialog({ record, open, onOpenChange }: AttendanceEditDialogProps) {
  const queryClient = useQueryClient();

  const [clockIn, setClockIn] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [notes, setNotes] = useState('');

  // Sync state when record changes
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  if (record && record.id !== lastRecordId) {
    setClockIn(toTimeInput(record.clock_in_time));
    setBreakStart(toTimeInput(record.break_start_time));
    setBreakEnd(toTimeInput(record.break_end_time));
    setClockOut(toTimeInput(record.clock_out_time));
    setNotes(record.notes || '');
    setLastRecordId(record.id);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!record) throw new Error('No record selected');

      const baseDate = record.clock_in_time;
      const newClockIn = applyTimeToDate(baseDate, clockIn);
      if (!newClockIn) throw new Error('Clock in time is required');

      const newBreakStart = applyTimeToDate(baseDate, breakStart);
      const newBreakEnd = applyTimeToDate(baseDate, breakEnd);
      const newClockOut = applyTimeToDate(baseDate, clockOut);
      const newStatus = deriveStatus(clockOut, breakStart, breakEnd);

      const { error } = await supabase
        .from('attendance_records')
        .update({
          clock_in_time: newClockIn,
          break_start_time: newBreakStart,
          break_end_time: newBreakEnd,
          clock_out_time: newClockOut,
          status: newStatus,
          notes: notes || null,
          override_pin_used: true,
        })
        .eq('id', record.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance record updated');
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-today'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance — {record.staff_profiles?.name}</DialogTitle>
          <DialogDescription>
            Manager override: edit clock and break times. Changes apply to payroll, leave, and reports.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clock-in">Clock In *</Label>
              <Input
                id="clock-in"
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clock-out">Clock Out</Label>
              <Input
                id="clock-out"
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="break-start">Break Start</Label>
              <Input
                id="break-start"
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-end">Break End</Label>
              <Input
                id="break-end"
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Override Notes</Label>
            <Textarea
              id="notes"
              placeholder="Reason for manual edit (e.g., forgot to clock out)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !clockIn}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
