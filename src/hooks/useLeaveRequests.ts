import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest, LeaveRequestWithStaff, LeaveStatus } from '@/types/attendance';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import { notifyManagers } from '@/hooks/useNotifications';
 
 export function useLeaveRequests() {
   const queryClient = useQueryClient();
 
   const leaveQuery = useQuery({
     queryKey: queryKeys.leaveRequests,
     queryFn: async () => {
       const { data, error } = await supabase
         .from('leave_requests')
         .select(`
           *,
           staff_profiles (
             id,
             name,
             profile_photo_url
           )
         `)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as LeaveRequestWithStaff[];
     },
   });
 
   const createLeaveRequest = useMutation({
     mutationFn: async (request: {
       staffId: string;
       startDate: string;
       endDate: string;
       leaveType?: string;
       reason?: string;
     }) => {
       const { data, error } = await supabase
         .from('leave_requests')
         .insert({
           staff_id: request.staffId,
           start_date: request.startDate,
           end_date: request.endDate,
           leave_type: request.leaveType || null,
           reason: request.reason,
         })
         .select()
         .single();
 
        if (error) throw error;
        
        // Get staff name for notification
        const { data: staffData } = await supabase
          .from('staff_profiles')
          .select('name')
          .eq('id', request.staffId)
          .single();
        
        const staffName = staffData?.name || 'Staff member';
        
        // Notify managers about new leave request
        notifyManagers(
          'leave_request',
          `${staffName} submitted a leave request`,
          `${request.startDate} to ${request.endDate}`,
          request.staffId,
          data.id
        );
        
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests });
        toast.success('Leave request submitted');
      },
      onError: (error) => {
        toast.error(`Failed to submit leave request: ${error.message}`);
      },
    });
 
   const updateLeaveStatus = useMutation({
     mutationFn: async ({
       id,
       status,
       reviewNotes,
     }: {
       id: string;
       status: LeaveStatus;
       reviewNotes?: string;
     }) => {
       const { data: userData } = await supabase.auth.getUser();
       
       const { data, error } = await supabase
         .from('leave_requests')
         .update({
           status,
           reviewed_by: userData.user?.id,
           reviewed_at: new Date().toISOString(),
           review_notes: reviewNotes,
         })
         .eq('id', id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests });
      toast.success(`Leave request ${variables.status}`);
     },
     onError: (error) => {
       toast.error(`Failed to update leave request: ${error.message}`);
     },
   });
 
   // Conflict detection: count overlapping leave requests
   const getConflicts = (startDate: string, endDate: string) => {
     if (!leaveQuery.data) return [];
     
     return leaveQuery.data.filter((request) => {
       if (request.status === 'rejected') return false;
       
       const reqStart = new Date(request.start_date);
       const reqEnd = new Date(request.end_date);
       const checkStart = new Date(startDate);
       const checkEnd = new Date(endDate);
       
       // Check for overlap
       return reqStart <= checkEnd && reqEnd >= checkStart;
     });
   };
 
   return {
     leaveRequests: leaveQuery.data ?? [],
     isLoading: leaveQuery.isLoading,
     isError: leaveQuery.isError,
     error: leaveQuery.error,
     createLeaveRequest,
     updateLeaveStatus,
     getConflicts,
     refetch: leaveQuery.refetch,
   };
 }