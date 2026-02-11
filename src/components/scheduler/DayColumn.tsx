import { format } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { ShiftSlot } from './ShiftSlot';
import { ShiftWithStaff, SHIFT_TIMES, getEveningEndTime, getEveningHours } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { getTodayUK } from '@/lib/datetime';

interface DayColumnProps {
  date: Date;
  shifts: ShiftWithStaff[];
  hasRestWarning: (staffId: string) => boolean;
  onRemoveShift: (shiftId: string) => void;
  isLoading?: boolean;
  /** Number of staff on approved leave this day */
  onLeaveCount?: number;
  /** Set of shift IDs that are no-shows (for highlighting) */
  noShowShiftIds?: Set<string>;
}

export function DayColumn({
  date,
  shifts,
  hasRestWarning,
  onRemoveShift,
  isLoading,
  onLeaveCount = 0,
  noShowShiftIds,
}: DayColumnProps) {
  const dayName = format(date, 'EEE');
  const dayNumber = format(date, 'd');
  const monthName = format(date, 'MMM');
  const isToday = format(date, 'yyyy-MM-dd') === getTodayUK();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const morningShifts = shifts.filter(s => s.shift_type === 'morning');
  const eveningShifts = shifts.filter(s => s.shift_type === 'evening');

  // Calculate daily totals
  const morningHours = SHIFT_TIMES.morning.hours;
  const eveningHours = getEveningHours(date);
  
  const morningCost = morningShifts.reduce((total, s) => 
    total + (s.staff_profiles.hourly_rate * morningHours), 0);
  const eveningCost = eveningShifts.reduce((total, s) => 
    total + (s.staff_profiles.hourly_rate * eveningHours), 0);
  const dailyTotal = morningCost + eveningCost;

  const eveningEndTime = getEveningEndTime(date);

  return (
    <div className={cn(
      'flex flex-col min-w-[160px]',
      isWeekend && 'bg-muted/30'
    )}>
      {/* Day Header */}
      <div className={cn(
        'p-3 text-center border-b',
        isToday && 'bg-primary/10'
      )}>
        <p className={cn(
          'text-sm font-medium',
          isToday && 'text-primary'
        )}>
          {dayName}
        </p>
        <p className={cn(
          'text-lg font-bold',
          isToday && 'text-primary'
        )}>
          {dayNumber}
        </p>
        <p className="text-xs text-muted-foreground">{monthName}</p>
        {onLeaveCount > 0 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1">
            <CalendarOff className="h-3 w-3" />
            {onLeaveCount} on leave
          </p>
        )}
      </div>

      {/* Daily Cost Header */}
      <div className="p-2 text-center bg-muted/50 border-b">
        <p className="text-xs text-muted-foreground">Daily Total</p>
        <p className="text-sm font-semibold text-primary">
          £{dailyTotal.toFixed(2)}
        </p>
      </div>

      {/* Morning Shift */}
      <div className="p-2 border-b flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Morning</span>
          <span className="text-[10px] text-muted-foreground">
            {SHIFT_TIMES.morning.start}–{SHIFT_TIMES.morning.end}
          </span>
        </div>
        <ShiftSlot
          date={date}
          shiftType="morning"
          shifts={morningShifts}
          hasRestWarning={hasRestWarning}
          onRemoveShift={onRemoveShift}
          isLoading={isLoading}
          noShowShiftIds={noShowShiftIds}
        />
      </div>

      {/* Evening Shift */}
      <div className="p-2 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Evening</span>
          <span className="text-[10px] text-muted-foreground">
            {SHIFT_TIMES.evening.start}–{eveningEndTime}
          </span>
        </div>
        <ShiftSlot
          date={date}
          shiftType="evening"
          shifts={eveningShifts}
          hasRestWarning={hasRestWarning}
          onRemoveShift={onRemoveShift}
          isLoading={isLoading}
          noShowShiftIds={noShowShiftIds}
        />
      </div>
    </div>
  );
}
