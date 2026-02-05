import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface LeaveBalance {
  id: string;
  staff_id: string;
  total_entitlement_hours: number;
  used_hours: number;
  accrued_hours: number;
  year: number;
  created_at: string;
  updated_at: string;
}

// UK statutory accrual rate for zero-hour workers
const ACCRUAL_RATE = 0.1207;

// Standard salaried entitlement: 28 days = 224 hours (8h/day)
const SALARIED_ANNUAL_HOURS = 224;

export function useLeaveBalance(staffId?: string) {
  const queryClient = useQueryClient();

  const balanceQuery = useQuery({
    queryKey: queryKeys.leaveBalance(staffId ?? ''),
    enabled: !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('staff_id', staffId!)
        .eq('year', new Date().getFullYear())
        .maybeSingle();

      if (error) throw error;
      return data as LeaveBalance | null;
    },
  });

  // Calculate available hours
  const availableHours = balanceQuery.data
    ? (balanceQuery.data.total_entitlement_hours + balanceQuery.data.accrued_hours) - balanceQuery.data.used_hours
    : 0;

  // Create or update balance
  const updateBalance = useMutation({
    mutationFn: async (updates: Partial<LeaveBalance>) => {
      if (!staffId) throw new Error('Staff ID required');

      const { data: existing } = await supabase
        .from('leave_balances')
        .select('id')
        .eq('staff_id', staffId)
        .eq('year', new Date().getFullYear())
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('leave_balances')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('leave_balances')
          .insert({
            staff_id: staffId,
            year: new Date().getFullYear(),
            ...updates,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalance(staffId ?? '') });
    },
    onError: (error) => {
      toast.error(`Failed to update leave balance: ${error.message}`);
    },
  });

  // Recalculate accrual based on total hours worked (for zero-hour staff)
  const recalculateAccrual = useMutation({
    mutationFn: async (totalHoursWorked: number) => {
      if (!staffId) throw new Error('Staff ID required');

      const accruedHours = totalHoursWorked * ACCRUAL_RATE;

      return updateBalance.mutateAsync({ accrued_hours: accruedHours });
    },
  });

  // Initialize balance for salaried staff
  const initializeSalariedBalance = useMutation({
    mutationFn: async () => {
      if (!staffId) throw new Error('Staff ID required');

      return updateBalance.mutateAsync({
        total_entitlement_hours: SALARIED_ANNUAL_HOURS,
        accrued_hours: 0,
      });
    },
  });

  // Deduct hours when leave is approved
  const deductHours = useMutation({
    mutationFn: async (hours: number) => {
      if (!balanceQuery.data) throw new Error('No balance record found');

      const newUsed = balanceQuery.data.used_hours + hours;

      return updateBalance.mutateAsync({ used_hours: newUsed });
    },
  });

  return {
    balance: balanceQuery.data,
    availableHours,
    isLoading: balanceQuery.isLoading,
    isError: balanceQuery.isError,
    updateBalance,
    recalculateAccrual,
    initializeSalariedBalance,
    deductHours,
  };
}

// Hook to get all staff leave balances (for managers)
export function useAllLeaveBalances() {
  return useQuery({
    queryKey: ['leave-balances', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          staff_profiles (
            id,
            name,
            profile_photo_url,
            contract_type
          )
        `)
        .eq('year', new Date().getFullYear())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Utility to calculate accrued leave hours
export function calculateAccruedLeave(hoursWorked: number): number {
  return hoursWorked * ACCRUAL_RATE;
}
