import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord, AttendanceRecordWithStaff } from '@/types/attendance';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { queryKeys } from '@/lib/queryKeys';
import { calculateLateness } from '@/lib/attendance';

interface ClockInParams {
  staffId: string;
  faceConfidence?: number;
  overrideBy?: string;
  overridePinUsed?: boolean;
  scheduledStartTime?: string;
  shiftDate?: string;
  graceMinutes?: number;
}

 export function useAttendance(date?: Date) {
   const queryClient = useQueryClient();
   const targetDate = date || new Date();
   const dateStr = format(targetDate, 'yyyy-MM-dd');
 
   const attendanceQuery = useQuery({
     queryKey: queryKeys.attendance(dateStr),
     queryFn: async () => {
       const startOfDay = `${dateStr}T00:00:00`;
       const endOfDay = `${dateStr}T23:59:59`;
 
       const { data, error } = await supabase
         .from('attendance_records')
         .select(`
           *,
           staff_profiles (
             id,
             name,
             profile_photo_url,
             role
           )
         `)
         .gte('clock_in_time', startOfDay)
         .lte('clock_in_time', endOfDay)
         .order('clock_in_time', { ascending: false });
 
       if (error) throw error;
       return data as AttendanceRecordWithStaff[];
     },
   });
 
  const clockIn = useMutation({
    mutationFn: async ({ 
      staffId, 
      faceConfidence, 
      overrideBy, 
      overridePinUsed, 
      scheduledStartTime,
      shiftDate,
      graceMinutes = 5
    }: ClockInParams) => {
      const clockInTime = new Date();
      const effectiveShiftDate = shiftDate || dateStr;
      
      // Calculate lateness if we have scheduled start time
      let isLate = false;
      let lateMinutes = 0;
      
      if (scheduledStartTime) {
        const lateness = calculateLateness(clockInTime, scheduledStartTime, effectiveShiftDate, graceMinutes);
        isLate = lateness.isLate;
        lateMinutes = lateness.lateMinutes;
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          staff_id: staffId,
          status: 'clocked_in',
          face_match_confidence: faceConfidence,
          override_by: overrideBy,
          override_pin_used: overridePinUsed ?? false,
          scheduled_start_time: scheduledStartTime || null,
          is_late: isLate,
          late_minutes: lateMinutes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(dateStr) });
      // Also invalidate shifts-today for TodayRoster
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(dateStr) });
      
      // Show appropriate toast based on lateness
      if (variables.scheduledStartTime) {
        const clockInTime = new Date();
        const lateness = calculateLateness(
          clockInTime, 
          variables.scheduledStartTime, 
          variables.shiftDate || dateStr, 
          variables.graceMinutes || 5
        );
        
        if (lateness.isLate) {
          toast.warning(`Clocked in ${lateness.lateMinutes} minutes late`);
        } else {
          toast.success('Successfully clocked in!');
        }
      } else {
        toast.success('Successfully clocked in!');
      }
    },
    onError: (error) => {
      toast.error(`Failed to clock in: ${error.message}`);
    },
  });
 
   const startBreak = useMutation({
     mutationFn: async (recordId: string) => {
       const { data, error } = await supabase
         .from('attendance_records')
         .update({
           break_start_time: new Date().toISOString(),
           status: 'on_break',
         })
         .eq('id', recordId)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: queryKeys.attendance(dateStr) });
       queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(dateStr) });
       toast.success('Break started - 30 minutes');
     },
     onError: (error) => {
       toast.error(`Failed to start break: ${error.message}`);
     },
   });
 
   const endBreak = useMutation({
     mutationFn: async (recordId: string) => {
       const { data, error } = await supabase
         .from('attendance_records')
         .update({
           break_end_time: new Date().toISOString(),
           status: 'clocked_in',
         })
         .eq('id', recordId)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: queryKeys.attendance(dateStr) });
       queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(dateStr) });
       toast.success('Break ended');
     },
     onError: (error) => {
       toast.error(`Failed to end break: ${error.message}`);
     },
   });
 
   const clockOut = useMutation({
     mutationFn: async (recordId: string) => {
       const { data, error } = await supabase
         .from('attendance_records')
         .update({
           clock_out_time: new Date().toISOString(),
           status: 'clocked_out',
         })
         .eq('id', recordId)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: queryKeys.attendance(dateStr) });
       queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(dateStr) });
       toast.success('Successfully clocked out!');
     },
     onError: (error) => {
       toast.error(`Failed to clock out: ${error.message}`);
     },
   });
 
   const getActiveRecord = (staffId: string) => {
     return attendanceQuery.data?.find(
       (record) => record.staff_id === staffId && record.status !== 'clocked_out'
     );
   };
 
   return {
     attendance: attendanceQuery.data ?? [],
     isLoading: attendanceQuery.isLoading,
     isError: attendanceQuery.isError,
     error: attendanceQuery.error,
     clockIn,
     startBreak,
     endBreak,
     clockOut,
     getActiveRecord,
     refetch: attendanceQuery.refetch,
   };
 }