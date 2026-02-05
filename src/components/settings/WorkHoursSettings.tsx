 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Switch } from '@/components/ui/switch';
 import { Timer, Save, AlertTriangle } from 'lucide-react';
 import { toast } from 'sonner';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 
 interface WorkHoursConfig {
   paidBreakMinutes: number;
   minRestBetweenShifts: number; // UK requirement: 11 hours
   maxWeeklyHours: number; // UK Working Time Directive: 48 hours
   latenessGraceMinutes: number;
   autoClockOutEnabled: boolean;
   autoClockOutHours: number;
 }
 
 export function WorkHoursSettings() {
   const [config, setConfig] = useState<WorkHoursConfig>({
     paidBreakMinutes: 30,
     minRestBetweenShifts: 11,
     maxWeeklyHours: 48,
     latenessGraceMinutes: 5,
     autoClockOutEnabled: true,
     autoClockOutHours: 12,
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = <K extends keyof WorkHoursConfig>(field: K, value: WorkHoursConfig[K]) => {
     setConfig((prev) => ({ ...prev, [field]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     toast.success('Work hours settings saved successfully');
     setIsDirty(false);
   };
 
   const isRestPeriodBelowLegal = config.minRestBetweenShifts < 11;
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Timer className="h-5 w-5 text-primary" />
           Work Hours & Breaks
         </CardTitle>
         <CardDescription>
           Configure working time rules per UK Working Time Directive.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         {isRestPeriodBelowLegal && (
           <Alert variant="destructive">
             <AlertTriangle className="h-4 w-4" />
             <AlertDescription>
               UK law requires minimum 11 hours rest between shifts. Current setting may cause compliance issues.
             </AlertDescription>
           </Alert>
         )}
 
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label htmlFor="paidBreakMinutes">Paid Break Duration (minutes)</Label>
             <Input
               id="paidBreakMinutes"
               type="number"
               min="0"
               max="120"
               value={config.paidBreakMinutes}
               onChange={(e) => handleChange('paidBreakMinutes', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               Break time included in paid hours
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="minRestBetweenShifts">Rest Between Shifts (hours)</Label>
             <Input
               id="minRestBetweenShifts"
               type="number"
               min="0"
               max="24"
               value={config.minRestBetweenShifts}
               onChange={(e) => handleChange('minRestBetweenShifts', Number(e.target.value))}
               className={isRestPeriodBelowLegal ? 'border-destructive' : ''}
             />
             <p className="text-xs text-muted-foreground">
               UK minimum: 11 hours between shifts
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="maxWeeklyHours">Maximum Weekly Hours</Label>
             <Input
               id="maxWeeklyHours"
               type="number"
               min="0"
               max="168"
               value={config.maxWeeklyHours}
               onChange={(e) => handleChange('maxWeeklyHours', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               UK Working Time Directive: 48 hrs without opt-out
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="latenessGraceMinutes">Lateness Grace Period (minutes)</Label>
             <Input
               id="latenessGraceMinutes"
               type="number"
               min="0"
               max="60"
               value={config.latenessGraceMinutes}
               onChange={(e) => handleChange('latenessGraceMinutes', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               Staff marked late after this many minutes
             </p>
           </div>
         </div>
 
         <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
           <div className="flex items-center justify-between">
             <div className="space-y-0.5">
               <Label>Auto Clock-Out</Label>
               <p className="text-sm text-muted-foreground">
                 Automatically clock out staff after extended period
               </p>
             </div>
             <Switch
               checked={config.autoClockOutEnabled}
               onCheckedChange={(checked) => handleChange('autoClockOutEnabled', checked)}
             />
           </div>
 
           {config.autoClockOutEnabled && (
             <div className="space-y-2">
               <Label htmlFor="autoClockOutHours">Auto Clock-Out After (hours)</Label>
               <Input
                 id="autoClockOutHours"
                 type="number"
                 min="1"
                 max="24"
                 value={config.autoClockOutHours}
                 onChange={(e) => handleChange('autoClockOutHours', Number(e.target.value))}
               />
             </div>
           )}
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