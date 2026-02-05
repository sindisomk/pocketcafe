import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkHoursSettings {
  latenessGraceMinutes: number;
  noShowThresholdMinutes: number;
  paidBreakMinutes: number;
  minRestBetweenShifts: number;
  maxWeeklyHours: number;
  autoClockOutEnabled: boolean;
  autoClockOutHours: number;
}

const DEFAULT_WORK_HOURS: WorkHoursSettings = {
  latenessGraceMinutes: 5,
  noShowThresholdMinutes: 30,
  paidBreakMinutes: 30,
  minRestBetweenShifts: 11,
  maxWeeklyHours: 48,
  autoClockOutEnabled: true,
  autoClockOutHours: 12,
};

export const queryKeys = {
  workHoursSettings: ['settings', 'work_hours'] as const,
};

export function useWorkHoursSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.workHoursSettings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'work_hours')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        // Cast and merge with defaults to ensure all fields exist
        const storedSettings = data.setting_value as Partial<WorkHoursSettings>;
        return { ...DEFAULT_WORK_HOURS, ...storedSettings };
      }
      
      return DEFAULT_WORK_HOURS;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - settings don't change often
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<WorkHoursSettings>) => {
      const currentSettings = query.data || DEFAULT_WORK_HOURS;
      const newSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'work_hours',
          setting_value: newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
      return newSettings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(queryKeys.workHoursSettings, newSettings);
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_WORK_HOURS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings,
    refetch: query.refetch,
  };
}
