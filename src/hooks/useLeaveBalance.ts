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

/**
 * Deduct leave hours for any staff (e.g. when leave is approved).
 * Optionally set deducted_at on the leave request so History shows "Applied to balance".
 */
export function useDeductLeaveForStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      hours,
      leaveRequestId,
      adjustOnly,
    }: {
      staffId: string;
      hours: number;
      leaveRequestId?: string;
      /** When true, only update balance (for edit flow); do not check or set deducted_at */
      adjustOnly?: boolean;
    }) => {
      // Ensure each leave request is only deducted once (unless adjustOnly)
      if (leaveRequestId && !adjustOnly) {
        const { data: leaveReq, error: leaveErr } = await supabase
          .from('leave_requests')
          .select('deducted_at')
          .eq('id', leaveRequestId)
          .single();
        if (leaveErr) throw leaveErr;
        if (leaveReq?.deducted_at) {
          throw new Error('This leave has already been deducted from balance.');
        }
      }

      const year = new Date().getFullYear();
      const { data: existing, error: fetchError } = await supabase
        .from('leave_balances')
        .select('id, used_hours')
        .eq('staff_id', staffId)
        .eq('year', year)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) {
        throw new Error('No leave balance record for this staff. Set up their balance first.');
      }

      const newUsed = (existing.used_hours ?? 0) + hours;
      const { data, error } = await supabase
        .from('leave_balances')
        .update({ used_hours: newUsed })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      if (leaveRequestId && !adjustOnly) {
        await supabase
          .from('leave_requests')
          .update({ deducted_at: new Date().toISOString() })
          .eq('id', leaveRequestId);
      }
      return data;
    },
    onSuccess: (_, { staffId, leaveRequestId, adjustOnly }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalance(staffId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalancesAll });
      if (leaveRequestId && !adjustOnly) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : `Failed to deduct leave: ${String(error)}`);
    },
  });
}

/**
 * Credit leave hours back to a staff balance (e.g. when cancelling approved leave that was deducted).
 */
export function useCreditLeaveForStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, hours }: { staffId: string; hours: number }) => {
      const year = new Date().getFullYear();
      const { data: existing, error: fetchError } = await supabase
        .from('leave_balances')
        .select('id, used_hours')
        .eq('staff_id', staffId)
        .eq('year', year)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) {
        throw new Error('No leave balance record for this staff.');
      }

      const currentUsed = existing.used_hours ?? 0;
      const newUsed = Math.max(0, currentUsed - hours);
      const { data, error } = await supabase
        .from('leave_balances')
        .update({ used_hours: newUsed })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { staffId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalance(staffId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalancesAll });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : `Failed to credit leave: ${String(error)}`);
    },
  });
}

// Hook to get all staff leave balances (for managers)
export function useAllLeaveBalances() {
  return useQuery({
    queryKey: queryKeys.leaveBalancesAll,
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
