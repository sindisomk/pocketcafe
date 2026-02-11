import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isNoShow, getNowUK } from '@/lib/attendance';
import { getTodayUK } from '@/lib/datetime';
import { notifyManagers } from '@/hooks/useNotifications';

const NO_SHOW_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface UseNoShowDetectionOptions {
  enabled?: boolean;
  thresholdMinutes?: number;
}

/**
 * Background hook that detects no-shows for today's shifts
 * Runs every 5 minutes to check for staff who haven't clocked in
 */
export function useNoShowDetection(options: UseNoShowDetectionOptions = {}) {
  const { enabled = true, thresholdMinutes = 30 } = options;
  const queryClient = useQueryClient();
  const isRunningRef = useRef(false);

  const detectNoShows = useCallback(async () => {
    // Prevent concurrent runs
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const today = getTodayUK();
      const now = getNowUK();

      // Get today's shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, staff_id, shift_date, start_time')
        .eq('shift_date', today);

      if (shiftsError) {
        console.error('[NoShowDetection] Failed to fetch shifts:', shiftsError);
        return;
      }

      // Get today's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('staff_id')
        .gte('clock_in_time', `${today}T00:00:00`)
        .lte('clock_in_time', `${today}T23:59:59`);

      if (attendanceError) {
        console.error('[NoShowDetection] Failed to fetch attendance:', attendanceError);
        return;
      }

      const clockedInStaffIds = new Set(attendance?.map(a => a.staff_id) || []);

      // Find shifts where staff hasn't clocked in and is past threshold
      for (const shift of shifts ?? []) {
        // Skip if already clocked in
        if (clockedInStaffIds.has(shift.staff_id)) continue;

        // Check if past no-show threshold
        if (isNoShow(shift.start_time, shift.shift_date, now, thresholdMinutes)) {
          // Check if already recorded
          const { data: existing } = await supabase
            .from('no_show_records')
            .select('id')
            .eq('shift_id', shift.id)
            .eq('shift_date', today)
            .maybeSingle();

          if (!existing) {
            // Create no-show record
            const { data: noShowData, error: insertError } = await supabase
              .from('no_show_records')
              .insert({
                staff_id: shift.staff_id,
                shift_id: shift.id,
                shift_date: shift.shift_date,
                scheduled_start_time: shift.start_time,
              })
              .select()
              .single();

            if (insertError) {
              console.error('[NoShowDetection] Failed to create no-show record:', insertError);
            } else {
              console.log('[NoShowDetection] Created no-show record for shift:', shift.id);
              
              // Get staff name for notification
              const { data: staffData } = await supabase
                .from('staff_profiles')
                .select('name')
                .eq('id', shift.staff_id)
                .single();
              
              const staffName = staffData?.name || 'Staff member';
              
              // Notify managers about no-show
              notifyManagers(
                'no_show',
                `${staffName} is a no-show`,
                `Scheduled at ${shift.start_time} but hasn't clocked in`,
                shift.staff_id,
                noShowData?.id
              );
              
              // Invalidate no-shows query
              queryClient.invalidateQueries({ 
                predicate: (query) => {
                  const key = query.queryKey;
                  return Array.isArray(key) && key[0] === 'no-shows';
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[NoShowDetection] Unexpected error:', error);
    } finally {
      isRunningRef.current = false;
    }
  }, [thresholdMinutes, queryClient]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    detectNoShows();

    // Set up interval
    const interval = setInterval(detectNoShows, NO_SHOW_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, detectNoShows]);

  return { detectNoShows };
}
