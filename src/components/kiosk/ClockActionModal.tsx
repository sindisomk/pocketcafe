 import { useState } from 'react';
 import { format } from 'date-fns';
 import { Clock, Coffee, LogIn, LogOut, Loader2, User } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { useAttendance } from '@/hooks/useAttendance';
import { AttendanceRecord } from '@/types/attendance';
 import { cn } from '@/lib/utils';
 
interface ClockActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  staffPhoto: string | null;
  activeRecord: AttendanceRecord | null;
  faceConfidence?: number;
  overrideManagerId?: string;
  isManagerOverride?: boolean;
  onActionComplete?: () => void;
  // New props for lateness calculation
  scheduledStartTime?: string;
  shiftDate?: string;
  graceMinutes?: number;
}

export function ClockActionModal({
  open,
  onOpenChange,
  staffId,
  staffName,
  staffPhoto,
  activeRecord,
  faceConfidence,
  overrideManagerId,
  isManagerOverride,
  onActionComplete,
  scheduledStartTime,
  shiftDate,
  graceMinutes,
}: ClockActionModalProps) {
  const { clockIn, startBreak, endBreak, clockOut } = useAttendance();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleAction = async (action: 'clock_in' | 'start_break' | 'end_break' | 'clock_out') => {
    setProcessingAction(action);

    try {
      switch (action) {
        case 'clock_in':
          await clockIn.mutateAsync({
            staffId,
            faceConfidence,
            overrideBy: isManagerOverride ? overrideManagerId : undefined,
            overridePinUsed: isManagerOverride,
            scheduledStartTime,
            shiftDate,
            graceMinutes,
          });
          break;
         case 'start_break':
           if (activeRecord) await startBreak.mutateAsync(activeRecord.id);
           break;
         case 'end_break':
           if (activeRecord) await endBreak.mutateAsync(activeRecord.id);
           break;
         case 'clock_out':
           if (activeRecord) await clockOut.mutateAsync(activeRecord.id);
           break;
       }
       
       // Close modal after successful action
        setTimeout(() => {
          onOpenChange(false);
          onActionComplete?.();
        }, 1000);
     } finally {
       setProcessingAction(null);
     }
   };
 
   const canClockIn = !activeRecord;
   const canStartBreak = activeRecord?.status === 'clocked_in' && !activeRecord.break_start_time;
   const canEndBreak = activeRecord?.status === 'on_break';
   const canClockOut = activeRecord && activeRecord.status !== 'clocked_out';
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader className="text-center">
           <div className="flex justify-center mb-4">
             <Avatar className="h-24 w-24 border-4 border-primary">
               <AvatarImage src={staffPhoto ?? undefined} />
               <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                 {staffName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
               </AvatarFallback>
             </Avatar>
           </div>
           <DialogTitle className="text-2xl">Welcome, {staffName.split(' ')[0]}!</DialogTitle>
           <DialogDescription className="text-base">
             {format(new Date(), "EEEE, MMMM d 'at' h:mm a")}
           </DialogDescription>
         </DialogHeader>
 
         <div className="grid grid-cols-2 gap-3 mt-6">
           {/* Clock In */}
           <Button
             size="lg"
             className={cn(
               "h-20 flex-col gap-2",
               canClockIn ? "bg-success hover:bg-success/90" : "opacity-50"
             )}
             disabled={!canClockIn || processingAction !== null}
             onClick={() => handleAction('clock_in')}
           >
             {processingAction === 'clock_in' ? (
               <Loader2 className="h-6 w-6 animate-spin" />
             ) : (
               <LogIn className="h-6 w-6" />
             )}
             <span>Clock In</span>
           </Button>
 
           {/* Start Break */}
           <Button
             size="lg"
             variant="secondary"
             className={cn(
               "h-20 flex-col gap-2",
               canStartBreak ? "bg-warning hover:bg-warning/90 text-warning-foreground" : "opacity-50"
             )}
             disabled={!canStartBreak || processingAction !== null}
             onClick={() => handleAction('start_break')}
           >
             {processingAction === 'start_break' ? (
               <Loader2 className="h-6 w-6 animate-spin" />
             ) : (
               <Coffee className="h-6 w-6" />
             )}
             <span>Start 30m Break</span>
           </Button>
 
           {/* End Break */}
           <Button
             size="lg"
             variant="secondary"
             className={cn(
               "h-20 flex-col gap-2",
               canEndBreak ? "bg-primary hover:bg-primary/90" : "opacity-50"
             )}
             disabled={!canEndBreak || processingAction !== null}
             onClick={() => handleAction('end_break')}
           >
             {processingAction === 'end_break' ? (
               <Loader2 className="h-6 w-6 animate-spin" />
             ) : (
               <Clock className="h-6 w-6" />
             )}
             <span>End Break</span>
           </Button>
 
           {/* Clock Out */}
           <Button
             size="lg"
             variant="destructive"
             className={cn(
               "h-20 flex-col gap-2",
               !canClockOut && "opacity-50"
             )}
             disabled={!canClockOut || processingAction !== null}
             onClick={() => handleAction('clock_out')}
           >
             {processingAction === 'clock_out' ? (
               <Loader2 className="h-6 w-6 animate-spin" />
             ) : (
               <LogOut className="h-6 w-6" />
             )}
             <span>Clock Out</span>
           </Button>
         </div>
 
         {/* Current status */}
         {activeRecord && (
           <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm">
             <span className="text-muted-foreground">Current status: </span>
             <span className="font-medium capitalize">
               {activeRecord.status.replace('_', ' ')}
             </span>
             {activeRecord.status === 'clocked_in' && (
               <span className="text-muted-foreground">
                 {' '}since {format(new Date(activeRecord.clock_in_time), 'h:mm a')}
               </span>
             )}
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 }