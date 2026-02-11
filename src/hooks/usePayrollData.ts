 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { AttendanceRecord } from '@/types/attendance';
 import { format, startOfYear, endOfDay } from 'date-fns';
 import { queryKeys } from '@/lib/queryKeys';
 import { calculateHoursWorked } from '@/lib/payroll';

 /**
  * YTD (year-to-date) hours worked for a staff member.
  * Used to sync zero-hour leave accrual (12.07% of hours worked).
  */
 export function useStaffYTDHours(staffId: string | undefined) {
   const yearStart = startOfYear(new Date());
   const startStr = format(yearStart, 'yyyy-MM-dd');
   const endStr = format(endOfDay(new Date()), 'yyyy-MM-dd');

   const query = useQuery({
     queryKey: queryKeys.staffYTDHours(staffId ?? ''),
     enabled: !!staffId,
     queryFn: async () => {
       const { data, error } = await supabase
         .from('attendance_records')
         .select('*')
         .eq('staff_id', staffId!)
         .gte('clock_in_time', `${startStr}T00:00:00`)
         .lte('clock_in_time', `${endStr}T23:59:59`)
         .eq('status', 'clocked_out');
       if (error) throw error;
       const records = (data ?? []) as AttendanceRecord[];
       return records.reduce((sum, r) => sum + calculateHoursWorked(r), 0);
     },
   });

   return {
     ytdHours: query.data ?? 0,
     isLoading: query.isLoading,
     refetch: query.refetch,
   };
 }

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