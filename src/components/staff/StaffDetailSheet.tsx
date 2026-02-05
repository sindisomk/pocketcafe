 import { useState } from 'react';
 import { User, Pencil, Scan, CheckCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StaffProfile } from '@/types/staff';
import { useAuth } from '@/hooks/useAuth';
import { useStaff } from '@/hooks/useStaff';
import { cn } from '@/lib/utils';
 import { FaceEnrollmentDialog } from './FaceEnrollmentDialog';
 
 interface StaffWithFaceToken extends StaffProfile {
   face_token?: string | null;
 }

interface StaffDetailSheetProps {
  staff: StaffProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (staff: StaffProfile) => void;
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

export function StaffDetailSheet({ staff, open, onOpenChange, onEdit }: StaffDetailSheetProps) {
  const { isAdmin } = useAuth();
  const { updateStaff } = useStaff();
   const [showEnrollment, setShowEnrollment] = useState(false);

  if (!staff) return null;
 
   const staffWithToken = staff as StaffWithFaceToken;
   const hasFaceEnrolled = !!staffWithToken?.face_token;

  const initials = staff.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isSalaried = staff.contract_type === 'salaried';

  const handleContractToggle = async (checked: boolean) => {
    await updateStaff.mutateAsync({
      id: staff.id,
      contract_type: checked ? 'salaried' : 'zero_rate',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-muted">
              <AvatarImage src={staff.profile_photo_url ?? undefined} alt={staff.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xl font-medium">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{staff.name}</SheetTitle>
              <SheetDescription>
                <Badge
                  variant="outline"
                  className={cn('mt-1 text-xs font-medium', roleColors[staff.role])}
                >
                  {roleLabels[staff.role]}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* NI Number - Admin only */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                National Insurance Number
              </Label>
              <p className="text-foreground font-mono">
                {staff.ni_number || 'Not provided'}
              </p>
            </div>
          )}

          <Separator />

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Hourly Rate
            </Label>
            <p className="text-2xl font-semibold text-foreground">
              £{staff.hourly_rate.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground">/hour</span>
            </p>
          </div>

          <Separator />

          {/* Contract Type Toggle */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Contract Type
            </Label>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {isSalaried ? 'Salaried' : 'Zero-Rate'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSalaried
                    ? 'Fixed monthly salary'
                    : 'Paid per hour worked (12.07% holiday accrual)'}
                </p>
              </div>
              {isAdmin && (
                <Switch
                  checked={isSalaried}
                  onCheckedChange={handleContractToggle}
                  disabled={updateStaff.isPending}
                />
              )}
            </div>
          </div>

          {isAdmin && (
            <>
              <Separator />
             <div className="space-y-2">
               <Label className="text-sm font-medium text-muted-foreground">
                 Biometric Recognition
               </Label>
               <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                 <div className="flex items-center gap-3">
                   {hasFaceEnrolled ? (
                     <CheckCircle className="h-5 w-5 text-green-600" />
                   ) : (
                     <Scan className="h-5 w-5 text-muted-foreground" />
                   )}
                   <div className="space-y-0.5">
                     <p className="text-sm font-medium">
                       {hasFaceEnrolled ? 'Face Enrolled' : 'Not Enrolled'}
                     </p>
                     <p className="text-xs text-muted-foreground">
                       {hasFaceEnrolled 
                         ? 'Ready for biometric clock-in' 
                         : 'Enroll face for Kiosk recognition'}
                     </p>
                   </div>
                 </div>
                 <Button 
                   variant={hasFaceEnrolled ? "outline" : "default"}
                   size="sm"
                   onClick={() => setShowEnrollment(true)}
                 >
                   <Scan className="h-4 w-4 mr-2" />
                   {hasFaceEnrolled ? 'Re-enroll' : 'Enroll Face'}
                 </Button>
               </div>
             </div>
             <Separator />
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                onClick={() => staff && onEdit?.(staff)}
              >
                <Pencil className="h-4 w-4" />
                Edit Staff Member
              </Button>
            </>
          )}
        </div>
      </SheetContent>
     <FaceEnrollmentDialog
       open={showEnrollment}
       onOpenChange={setShowEnrollment}
       staffId={staff.id}
       staffName={staff.name}
     />
    </Sheet>
  );
}
