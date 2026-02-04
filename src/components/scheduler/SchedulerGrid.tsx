import { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, differenceInHours } from 'date-fns';
import { ChevronLeft, ChevronRight, Send, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DraggableStaffCard } from './DraggableStaffCard';
import { DayColumn } from './DayColumn';
import { useSchedule } from '@/hooks/useSchedule';
import { useStaff } from '@/hooks/useStaff';
import { StaffProfile } from '@/types/staff';
import { ShiftWithStaff, SHIFT_TIMES, getEveningEndTime } from '@/types/schedule';
import { cn } from '@/lib/utils';

export function SchedulerGrid() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeStaff, setActiveStaff] = useState<StaffProfile | null>(null);

  const { staff, isLoading: staffLoading } = useStaff();
  const { 
    schedule, 
    shifts, 
    isLoading: scheduleLoading,
    addShift,
    removeShift,
    publishSchedule,
  } = useSchedule(currentWeekStart);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Check for rest period violations (<11 hours between shifts)
  const hasRestWarning = useCallback((staffId: string): boolean => {
    const staffShifts = shifts
      .filter(s => s.staff_id === staffId)
      .sort((a, b) => {
        const dateA = new Date(`${a.shift_date}T${a.end_time}`);
        const dateB = new Date(`${b.shift_date}T${b.start_time}`);
        return dateA.getTime() - dateB.getTime();
      });

    for (let i = 0; i < staffShifts.length - 1; i++) {
      const currentEnd = new Date(`${staffShifts[i].shift_date}T${staffShifts[i].end_time}`);
      const nextStart = new Date(`${staffShifts[i + 1].shift_date}T${staffShifts[i + 1].start_time}`);
      
      const hoursBetween = differenceInHours(nextStart, currentEnd);
      if (hoursBetween < 11) {
        return true;
      }
    }
    return false;
  }, [shifts]);

  // Calculate weekly total
  const weeklyTotal = useMemo(() => {
    return shifts.reduce((total, shift) => {
      const shiftDate = parseISO(shift.shift_date);
      const hours = shift.shift_type === 'morning' 
        ? SHIFT_TIMES.morning.hours 
        : (shift.end_time === '23:00:00' ? 8 : 7);
      return total + (shift.staff_profiles.hourly_rate * hours);
    }, 0);
  }, [shifts]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const staffData = active.data.current?.staff as StaffProfile | undefined;
    if (staffData) {
      setActiveStaff(staffData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStaff(null);

    if (!over) return;

    const staffData = active.data.current?.staff as StaffProfile | undefined;
    const slotData = over.data.current as { date: Date; shiftType: 'morning' | 'evening' } | undefined;

    if (staffData && slotData) {
      addShift.mutate({
        staffId: staffData.id,
        shiftDate: slotData.date,
        shiftType: slotData.shiftType,
      });
    }
  };

  const handleRemoveShift = (shiftId: string) => {
    removeShift.mutate(shiftId);
  };

  const handlePublish = () => {
    publishSchedule.mutate();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev =>
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const isLoading = staffLoading || scheduleLoading;
  const isPublished = schedule?.status === 'published';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Staff Sidebar */}
        <Card className="lg:w-64 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Available Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] lg:h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-3">
                {staffLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff available
                  </p>
                ) : (
                  staff.map((s) => (
                    <DraggableStaffCard key={s.id} staff={s} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Calendar Grid */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-[180px]">
                  <p className="font-semibold">
                    {format(currentWeekStart, 'MMM d')} – {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Weekly Total & Publish */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Weekly Labour Cost</p>
                  <p className="text-lg font-bold text-primary">£{weeklyTotal.toFixed(2)}</p>
                </div>

                {isPublished ? (
                  <Badge variant="secondary" className="gap-1">
                    Published
                  </Badge>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={publishSchedule.isPending || shifts.length === 0}
                    className="gap-2"
                  >
                    {publishSchedule.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish Schedule
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="flex border-t">
                {weekDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = shifts.filter(s => s.shift_date === dayStr);
                  
                  return (
                    <DayColumn
                      key={dayStr}
                      date={day}
                      shifts={dayShifts}
                      hasRestWarning={hasRestWarning}
                      onRemoveShift={handleRemoveShift}
                      isLoading={removeShift.isPending}
                    />
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeStaff ? (
          <div className="opacity-80">
            <DraggableStaffCard staff={activeStaff} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
