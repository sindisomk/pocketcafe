import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { getTodayUK } from '@/lib/datetime';
import { devLog } from '@/lib/logger';
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
          devLog('[Realtime] attendance_records change:', payload.eventType);
          setLastSync(new Date());
          const today = getTodayUK();
          queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
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
          devLog('[Realtime] shifts change:', payload.eventType);
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
          devLog('[Realtime] leave_requests change:', payload.eventType);
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
          devLog('[Realtime] staff_profiles change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ queryKey: queryKeys.staff });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_show_records',
        },
        (payload) => {
          devLog('[Realtime] no_show_records change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && key[0] === 'no-shows';
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_balances',
        },
        (payload) => {
          devLog('[Realtime] leave_balances change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && (key[0] === 'leave-balance' || key[0] === 'leave-balances');
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          devLog('[Realtime] notifications change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => {
          devLog('[Realtime] app_settings change:', payload.eventType);
          setLastSync(new Date());
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && key[0] === 'settings';
            }
          });
        }
      )
      .subscribe((status) => {
        devLog('[Realtime] Connection status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      devLog('[Realtime] Cleaning up subscription');
      channel.unsubscribe();
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastSync }}>
      {children}
    </RealtimeContext.Provider>
  );
}
