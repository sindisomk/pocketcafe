import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OvertimeConfig {
  enabled: boolean;
  weeklyThreshold: number;
  dailyThreshold: number;
  rate: number;
  bankHolidayRate: number;
}

export const DEFAULT_OVERTIME: OvertimeConfig = {
  enabled: true,
  weeklyThreshold: 48,
  dailyThreshold: 8,
  rate: 1.5,
  bankHolidayRate: 2.0,
};

export const overtimeQueryKey = ['settings', 'overtime_config'] as const;

export function useOvertimeSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: overtimeQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'overtime_config')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const stored = data.setting_value as Partial<OvertimeConfig>;
        return { ...DEFAULT_OVERTIME, ...stored };
      }

      return DEFAULT_OVERTIME;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: OvertimeConfig) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert([{
          setting_key: 'overtime_config',
          setting_value: JSON.parse(JSON.stringify(settings)),
          updated_at: new Date().toISOString(),
        }], { onConflict: 'setting_key' });

      if (error) throw error;
      return settings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(overtimeQueryKey, newSettings);
      toast.success('Overtime settings saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save overtime settings: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_OVERTIME,
    isLoading: query.isLoading,
    updateSettings,
  };
}
