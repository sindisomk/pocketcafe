import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, parseISO } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StaffProfile, JOB_TITLES } from '@/types/staff';
import { cn } from '@/lib/utils';

interface DraggableStaffCardProps {
  staff: StaffProfile;
  leaveDaysInWeek?: string[];
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

  const onLeave = leaveDaysInWeek.length > 0;
  const leaveDayLabels =
    weekDays.length && onLeave
      ? leaveDaysInWeek
          .map((d) => format(parseISO(d), 'EEE d'))
          .join(', ')
      : '';

  const jobLabel = staff.job_title
    ? JOB_TITLES.find((j) => j.value === staff.job_title)?.label ?? null
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-2.5 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        onLeave && 'border-amber-500/50 bg-amber-500/5'
      )}
      {...listeners}
      {...attributes}
    >
      <div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{staff.name}</p>
            {onLeave && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0 bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30">
                <CalendarOff className="h-3 w-3" />
                On leave
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {jobLabel ? `${jobLabel} — ` : ''}£{staff.hourly_rate.toFixed(2)}/hr
          </p>
          {onLeave && leaveDayLabels && (
            <p className="text-[10px] text-amber-700 dark:text-amber-300 truncate" title={leaveDayLabels}>
              {leaveDayLabels}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
