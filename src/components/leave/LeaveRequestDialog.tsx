 import { useState, useEffect } from 'react';
 import { format, parse } from 'date-fns';
 import { CalendarIcon, Loader2, AlertTriangle, Clock } from 'lucide-react';
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
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Calendar } from '@/components/ui/calendar';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { useLeaveRequests } from '@/hooks/useLeaveRequests';
 import { useStaff } from '@/hooks/useStaff';
 import { useAuth } from '@/hooks/useAuth';
 import { cn } from '@/lib/utils';
 
 /** Minimal shape for edit prefill */
 export type LeaveRequestEdit = {
   id: string;
   staff_id: string;
   start_date: string;
   end_date: string;
   start_time: string | null;
   end_time: string | null;
   leave_type: string | null;
   reason: string | null;
 };

 interface LeaveRequestDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   /** When set, dialog is in edit mode: prefill and call onUpdate on submit */
   editRequest?: LeaveRequestEdit | null;
   /** When true, submit is in progress (e.g. parent saving edit) */
   isUpdating?: boolean;
   onUpdate?: (id: string, payload: {
     startDate: string;
     endDate: string;
     startTime: string | null;
     endTime: string | null;
     leaveType: string | null;
     reason: string | null;
   }) => void | Promise<void>;
 }

 function toHHmm(t: string | null | undefined): string {
   if (t == null || t === '') return '09:00';
   const s = t.trim();
   return s.length >= 5 ? s.slice(0, 5) : s;
 }

 export function LeaveRequestDialog({ open, onOpenChange, editRequest, isUpdating, onUpdate }: LeaveRequestDialogProps) {
   const { createLeaveRequest, getConflicts } = useLeaveRequests();
   const { staff } = useStaff();
   const { isAdmin, isManager } = useAuth();
 
   const [selectedStaff, setSelectedStaff] = useState<string>('');
   const [startDate, setStartDate] = useState<Date>();
   const [endDate, setEndDate] = useState<Date>();
   const [leaveType, setLeaveType] = useState<string>('');
   const [fullDay, setFullDay] = useState<boolean>(true);
   const [startTime, setStartTime] = useState<string>('09:00');
   const [endTime, setEndTime] = useState<string>('17:00');
   const [reason, setReason] = useState('');

   useEffect(() => {
     if (open && editRequest) {
       setSelectedStaff(editRequest.staff_id);
       setStartDate(parse(editRequest.start_date, 'yyyy-MM-dd', new Date()));
       setEndDate(parse(editRequest.end_date, 'yyyy-MM-dd', new Date()));
       setLeaveType(editRequest.leave_type ?? '');
       const hasPartial = !!(editRequest.start_time && editRequest.end_time);
       setFullDay(!hasPartial);
       setStartTime(toHHmm(editRequest.start_time) || '09:00');
       setEndTime(toHHmm(editRequest.end_time) || '17:00');
       setReason(editRequest.reason ?? '');
     } else if (open && !editRequest) {
       setSelectedStaff('');
       setStartDate(undefined);
       setEndDate(undefined);
       setLeaveType('');
       setFullDay(true);
       setStartTime('09:00');
       setEndTime('17:00');
       setReason('');
     }
   }, [open, editRequest]);
 
   const conflicts = startDate && endDate
     ? getConflicts(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'))
     : [];
 
   const handleSubmit = async () => {
     if (!selectedStaff || !startDate || !endDate) return;
 
     const payload = {
       startDate: format(startDate, 'yyyy-MM-dd'),
       endDate: format(endDate, 'yyyy-MM-dd'),
       startTime: fullDay ? null : startTime,
       endTime: fullDay ? null : endTime,
       leaveType: leaveType || null,
       reason: reason || null,
     };

     if (editRequest && onUpdate) {
       await onUpdate(editRequest.id, payload);
       onOpenChange(false);
       return;
     }

     await createLeaveRequest.mutateAsync({
       staffId: selectedStaff,
       ...payload,
       leaveType: payload.leaveType ?? undefined,
       reason: payload.reason ?? undefined,
     });

     setSelectedStaff('');
     setStartDate(undefined);
     setEndDate(undefined);
     setLeaveType('');
     setFullDay(true);
     setStartTime('09:00');
     setEndTime('17:00');
     setReason('');
     onOpenChange(false);
   };
 
   const partialTimeValid = fullDay || (startTime < endTime);
   const isValid =
     selectedStaff &&
     startDate &&
     endDate &&
     endDate >= startDate &&
     partialTimeValid;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>{editRequest ? 'Edit Leave' : 'New Leave Request'}</DialogTitle>
           <DialogDescription>
             {editRequest ? 'Update dates, times, type or reason.' : 'Submit a leave request for review'}
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           {/* Staff selector (only for admins/managers, hidden in edit mode) */}
           {(isAdmin || isManager) && !editRequest && (
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

           {/* Leave type (UK) */}
           <div className="space-y-2">
             <Label>Leave Type</Label>
             <Select value={leaveType} onValueChange={setLeaveType}>
               <SelectTrigger>
                 <SelectValue placeholder="Select leave type" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                 <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                 <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                 <SelectItem value="Parental Leave">Parental Leave</SelectItem>
                 <SelectItem value="Bereavement Leave">Bereavement Leave</SelectItem>
                 <SelectItem value="Time Off in Lieu (TOIL)">Time Off in Lieu (TOIL)</SelectItem>
                 <SelectItem value="Other">Other</SelectItem>
               </SelectContent>
             </Select>
           </div>

           {/* Full day vs partial (hours) */}
           <div className="space-y-3">
             <Label>Duration</Label>
             <RadioGroup
               value={fullDay ? 'full' : 'partial'}
               onValueChange={(v) => setFullDay(v === 'full')}
               className="flex flex-col gap-2"
             >
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="full" id="full" />
                 <Label htmlFor="full" className="font-normal cursor-pointer">
                   Full day(s)
                 </Label>
               </div>
               <div className="flex items-center space-x-2">
                 <RadioGroupItem value="partial" id="partial" />
                 <Label htmlFor="partial" className="font-normal cursor-pointer">
                   Partial day – specify hours (applies to each day in range)
                 </Label>
               </div>
             </RadioGroup>
             {!fullDay && (
               <div className="grid grid-cols-2 gap-4 pl-6 pt-2">
                 <div className="space-y-2">
                   <Label htmlFor="startTime" className="text-xs flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     Start time
                   </Label>
                   <Input
                     id="startTime"
                     type="time"
                     value={startTime}
                     onChange={(e) => setStartTime(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="endTime" className="text-xs flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     End time
                   </Label>
                   <Input
                     id="endTime"
                     type="time"
                     value={endTime}
                     onChange={(e) => setEndTime(e.target.value)}
                   />
                 </div>
                 {startTime >= endTime && (
                   <p className="col-span-2 text-xs text-destructive">
                     End time must be after start time
                   </p>
                 )}
               </div>
             )}
           </div>

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
                     disabled={(date) => !editRequest && date < new Date()}
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
             disabled={!isValid || (createLeaveRequest.isPending && !editRequest) || isUpdating}
           >
             {(createLeaveRequest.isPending && !editRequest) || isUpdating ? (
               <>
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 {editRequest ? 'Saving...' : 'Submitting...'}
               </>
             ) : editRequest ? (
               'Save changes'
             ) : (
               'Submit Request'
             )}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }