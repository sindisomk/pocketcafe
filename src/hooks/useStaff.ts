import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StaffProfile } from '@/types/staff';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface StaffProfileWithFaceToken extends StaffProfile {
  face_token?: string | null;
}

// Fields that managers are allowed to update (non-sensitive)
type ManagerUpdatableFields = {
  id: string;
  name?: string;
  role?: 'kitchen' | 'floor' | 'management' | 'bar';
  job_title?: string;
  contract_type?: 'salaried' | 'zero_rate';
  contact_email?: string;
  contact_phone?: string;
  profile_photo_url?: string;
  start_date?: string;
};

// All fields (for admin updates)
type AdminUpdatableFields = Partial<StaffProfile> & { id: string };

export function useStaff() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const staffQuery = useQuery({
    queryKey: [...queryKeys.staff, isAdmin ? 'admin' : 'manager'],
    queryFn: async () => {
      if (isAdmin) {
        // Admins get full access to all columns via base table
        const { data, error } = await supabase
          .from('staff_profiles')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return data as StaffProfileWithFaceToken[];
      } else {
        // Managers/staff use the secure view (excludes ni_number, tax_code, hourly_rate, face_token, nic_category)
        const { data, error } = await supabase
          .from('staff_profiles_manager')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return (data ?? []).map(d => ({
          ...d,
          // Provide safe defaults for fields excluded from manager view
          hourly_rate: 0,
          ni_number: null,
          tax_code: null,
          nic_category: null,
          face_token: null,
          contract_type: d.contract_type ?? 'zero_rate',
          role: d.role ?? 'floor',
          name: d.name ?? '',
          id: d.id ?? '',
          created_at: d.created_at ?? '',
          updated_at: d.updated_at ?? '',
        })) as StaffProfileWithFaceToken[];
      }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
      toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add staff member: ${error.message}`);
    },
  });

  // Admin update - direct table access for all fields including sensitive ones
  const updateStaffAdmin = useMutation({
    mutationFn: async ({ id, ...updates }: AdminUpdatableFields) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update staff member: ${error.message}`);
    },
  });

  // Manager update - uses secure RPC function (non-sensitive fields only)
  const updateStaffManager = useMutation({
    mutationFn: async ({ id, ...updates }: ManagerUpdatableFields) => {
      const { data, error } = await supabase.rpc('manager_update_staff_profile', {
        p_staff_id: id,
        p_name: updates.name ?? null,
        p_role: updates.role ?? null,
        p_job_title: (updates.job_title as Parameters<typeof supabase.rpc<'manager_update_staff_profile'>>[1]['p_job_title']) ?? null,
        p_contract_type: updates.contract_type ?? null,
        p_contact_email: updates.contact_email ?? null,
        p_contact_phone: updates.contact_phone ?? null,
        p_profile_photo_url: updates.profile_photo_url ?? null,
        p_start_date: updates.start_date ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
      toast.success('Staff member removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove staff member: ${error.message}`);
    },
  });

  return {
    staff: staffQuery.data ?? [] as StaffProfileWithFaceToken[],
    isLoading: staffQuery.isLoading,
    isError: staffQuery.isError,
    error: staffQuery.error,
    createStaff,
    updateStaffAdmin,
    updateStaffManager,
    deleteStaff,
    refetch: staffQuery.refetch,
  };
}
