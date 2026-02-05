import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OutletSettings {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  companyNumber: string;
  vatNumber: string;
}

const DEFAULT_OUTLET: OutletSettings = {
  name: 'PocketCafe',
  address: '',
  postcode: '',
  phone: '',
  email: '',
  companyNumber: '',
  vatNumber: '',
};

export const outletQueryKey = ['settings', 'outlet'] as const;

export function useOutletSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: outletQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'outlet')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        const storedSettings = data.setting_value as Partial<OutletSettings>;
        return { ...DEFAULT_OUTLET, ...storedSettings };
      }
      
      return DEFAULT_OUTLET;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<OutletSettings>) => {
      const currentSettings = query.data || DEFAULT_OUTLET;
      const newSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'outlet',
          setting_value: newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
      return newSettings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(outletQueryKey, newSettings);
      toast.success('Restaurant details saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save details: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_OUTLET,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings,
    refetch: query.refetch,
  };
}
