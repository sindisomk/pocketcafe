import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecordWithStaff } from '@/types/attendance';

export function useAttendanceHistory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['attendance-history', startDate, endDate],
    queryFn: async () => {
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
        .gte('clock_in_time', `${startDate}T00:00:00`)
        .lte('clock_in_time', `${endDate}T23:59:59`)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      return data as AttendanceRecordWithStaff[];
    },
    enabled: !!startDate && !!endDate,
  });
}
