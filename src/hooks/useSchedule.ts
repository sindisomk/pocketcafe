import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shift, ShiftWithStaff, WeeklySchedule, SHIFT_TIMES, getEveningEndTime } from '@/types/schedule';
import { toast } from 'sonner';
import { format, startOfWeek, addDays } from 'date-fns';
import { queryKeys } from '@/lib/queryKeys';
import { getTodayUK } from '@/lib/datetime';

export function useSchedule(weekStartDate: Date) {
  const queryClient = useQueryClient();
  const weekStart = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch weekly schedule
  const scheduleQuery = useQuery({
    queryKey: queryKeys.weeklySchedule(weekStart),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('week_start_date', weekStart)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeeklySchedule | null;
    },
  });

  // Fetch shifts for the week with staff info
  const shiftsQuery = useQuery({
    queryKey: queryKeys.shifts(weekStart),
    queryFn: async () => {
      const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          staff_profiles (
            id,
            name,
            hourly_rate,
            profile_photo_url,
            role
          )
        `)
        .gte('shift_date', weekStart)
        .lte('shift_date', weekEnd)
        .order('shift_date');
      
      if (error) throw error;
      return data as ShiftWithStaff[];
    },
  });

  // Create or get weekly schedule
  const ensureSchedule = useMutation({
    mutationFn: async () => {
      // Check if schedule exists
      const { data: existing } = await supabase
        .from('weekly_schedules')
        .select('id')
        .eq('week_start_date', weekStart)
        .maybeSingle();
      
      if (existing) return existing;

      // Create new schedule
      const { data, error } = await supabase
        .from('weekly_schedules')
        .insert({ week_start_date: weekStart })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule(weekStart) });
    },
  });

  // Add shift
  const addShift = useMutation({
    mutationFn: async ({ 
      staffId, 
      shiftDate, 
      shiftType 
    }: { 
      staffId: string; 
      shiftDate: Date; 
      shiftType: 'morning' | 'evening';
    }) => {
      // Ensure schedule exists
      let scheduleId = scheduleQuery.data?.id;
      if (!scheduleId) {
        const schedule = await ensureSchedule.mutateAsync();
        scheduleId = schedule.id;
      }

      const dateStr = format(shiftDate, 'yyyy-MM-dd');
      const startTime = SHIFT_TIMES[shiftType].start;
      const endTime = shiftType === 'evening' 
        ? getEveningEndTime(shiftDate)
        : SHIFT_TIMES[shiftType].end;

      const { data, error } = await supabase
        .from('shifts')
        .insert({
          schedule_id: scheduleId,
          staff_id: staffId,
          shift_date: dateStr,
          shift_type: shiftType,
          start_time: startTime,
          end_time: endTime,
        })
        .select(`
          *,
          staff_profiles (
            id,
            name,
            hourly_rate,
            profile_photo_url,
            role
          )
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Revert schedule to draft so user can republish
      if (scheduleQuery.data?.id && scheduleQuery.data.status === 'published') {
        await supabase
          .from('weekly_schedules')
          .update({ status: 'draft', published_at: null })
          .eq('id', scheduleQuery.data.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule(weekStart) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(weekStart) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(getTodayUK()) });
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This staff member is already assigned to this shift');
      } else {
        toast.error(`Failed to add shift: ${error.message}`);
      }
    },
  });

  // Remove shift
  const removeShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      // Revert schedule to draft so user can republish
      if (scheduleQuery.data?.id && scheduleQuery.data.status === 'published') {
        await supabase
          .from('weekly_schedules')
          .update({ status: 'draft', published_at: null })
          .eq('id', scheduleQuery.data.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule(weekStart) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(weekStart) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(getTodayUK()) });
    },
    onError: (error) => {
      toast.error(`Failed to remove shift: ${error.message}`);
    },
  });

  // Publish schedule
  const publishSchedule = useMutation({
    mutationFn: async () => {
      if (!scheduleQuery.data?.id) {
        throw new Error('No schedule to publish');
      }

      const { data, error } = await supabase
        .from('weekly_schedules')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', scheduleQuery.data.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule(weekStart) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(weekStart) });
      toast.success('Schedule published successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to publish schedule: ${error.message}`);
    },
  });

  return {
    schedule: scheduleQuery.data,
    shifts: shiftsQuery.data ?? [],
    isLoading: scheduleQuery.isLoading || shiftsQuery.isLoading,
    isError: scheduleQuery.isError || shiftsQuery.isError,
    addShift,
    removeShift,
    publishSchedule,
    refetch: () => {
      scheduleQuery.refetch();
      shiftsQuery.refetch();
    },
  };
}
