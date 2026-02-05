import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type NotificationType = 
  | 'late_arrival' 
  | 'extended_break' 
  | 'no_show' 
  | 'shift_published' 
  | 'leave_request';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  related_staff_id: string | null;
  related_record_id: string | null;
  read_at: string | null;
  created_at: string;
  // Joined data
  staff_profiles?: {
    id: string;
    name: string;
    profile_photo_url: string | null;
  } | null;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          staff_profiles:related_staff_id (
            id,
            name,
            profile_photo_url
          )
        `)
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notificationsQuery.data?.filter(n => !n.read_at).length ?? 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success('All notifications marked as read');
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    refetch: notificationsQuery.refetch,
  };
}

// Helper to create notifications for all managers
export async function notifyManagers(
  type: NotificationType,
  title: string,
  message: string | null,
  relatedStaffId?: string,
  relatedRecordId?: string
) {
  try {
    // Get all manager user IDs
    const { data: managers, error: managersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager']);

    if (managersError) {
      console.error('[Notifications] Failed to fetch managers:', managersError);
      return;
    }

    if (!managers || managers.length === 0) {
      console.log('[Notifications] No managers found to notify');
      return;
    }

    // Create notification for each manager
    const notifications = managers.map((m) => ({
      recipient_id: m.user_id,
      type,
      title,
      message,
      related_staff_id: relatedStaffId || null,
      related_record_id: relatedRecordId || null,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[Notifications] Failed to create notifications:', insertError);
    } else {
      console.log(`[Notifications] Created ${notifications.length} notifications for type: ${type}`);
    }
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
  }
}
