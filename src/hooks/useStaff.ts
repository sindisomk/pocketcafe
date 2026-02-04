import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StaffProfile } from '@/types/staff';
import { toast } from 'sonner';

export function useStaff() {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as StaffProfile[];
    },
  });

  const createStaff = useMutation({
    mutationFn: async (staff: Omit<StaffProfile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('staff_profiles')
        .insert(staff)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add staff member: ${error.message}`);
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update staff member: ${error.message}`);
    },
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove staff member: ${error.message}`);
    },
  });

  return {
    staff: staffQuery.data ?? [],
    isLoading: staffQuery.isLoading,
    isError: staffQuery.isError,
    error: staffQuery.error,
    createStaff,
    updateStaff,
    deleteStaff,
    refetch: staffQuery.refetch,
  };
}
