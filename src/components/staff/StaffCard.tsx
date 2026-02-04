import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StaffProfile } from '@/types/staff';
import { cn } from '@/lib/utils';

interface StaffCardProps {
  staff: StaffProfile;
  onClick: () => void;
}

const roleColors: Record<string, string> = {
  kitchen: 'bg-amber-100 text-amber-800 border-amber-200',
  floor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  management: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const roleLabels: Record<string, string> = {
  kitchen: 'Kitchen',
  floor: 'Floor',
  management: 'Management',
};

const contractLabels: Record<string, string> = {
  salaried: 'Salaried',
  zero_rate: 'Zero-Rate',
};

export function StaffCard({ staff, onClick }: StaffCardProps) {
  const initials = staff.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-muted">
            <AvatarImage src={staff.profile_photo_url ?? undefined} alt={staff.name} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {initials || <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{staff.name}</h3>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', roleColors[staff.role])}
              >
                {roleLabels[staff.role]}
              </Badge>
              
              <Badge variant="secondary" className="text-xs font-medium">
                {contractLabels[staff.contract_type]}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              £{staff.hourly_rate.toFixed(2)}/hr
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
