 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { AttendanceRecord } from '@/types/attendance';
 import { format } from 'date-fns';
 import { queryKeys } from '@/lib/queryKeys';
 
 export function usePayrollData(startDate: Date, endDate: Date) {
   const startStr = format(startDate, 'yyyy-MM-dd');
   const endStr = format(endDate, 'yyyy-MM-dd');
 
   const attendanceQuery = useQuery({
     queryKey: queryKeys.payrollAttendance(startStr, endStr),
     queryFn: async () => {
       const { data, error } = await supabase
         .from('attendance_records')
         .select('*')
         .gte('clock_in_time', `${startStr}T00:00:00`)
         .lte('clock_in_time', `${endStr}T23:59:59`)
         .eq('status', 'clocked_out'); // Only count completed shifts
 
       if (error) throw error;
       return data as AttendanceRecord[];
     },
   });
 
   return {
     attendanceRecords: attendanceQuery.data ?? [],
     isLoading: attendanceQuery.isLoading,
     isError: attendanceQuery.isError,
     error: attendanceQuery.error,
     refetch: attendanceQuery.refetch,
   };
 }