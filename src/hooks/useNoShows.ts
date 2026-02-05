import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface NoShowRecord {
  id: string;
  staff_id: string;
  shift_id: string;
  shift_date: string;
  scheduled_start_time: string;
  detected_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  staff_profiles: {
    id: string;
    name: string;
    profile_photo_url: string | null;
    role: string;
  } | null;
  shifts: {
    shift_type: string;
    start_time: string;
    end_time: string;
  } | null;
}

export function useNoShows(date?: Date) {
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateStr = format(targetDate, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['no-shows', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('no_show_records')
        .select(`
          *,
          staff_profiles (id, name, profile_photo_url, role),
          shifts (shift_type, start_time, end_time)
        `)
        .eq('shift_date', dateStr)
        .eq('resolved', false)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data as NoShowRecord[];
    },
  });

  const resolveNoShow = useMutation({
    mutationFn: async ({ 
      noShowId, 
      notes 
    }: { 
      noShowId: string; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('no_show_records')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
        })
        .eq('id', noShowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['no-shows', dateStr] });
      toast.success('No-show resolved');
    },
    onError: (error) => {
      toast.error(`Failed to resolve no-show: ${error.message}`);
    },
  });

  return {
    noShows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    resolveNoShow,
    refetch: query.refetch,
  };
}
