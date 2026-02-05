import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetSettings {
  kitchen: number;
  floor: number;
  bar: number;
  management: number;
}

const DEFAULT_BUDGETS: BudgetSettings = {
  kitchen: 5000,
  floor: 6000,
  bar: 4000,
  management: 3000,
};

export const budgetQueryKey = ['settings', 'department_budgets'] as const;

export function useBudgetSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: budgetQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'department_budgets')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        const storedSettings = data.setting_value as Partial<BudgetSettings>;
        return { ...DEFAULT_BUDGETS, ...storedSettings };
      }
      
      return DEFAULT_BUDGETS;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<BudgetSettings>) => {
      const currentSettings = query.data || DEFAULT_BUDGETS;
      const newSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'department_budgets',
          setting_value: newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
      return newSettings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(budgetQueryKey, newSettings);
      toast.success('Department budgets saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save budgets: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_BUDGETS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings,
    refetch: query.refetch,
  };
}
