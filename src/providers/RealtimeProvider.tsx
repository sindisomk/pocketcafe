import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextValue {
  isConnected: boolean;
  lastSync: Date | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  lastSync: null,
});

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Create a single channel for all database changes
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
        },
        (payload) => {
          console.log('[Realtime] attendance_records change:', payload.eventType);
          setLastSync(new Date());
          // Invalidate attendance queries
          queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
          // Also invalidate shifts-today since TodayRoster uses both
          queryClient.invalidateQueries({ queryKey: queryKeys.shiftsToday(today) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
        },
        (payload) => {
          console.log('[Realtime] shifts change:', payload.eventType);
          setLastSync(new Date());
          // Invalidate all shift-related queries
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && (
                key[0] === 'shifts' || 
                key[0] === 'shifts-today' || 
                key[0] === 'weekly-schedule'
              );
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        (payload) => {
          console.log('[Realtime] leave_requests change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_profiles',
        },
        (payload) => {
          console.log('[Realtime] staff_profiles change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ queryKey: queryKeys.staff });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Connection status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up subscription');
      channel.unsubscribe();
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastSync }}>
      {children}
    </RealtimeContext.Provider>
  );
}
