import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

export interface ShiftTimesSettings {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  eveningEndWeekend: string;
}

const DEFAULT_SHIFT_TIMES: ShiftTimesSettings = {
  morningStart: '08:00',
  morningEnd: '15:00',
  eveningStart: '15:00',
  eveningEnd: '22:00',
  eveningEndWeekend: '23:00',
};

export function useShiftTimesSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.settingsShiftTimes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'shift_times')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value && typeof data.setting_value === 'object') {
        const stored = data.setting_value as Partial<ShiftTimesSettings>;
        return { ...DEFAULT_SHIFT_TIMES, ...stored };
      }

      return DEFAULT_SHIFT_TIMES;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<ShiftTimesSettings>) => {
      const current = query.data ?? DEFAULT_SHIFT_TIMES;
      const next = { ...current, ...settings };

      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            setting_key: 'shift_times',
            setting_value: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.settingsShiftTimes, next);
      toast.success('Shift times saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save shift times: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_SHIFT_TIMES,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings,
    refetch: query.refetch,
  };
}
