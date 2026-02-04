import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StaffProfile } from '@/types/staff';
import { cn } from '@/lib/utils';

interface DraggableStaffCardProps {
  staff: StaffProfile;
}

export function DraggableStaffCard({ staff }: DraggableStaffCardProps) {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
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
          <p className="text-sm font-medium truncate">{staff.name}</p>
          <p className="text-xs text-muted-foreground">
            £{staff.hourly_rate.toFixed(2)}/hr
          </p>
        </div>
      </div>
    </Card>
  );
}
