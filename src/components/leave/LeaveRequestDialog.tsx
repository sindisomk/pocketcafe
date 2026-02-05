 import { useState } from 'react';
 import { format } from 'date-fns';
 import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Calendar } from '@/components/ui/calendar';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { useLeaveRequests } from '@/hooks/useLeaveRequests';
 import { useStaff } from '@/hooks/useStaff';
 import { useAuth } from '@/hooks/useAuth';
 import { cn } from '@/lib/utils';
 
 interface LeaveRequestDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function LeaveRequestDialog({ open, onOpenChange }: LeaveRequestDialogProps) {
   const { createLeaveRequest, getConflicts } = useLeaveRequests();
   const { staff } = useStaff();
   const { isAdmin, isManager } = useAuth();
 
   const [selectedStaff, setSelectedStaff] = useState<string>('');
   const [startDate, setStartDate] = useState<Date>();
   const [endDate, setEndDate] = useState<Date>();
   const [reason, setReason] = useState('');
 
   const conflicts = startDate && endDate
     ? getConflicts(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'))
     : [];
 
   const handleSubmit = async () => {
     if (!selectedStaff || !startDate || !endDate) return;
 
     await createLeaveRequest.mutateAsync({
       staffId: selectedStaff,
       startDate: format(startDate, 'yyyy-MM-dd'),
       endDate: format(endDate, 'yyyy-MM-dd'),
       reason: reason || undefined,
     });
 
     // Reset form
     setSelectedStaff('');
     setStartDate(undefined);
     setEndDate(undefined);
     setReason('');
     onOpenChange(false);
   };
 
   const isValid = selectedStaff && startDate && endDate && endDate >= startDate;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>New Leave Request</DialogTitle>
           <DialogDescription>
             Submit a leave request for review
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           {/* Staff selector (only for admins/managers) */}
           {(isAdmin || isManager) && (
             <div className="space-y-2">
               <Label>Staff Member</Label>
               <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select staff member" />
                 </SelectTrigger>
                 <SelectContent>
                   {staff.map((s) => (
                     <SelectItem key={s.id} value={s.id}>
                       {s.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           )}
 
           {/* Date range */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Start Date</Label>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button
                     variant="outline"
                     className={cn(
                       "w-full justify-start text-left font-normal",
                       !startDate && "text-muted-foreground"
                     )}
                   >
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {startDate ? format(startDate, "PPP") : "Pick date"}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="single"
                     selected={startDate}
                     onSelect={setStartDate}
                     initialFocus
                     disabled={(date) => date < new Date()}
                   />
                 </PopoverContent>
               </Popover>
             </div>
 
             <div className="space-y-2">
               <Label>End Date</Label>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button
                     variant="outline"
                     className={cn(
                       "w-full justify-start text-left font-normal",
                       !endDate && "text-muted-foreground"
                     )}
                   >
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {endDate ? format(endDate, "PPP") : "Pick date"}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="single"
                     selected={endDate}
                     onSelect={setEndDate}
                     initialFocus
                     disabled={(date) => date < (startDate || new Date())}
                   />
                 </PopoverContent>
               </Popover>
             </div>
           </div>
 
           {/* Conflict warning */}
           {conflicts.length > 0 && (
             <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
               <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
               <div className="text-sm">
                 <p className="font-medium text-warning">Scheduling Conflict</p>
                 <p className="text-muted-foreground">
                   {conflicts.length} other staff member{conflicts.length > 1 ? 's are' : ' is'} already off during this period
                 </p>
               </div>
             </div>
           )}
 
           {/* Reason */}
           <div className="space-y-2">
             <Label>Reason (optional)</Label>
             <Textarea
               placeholder="e.g., Family vacation, medical appointment..."
               value={reason}
               onChange={(e) => setReason(e.target.value)}
               rows={3}
             />
           </div>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button 
             onClick={handleSubmit} 
             disabled={!isValid || createLeaveRequest.isPending}
           >
             {createLeaveRequest.isPending ? (
               <>
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 Submitting...
               </>
             ) : (
               'Submit Request'
             )}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }