 import { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Switch } from '@/components/ui/switch';
 import { CalendarDays, Save } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface LeaveConfig {
   annualEntitlement: number; // Days for salaried staff
   accrualRate: number; // Percentage for zero-hour (UK statutory: 12.07%)
   carryOverEnabled: boolean;
   maxCarryOver: number;
   minNoticeDays: number;
   maxConcurrentStaff: number;
 }
 
 export function LeaveSettings() {
   const [config, setConfig] = useState<LeaveConfig>({
     annualEntitlement: 28, // UK statutory minimum (inc bank holidays)
     accrualRate: 12.07,
     carryOverEnabled: true,
     maxCarryOver: 5,
     minNoticeDays: 14,
     maxConcurrentStaff: 2,
   });
   const [isDirty, setIsDirty] = useState(false);
 
   const handleChange = <K extends keyof LeaveConfig>(field: K, value: LeaveConfig[K]) => {
     setConfig((prev) => ({ ...prev, [field]: value }));
     setIsDirty(true);
   };
 
   const handleSave = () => {
     toast.success('Leave settings saved successfully');
     setIsDirty(false);
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <CalendarDays className="h-5 w-5 text-primary" />
           Leave & Holiday Policy
         </CardTitle>
         <CardDescription>
           Configure annual leave entitlements and request policies per UK regulations.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label htmlFor="annualEntitlement">Salaried Annual Leave (days)</Label>
             <Input
               id="annualEntitlement"
               type="number"
               min="0"
               max="60"
               value={config.annualEntitlement}
               onChange={(e) => handleChange('annualEntitlement', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               UK minimum: 28 days (inc 8 bank holidays)
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="accrualRate">Zero-Hour Accrual Rate (%)</Label>
             <Input
               id="accrualRate"
               type="number"
               step="0.01"
               min="0"
               max="100"
               value={config.accrualRate}
               onChange={(e) => handleChange('accrualRate', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               UK statutory: 12.07% of hours worked
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="minNoticeDays">Minimum Notice (days)</Label>
             <Input
               id="minNoticeDays"
               type="number"
               min="0"
               max="90"
               value={config.minNoticeDays}
               onChange={(e) => handleChange('minNoticeDays', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               Days in advance leave must be requested
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="maxConcurrentStaff">Max Concurrent Leave</Label>
             <Input
               id="maxConcurrentStaff"
               type="number"
               min="1"
               max="50"
               value={config.maxConcurrentStaff}
               onChange={(e) => handleChange('maxConcurrentStaff', Number(e.target.value))}
             />
             <p className="text-xs text-muted-foreground">
               Maximum staff allowed off at the same time
             </p>
           </div>
         </div>
 
         <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
           <div className="flex items-center justify-between">
             <div className="space-y-0.5">
               <Label>Allow Carry Over</Label>
               <p className="text-sm text-muted-foreground">
                 Allow unused leave to carry over to next year
               </p>
             </div>
             <Switch
               checked={config.carryOverEnabled}
               onCheckedChange={(checked) => handleChange('carryOverEnabled', checked)}
             />
           </div>
 
           {config.carryOverEnabled && (
             <div className="space-y-2">
               <Label htmlFor="maxCarryOver">Maximum Carry Over (days)</Label>
               <Input
                 id="maxCarryOver"
                 type="number"
                 min="0"
                 max="30"
                 value={config.maxCarryOver}
                 onChange={(e) => handleChange('maxCarryOver', Number(e.target.value))}
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