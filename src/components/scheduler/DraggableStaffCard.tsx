import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO } from 'date-fns';
import { User, GripVertical, CalendarOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StaffProfile } from '@/types/staff';
import { cn } from '@/lib/utils';

interface DraggableStaffCardProps {
  staff: StaffProfile;
  /** Date strings (yyyy-MM-dd) when this staff is on approved leave in the current week */
  leaveDaysInWeek?: string[];
  /** Week day Date objects for formatting leave days */
  weekDays?: Date[];
}

export function DraggableStaffCard({ staff, leaveDaysInWeek = [], weekDays = [] }: DraggableStaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: { staff },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const initials = staff.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onLeave = leaveDaysInWeek.length > 0;
  const leaveDayLabels =
    weekDays.length && onLeave
      ? leaveDaysInWeek
          .map((d) => format(parseISO(d), 'EEE d'))
          .join(', ')
      : '';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        onLeave && 'border-amber-500/50 bg-amber-500/5'
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        
        <Avatar className="h-9 w-9 border border-muted">
          <AvatarImage src={staff.profile_photo_url ?? undefined} alt={staff.name} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{staff.name}</p>
            {onLeave && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0 bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30">
                <CalendarOff className="h-3 w-3" />
                On leave
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            £{staff.hourly_rate.toFixed(2)}/hr
            {onLeave && leaveDayLabels && (
              <span className="block text-amber-700 dark:text-amber-300 truncate" title={leaveDayLabels}>
                {leaveDayLabels}
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
