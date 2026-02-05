import { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ShiftWithStaff, ShiftType, SHIFT_TIMES, getEveningHours } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ShiftSlotProps {
  date: Date;
  shiftType: ShiftType;
  shifts: ShiftWithStaff[];
  hasRestWarning: (staffId: string) => boolean;
  onRemoveShift: (shiftId: string) => void;
  isLoading?: boolean;
}

export const ShiftSlot = forwardRef<HTMLDivElement, ShiftSlotProps>(function ShiftSlot(
  {
    date,
    shiftType,
    shifts,
    hasRestWarning,
    onRemoveShift,
    isLoading,
  },
  externalRef
) {
  const slotId = `${date.toISOString()}-${shiftType}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { date, shiftType },
  });

  // Combine refs for dnd-kit and any external ref
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      externalRef.current = node;
    }
  };

  // Calculate shift hours
  const shiftHours = shiftType === 'morning' 
    ? SHIFT_TIMES.morning.hours 
    : getEveningHours(date);

  // Calculate total cost for this slot
  const slotCost = shifts.reduce((total, shift) => {
    return total + (shift.staff_profiles.hourly_rate * shiftHours);
  }, 0);

  return (
    <div
      ref={combinedRef}
      className={cn(
        'min-h-[120px] p-2 border border-dashed rounded-lg transition-all',
        'flex flex-col gap-2',
        isOver && 'border-primary bg-primary/5 border-solid',
        !isOver && 'border-muted-foreground/30 bg-muted/20'
      )}
    >
      {shifts.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Drop staff here</p>
        </div>
      )}

      {shifts.map((shift) => {
        const showWarning = hasRestWarning(shift.staff_id);
        const initials = shift.staff_profiles.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={shift.id}
            className={cn(
              'group relative p-2 rounded-md bg-card border transition-all',
              showWarning && 'border-warning ring-1 ring-warning/50'
            )}
          >
            {showWarning && (
              <div className="absolute -top-2 -right-2 bg-warning text-warning-foreground rounded-full p-0.5">
                <AlertTriangle className="h-3 w-3" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 border border-muted">
                <AvatarImage 
                  src={shift.staff_profiles.profile_photo_url ?? undefined} 
                  alt={shift.staff_profiles.name} 
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{shift.staff_profiles.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  £{(shift.staff_profiles.hourly_rate * shiftHours).toFixed(2)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveShift(shift.id)}
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}

      {shifts.length > 0 && (
        <div className="mt-auto pt-2 border-t border-muted">
          <p className="text-[10px] text-muted-foreground text-center">
            Slot: £{slotCost.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
});
