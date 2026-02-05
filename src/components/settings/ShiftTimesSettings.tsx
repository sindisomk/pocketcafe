 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Clock, Save } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface ShiftTimes {
   morningStart: string;
   morningEnd: string;
   eveningStart: string;
   eveningEnd: string;
   eveningEndWeekend: string;
 }
 
 export function ShiftTimesSettings() {
   const [shiftTimes, setShiftTimes] = useState<ShiftTimes>({
     morningStart: '08:00',
     morningEnd: '15:00',
     eveningStart: '15:00',
     eveningEnd: '22:00',
     eveningEndWeekend: '23:00',
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = (field: keyof ShiftTimes, value: string) => {
     setShiftTimes((prev) => ({ ...prev, [field]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     // TODO: Save to database in future phase
     toast.success('Shift times saved successfully');
     setIsDirty(false);
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Clock className="h-5 w-5 text-primary" />
           Shift Times
         </CardTitle>
         <CardDescription>
           Configure standard shift patterns for morning and evening shifts.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <div className="grid gap-6 sm:grid-cols-2">
           {/* Morning Shift */}
           <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
             <h4 className="font-medium text-foreground">Morning Shift</h4>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="morningStart">Start Time</Label>
                 <Input
                   id="morningStart"
                   type="time"
                   value={shiftTimes.morningStart}
                   onChange={(e) => handleChange('morningStart', e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="morningEnd">End Time</Label>
                 <Input
                   id="morningEnd"
                   type="time"
                   value={shiftTimes.morningEnd}
                   onChange={(e) => handleChange('morningEnd', e.target.value)}
                 />
               </div>
             </div>
           </div>
 
           {/* Evening Shift */}
           <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
             <h4 className="font-medium text-foreground">Evening Shift</h4>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="eveningStart">Start Time</Label>
                 <Input
                   id="eveningStart"
                   type="time"
                   value={shiftTimes.eveningStart}
                   onChange={(e) => handleChange('eveningStart', e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="eveningEnd">End Time (Mon-Thu)</Label>
                 <Input
                   id="eveningEnd"
                   type="time"
                   value={shiftTimes.eveningEnd}
                   onChange={(e) => handleChange('eveningEnd', e.target.value)}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label htmlFor="eveningEndWeekend">End Time (Fri-Sat)</Label>
               <Input
                 id="eveningEndWeekend"
                 type="time"
                 value={shiftTimes.eveningEndWeekend}
                 onChange={(e) => handleChange('eveningEndWeekend', e.target.value)}
               />
             </div>
           </div>
         </div>
 
         <div className="flex justify-end">
           <Button onClick={handleSave} disabled={!isDirty} className="gap-2">
             <Save className="h-4 w-4" />
             Save Changes
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }