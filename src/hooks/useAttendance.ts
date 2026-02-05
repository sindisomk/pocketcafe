 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { AttendanceRecord, AttendanceRecordWithStaff } from '@/types/attendance';
 import { toast } from 'sonner';
 import { format } from 'date-fns';
 
interface ClockInParams {
  staffId: string;
  faceConfidence?: number;
  overrideBy?: string;
  overridePinUsed?: boolean;
}

 export function useAttendance(date?: Date) {
   const queryClient = useQueryClient();
   const targetDate = date || new Date();
   const dateStr = format(targetDate, 'yyyy-MM-dd');
 
   const attendanceQuery = useQuery({
     queryKey: ['attendance', dateStr],
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
    mutationFn: async ({ staffId, faceConfidence, overrideBy, overridePinUsed }: ClockInParams) => {
       const { data, error } = await supabase
         .from('attendance_records')
         .insert({
           staff_id: staffId,
           status: 'clocked_in',
           face_match_confidence: faceConfidence,
          override_by: overrideBy,
          override_pin_used: overridePinUsed ?? false,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
       toast.success('Successfully clocked in!');
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
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
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